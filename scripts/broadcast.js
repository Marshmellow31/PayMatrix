const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error("ERROR: Missing 'serviceAccountKey.json' in the scripts directory.");
  console.error("Please download it from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key.");
  console.error("Save it as 'scripts/serviceAccountKey.json' and run this script again.");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function broadcastUpdate() {
  try {
    console.log('Fetching users...');
    const usersSnap = await db.collection('users').get();
    console.log(`Found ${usersSnap.size} users. Processing...`);

    const batch = db.batch();
    const timestamp = new Date().toISOString();

    usersSnap.forEach(doc => {
      const newNotificationRef = db.collection('notifications').doc();
      batch.set(newNotificationRef, {
        to: doc.id,
        message: "App Update! Version 1.1.0 is here with mobile optimizations, an improved Profile UI, and more. Check the Changelog!",
        type: 'info',
        read: false,
        createdAt: timestamp
      });
    });

    console.log('Committing notifications...');
    await batch.commit();
    console.log('Successfully sent notification to all users!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to broadcast notification:', error);
    process.exit(1);
  }
}

broadcastUpdate();
