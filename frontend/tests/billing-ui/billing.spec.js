import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Exercise the real component with isolated provider responses, never real payments.
  await page.route('**/src/services/razorpayService.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    export async function authenticatedGet() { return { state: window.fixturePro ? 'active' : 'free', isPro: !!window.fixturePro }; }
    export async function authenticatedPost(url, body) {
      if (body.action === 'cancel') window.fixtureCancelled = true;
      return { isPro: !!window.fixturePro, subscription: window.fixtureSubscription ? { id: 'sub_fixture', status: 'active', cycle: 'monthly', currentPeriodEnd: '2030-01-01T00:00:00Z', cancelRequested: !!window.fixtureCancelled } : null };
    }
  `,
    })
  );
  await page.route('**/src/services/subscriptionService.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    export async function startRazorpaySubscription(options) {
      window.fixtureCheckouts = (window.fixtureCheckouts || 0) + 1;
      if (window.fixtureFailure) { options.onFailure({ error: { description: 'Payment failed. Refresh billing before retrying.' } }); return; }
      options.onVerifying();
      options.onSuccess({ verified: true, isPro: !!window.fixturePro });
    }
  `,
    })
  );
});

test('pending authorization never claims activation; layout fits', async ({ page }, info) => {
  await page.goto('/tests/billing-ui/index.html');
  await page.getByRole('button', { name: 'Choose monthly' }).click();
  await expect(page.getByRole('status')).toContainText('Activation is pending');
  await expect(page.getByRole('status')).not.toContainText('Pro is active');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const button = await page.getByRole('button', { name: 'Refresh billing' }).boundingBox();
  expect(button.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath('billing.png'), fullPage: true });
});

test('failed checkout has a recovery action', async ({ page }) => {
  await page.addInitScript(() => {
    window.fixtureFailure = true;
  });
  await page.goto('/tests/billing-ui/index.html');
  await page.getByRole('button', { name: 'Choose yearly' }).click();
  await expect(page.getByRole('alert')).toContainText('Payment failed');
  await page.getByRole('button', { name: 'Refresh billing' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('cancellation requires explicit confirmation and shows result', async ({ page }) => {
  await page.addInitScript(() => {
    window.fixturePro = true;
    window.fixtureSubscription = true;
  });
  await page.goto('/tests/billing-ui/index.html');
  await page.getByRole('button', { name: 'Cancel subscription', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm cancellation' })).toBeVisible();
  expect(await page.evaluate(() => !!window.fixtureCancelled)).toBe(false);
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByText('Cancellation requested', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel subscription', exact: true })).toHaveCount(
    0
  );
});
