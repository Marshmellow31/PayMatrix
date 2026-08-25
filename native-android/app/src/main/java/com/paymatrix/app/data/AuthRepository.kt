package com.paymatrix.app.data

import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

class AuthRepository(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
) {
    val currentUser get() = auth.currentUser

    suspend fun signInWithGoogle(context: Context, webClientId: String): UserProfile {
        val option = GetSignInWithGoogleOption.Builder(webClientId).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        val response = CredentialManager.create(context).getCredential(context, request)
        val custom = response.credential as? CustomCredential
            ?: error("Google did not return an identity credential.")
        require(custom.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            "Unexpected credential type."
        }
        val google = GoogleIdTokenCredential.createFrom(custom.data)
        val result = auth.signInWithCredential(GoogleAuthProvider.getCredential(google.idToken, null)).await()
        val firebaseUser = result.user ?: error("Firebase authentication did not return a user.")
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
        db.collection("publicProfiles").document(firebaseUser.uid).set(
            mapOf("name" to (firebaseUser.displayName ?: "Member"), "avatar" to (firebaseUser.photoUrl?.toString() ?: ""), "updatedAt" to now),
            com.google.firebase.firestore.SetOptions.merge(),
        ).await()
        return profile(firebaseUser.uid)
    }

    suspend fun profile(uid: String = currentUser?.uid ?: error("Authentication required")): UserProfile {
        val doc = db.collection("users").document(uid).get().await()
        val authUser = if (uid == currentUser?.uid) currentUser else null
        return UserProfile(
            uid = uid,
            name = doc.getString("name") ?: doc.getString("displayName") ?: authUser?.displayName ?: "Member",
            email = doc.getString("email") ?: authUser?.email.orEmpty(),
            avatar = doc.getString("avatar") ?: doc.getString("photoURL") ?: authUser?.photoUrl?.toString().orEmpty(),
            upiId = doc.getString("upiId").orEmpty(),
            phone = doc.getString("phone").orEmpty(),
            friends = (doc.get("friends") as? List<*>)?.mapNotNull { it as? String }.orEmpty(),
        )
    }

    suspend fun updateProfile(name: String, upiId: String, phone: String) {
        val user = currentUser ?: error("Authentication required")
        require(name.trim().isNotEmpty() && name.length <= 50) { "Name must be 1–50 characters." }
        require(upiId.isBlank() || Regex("^[\\w.-]+@[\\w.-]+$", RegexOption.IGNORE_CASE).matches(upiId)) { "Enter a valid UPI ID." }
        val payload = mapOf("name" to name.trim(), "displayName" to name.trim(), "nameLowerCase" to name.trim().lowercase(), "upiId" to upiId.trim(), "phone" to phone.trim(), "updatedAt" to java.time.Instant.now().toString())
        db.collection("users").document(user.uid).update(payload).await()
        db.collection("publicProfiles").document(user.uid).set(mapOf("name" to name.trim(), "updatedAt" to java.time.Instant.now().toString()), com.google.firebase.firestore.SetOptions.merge()).await()
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

    private fun installationId(context: Context): String {
        val prefs = context.getSharedPreferences("paymatrix_native", Context.MODE_PRIVATE)
        return prefs.getString("installation_id", null) ?: java.util.UUID.randomUUID().toString().also {
            prefs.edit().putString("installation_id", it).apply()
        }
    }
}
