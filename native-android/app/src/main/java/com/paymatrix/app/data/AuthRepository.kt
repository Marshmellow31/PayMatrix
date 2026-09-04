package com.paymatrix.app.data

import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import java.time.Instant

class AuthRepository(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
) {
    val currentUser get() = auth.currentUser

    suspend fun signInWithGoogle(context: Context, webClientId: String): UserProfile {
        val credential = googleCredential(context, webClientId)
        val result = auth.signInWithCredential(credential).await()
        return completeSignIn(result.user ?: error("Firebase authentication did not return a user."), isGoogle = true)
    }

    suspend fun createEmailAccount(name: String, email: String, password: String): String {
        val cleanName = name.trim()
        require(cleanName.isNotEmpty() && cleanName.length <= 50) { "Name must be 1–50 characters." }
        require(password.length >= 8) { "Password must be at least 8 characters." }
        val result = auth.createUserWithEmailAndPassword(email.trim().lowercase(), password).await()
        val user = result.user ?: error("Firebase authentication did not return a user.")
        user.updateProfile(com.google.firebase.auth.UserProfileChangeRequest.Builder().setDisplayName(cleanName).build()).await()
        user.sendEmailVerification().await()
        return user.email.orEmpty()
    }

    suspend fun signInWithEmail(email: String, password: String): UserProfile? {
        val result = auth.signInWithEmailAndPassword(email.trim().lowercase(), password).await()
        val user = result.user ?: error("Firebase authentication did not return a user.")
        user.reload().await()
        val refreshed = auth.currentUser ?: error("Authentication session expired.")
        return if (needsEmailVerification(refreshed)) null else completeSignIn(refreshed)
    }

    suspend fun currentVerifiedProfile(): UserProfile? {
        val user = currentUser ?: return null
        // Firebase persists the verified flag with the local auth session. Avoid a
        // network reload here so an already verified member can still open the app
        // offline; the explicit verification action below performs the fresh check.
        return if (needsEmailVerification(user)) null else profile(user.uid)
    }

    suspend fun refreshEmailVerification(): UserProfile? {
        val user = currentUser ?: error("Sign in with your email and password first.")
        user.reload().await()
        val refreshed = currentUser ?: error("Authentication session expired.")
        return if (needsEmailVerification(refreshed)) null else completeSignIn(refreshed)
    }

    suspend fun resendEmailVerification(): String {
        val user = currentUser ?: error("Sign in with your email and password first.")
        require(needsEmailVerification(user)) { "This email is already verified." }
        user.sendEmailVerification().await()
        return user.email.orEmpty()
    }

    suspend fun sendPasswordReset(email: String) {
        require(email.isNotBlank()) { "Enter your email address first." }
        auth.sendPasswordResetEmail(email.trim().lowercase()).await()
    }

    fun pendingVerificationEmail(): String = currentUser?.takeIf(::needsEmailVerification)?.email.orEmpty()

    fun usesPasswordProvider(): Boolean = currentUser?.providerData?.any { it.providerId == EmailAuthProvider.PROVIDER_ID } == true

    suspend fun linkEmailPassword(password: String) {
        val user = currentUser ?: error("Sign in before adding an email password.")
        require(!usesPasswordProvider()) { "Email password is already enabled for this account." }
        require(password.length >= 8) { "Password must be at least 8 characters." }
        val email = user.email ?: error("This account does not have an email address.")
        user.linkWithCredential(EmailAuthProvider.getCredential(email, password)).await()
    }

    private fun needsEmailVerification(user: FirebaseUser): Boolean {
        // Google accounts are authenticated directly by Google and do not require separate email verification.
        if (user.providerData.any { it.providerId == GoogleAuthProvider.PROVIDER_ID }) return false
        return user.providerData.any { it.providerId == EmailAuthProvider.PROVIDER_ID } && !user.isEmailVerified
    }

    private suspend fun completeSignIn(firebaseUser: FirebaseUser, isGoogle: Boolean = false): UserProfile {
        if (!isGoogle) {
            require(!needsEmailVerification(firebaseUser)) { "Verify your email before opening shared data." }
        }
        firebaseUser.getIdToken(true).await()
        val userRef = db.collection("users").document(firebaseUser.uid)
        val existing = userRef.get().await()
        val now = java.time.Instant.now().toString()
        val base = mutableMapOf<String, Any>(
            "uid" to firebaseUser.uid,
            "_id" to firebaseUser.uid,
            "email" to (firebaseUser.email ?: ""),
            "name" to (firebaseUser.displayName ?: "Member"),
            "displayName" to (firebaseUser.displayName ?: ""),
            "nameLowerCase" to (firebaseUser.displayName ?: "Member").lowercase(),
            "avatar" to (firebaseUser.photoUrl?.toString() ?: ""),
            "photoURL" to (firebaseUser.photoUrl?.toString() ?: ""),
            "updatedAt" to now,
        )
        if (!existing.exists()) {
            base["friends"] = emptyList<String>()
            base["createdAt"] = now
        }
        userRef.set(base, com.google.firebase.firestore.SetOptions.merge()).await()
        runCatching {
            val publicData = mapOf(
                "name" to (firebaseUser.displayName?.ifBlank { null } ?: existing.getString("name")?.ifBlank { null } ?: "Member"),
                "avatar" to allowedAvatar(firebaseUser.photoUrl?.toString(), existing.getString("avatar")),
                "updatedAt" to now
            )
            db.collection("publicProfiles").document(firebaseUser.uid).set(publicData).await()
        }.onFailure { e ->
            android.util.Log.w("AuthRepository", "Public profile sync skipped: ${e.message}")
        }
        runCatching { ensureFriendCode(firebaseUser) }.onFailure { e ->
            android.util.Log.w("AuthRepository", "Friend code sync skipped: ${e.message}")
        }
        return profile(firebaseUser.uid)
    }

    suspend fun profile(uid: String = currentUser?.uid ?: error("Authentication required")): UserProfile {
        val doc = db.collection("users").document(uid).get().await()
        val authUser = if (uid == currentUser?.uid) currentUser else null
        return UserProfile(
            uid = uid,
            name = doc.getString("name") ?: doc.getString("displayName") ?: authUser?.displayName ?: "Member",
            email = doc.getString("email") ?: authUser?.email.orEmpty(),
            avatar = allowedAvatar(doc.getString("avatar"), doc.getString("photoURL"), authUser?.photoUrl?.toString()),
            upiId = doc.getString("upiId").orEmpty(),
            phone = doc.getString("phone").orEmpty(),
            friends = (doc.get("friends") as? List<*>)?.mapNotNull { it as? String }.orEmpty(),
            friendCode = doc.getString("friendCode").orEmpty(),
            createdAt = when (val value = doc.get("createdAt")) {
                is String -> value
                is com.google.firebase.Timestamp -> value.toDate().toInstant().toString()
                else -> ""
            },
        )
    }

    suspend fun updateProfile(name: String, upiId: String, phone: String) {
        val user = currentUser ?: error("Authentication required")
        require(name.trim().isNotEmpty() && name.length <= 50) { "Name must be 1–50 characters." }
        require(upiId.isBlank() || Regex("^[\\w.-]+@[\\w.-]+$", RegexOption.IGNORE_CASE).matches(upiId)) { "Enter a valid UPI ID." }
        val payload = mapOf("name" to name.trim(), "displayName" to name.trim(), "nameLowerCase" to name.trim().lowercase(), "upiId" to upiId.trim(), "phone" to phone.trim(), "updatedAt" to java.time.Instant.now().toString())
        db.collection("users").document(user.uid).update(payload).await()
        runCatching {
            db.collection("publicProfiles").document(user.uid).update(mapOf("name" to name.trim(), "updatedAt" to java.time.Instant.now().toString())).await()
        }
        user.updateProfile(com.google.firebase.auth.UserProfileChangeRequest.Builder().setDisplayName(name.trim()).build()).await()
    }

    suspend fun signOut(context: Context) {
        val uid = currentUser?.uid
        if (uid != null) runCatching {
            db.collection("users").document(uid).collection("pushTokens").document(installationId(context)).delete().await()
        }
        auth.signOut()
        runCatching { CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest()) }
    }

    suspend fun savePushToken(context: Context, token: String) {
        val uid = currentUser?.uid ?: return
        db.collection("users").document(uid).collection("pushTokens").document(installationId(context)).set(
            mapOf("token" to token, "platform" to "android", "updatedAt" to FieldValue.serverTimestamp()),
        ).await()
    }

    suspend fun deleteAccount(context: Context, webClientId: String, password: String = "") {
        val user = currentUser ?: error("Sign in before deleting your account.")
        if (usesPasswordProvider()) {
            require(password.isNotBlank()) { "Enter your current password to delete this account." }
            user.reauthenticate(EmailAuthProvider.getCredential(user.email.orEmpty(), password)).await()
        } else {
            user.reauthenticate(googleCredential(context, webClientId)).await()
        }
        runCatching { db.collection("users").document(user.uid).collection("pushTokens").document(installationId(context)).delete().await() }
        val userRef = db.collection("users").document(user.uid)
        val profile = userRef.get().await()
        val deletionRef = db.collection("accountDeletionRequests").document(user.uid)
        if (!deletionRef.get().await().exists()) {
            val stamp = FieldValue.serverTimestamp()
            db.runBatch { batch ->
                batch.set(userRef, mapOf("uid" to user.uid, "name" to "Deleted user", "displayName" to "Deleted user", "nameLowerCase" to "deleted user", "avatar" to "", "photoURL" to "", "friends" to emptyList<String>(), "deletedAt" to stamp, "deletionStatus" to "anonymized"))
                batch.set(db.collection("publicProfiles").document(user.uid), mapOf("name" to "Deleted user", "avatar" to "", "updatedAt" to stamp, "deleted" to true))
                batch.set(deletionRef, mapOf("uidHashVersion" to 1, "status" to "anonymized", "requestedAt" to stamp, "deleteAfter" to com.google.firebase.Timestamp(java.util.Date.from(Instant.now().plusSeconds(30L * 24L * 60L * 60L)))))
                profile.getString("friendCode")?.takeIf { it.isNotBlank() }?.let { batch.delete(db.collection("friendCodes").document(it)) }
            }.await()
        }
        user.delete().await()
        runCatching { CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest()) }
    }

    private suspend fun googleCredential(context: Context, webClientId: String): com.google.firebase.auth.AuthCredential {
        val credentialManager = CredentialManager.create(context)
        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(webClientId)
            .setAutoSelectEnabled(false)
            .build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        val response = try {
            credentialManager.getCredential(context, request)
        } catch (cancellation: androidx.credentials.exceptions.GetCredentialCancellationException) {
            val msg = cancellation.message.orEmpty()
            if (msg.contains("reauth", ignoreCase = true) || msg.contains("16")) {
                runCatching { credentialManager.clearCredentialState(ClearCredentialStateRequest()) }
                val retryOption = GetSignInWithGoogleOption.Builder(webClientId).build()
                val retryRequest = GetCredentialRequest.Builder().addCredentialOption(retryOption).build()
                credentialManager.getCredential(context, retryRequest)
            } else {
                throw cancellation
            }
        } catch (e: Exception) {
            runCatching { credentialManager.clearCredentialState(ClearCredentialStateRequest()) }
            val fallbackOption = GetSignInWithGoogleOption.Builder(webClientId).build()
            val fallbackRequest = GetCredentialRequest.Builder().addCredentialOption(fallbackOption).build()
            credentialManager.getCredential(context, fallbackRequest)
        }

        val custom = response.credential as? CustomCredential ?: error("Google did not return an identity credential.")
        val idToken = when (custom.type) {
            GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL,
            GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_SIWG_CREDENTIAL -> {
                GoogleIdTokenCredential.createFrom(custom.data).idToken
            }
            else -> {
                runCatching { GoogleIdTokenCredential.createFrom(custom.data).idToken }
                    .getOrNull() ?: error("Unexpected credential type: ${custom.type}")
            }
        }
        return GoogleAuthProvider.getCredential(idToken, null)
    }

    private suspend fun ensureFriendCode(user: FirebaseUser) {
        val userRef = db.collection("users").document(user.uid)
        val existing = userRef.get().await().getString("friendCode")
        if (!existing.isNullOrBlank()) return
        val alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        repeat(12) {
            val code = (1..8).map { alphabet.random() }.joinToString("")
            val codeRef = db.collection("friendCodes").document(code)
            if (!codeRef.get().await().exists()) {
                val stamp = Instant.now().toString()
                db.runBatch { batch ->
                    batch.set(codeRef, mapOf("uid" to user.uid, "name" to (user.displayName ?: "Member").take(50), "avatar" to (user.photoUrl?.toString() ?: ""), "createdAt" to stamp))
                    batch.update(userRef, "friendCode", code)
                }.await()
                return
            }
        }
        error("Could not allocate a friend code. Try again.")
    }

    private fun installationId(context: Context): String {
        val prefs = context.getSharedPreferences("paymatrix_native", Context.MODE_PRIVATE)
        return prefs.getString("installation_id", null) ?: java.util.UUID.randomUUID().toString().also {
            prefs.edit().putString("installation_id", it).apply()
        }
    }

    private fun allowedAvatar(vararg values: String?): String = values.firstOrNull { value ->
        value?.startsWith("https://lh3.googleusercontent.com/") == true || value?.startsWith("https://firebasestorage.googleapis.com/") == true
    }.orEmpty()
}
