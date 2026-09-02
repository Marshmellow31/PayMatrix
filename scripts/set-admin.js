const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const projectId = process.env.FIREBASE_PROJECT_ID || 'paymatrix-174b5';
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.SERVICE_ACCOUNT_KEY_PATH;

if (keyPath && fs.existsSync(keyPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(require(path.resolve(keyPath))),
    projectId,
  });
} else {
  // Use Application Default Credentials (gcloud auth application-default login)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

// Usage: node set-admin.js <email>
const email = process.argv[2];

if (!email) {
  console.error('Usage: node set-admin.js <email>');
  process.exit(1);
}

async function setAdmin() {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.displayName || '(no name)'} (UID: ${user.uid})`);

    // The `admin` custom claim is the ONLY thing that grants admin access —
    // Firestore rules and every admin Cloud Function verify it server-side.
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Successfully set admin custom claim for ${email}.`);
    console.log('The user must sign out and back in (or refresh their ID token) for it to take effect.');

    process.exit(0);
  } catch (error) {
    console.error('Error setting admin claim:', error);
    process.exit(1);
  }
}

setAdmin();
