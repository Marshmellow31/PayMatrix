package com.paymatrix.app.data

import com.google.firebase.firestore.AggregateSource
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await

class AdminRepository(
    private val db: FirebaseFirestore,
    private val functions: FirebaseFunctions,
    private val auth: AuthRepository,
) {
    private suspend fun requireAdmin() { require(auth.isAdmin()) { "Firebase admin claim required." } }

    suspend fun stats(): AdminStats = coroutineScope {
        requireAdmin()
        val refs = listOf("users", "groups", "notifications", "security_logs", "ai_requests").map { name -> async { db.collection(name).count().get(AggregateSource.SERVER).await().count } }
        val values = refs.awaitAll()
        val active = db.collection("groups").whereEqualTo("status", "active").count().get(AggregateSource.SERVER).await().count
        AdminStats(values[0], values[1], active, values[2], values[3], values[4])
    }

    suspend fun users(): List<AdminUser> {
        requireAdmin()
        return db.collection("users").orderBy("createdAt", Query.Direction.DESCENDING).limit(100).get().await().documents.map {
            AdminUser(it.id, it.getString("name") ?: it.getString("displayName") ?: "Member", it.getString("email").orEmpty(), timestamp(it.get("createdAt")), it.getBoolean("disabled") ?: false, it.getBoolean("isAdmin") ?: false)
        }
    }

    suspend fun groups(): List<AdminGroup> {
        requireAdmin()
        return db.collection("groups").orderBy("createdAt", Query.Direction.DESCENDING).limit(100).get().await().documents.map {
            AdminGroup(it.id, it.getString("name") ?: it.getString("title") ?: "Untitled", (it.get("members") as? List<*>)?.size ?: 0, it.getString("status") ?: "active", timestamp(it.get("createdAt")))
        }
    }

    suspend fun notificationHistory(): List<AdminRecord> {
        requireAdmin()
        return records("admin_notifications", "title", "body", "status", "createdAt")
    }

    suspend fun securityLogs(): List<AdminRecord> {
        requireAdmin()
        return records("security_logs", "event", "message", "severity", "timestamp")
    }

    suspend fun aiRequests(): List<AdminRecord> {
        requireAdmin()
        return records("ai_requests", "model", "error", "status", "timestamp", "duration")
    }

    suspend fun setFeatureFlag(key: String, value: Boolean) {
        requireAdmin()
        require(key in setOf("billScanning", "analytics", "settlements", "logs", "maintenanceMode"))
        db.collection("config").document("featureFlags").set(mapOf(key to value, "updatedAt" to java.time.Instant.now().toString()), com.google.firebase.firestore.SetOptions.merge()).await()
    }

    suspend fun manageUser(uid: String, action: String) {
        requireAdmin()
        require(action in setOf("disable", "enable", "clearFcm", "grantAdmin", "revokeAdmin"))
        functions.getHttpsCallable("adminManageUser").call(mapOf("uid" to uid, "action" to action)).await()
    }

    suspend fun manageGroup(groupId: String, delete: Boolean) {
        requireAdmin()
        functions.getHttpsCallable(if (delete) "adminDeleteGroup" else "adminArchiveGroup").call(mapOf("groupId" to groupId)).await()
    }

    suspend fun broadcast(title: String, body: String, url: String, targetUid: String) {
        requireAdmin(); require(title.isNotBlank() && body.isNotBlank()) { "Title and body are required." }
        functions.getHttpsCallable("broadcastNotification").call(mapOf("title" to title.take(100), "body" to body.take(500), "url" to url.take(300), "targetUid" to targetUid.trim())).await()
    }

    private suspend fun records(collection: String, titleField: String, bodyField: String, statusField: String, timeField: String, detailField: String? = null): List<AdminRecord> = db.collection(collection).orderBy(timeField, Query.Direction.DESCENDING).limit(100).get().await().documents.map {
        AdminRecord(it.id, it.getString(titleField) ?: titleField.replaceFirstChar(Char::uppercase), it.getString(bodyField).orEmpty(), it.getString(statusField).orEmpty(), timestamp(it.get(timeField)), detailField?.let { field -> it.get(field)?.toString() }.orEmpty())
    }

    private fun timestamp(value: Any?): String = when (value) { is String -> value; is com.google.firebase.Timestamp -> value.toDate().toInstant().toString(); else -> "" }
}
