const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = '1080patelharshil@gmail.com';

async function setAdmin() {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.displayName} (UID: ${user.uid})`);
    
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Successfully set admin Custom Claim for ${email}!`);
    
    // Also update the Firestore user document to show isAdmin: true
    const db = admin.firestore();
    await db.collection('users').doc(user.uid).update({ isAdmin: true });
    console.log(`Successfully updated Firestore user document to isAdmin: true!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting admin claim:', error);
    process.exit(1);
  }
}

setAdmin();
