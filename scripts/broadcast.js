const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

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
        message: "App Update: The Scan Bill OCR feature is now live and fully functional! Try uploading a receipt for instant, smart expense splits.",
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
