package com.paymatrix.app.data

import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.paymatrix.app.domain.BalanceEngine
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import java.time.Instant
import java.util.UUID

class FirebaseRepository(
    private val db: FirebaseFirestore,
    private val auth: AuthRepository,
) {
    private val uid get() = auth.currentUser?.uid ?: error("Authentication required")
    private fun now() = Instant.now().toString()

    suspend fun groups(): List<Group> = db.collection("groups")
        .whereArrayContains("members", uid).get().await().documents.map(::groupFrom)
        .filter { it.status != "deleted" }.sortedByDescending { it.createdAt }

    suspend fun createGroup(name: String, description: String, category: String): String {
        require(name.trim().isNotEmpty() && name.length <= 100) { "Group name is required and must be at most 100 characters." }
        val ref = db.collection("groups").document()
        val code = randomInviteCode()
        val data = mapOf(
            "name" to name.trim(), "title" to name.trim(), "description" to description.trim().take(500),
            "category" to category.take(50), "members" to listOf(uid), "historicalMembers" to listOf(uid),
            "admin" to uid, "createdBy" to uid, "status" to "active", "inviteCode" to code,
            "createdAt" to now(), "updatedAt" to now(),
        )
        db.runBatch { batch ->
            batch.set(ref, data)
            batch.set(db.collection("groupInvites").document(code), mapOf("groupId" to ref.id, "createdBy" to uid, "active" to true, "createdAt" to now()))
        }.await()
        return ref.id
    }

    suspend fun joinGroup(code: String): String {
        val normalized = code.trim().uppercase()
        val invite = db.collection("groupInvites").document(normalized).get().await()
        require(invite.exists() && invite.getBoolean("active") == true) { "Invalid or expired invite code." }
        val groupId = invite.getString("groupId") ?: error("Invite has no group.")
        db.collection("groups").document(groupId).update(
            mapOf("members" to FieldValue.arrayUnion(uid), "historicalMembers" to FieldValue.arrayUnion(uid), "updatedAt" to now()),
        ).await()
        return groupId
    }

    suspend fun groupSnapshot(groupId: String): GroupSnapshot = coroutineScope {
        val groupDoc = async { db.collection("groups").document(groupId).get().await() }
        val expenses = async { db.collection("groups").document(groupId).collection("expenses").orderBy("createdAt", Query.Direction.DESCENDING).get().await().documents.map { expenseFrom(it, groupId) } }
        val settlements = async { db.collection("groups").document(groupId).collection("settlements").orderBy("createdAt", Query.Direction.DESCENDING).get().await().documents.map { settlementFrom(it, groupId) } }
        val group = groupFrom(groupDoc.await())
        val profiles = group.members.map { member -> async { member to publicProfile(member) } }.awaitAll().toMap()
        val expenseList = expenses.await()
        val settlementList = settlements.await()
        val balances = BalanceEngine.computeBalances(expenseList, settlementList, group.members)
        GroupSnapshot(group, profiles, expenseList, settlementList, balances, BalanceEngine.simplify(balances))
    }

    suspend fun addExpense(
        groupId: String,
        title: String,
        amountText: String,
        category: String,
        notes: String,
        participants: List<String>,
        splitType: String = "equal",
        splitValues: Map<String, Double> = emptyMap(),
    ): String {
        val totalPaise = com.paymatrix.app.domain.Money.toPaise(amountText)
        require(totalPaise in 1..100_000_000) { "Amount must be between ₹0.01 and ₹10,00,000." }
        require(title.trim().isNotEmpty() && title.length <= 100) { "Title is required." }
        require(participants.isNotEmpty()) { "Choose at least one participant." }
        val splits = BalanceEngine.calculateSplits(totalPaise, splitType, splitValues, participants)
        val expenseRef = db.collection("groups").document(groupId).collection("expenses").document()
        val logRef = db.collection("groups").document(groupId).collection("logs").document()
        val actor = publicProfile(uid).name
        val stamp = FieldValue.serverTimestamp()
        val payload = mapOf(
            "title" to title.trim(), "description" to "", "amount" to totalPaise / 100.0,
            "amountPaise" to totalPaise, "currency" to "INR", "date" to now(), "paidBy" to uid,
            "paidByName" to actor, "createdBy" to uid, "admin" to uid, "splitType" to splitType,
            "splitData" to splitValues, "participants" to participants, "splitUserIds" to splits.map { it.user },
            "splits" to splits.map { mapOf("user" to it.user, "amount" to it.amount, "amountPaise" to it.amountPaise) },
            "category" to category.take(50), "attachments" to emptyList<String>(), "notes" to notes.take(500),
            "groupId" to groupId, "status" to "active", "createdAt" to now(), "updatedAt" to now(),
            "lastMutationAt" to stamp, "lastMutationId" to logRef.id, "lastMutationType" to "expense_added",
            "lastEditedBy" to uid, "version" to 1,
        )
        db.runBatch { batch ->
            batch.set(expenseRef, payload)
            batch.set(logRef, audit("expense_added", "$actor added \"${title.trim()}\" (${com.paymatrix.app.domain.Money.format(totalPaise)})", expenseRef.id, groupId, actor, stamp))
        }.await()
        return expenseRef.id
    }

    suspend fun archiveExpense(groupId: String, expense: Expense) {
        mutateFinancial(groupId, "expenses", expense.id, "expense_deleted", "Deleted ${expense.title}")
    }

    suspend fun settle(groupId: String, payee: String, amountText: String, note: String): String {
        require(payee.isNotBlank() && payee != uid) { "Choose another group member." }
        val amountPaise = com.paymatrix.app.domain.Money.toPaise(amountText)
        require(amountPaise in 1..100_000_000) { "Enter a valid settlement amount." }
        db.collection("groups").document(groupId).get(com.google.firebase.firestore.Source.SERVER).await()
        val operationId = "native_${UUID.randomUUID()}".replace("-", "_")
        val settlementRef = db.collection("groups").document(groupId).collection("settlements").document(operationId)
        val logRef = db.collection("groups").document(groupId).collection("logs").document()
        val actor = publicProfile(uid).name
        val payeeName = publicProfile(payee).name
        val stamp = FieldValue.serverTimestamp()
        val data = mapOf(
            "payer" to uid, "payee" to payee, "amount" to amountPaise / 100.0, "amountPaise" to amountPaise,
            "notes" to note.take(500).ifBlank { "Settled up" }, "groupId" to groupId, "operationId" to operationId,
            "confirmationStatus" to "confirmed", "confirmedBy" to uid, "confirmedAt" to stamp,
            "status" to "active", "createdAt" to stamp, "updatedAt" to stamp,
            "lastMutationAt" to stamp, "lastMutationId" to logRef.id, "lastMutationType" to "settlement_added",
            "lastEditedBy" to uid, "version" to 1,
        )
        db.runBatch { batch ->
            batch.set(settlementRef, data)
            batch.set(logRef, audit("settlement_added", "$actor recorded ${com.paymatrix.app.domain.Money.format(amountPaise)} to $payeeName", settlementRef.id, groupId, actor, stamp))
        }.await()
        return operationId
    }

    suspend fun friends(): Pair<List<UserProfile>, List<FriendRequest>> = coroutineScope {
        val me = auth.profile()
        val profiles = me.friends.map { friend -> async { publicProfile(friend) } }.awaitAll()
        val incoming = db.collection("friendRequests").whereEqualTo("to", uid).whereEqualTo("status", "pending").get().await().documents
        val outgoing = db.collection("friendRequests").whereEqualTo("from", uid).whereEqualTo("status", "pending").get().await().documents
        val requests = (incoming + outgoing).map { doc ->
            val other = if (doc.getString("from") == uid) doc.getString("to") else doc.getString("from")
            FriendRequest(doc.id, doc.getString("from").orEmpty(), doc.getString("to").orEmpty(), doc.getString("status").orEmpty(), doc.getString("createdAt").orEmpty(), other?.let { publicProfile(it) })
        }
        profiles to requests
    }

    suspend fun sendFriendRequest(friendCode: String) {
        val codeDoc = db.collection("friendCodes").document(friendCode.trim().uppercase()).get().await()
        val target = codeDoc.getString("uid") ?: codeDoc.getString("userId") ?: error("Friend code not found.")
        require(target != uid) { "You cannot connect with your own account." }
        val id = "${uid}_$target"
        val ref = db.collection("friendRequests").document(id)
        if (ref.get().await().getString("status") == "pending") return
        ref.set(mapOf("from" to uid, "to" to target, "status" to "pending", "createdAt" to now())).await()
    }

    suspend fun respondToFriend(request: FriendRequest, accept: Boolean) {
        require(request.to == uid) { "Only the recipient can respond." }
        val requestRef = db.collection("friendRequests").document(request.id)
        if (accept) db.runBatch { batch ->
            batch.update(requestRef, mapOf("status" to "accepted", "respondedAt" to now()))
            batch.update(db.collection("users").document(request.from), "friends", FieldValue.arrayUnion(request.to))
            batch.update(db.collection("users").document(request.to), "friends", FieldValue.arrayUnion(request.from))
        }.await() else requestRef.update(mapOf("status" to "rejected", "respondedAt" to now())).await()
    }

    suspend fun notifications(): List<AppNotification> = db.collection("notifications").whereEqualTo("to", uid)
        .get().await().documents.map { AppNotification(it.id, it.getString("title") ?: "paymatrix", it.getString("message").orEmpty(), it.getString("type").orEmpty(), it.getBoolean("read") ?: it.getBoolean("isRead") ?: false, timestamp(it.get("createdAt"))) }
        .sortedByDescending { it.createdAt }

    suspend fun markNotificationRead(id: String) = db.collection("notifications").document(id).update("read", true).await()

    suspend fun logGroups(): List<LogGroup> = db.collection("logGroups").whereArrayContains("members", uid).get().await().documents.map {
        LogGroup(it.id, it.getString("name") ?: "Log", it.getString("ownerId").orEmpty(), strings(it.get("members")), it.getString("updatedAt").orEmpty())
    }.sortedByDescending { it.updatedAt }

    suspend fun createLogGroup(name: String): String {
        require(name.trim().isNotEmpty()) { "Log name is required." }
        val data = mapOf("name" to name.trim().take(100), "ownerId" to uid, "members" to listOf(uid), "createdAt" to now(), "updatedAt" to now())
        return db.collection("logGroups").add(data).await().id
    }

    suspend fun logEntries(groupId: String): List<LogEntry> = db.collection("logGroups").document(groupId).collection("entries").get().await().documents.map {
        LogEntry(it.id, it.getString("title") ?: "Entry", paise(it, "amountPaise", "amount"), it.getString("category") ?: "Other", it.getString("place").orEmpty(), it.getString("note").orEmpty(), it.getString("date").orEmpty(), it.getString("type") ?: "manual")
    }.sortedByDescending { it.date }

    suspend fun addLogEntry(groupId: String, title: String, amountText: String, category: String, note: String) {
        val amount = com.paymatrix.app.domain.Money.toPaise(amountText)
        require(title.trim().isNotEmpty() && amount > 0) { "Title and positive amount are required." }
        db.collection("logGroups").document(groupId).collection("entries").add(mapOf(
            "type" to "manual", "title" to title.trim().take(100), "amount" to amount / 100.0,
            "category" to category.take(50), "place" to "", "note" to note.take(500), "date" to now(),
            "addedBy" to uid, "addedByName" to publicProfile(uid).name, "createdAt" to now(), "updatedAt" to now(),
        )).await()
    }

    private suspend fun mutateFinancial(groupId: String, collection: String, id: String, type: String, message: String) {
        val record = db.collection("groups").document(groupId).collection(collection).document(id)
        val current = record.get().await()
        val log = db.collection("groups").document(groupId).collection("logs").document()
        val actor = publicProfile(uid).name
        val stamp = FieldValue.serverTimestamp()
        db.runBatch { batch ->
            batch.update(record, mapOf("status" to "deleted", "updatedAt" to stamp, "version" to ((current.getLong("version") ?: 1) + 1), "lastMutationAt" to stamp, "lastMutationId" to log.id, "lastMutationType" to type, "lastEditedBy" to uid))
            batch.set(log, audit(type, message, id, groupId, actor, stamp))
        }.await()
    }

    private fun audit(type: String, message: String, relatedId: String, groupId: String, actor: String, stamp: Any) = mapOf(
        "type" to type, "message" to message.take(500), "actorId" to uid, "actorName" to actor,
        "relatedId" to relatedId.take(128), "groupId" to groupId, "createdAt" to stamp,
    )

    private suspend fun publicProfile(userId: String): UserProfile {
        val public = db.collection("publicProfiles").document(userId).get().await()
        val privateProfile = runCatching { db.collection("users").document(userId).get().await() }.getOrNull()
        return UserProfile(
            uid = userId,
            name = privateProfile?.getString("name") ?: privateProfile?.getString("displayName") ?: public.getString("name") ?: public.getString("displayName") ?: "Member",
            email = privateProfile?.getString("email").orEmpty(),
            avatar = privateProfile?.getString("avatar") ?: privateProfile?.getString("photoURL") ?: public.getString("avatar") ?: public.getString("photoURL").orEmpty(),
            upiId = privateProfile?.getString("upiId").orEmpty(),
            phone = privateProfile?.getString("phone").orEmpty(),
            friends = strings(privateProfile?.get("friends")),
        )
    }

    private fun groupFrom(doc: DocumentSnapshot) = Group(doc.id, doc.getString("name") ?: doc.getString("title") ?: "Untitled group", doc.getString("description").orEmpty(), doc.getString("category") ?: "Other", strings(doc.get("members")), doc.getString("admin") ?: doc.getString("createdBy").orEmpty(), doc.getString("inviteCode").orEmpty(), doc.getString("status") ?: "active", timestamp(doc.get("createdAt")))

    private fun expenseFrom(doc: DocumentSnapshot, groupId: String): Expense {
        val splits = (doc.get("splits") as? List<*>)?.mapNotNull { raw ->
            val map = raw as? Map<*, *> ?: return@mapNotNull null
            val user = when (val value = map["user"]) { is String -> value; is Map<*, *> -> value["uid"] as? String ?: value["_id"] as? String; else -> null } ?: return@mapNotNull null
            Split(user, number(map["amountPaise"])?.toLong() ?: ((number(map["amount"])?.toDouble() ?: 0.0) * 100).toLong())
        }.orEmpty()
        return Expense(doc.id, groupId, doc.getString("title") ?: "Expense", doc.getString("description").orEmpty(), paise(doc, "amountPaise", "amount"), doc.getString("currency") ?: "INR", idValue(doc.get("paidBy")), doc.getString("paidByName") ?: "Member", doc.getString("createdBy") ?: doc.getString("admin").orEmpty(), doc.getString("splitType") ?: "equal", strings(doc.get("participants")), splits, doc.getString("category") ?: "Other", doc.getString("notes").orEmpty(), timestamp(doc.get("date")), timestamp(doc.get("createdAt")), doc.getString("status") ?: "active")
    }

    private fun settlementFrom(doc: DocumentSnapshot, groupId: String) = Settlement(doc.id, groupId, idValue(doc.get("payer") ?: doc.get("createdBy")), idValue(doc.get("payee") ?: doc.get("recipient") ?: doc.get("to")), paise(doc, "amountPaise", "amount"), doc.getString("confirmationStatus") ?: "confirmed", doc.getString("status") ?: "active", doc.getString("notes").orEmpty(), timestamp(doc.get("createdAt")))

    private fun strings(value: Any?) = (value as? List<*>)?.mapNotNull { when (it) { is String -> it; is Map<*, *> -> idValue(it); else -> null } }.orEmpty()
    private fun idValue(value: Any?): String = when (value) { is String -> value; is Map<*, *> -> (value["uid"] ?: value["_id"] ?: value["id"])?.toString().orEmpty(); else -> "" }
    private fun number(value: Any?) = value as? Number
    private fun paise(doc: DocumentSnapshot, paiseField: String, amountField: String): Long = doc.getLong(paiseField) ?: ((doc.getDouble(amountField) ?: doc.getLong(amountField)?.toDouble() ?: 0.0) * 100).toLong()
    private fun timestamp(value: Any?): String = when (value) { is String -> value; is com.google.firebase.Timestamp -> value.toDate().toInstant().toString(); else -> "" }
    private fun randomInviteCode(): String = (1..8).map { "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".random() }.joinToString("")
}
