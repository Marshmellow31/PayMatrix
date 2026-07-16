const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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
