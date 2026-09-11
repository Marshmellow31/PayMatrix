import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const envExample = read('.env.example');
const vercel = read('vercel.json');
const vite = read('vite.config.js');
const html = read('index.html');
const apiFiles = fs.readdirSync(path.join(root, 'api')).filter((name) => name.endsWith('.js'));
const apiSource = apiFiles.map((name) => read(`api/${name}`)).join('\n');

check(!vercel.includes("'unsafe-eval'"), 'Production CSP must not allow unsafe-eval.');
check(vercel.includes("object-src 'none'"), 'Production CSP must block object embedding.');
check(vercel.includes("frame-ancestors 'none'"), 'Production CSP must block framing.');
check(vite.includes("name: 'paymatrix'"), 'PWA name must use lowercase paymatrix branding.');
check(html.includes('<title>paymatrix'), 'Document title must use lowercase paymatrix branding.');
check(
  /RAZORPAY_SUBSCRIPTIONS_ENABLED="false"/.test(envExample),
  'Subscription server kill switch must default to false.'
);
check(
  /RAZORPAY_TEST_CHECKOUT_ENABLED="false"/.test(envExample),
  'Test-checkout server kill switch must default to false.'
);
check(
  !apiSource.includes('process.env.VITE_GEMINI_API_KEY'),
  'API code must not accept a public Gemini key.'
);
check(
  !/VITE_[A-Z0-9_]*(SECRET|PRIVATE_KEY)/.test(envExample),
  'Secrets and private keys must never use a VITE_ prefix.'
);

if (process.argv.includes('--production-env')) {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'GEMINI_API_KEY',
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
  ];
  required.forEach((name) =>
    check(Boolean(process.env[name]?.trim()), `Missing production variable: ${name}`)
  );
  const billingEnabled = process.env.RAZORPAY_SUBSCRIPTIONS_ENABLED === 'true';
  check(
    (process.env.VITE_RAZORPAY_SUBSCRIPTIONS_ENABLED === 'true') === billingEnabled,
    'Browser and server subscription flags must match.'
  );
  if (billingEnabled) {
    [
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
      'RAZORPAY_PLAN_MONTHLY_INR',
      'RAZORPAY_PLAN_YEARLY_INR',
    ].forEach((name) =>
      check(Boolean(process.env[name]?.trim()), `Missing billing variable: ${name}`)
    );
    check(
      /^rzp_(test|live)_/.test(process.env.RAZORPAY_KEY_ID || ''),
      'Invalid Razorpay key mode.'
    );
    ['RAZORPAY_PLAN_MONTHLY_INR', 'RAZORPAY_PLAN_YEARLY_INR'].forEach((name) =>
      check(/^plan_[A-Za-z0-9]+$/.test(process.env[name] || ''), `Invalid plan: ${name}`)
    );
  }
  check(
    String(process.env.RAZORPAY_TEST_CHECKOUT_ENABLED || 'false').toLowerCase() === 'false',
    'Core release requires Razorpay test checkout to remain disabled.'
  );
}

if (failures.length) {
  console.error('Release verification failed:\n' + failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(
  `Release verification passed (${process.argv.includes('--production-env') ? 'production environment' : 'repository'}).`
);
