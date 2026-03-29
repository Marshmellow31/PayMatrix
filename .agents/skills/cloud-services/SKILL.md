---
name: Cloud Integrations & Services
description: Cloudinary, Firebase, and Nodemailer integration skills
---

# Cloud Integrations & Services Skill

## Requirements based on README
- **Cloudinary**: Image/Receipt Storage.
- **Firebase**: Push Notifications (FCM).
- **Nodemailer**: Email Notifications.

## Configuration & Usage Rules
- `backend/config/cloudinary.js` contains the Cloudinary storage setup.
- Used in `backend/controllers/expenseController.js` for receipts and avatars.
- Firebase FCM tokens should be stored within User documents for PWA push notification support.
- FCM logic is handled internally or via the Notification endpoint.
- Nodemailer is utilized in `backend/services/emailService.js` to dispatch digests or pending bills.
