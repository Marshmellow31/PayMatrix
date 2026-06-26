# Firebase Console Changes Required

These are the manual steps you need to perform in the Firebase Console
at https://console.firebase.google.com — no CLI or code changes needed.

---

## 1. Deploy updated Firestore Security Rules  ⚠️ CRITICAL

The new `firestore.rules` file has 5 security fixes. You need to deploy it.

**Steps:**
1. Open Firebase Console → **Firestore Database** → **Rules** tab
2. Delete all existing content in the editor
3. Copy the entire contents of `firestore.rules` from the repo and paste it in
4. Click **Publish**

**What changes:**
- Admin check no longer allows a hardcoded UID bypass
- User profiles are no longer globally readable by all signed-in users
- Payers can no longer hard-delete their own settlements
- Notifications can only be created targeting yourself (cross-user ones go through Cloud Function)
- Users can no longer reset their own rate-limit counters

---

## 2. Deploy updated Cloud Functions  ⚠️ CRITICAL

Two new Cloud Functions were added (`scanBillWithGemini`, `createCrossUserNotification`) and the existing ones were updated.

Since you can't use the CLI, you have two options:

**Option A — Vercel/GitHub auto-deploy (if you have it set up):**
Push the updated `functions/index.js` to your main branch. If you have Firebase auto-deploy set up via GitHub Actions, it will deploy automatically.

**Option B — Firebase Console inline editor:**
1. Open Firebase Console → **Functions**
2. Click on each existing function → **Edit** (if the console supports it)

> **Recommended:** Set up the GitHub Actions CI (`.github/workflows/ci.yml` is already created) and add a Firebase deploy step, or use Firebase CLI from your local machine just once:
> ```
> npm install -g firebase-tools
> firebase login
> firebase deploy --only functions
> ```

---

## 3. Set the Gemini API key as a Cloud Functions environment variable  ⚠️ REQUIRED for bill scanning

The Gemini API key has been moved from the browser bundle to the server. You need to set it as an environment variable for the Cloud Functions.

**Steps:**
1. Open Firebase Console → **Functions** → **Configuration** tab  
   (URL: https://console.firebase.google.com/project/paymatrix-174b5/functions/list → scroll to Environment Variables)
2. Click **Add variable** (or **Edit** if variables already exist)
3. Add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** The value of `VITE_GEMINI_API_KEY` from your `frontend/.env` file
4. Click **Save** and then **Redeploy** all functions

> Your `.env` stays exactly as-is. The `VITE_GEMINI_API_KEY` variable in `.env` is no longer used by the browser — it's now read by the Cloud Function from this server-side config.

---

## 4. Grant yourself Admin Custom Claims  ⚠️ REQUIRED (one-time, do this last)

After deploying the new Firestore rules, the hardcoded UID bypass no longer exists. You must grant yourself admin status via Custom Claims.

**Steps (do this AFTER deploying the new rules):**
1. Open your live app at **pay-matrix.vercel.app**
2. Log in with your account
3. Navigate to **/admin** — you'll see the password form
4. Enter your admin password (the value of `VITE_ADMIN_PASSWORD`)
5. In the Admin Panel, go to **Users**
6. Find your account in the list
7. Click **Grant Admin Claims**
8. **Sign out** from PayMatrix
9. **Sign back in** — your account now has permanent admin access via Custom Claims

> After this, every future login will detect the Custom Claim automatically, and the password form will be skipped.

---

## 5. Rotate the committed service account key  🔴 SECURITY — Do this ASAP

The file `scripts/serviceAccountKey.json` contains a Firebase Admin SDK private key that was committed to git. This is a critical security issue.

**Steps:**
1. Open Firebase Console → **Project Settings** (gear icon) → **Service Accounts** tab
2. You'll see the existing service account. Click **Generate new private key** → Save it **securely** (do NOT commit it)
3. In the same list, find the old key (matching `private_key_id: 88a4a7ce10ba649815117c3acffe59c7bbbb699c`) and **Delete** it
4. On your local machine:
   - Delete `scripts/serviceAccountKey.json`
   - Add `scripts/serviceAccountKey.json` to `.gitignore`
   - Commit: `git rm scripts/serviceAccountKey.json && git commit -m "security: remove committed service account key"`
5. If this repo has ever been pushed to a public GitHub repository, treat the old key as compromised and consider rotating all Firebase project credentials.

---

## 6. Verify Firestore Indexes exist (if queries fail after deploy)

If you see "The query requires an index" errors after deploying new rules, create these indexes in:

Firebase Console → **Firestore** → **Indexes** → **Composite** → **Add index**

| Collection | Fields | Notes |
|-----------|--------|-------|
| `groups/{id}/logs` | `createdAt` DESC | Activity feed |
| `notifications` | `to` ASC, `read` ASC | Unread notification query |

---

## Summary checklist

- [ ] Deploy new Firestore Security Rules (step 1)
- [ ] Deploy updated Cloud Functions (step 2)
- [ ] Set `GEMINI_API_KEY` in Functions configuration (step 3)
- [ ] Grant yourself Admin Custom Claims via the app (step 4)
- [ ] Rotate the committed service account key (step 5)
- [ ] Check for missing Firestore indexes if needed (step 6)
