import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Crown, ShieldCheck } from 'lucide-react';
import { useEntitlement } from '../../hooks/useEntitlement.js';
import { formatPrice, getRegionalPricing } from '../../config/subscriptionPlans.js';
import { startRazorpaySubscription } from '../../services/subscriptionService.js';
import { authenticatedPost } from '../../services/razorpayService.js';

const LABELS = {
  free: 'Free',
  active: 'Pro active',
  grace_period: 'Payment needs attention',
  cancelled: 'Cancelled',
  expired: 'Expired',
};
const buttonClass =
  'min-h-11 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50';
const dateLabel = (value) =>
  value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : '';

const SubscriptionSettingsCard = ({ country = 'IN' }) => {
  const entitlement = useEntitlement();
  const user = useSelector((state) => state.auth.user);
  const [mode, setMode] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const pricing = getRegionalPricing(country);
  const enabled = import.meta.env.VITE_RAZORPAY_SUBSCRIPTIONS_ENABLED === 'true';
  const refreshEntitlement = () => window.dispatchEvent(new Event('paymatrix:entitlement-refresh'));

  useEffect(() => {
    let active = true;
    setSubscription(null);
    setError('');
    setMessage('');
    if (enabled)
      authenticatedPost('/api/manage-subscription', { action: 'refresh' })
        .then((result) => {
          if (active) {
            setSubscription(result.subscription);
            setMode(result.mode || '');
          }
        })
        .catch((err) => {
          if (active) setError(err.message);
        });
    return () => {
      active = false;
    };
  }, [enabled, user?.uid, user?._id]);

  const manage = async (action) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(action);
    setError('');
    try {
      const result = await authenticatedPost('/api/manage-subscription', { action });
      setSubscription(result.subscription);
      setMode(result.mode || '');
      setConfirmCancel(false);
      setMessage(
        action === 'cancel'
          ? 'Cancellation confirmed. Any remaining paid access lasts until the date below.'
          : result.isPro
            ? 'Pro is active. Your billing status is up to date.'
            : 'Status refreshed. Pro activates after the first billing cycle starts.'
      );
      refreshEntitlement();
    } catch (err) {
      setError(err.message);
    } finally {
      locked.current = false;
      setBusy('');
    }
  };

  const subscribe = async (cycle) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(cycle);
    setError('');
    setMessage('Opening secure checkout…');
    const finish = () => {
      locked.current = false;
      setBusy('');
    };
    try {
      await startRazorpaySubscription({
        cycle,
        country: pricing.country,
        currency: pricing.currency,
        user,
        onDismiss: () => {
          finish();
          setMessage(
            'Checkout closed. Refresh status if you authorized a payment. You can resume an unfinished checkout.'
          );
        },
        onVerifying: () => {
          setBusy('verifying');
          setMessage('Verifying your authorization…');
        },
        onSuccess: (result) => {
          finish();
          setMessage(
            result.isPro
              ? 'Payment verified. paymatrix Pro is active.'
              : 'Authorization verified. Activation is pending; refresh status shortly.'
          );
          refreshEntitlement();
          authenticatedPost('/api/manage-subscription', { action: 'refresh' })
            .then((data) => setSubscription(data.subscription))
            .catch((err) => setError(err.message));
        },
        onFailure: (event) => {
          finish();
          setError(event?.error?.description || 'Checkout failed. Refresh status before retrying.');
        },
      });
    } catch (err) {
      finish();
      setError(err.message);
    }
  };

  const pending =
    subscription && !['cancelled', 'completed', 'expired', 'created'].includes(subscription.status);
  return (
    <section
      className="glass-card overflow-hidden border border-white/10"
      aria-labelledby="billing-title"
    >
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Crown size={22} className="text-primary" aria-hidden="true" />
            <div>
              <h3 id="billing-title" className="text-lg font-bold text-white">
                paymatrix Pro
              </h3>
              <p className="mt-1 text-sm text-white/70">Manage your plan and billing.</p>
            </div>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/80">
            {entitlement.loading
              ? 'Checking…'
              : entitlement.error
                ? 'Status unavailable'
                : LABELS[entitlement.state] || 'Free'}
          </span>
        </div>
        {mode === 'test' && (
          <p className="mt-4 rounded-xl border border-amber-300/30 p-3 text-sm text-amber-200">
            Test Mode: use Razorpay test payment details. No real money is charged.
          </p>
        )}
        <div className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          {['monthly', 'yearly'].map((cycle) => (
            <div key={cycle} className="rounded-xl border border-white/15 p-4">
              <h4 className="text-sm font-medium text-white/80">
                {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
              </h4>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatPrice(pricing[cycle], pricing)}
                <span className="text-sm font-normal text-white/70">
                  {' '}
                  / {cycle === 'monthly' ? 'month' : 'year'}
                </span>
              </p>
              <p className="mt-2 text-sm text-white/70">
                {cycle === 'yearly' ? 'Billed annually.' : 'Billed monthly.'}
              </p>
              {!entitlement.isPro && enabled && pricing.checkoutSupported && !pending && (
                <button
                  type="button"
                  disabled={
                    Boolean(busy) ||
                    entitlement.loading ||
                    Boolean(entitlement.error) ||
                    Boolean(error)
                  }
                  onClick={() => subscribe(cycle)}
                  className={`${buttonClass} mt-4 w-full`}
                >
                  {busy === cycle
                    ? 'Opening…'
                    : subscription?.status === 'created' && subscription.cycle === cycle
                      ? 'Resume checkout'
                      : `Choose ${cycle}`}
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 flex gap-2 text-sm leading-relaxed text-white/70">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          Recurring billing through Razorpay. Review the amount and payment mandate in checkout
          before authorizing. Cancel future renewals here.
        </p>
        {!enabled && (
          <p className="mt-4 text-sm text-white/70">
            Subscriptions are currently unavailable. Your free account remains available.
          </p>
        )}
        {!pricing.checkoutSupported && (
          <p className="mt-4 text-sm text-white/70">
            Checkout is currently available for India in INR.
          </p>
        )}
        {subscription && (
          <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm text-white/80">
            <p>
              Billing status:{' '}
              <strong>
                {subscription.cancelRequested ? 'Cancellation requested' : subscription.status}
              </strong>
            </p>
            {subscription.currentPeriodEnd && (
              <p>Current period ends {dateLabel(subscription.currentPeriodEnd)}.</p>
            )}
            <p className="break-all text-xs text-white/60">Reference: {subscription.id}</p>
          </div>
        )}
        <div
          role="status"
          aria-live="polite"
          className="mt-4 text-sm leading-relaxed text-white/80"
        >
          {message}
        </div>
        {(error || entitlement.error) && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error || entitlement.error} Use Refresh billing to try again.
          </p>
        )}
        {enabled && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClass}
              disabled={Boolean(busy)}
              onClick={() => manage('refresh')}
            >
              {busy === 'refresh' ? 'Refreshing…' : 'Refresh billing'}
            </button>
            {subscription &&
              !subscription.cancelRequested &&
              !['cancelled', 'completed', 'expired'].includes(subscription.status) && (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={Boolean(busy)}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel subscription
                </button>
              )}
          </div>
        )}
        {confirmCancel && (
          <div className="mt-4 rounded-xl border border-white/20 p-4">
            <p className="text-sm text-white/80">
              Stop future renewals? Active subscriptions keep access through the current paid
              period. Unstarted authorizations are cancelled immediately. This does not issue a
              refund.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClass}
                disabled={Boolean(busy)}
                onClick={() => manage('cancel')}
              >
                {busy === 'cancel' ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={Boolean(busy)}
                onClick={() => setConfirmCancel(false)}
              >
                Keep subscription
              </button>
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-4 text-sm text-white/70">
          <Link to="/terms" className="underline underline-offset-4">
            Billing, cancellation & refunds
          </Link>
          <Link to="/privacy" className="underline underline-offset-4">
            Privacy
          </Link>
          <Link to="/terms" className="underline underline-offset-4">
            Contact & support
          </Link>
        </div>
      </div>
    </section>
  );
};
export default SubscriptionSettingsCard;
