const admin = require('firebase-admin');
try {
  admin.initializeApp();
  console.log('Firebase admin initialized successfully!');
} catch (e) {
  console.error('Failed to initialize admin:', e);
}
