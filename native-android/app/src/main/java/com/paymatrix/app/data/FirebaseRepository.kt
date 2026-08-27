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
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.UUID
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject

class FirebaseRepository(
    private val db: FirebaseFirestore,
    private val auth: AuthRepository,
) {
    private val uid get() = auth.currentUser?.uid ?: error("Authentication required")
    private fun now() = Instant.now().toString()

    fun homeChanges(): Flow<Unit> = callbackFlow {
        val registrations = listOf(
            db.collection("groups").whereArrayContains("members", uid).addSnapshotListener { _, error -> if (error == null) trySend(Unit) },
            db.collection("notifications").whereEqualTo("to", uid).addSnapshotListener { _, error -> if (error == null) trySend(Unit) },
            db.collection("config").document("features").addSnapshotListener { _, error -> if (error == null) trySend(Unit) },
        )
        awaitClose { registrations.forEach { it.remove() } }
    }

    fun groupChanges(groupId: String): Flow<Unit> = callbackFlow {
        val group = db.collection("groups").document(groupId)
        val registrations = listOf(
            group.addSnapshotListener { _, error -> if (error == null) trySend(Unit) },
            group.collection("expenses").addSnapshotListener { _, error -> if (error == null) trySend(Unit) },
            group.collection("settlements").addSnapshotListener { _, error -> if (error == null) trySend(Unit) },
            group.collection("logs").addSnapshotListener { _, error -> if (error == null) trySend(Unit) },
        )
        awaitClose { registrations.forEach { it.remove() } }
    }

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

    suspend fun updateGroup(groupId: String, name: String, description: String, category: String) {
        require(name.trim().isNotEmpty() && name.length <= 100) { "Group name is required." }
        db.collection("groups").document(groupId).update(
            mapOf("name" to name.trim(), "title" to name.trim(), "description" to description.trim().take(500), "category" to category.take(50), "updatedAt" to now()),
        ).await()
    }

    suspend fun addGroupMember(groupId: String, memberUid: String) {
        require(memberUid.isNotBlank() && memberUid != uid) { "Choose another member." }
        db.collection("groups").document(groupId).update(
            mapOf("members" to FieldValue.arrayUnion(memberUid), "historicalMembers" to FieldValue.arrayUnion(memberUid), "updatedAt" to now()),
        ).await()
    }

    suspend fun removeGroupMember(groupId: String, memberUid: String) {
        val snapshot = groupSnapshot(groupId)
        require(kotlin.math.abs(snapshot.balances[memberUid] ?: 0L) <= 1L) { "Settle this member's balance before removing them." }
        require(snapshot.group.admin != memberUid) { "Transfer administration before removing the group admin." }
        db.collection("groups").document(groupId).update(mapOf("members" to FieldValue.arrayRemove(memberUid), "updatedAt" to now())).await()
    }

    suspend fun leaveGroup(groupId: String) {
        val snapshot = groupSnapshot(groupId)
        require(kotlin.math.abs(snapshot.balances[uid] ?: 0L) <= 1L) { "Settle your balance before leaving." }
        require(snapshot.group.admin != uid) { "The group admin cannot leave until administration is transferred." }
        db.collection("groups").document(groupId).update(mapOf("members" to FieldValue.arrayRemove(uid), "updatedAt" to now())).await()
    }

    suspend fun deleteGroup(groupId: String) {
        val snapshot = groupSnapshot(groupId)
        require(snapshot.group.admin == uid) { "Only the group admin can delete this group." }
        require(snapshot.balances.values.all { kotlin.math.abs(it) <= 1L }) { "Reconcile all balances before deleting this group." }
        db.collection("groups").document(groupId).update(mapOf("status" to "deleted", "deletedAt" to now(), "updatedAt" to now())).await()
    }

    suspend fun groupSnapshot(groupId: String): GroupSnapshot = coroutineScope {
        val groupDoc = async { db.collection("groups").document(groupId).get().await() }
        val expenses = async { db.collection("groups").document(groupId).collection("expenses").orderBy("createdAt", Query.Direction.DESCENDING).get().await().documents.map { expenseFrom(it, groupId) } }
        val settlements = async { db.collection("groups").document(groupId).collection("settlements").orderBy("createdAt", Query.Direction.DESCENDING).get().await().documents.map { settlementFrom(it, groupId) } }
        val activity = async { groupActivity(groupId) }
        val group = groupFrom(groupDoc.await())
        val profiles = group.members.map { member -> async { member to publicProfile(member) } }.awaitAll().toMap()
        val expenseList = expenses.await()
        val settlementList = settlements.await()
        val balances = BalanceEngine.computeBalances(expenseList, settlementList, group.members)
        GroupSnapshot(group, profiles, expenseList, settlementList, balances, BalanceEngine.simplify(balances), activity.await())
    }

    suspend fun dashboardSummary(sourceGroups: List<Group>? = null): DashboardSummary {
        val resolvedGroups = sourceGroups ?: groups()
        return dashboardFromSnapshots(groupSnapshots(resolvedGroups))
    }

    private fun dashboardFromSnapshots(snapshots: List<GroupSnapshot>): DashboardSummary {
        var owed = 0L
        var owe = 0L
        var shared = 0L
        val categoryTotals = linkedMapOf<String, Long>()
        val groupBalances = linkedMapOf<String, Long>()
        for (snapshot in snapshots) {
            val group = snapshot.group
            val mine = snapshot.balances[uid] ?: 0L
            groupBalances[group.id] = mine
            if (mine > 0) owed += mine else owe += -mine
            snapshot.expenses.filter { it.status != "deleted" && it.status != "archived" }.forEach { expense ->
                val share = expense.splits.firstOrNull { it.user == uid }?.amountPaise ?: 0L
                shared += share
                if (share > 0) categoryTotals[expense.category] = (categoryTotals[expense.category] ?: 0L) + share
            }
        }
        return DashboardSummary(owed, owe, owed - owe, shared, categoryTotals.map { CategoryTotal(it.key, it.value) }.sortedByDescending { it.amountPaise }, groupBalances)
    }

    suspend fun analytics(sourceGroups: List<Group>? = null): AnalyticsSnapshot {
        val resolvedGroups = sourceGroups ?: groups()
        val snapshots = groupSnapshots(resolvedGroups)
        val summary = dashboardFromSnapshots(snapshots)
        val monthTotals = linkedMapOf<String, Long>()
        var expenseCount = 0
        var settlementCount = 0
        for (snap in snapshots) {
            snap.expenses.filter { it.status != "deleted" && it.status != "archived" }.forEach { expense ->
                expenseCount++
                val instant = runCatching { Instant.parse(expense.date.ifBlank { expense.createdAt }) }.getOrNull()
                val label = instant?.atZone(ZoneId.systemDefault())?.month?.getDisplayName(TextStyle.SHORT, Locale.ENGLISH) ?: "Other"
                monthTotals[label] = (monthTotals[label] ?: 0L) + (expense.splits.firstOrNull { it.user == uid }?.amountPaise ?: 0L)
            }
            settlementCount += snap.settlements.count { it.status != "deleted" }
        }
        return AnalyticsSnapshot(summary, monthTotals.map { SpendingPoint(it.key, it.value) }, expenseCount, settlementCount)
    }

    private suspend fun groupSnapshots(groups: List<Group>): List<GroupSnapshot> = coroutineScope {
        groups.map { group -> async { groupSnapshot(group.id) } }.awaitAll()
    }

    suspend fun groupActivity(groupId: String): List<ActivityItem> = db.collection("groups").document(groupId)
        .collection("logs").orderBy("createdAt", Query.Direction.DESCENDING).limit(100).get().await().documents.map {
            ActivityItem(it.id, it.getString("type").orEmpty(), it.getString("message").orEmpty(), it.getString("actorId").orEmpty(), it.getString("actorName") ?: "Member", it.getString("relatedId").orEmpty(), groupId, timestamp(it.get("createdAt")))
        }

    suspend fun allActivity(sourceGroups: List<Group>? = null): List<ActivityItem> = coroutineScope {
        val resolvedGroups = sourceGroups ?: groups()
        resolvedGroups.map { group -> async { groupActivity(group.id) } }.awaitAll().flatten().sortedByDescending { it.createdAt }
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
        date: String = "",
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
            "amountPaise" to totalPaise, "currency" to "INR", "date" to date.ifBlank { now() }, "paidBy" to uid,
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

    suspend fun updateExpense(expense: Expense, draft: ExpenseDraft) {
        val totalPaise = com.paymatrix.app.domain.Money.toPaise(draft.amount)
        require(totalPaise in 1..100_000_000) { "Amount must be between ₹0.01 and ₹10,00,000." }
        require(draft.title.trim().isNotEmpty() && draft.participants.isNotEmpty()) { "Title and participants are required." }
        val splits = BalanceEngine.calculateSplits(totalPaise, draft.splitType, draft.splitValues, draft.participants)
        val record = db.collection("groups").document(expense.groupId).collection("expenses").document(expense.id)
        val current = record.get().await()
        val log = db.collection("groups").document(expense.groupId).collection("logs").document()
        val actor = publicProfile(uid).name
        val stamp = FieldValue.serverTimestamp()
        val changes = mapOf(
            "title" to draft.title.trim(), "amount" to totalPaise / 100.0, "amountPaise" to totalPaise,
            "splitType" to draft.splitType, "splitData" to draft.splitValues, "participants" to draft.participants,
            "splitUserIds" to splits.map { it.user }, "splits" to splits.map { mapOf("user" to it.user, "amount" to it.amount, "amountPaise" to it.amountPaise) },
            "category" to draft.category.take(50), "notes" to draft.notes.take(500), "date" to draft.date.ifBlank { expense.date }, "updatedAt" to stamp,
            "version" to ((current.getLong("version") ?: 1L) + 1L), "lastMutationAt" to stamp,
            "lastMutationId" to log.id, "lastMutationType" to "expense_updated", "lastEditedBy" to uid,
        )
        db.runBatch { batch ->
            batch.update(record, changes)
            batch.set(log, audit("expense_updated", "$actor edited \"${draft.title.trim()}\"", expense.id, expense.groupId, actor, stamp))
        }.await()
    }

    suspend fun archiveExpense(groupId: String, expense: Expense) {
        mutateFinancial(groupId, "expenses", expense.id, "expense_deleted", "Deleted ${expense.title}", "deleted")
    }

    suspend fun restoreExpense(groupId: String, expense: Expense) = mutateFinancial(groupId, "expenses", expense.id, "expense_restored", "Restored ${expense.title}", "active")

    suspend fun archiveSettlement(groupId: String, settlement: Settlement) = mutateFinancial(groupId, "settlements", settlement.id, "settlement_deleted", "Deleted settlement", "deleted")

    suspend fun restoreSettlement(groupId: String, settlement: Settlement) = mutateFinancial(groupId, "settlements", settlement.id, "settlement_restored", "Restored settlement", "active")

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

    suspend fun removeFriend(friendUid: String) {
        require(friendUid.isNotBlank() && friendUid != uid)
        db.runBatch { batch ->
            batch.update(db.collection("users").document(uid), "friends", FieldValue.arrayRemove(friendUid))
            batch.update(db.collection("users").document(friendUid), "friends", FieldValue.arrayRemove(uid))
        }.await()
    }

    suspend fun notifications(): List<AppNotification> = db.collection("notifications").whereEqualTo("to", uid)
        .get().await().documents.map { AppNotification(it.id, it.getString("title") ?: "paymatrix", it.getString("message").orEmpty(), it.getString("type").orEmpty(), it.getBoolean("read") ?: it.getBoolean("isRead") ?: false, timestamp(it.get("createdAt"))) }
        .sortedByDescending { it.createdAt }

    suspend fun markNotificationRead(id: String) = db.collection("notifications").document(id).update("read", true).await()

    suspend fun markAllNotificationsRead() {
        val unread = db.collection("notifications").whereEqualTo("to", uid).whereEqualTo("read", false).get().await()
        if (unread.isEmpty) return
        db.runBatch { batch -> unread.documents.forEach { batch.update(it.reference, "read", true) } }.await()
    }

    suspend fun logGroups(): List<LogGroup> = db.collection("logGroups").whereArrayContains("members", uid).get().await().documents.map {
        LogGroup(it.id, it.getString("name") ?: "Log", it.getString("ownerId").orEmpty(), strings(it.get("members")), it.getString("updatedAt").orEmpty())
    }.sortedByDescending { it.updatedAt }

    suspend fun createLogGroup(name: String): String {
        require(name.trim().isNotEmpty()) { "Log name is required." }
        val data = mapOf("name" to name.trim().take(100), "ownerId" to uid, "members" to listOf(uid), "createdAt" to now(), "updatedAt" to now())
        return db.collection("logGroups").add(data).await().id
    }

    suspend fun renameLogGroup(groupId: String, name: String) {
        require(name.trim().isNotEmpty()) { "Log name is required." }
        db.collection("logGroups").document(groupId).update(mapOf("name" to name.trim().take(100), "updatedAt" to now())).await()
    }

    suspend fun addLogGroupMembers(groupId: String, members: List<String>) {
        if (members.isEmpty()) return
        db.collection("logGroups").document(groupId).update(mapOf("members" to FieldValue.arrayUnion(*members.toTypedArray()), "updatedAt" to now())).await()
    }

    suspend fun removeLogGroupMember(groupId: String, memberUid: String) {
        db.collection("logGroups").document(groupId).update(mapOf("members" to FieldValue.arrayRemove(memberUid), "updatedAt" to now())).await()
    }

    suspend fun deleteLogGroup(groupId: String) = db.collection("logGroups").document(groupId).delete().await()

    suspend fun logEntries(groupId: String): List<LogEntry> = db.collection("logGroups").document(groupId).collection("entries").get().await().documents.map {
        LogEntry(it.id, it.getString("title") ?: "Entry", paise(it, "amountPaise", "amount"), it.getString("category") ?: "Other", it.getString("place").orEmpty(), it.getString("note").orEmpty(), it.getString("date").orEmpty(), it.getString("type") ?: "manual")
    }.sortedByDescending { it.date }

    suspend fun addLogEntry(groupId: String, title: String, amountText: String, category: String, place: String, note: String) {
        val amount = com.paymatrix.app.domain.Money.toPaise(amountText)
        require(title.trim().isNotEmpty() && amount > 0) { "Title and positive amount are required." }
        db.collection("logGroups").document(groupId).collection("entries").add(mapOf(
            "type" to "manual", "title" to title.trim().take(100), "amount" to amount / 100.0,
            "category" to category.take(50), "place" to place.take(100), "note" to note.take(500), "date" to now(),
            "addedBy" to uid, "addedByName" to publicProfile(uid).name, "createdAt" to now(), "updatedAt" to now(),
        )).await()
    }

    suspend fun updateLogEntry(groupId: String, entryId: String, title: String, amountText: String, category: String, place: String, note: String) {
        val amount = com.paymatrix.app.domain.Money.toPaise(amountText)
        require(title.trim().isNotEmpty() && amount > 0) { "Title and positive amount are required." }
        db.collection("logGroups").document(groupId).collection("entries").document(entryId).update(
            mapOf("title" to title.trim().take(100), "amount" to amount / 100.0, "category" to category.take(50), "place" to place.take(100), "note" to note.take(500), "updatedAt" to now()),
        ).await()
    }

    suspend fun deleteLogEntry(groupId: String, entryId: String) = db.collection("logGroups").document(groupId).collection("entries").document(entryId).delete().await()

    suspend fun myExpenseShares(sourceGroups: List<Group>? = null): List<ExpenseShare> {
        val resolvedGroups = sourceGroups ?: groups()
        val result = mutableListOf<ExpenseShare>()
        for (group in resolvedGroups) {
            val expenses = db.collection("groups").document(group.id).collection("expenses").get().await().documents.map { expenseFrom(it, group.id) }
            expenses.filter { it.status != "deleted" && it.status != "archived" }.forEach { expense ->
                expense.splits.firstOrNull { it.user == uid && it.amountPaise > 0 }?.let { split -> result += ExpenseShare(group.id, group.name, expense.id, expense.title, split.amountPaise, expense.category, expense.date.ifBlank { expense.createdAt }) }
            }
        }
        return result.sortedByDescending { it.date }
    }

    suspend fun addExpenseShareToLog(logGroupId: String, share: ExpenseShare) {
        val entryId = "exp_${uid}_${share.sourceGroupId}_${share.sourceExpenseId}"
        db.collection("logGroups").document(logGroupId).collection("entries").document(entryId).set(mapOf(
            "type" to "expense", "title" to share.title, "amount" to share.amountPaise / 100.0,
            "category" to share.category, "place" to "", "note" to "", "date" to share.date,
            "addedBy" to uid, "addedByName" to publicProfile(uid).name, "sourceGroupId" to share.sourceGroupId,
            "sourceGroupName" to share.sourceGroupName, "sourceExpenseId" to share.sourceExpenseId,
            "createdAt" to now(), "updatedAt" to now(),
        )).await()
    }

    suspend fun featureFlags(): FeatureFlags {
        val doc = db.collection("config").document("featureFlags").get().await()
        return FeatureFlags(
            billScanning = doc.getBoolean("billScanning") ?: true,
            analytics = doc.getBoolean("analytics") ?: true,
            settlements = doc.getBoolean("settlements") ?: true,
            logs = doc.getBoolean("logs") ?: true,
            maintenanceMode = doc.getBoolean("maintenanceMode") ?: false,
        )
    }

    suspend fun exportMyData(): String {
        val profile = db.collection("users").document(uid).get().await()
        val publicProfile = db.collection("publicProfiles").document(uid).get().await()
        val history = db.collection("groups").whereArrayContains("historicalMembers", uid).get().await().documents
        val groupsJson = JSONArray()
        for (group in history) {
            val value = JSONObject(jsonSafe(group.data) as Map<*, *>).put("id", group.id)
            value.put("expenses", JSONArray(group.reference.collection("expenses").get().await().documents.map { JSONObject(jsonSafe(it.data) as Map<*, *>).put("id", it.id) }))
            value.put("settlements", JSONArray(group.reference.collection("settlements").get().await().documents.map { JSONObject(jsonSafe(it.data) as Map<*, *>).put("id", it.id) }))
            value.put("auditLog", JSONArray(group.reference.collection("logs").get().await().documents.map { JSONObject(jsonSafe(it.data) as Map<*, *>).put("id", it.id) }))
            groupsJson.put(value)
        }
        return JSONObject().put("exportedAt", now()).put("profile", JSONObject(jsonSafe(profile.data.orEmpty()) as Map<*, *>)).put("publicProfile", JSONObject(jsonSafe(publicProfile.data.orEmpty()) as Map<*, *>)).put("groups", groupsJson).toString(2)
    }

    private suspend fun mutateFinancial(groupId: String, collection: String, id: String, type: String, message: String, status: String) {
        val record = db.collection("groups").document(groupId).collection(collection).document(id)
        val current = record.get().await()
        val log = db.collection("groups").document(groupId).collection("logs").document()
        val actor = publicProfile(uid).name
        val stamp = FieldValue.serverTimestamp()
        db.runBatch { batch ->
            batch.update(record, mapOf("status" to status, "updatedAt" to stamp, "version" to ((current.getLong("version") ?: 1) + 1), "lastMutationAt" to stamp, "lastMutationId" to log.id, "lastMutationType" to type, "lastEditedBy" to uid))
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
            avatar = firstNonBlank(privateProfile?.getString("avatar"), privateProfile?.getString("photoURL"), public.getString("avatar"), public.getString("photoURL")),
            upiId = privateProfile?.getString("upiId").orEmpty(),
            phone = privateProfile?.getString("phone").orEmpty(),
            friends = strings(privateProfile?.get("friends")),
            friendCode = privateProfile?.getString("friendCode").orEmpty(),
            createdAt = timestamp(privateProfile?.get("createdAt")),
        )
    }

    private fun groupFrom(doc: DocumentSnapshot) = Group(doc.id, doc.getString("name") ?: doc.getString("title") ?: "Untitled group", doc.getString("description").orEmpty(), doc.getString("category") ?: "Other", strings(doc.get("members")), doc.getString("admin") ?: doc.getString("createdBy").orEmpty(), doc.getString("inviteCode").orEmpty(), doc.getString("status") ?: "active", timestamp(doc.get("createdAt")), timestamp(doc.get("updatedAt")))

    private fun expenseFrom(doc: DocumentSnapshot, groupId: String): Expense {
        val splits = (doc.get("splits") as? List<*>)?.mapNotNull { raw ->
            val map = raw as? Map<*, *> ?: return@mapNotNull null
            val user = when (val value = map["user"]) { is String -> value; is Map<*, *> -> value["uid"] as? String ?: value["_id"] as? String; else -> null } ?: return@mapNotNull null
            Split(user, number(map["amountPaise"])?.toLong() ?: ((number(map["amount"])?.toDouble() ?: 0.0) * 100).toLong())
        }.orEmpty()
        return Expense(doc.id, groupId, doc.getString("title") ?: "Expense", doc.getString("description").orEmpty(), paise(doc, "amountPaise", "amount"), doc.getString("currency") ?: "INR", idValue(doc.get("paidBy")), doc.getString("paidByName") ?: "Member", doc.getString("createdBy") ?: doc.getString("admin").orEmpty(), doc.getString("splitType") ?: "equal", strings(doc.get("participants")), splits, doc.getString("category") ?: "Other", doc.getString("notes").orEmpty(), timestamp(doc.get("date")), timestamp(doc.get("createdAt")), doc.getString("status") ?: "active")
    }

    private fun settlementFrom(doc: DocumentSnapshot, groupId: String) = Settlement(doc.id, groupId, idValue(doc.get("payer") ?: doc.get("createdBy")), idValue(doc.get("payee") ?: doc.get("recipient") ?: doc.get("to")), paise(doc, "amountPaise", "amount"), doc.getString("confirmationStatus") ?: "confirmed", doc.getString("status") ?: "active", doc.getString("notes").orEmpty(), timestamp(doc.get("createdAt")))

    private fun firstNonBlank(vararg values: String?): String = values.firstOrNull { !it.isNullOrBlank() }.orEmpty()

    private fun strings(value: Any?) = (value as? List<*>)?.mapNotNull { when (it) { is String -> it; is Map<*, *> -> idValue(it); else -> null } }.orEmpty()
    private fun idValue(value: Any?): String = when (value) { is String -> value; is Map<*, *> -> (value["uid"] ?: value["_id"] ?: value["id"])?.toString().orEmpty(); else -> "" }
    private fun number(value: Any?) = value as? Number
    private fun paise(doc: DocumentSnapshot, paiseField: String, amountField: String): Long = doc.getLong(paiseField) ?: ((doc.getDouble(amountField) ?: doc.getLong(amountField)?.toDouble() ?: 0.0) * 100).toLong()
    private fun timestamp(value: Any?): String = when (value) { is String -> value; is com.google.firebase.Timestamp -> value.toDate().toInstant().toString(); else -> "" }
    private fun jsonSafe(value: Any?): Any? = when (value) {
        is com.google.firebase.Timestamp -> value.toDate().toInstant().toString()
        is Map<*, *> -> value.entries.associate { it.key.toString() to jsonSafe(it.value) }
        is List<*> -> value.map(::jsonSafe)
        else -> value
    }
    private fun randomInviteCode(): String = (1..8).map { "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".random() }.joinToString("")
}
