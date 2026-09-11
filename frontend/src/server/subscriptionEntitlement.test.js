/* eslint-env node */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  sourceFromSubscription,
  reconcileSubscriptionSources,
  deriveEffectiveEntitlement,
  isApprovedPlan,
  THREE_DAYS_MS,
} from '../../server/subscriptionEntitlementCore.js';

describe('Subscription and Entitlement Core Lifecycle & Security', () => {
  const baseTime = Date.parse('2026-09-10T12:00:00Z');

  describe('sourceFromSubscription lifecycle mappings', () => {
    it('does not grant paid access for an authenticated mandate or an active record without a period', () => {
      expect(
        deriveEffectiveEntitlement([
          sourceFromSubscription({ id: 'sub_auth', status: 'authenticated' }),
        ]).isPro
      ).toBe(false);
      expect(
        deriveEffectiveEntitlement([sourceFromSubscription({ id: 'sub_active', status: 'active' })])
          .isPro
      ).toBe(false);
    });

    it('maps active paid-through state without inventing grace', () => {
      const periodEnd = Math.floor(Date.parse('2026-10-10T12:00:00Z') / 1000);
      const source = sourceFromSubscription(
        {
          id: 'sub_test',
          plan_id: 'plan_TaIatcbuADa6uE',
          status: 'active',
          current_end: periodEnd,
        },
        { now: baseTime }
      );
      expect(source.state).toBe('active');
      expect(source.validUntil).toBe(new Date(periodEnd * 1000).toISOString());
      expect(source.graceUntil).toBeNull();
      expect(source.cancelAtPeriodEnd).toBe(false);
    });

    it('maps halted subscriptions to a bounded grace period from periodEnd', () => {
      const periodEnd = Math.floor(Date.parse('2026-09-10T00:00:00Z') / 1000);
      const source = sourceFromSubscription(
        {
          id: 'sub_test',
          plan_id: 'plan_TaIatcbuADa6uE',
          status: 'halted',
          current_end: periodEnd,
        },
        { now: baseTime }
      );
      expect(source.state).toBe('grace_period');
      expect(source.graceUntil).toBe(new Date(periodEnd * 1000 + THREE_DAYS_MS).toISOString());
    });

    it('does not grant access to a pending subscription', () => {
      const source = sourceFromSubscription(
        {
          id: 'sub_pending',
          plan_id: 'plan_TaIatcbuADa6uE',
          status: 'pending',
          current_end: Math.floor(Date.parse('2026-10-10T00:00:00Z') / 1000),
        },
        { now: baseTime }
      );
      expect(source.state).toBe('free');
      expect(deriveEffectiveEntitlement([source], baseTime).isPro).toBe(false);
    });

    it('maps cancelled subscriptions with cancelAtPeriodEnd flag and validUntil preserved', () => {
      const periodEnd = Math.floor(Date.parse('2026-09-25T00:00:00Z') / 1000);
      const source = sourceFromSubscription(
        {
          id: 'sub_123',
          plan_id: 'plan_TaIatcbuADa6uE',
          status: 'cancelled',
          current_end: periodEnd,
        },
        { now: baseTime }
      );
      expect(source.state).toBe('cancelled');
      expect(source.cancelAtPeriodEnd).toBe(true);
      expect(source.validUntil).toBe(new Date(periodEnd * 1000).toISOString());
    });

    it('maps completed and expired to expired state', () => {
      expect(sourceFromSubscription({ id: 'sub_1', status: 'completed' }).state).toBe('expired');
      expect(sourceFromSubscription({ id: 'sub_2', status: 'expired' }).state).toBe('expired');
    });

    it('does not grant an unknown provider state', () => {
      expect(sourceFromSubscription({ id: 'sub_test', status: 'created' }).state).toBe('free');
    });
  });

  describe('Event ordering and reconciliation protection', () => {
    it('updates source when incoming event is newer', () => {
      const existing = [
        {
          provider: 'razorpay',
          providerId: 'sub_1',
          state: 'active',
          providerEventTimestamp: 1000,
        },
      ];
      const incoming = {
        provider: 'razorpay',
        providerId: 'sub_1',
        state: 'cancelled',
        providerEventTimestamp: 2000,
      };

      const result = reconcileSubscriptionSources(existing, incoming);
      expect(result.ignored).toBe(false);
      expect(result.sources[0].state).toBe('cancelled');
      expect(result.sources[0].providerEventTimestamp).toBe(2000);
    });

    it('rejects out-of-order older event from regressing newer state', () => {
      const existing = [
        {
          provider: 'razorpay',
          providerId: 'sub_1',
          state: 'cancelled',
          providerEventTimestamp: 5000,
        },
      ];
      const delayedIncoming = {
        provider: 'razorpay',
        providerId: 'sub_1',
        state: 'active',
        providerEventTimestamp: 3000,
      };

      const result = reconcileSubscriptionSources(existing, delayedIncoming);
      expect(result.ignored).toBe(true);
      expect(result.reason).toBe('out_of_order_event');
      expect(result.sources[0].state).toBe('cancelled'); // Remains cancelled!
    });

    it('retains independent multi-provider sources without overwriting', () => {
      const existing = [
        { provider: 'play', providerId: 'play_order_1', state: 'active', lifetime: true },
        { provider: 'admin', providerId: 'admin_grant', state: 'active', validUntil: '2027-01-01' },
      ];
      const incomingRazorpay = {
        provider: 'razorpay',
        providerId: 'sub_rzp',
        state: 'active',
        providerEventTimestamp: 1000,
      };

      const result = reconcileSubscriptionSources(existing, incomingRazorpay);
      expect(result.sources.length).toBe(3);
      expect(result.sources.find((s) => s.provider === 'play')).toBeDefined();
      expect(result.sources.find((s) => s.provider === 'admin')).toBeDefined();
      expect(result.sources.find((s) => s.provider === 'razorpay')).toBeDefined();
    });
  });

  describe('deriveEffectiveEntitlement across multiple sources', () => {
    it('preserves Pro access when a cancelled subscription is still within paid period', () => {
      const futureEnd = new Date(baseTime + 10 * 86400000).toISOString();
      const sources = [
        {
          provider: 'razorpay',
          providerId: 'sub_1',
          state: 'cancelled',
          validUntil: futureEnd,
          cancelAtPeriodEnd: true,
        },
      ];
      const effective = deriveEffectiveEntitlement(sources, baseTime);
      expect(effective.isPro).toBe(true);
      expect(effective.state).toBe('cancelled');
    });

    it('expires Pro access when cancelled subscription passes paid period', () => {
      const pastEnd = new Date(baseTime - 1000).toISOString();
      const sources = [
        {
          provider: 'razorpay',
          providerId: 'sub_1',
          state: 'cancelled',
          validUntil: pastEnd,
          cancelAtPeriodEnd: true,
        },
      ];
      const effective = deriveEffectiveEntitlement(sources, baseTime);
      expect(effective.isPro).toBe(false);
      expect(effective.state).toBe('cancelled');
    });

    it('grants Pro when Google Play or Admin grant is active even if Razorpay expired', () => {
      const sources = [
        { provider: 'razorpay', providerId: 'sub_1', state: 'expired', validUntil: '2026-01-01' },
        { provider: 'admin', providerId: 'admin_grant', state: 'active', lifetime: true },
      ];
      const effective = deriveEffectiveEntitlement(sources, baseTime);
      expect(effective.isPro).toBe(true);
      expect(effective.state).toBe('active');
    });

    it('grants Pro during bounded grace period', () => {
      const graceEnd = new Date(baseTime + 2 * 86400000).toISOString();
      const sources = [
        { provider: 'razorpay', providerId: 'sub_1', state: 'grace_period', graceUntil: graceEnd },
      ];
      const effective = deriveEffectiveEntitlement(sources, baseTime);
      expect(effective.isPro).toBe(true);
      expect(effective.state).toBe('grace_period');
    });
  });

  describe('Approved plan registry', () => {
    it('approves standard INR monthly and yearly plans', () => {
      process.env.RAZORPAY_PLAN_MONTHLY_INR = 'plan_TaIatcbuADa6uE';
      process.env.RAZORPAY_PLAN_YEARLY_INR = 'plan_TaIbDanlqitfVO';
      expect(isApprovedPlan('plan_TaIatcbuADa6uE')).toBe(true);
      expect(isApprovedPlan('plan_TaIbDanlqitfVO')).toBe(true);
    });

    it('rejects invented or foreign plans', () => {
      process.env.RAZORPAY_PLAN_MONTHLY_INR = 'plan_TaIatcbuADa6uE';
      process.env.RAZORPAY_PLAN_YEARLY_INR = 'plan_TaIbDanlqitfVO';
      expect(isApprovedPlan('plan_random_usd_123')).toBe(false);
      expect(isApprovedPlan('')).toBe(false);
      expect(isApprovedPlan(null)).toBe(false);
    });

    it('fails closed when plan configuration is missing', () => {
      const monthly = process.env.RAZORPAY_PLAN_MONTHLY_INR;
      const yearly = process.env.RAZORPAY_PLAN_YEARLY_INR;
      delete process.env.RAZORPAY_PLAN_MONTHLY_INR;
      delete process.env.RAZORPAY_PLAN_YEARLY_INR;
      expect(isApprovedPlan('plan_TaIatcbuADa6uE')).toBe(false);
      if (monthly) process.env.RAZORPAY_PLAN_MONTHLY_INR = monthly;
      if (yearly) process.env.RAZORPAY_PLAN_YEARLY_INR = yearly;
    });
  });

  describe('Zero divergence between frontend server and billing-gateway core modules', () => {
    it('ensures billing-gateway core module is identical to frontend core module', () => {
      const frontendPath = resolve(process.cwd(), 'server/subscriptionEntitlementCore.js');
      const billingGatewayPath = resolve(
        process.cwd(),
        '../billing-gateway/lib/subscriptionEntitlementCore.js'
      );

      const frontendCode = readFileSync(frontendPath, 'utf8').trim();
      const billingGatewayCode = readFileSync(billingGatewayPath, 'utf8').trim();

      expect(frontendCode).toBe(billingGatewayCode);
    });
  });
});
