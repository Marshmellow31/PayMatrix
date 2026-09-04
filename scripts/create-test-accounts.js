const fs = require('fs');
const os = require('os');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'paymatrix-174b5';
const WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyCBX6At66RcgTYTVWLk62-ghUDrtgjJGbk';

// 1. Get Firebase CLI auth credentials
function getCliAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Firebase tools config not found at: ${configPath}. Run 'firebase login' first.`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = config?.tokens?.access_token;
  if (!token) {
    throw new Error('No access_token found in firebase-tools config. Run "firebase login" first.');
  }
  return token;
}

// 2. Initialize Firebase Admin SDK using CLI OAuth2 Access Token
function initAdmin() {
  const token = getCliAccessToken();
  return admin.initializeApp({
    credential: {
      getAccessToken: () => Promise.resolve({ access_token: token, expires_in: 3600 }),
    },
    projectId: PROJECT_ID,
  });
}

// 3. Test credentials by signing in via Firebase Auth REST API
async function verifyCredentials(email, password) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
  return data;
}

// 4. Create or update user
async function createOrUpdateUser({ email, password, displayName, emailVerified }) {
  const auth = admin.auth();
  let user;
  let action;

  try {
    user = await auth.getUserByEmail(email);
    // User exists, update password and verification state
    user = await auth.updateUser(user.uid, {
      password,
      displayName,
      emailVerified,
    });
    action = 'UPDATED';
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      user = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified,
      });
      action = 'CREATED';
    } else {
      throw err;
    }
  }

  // Verify sign-in works
  let signInStatus = 'VERIFIED_SIGN_IN_OK';
  try {
    const signInResult = await verifyCredentials(email, password);
    if (!signInResult.idToken) {
      signInStatus = 'SIGN_IN_FAILED_NO_TOKEN';
    }
  } catch (signInErr) {
    signInStatus = `SIGN_IN_FAILED: ${signInErr.message}`;
  }

  return {
    email,
    displayName,
    emailVerified,
    uid: user.uid,
    action,
    signInStatus,
  };
}

// Test accounts to prepare
const DEFAULT_ACCOUNTS = [
  {
    email: 'google.reviewer@paymatrix.app',
    password: 'PayMatrixReview2026!',
    displayName: 'Google Reviewer',
    emailVerified: true,
    purpose: 'Dedicated Google Play Console App Access Reviewer Account',
  },
  {
    email: 'tester1@paymatrix.app',
    password: 'PayMatrixTest2026!',
    displayName: 'Test User One',
    emailVerified: true,
    purpose: 'Primary QA & Development Test Account (Verified)',
  },
  {
    email: 'tester2@paymatrix.app',
    password: 'PayMatrixTest2026!',
    displayName: 'Test User Two',
    emailVerified: true,
    purpose: 'Secondary QA Test Account for Groups & Splits (Verified)',
  },
  {
    email: 'unverified.tester@paymatrix.app',
    password: 'PayMatrixTest2026!',
    displayName: 'Unverified Tester',
    emailVerified: false,
    purpose: 'QA Test Account for Email Verification Screen & Resend Flow',
  },
];

async function main() {
  console.log(`Initialising Firebase Admin for project: ${PROJECT_ID}...`);
  initAdmin();

  console.log(`\nCreating/Updating ${DEFAULT_ACCOUNTS.length} test accounts...\n`);

  const results = [];
  for (const acc of DEFAULT_ACCOUNTS) {
    process.stdout.write(`Processing ${acc.email}... `);
    try {
      const res = await createOrUpdateUser(acc);
      console.log(`[${res.action}] UID: ${res.uid} | SignIn: ${res.signInStatus}`);
      results.push({
        ...acc,
        uid: res.uid,
        action: res.action,
        signInStatus: res.signInStatus,
      });
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
      results.push({
        ...acc,
        error: err.message,
      });
    }
  }

  console.log('\n============================================================');
  console.log('SUMMARY OF TEST ACCOUNTS');
  console.log('============================================================\n');
  for (const r of results) {
    console.log(`Email:          ${r.email}`);
    console.log(`Password:       ${r.password}`);
    console.log(`Display Name:   ${r.displayName}`);
    console.log(`Email Verified: ${r.emailVerified}`);
    console.log(`UID:            ${r.uid || 'N/A'}`);
    console.log(`Purpose:        ${r.purpose}`);
    console.log(`Sign-In Test:   ${r.signInStatus || r.error}`);
    console.log('------------------------------------------------------------');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
