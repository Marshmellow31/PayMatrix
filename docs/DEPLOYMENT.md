# Deployment Guide

PayMatrix frontend is deployed on Vercel; Cloud Functions on Firebase.

## Frontend (Vercel)

The app is live at **pay-matrix.vercel.app**.

Vercel reads environment variables from the project settings. These must match `frontend/.env` exactly:

| Variable | Where to set |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Vercel → Project → Settings → Environment Variables |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same |
| `VITE_FIREBASE_PROJECT_ID` | Same |
| `VITE_FIREBASE_STORAGE_BUCKET` | Same |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `VITE_FIREBASE_APP_ID` | Same |
| `VITE_FIREBASE_MEASUREMENT_ID` | Same |
| `VITE_GEMINI_API_KEY` | **Leave set for backward compat but it is no longer read** |
| `VITE_ADMIN_PASSWORD` | Vercel (keep secret) |

Deployments trigger automatically on push to `main`.

## Cloud Functions

### First-time deploy

```bash
npm install -g firebase-tools
firebase login
firebase use paymatrix-174b5
cd functions && npm install
firebase deploy --only functions
```

### Setting the Gemini API key (required for bill scanning)

In Firebase Console → Functions → Configuration, add:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | The value of `VITE_GEMINI_API_KEY` from `frontend/.env` |

Or via CLI:
```bash
firebase functions:secrets:set GEMINI_API_KEY
# When prompted, paste the key value
```

Then redeploy functions:
```bash
firebase deploy --only functions
```

### Updating Firestore rules

```bash
firebase deploy --only firestore:rules
```

This deploys `firestore.rules` from the repo root. Always run:
```bash
firebase emulators:start --only firestore
```
and verify rules locally before deploying.

## Firestore Indexes

Firestore will prompt for missing indexes via error messages in the console. Create them in Firebase Console → Firestore → Indexes. Common ones needed:

| Collection | Fields | Order |
|-----------|--------|-------|
| `groups/{id}/expenses` | `createdAt` | DESC |
| `groups/{id}/logs` | `createdAt` | DESC |
| `users` | `createdAt` | ASC |
| `notifications` | `to` ASC, `read` ASC | — |

## Rollback

**Frontend:** In Vercel dashboard → Deployments → click any previous deployment → Promote to Production.

**Cloud Functions:** Re-deploy the previous `functions/index.js` commit.

**Firestore rules:** Re-deploy the previous `firestore.rules` commit via `firebase deploy --only firestore:rules`.
