package com.paymatrix.app.data

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.google.android.gms.tasks.Task
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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.delay
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.UUID
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject

class FirebaseRepository(
    context: Context,
    private val db: FirebaseFirestore,
    private val auth: AuthRepository,
) {
    private val appContext = context.applicationContext
    private val connectivity = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val pendingWrites = AtomicInteger(0)
    private val savedReads = AtomicInteger(0)
    val cachedDisplayReadCount: Int get() = savedReads.get()
    private val _syncStatus = MutableStateFlow(SyncStatus())
    val syncStatus: StateFlow<SyncStatus> = _syncStatus.asStateFlow()
    private val uid get() = auth.currentUser?.uid ?: error("Authentication required")
    private fun now() = Instant.now().toString()
    private val lastMutationTime = ConcurrentHashMap<String, Long>()

    private suspend fun enforceMutationThrottle(recordId: String) {
        val currentTime = System.currentTimeMillis()
        val last = lastMutationTime[recordId] ?: 0L
        val elapsed = currentTime - last
        if (elapsed in 1..1100L) {
            delay(1150L - elapsed)
        }
        lastMutationTime[recordId] = System.currentTimeMillis()
    }

    fun isOnline(): Boolean {
        val network = connectivity.activeNetwork ?: return false
        val capabilities = connectivity.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    fun watchPendingWrites() {
        if (auth.currentUser == null) return
        val task = db.waitForPendingWrites()
        if (task.isComplete) return
        trackPending(task)
    }

    private suspend fun finishWrite(task: Task<Void>): Boolean {
        if (!isOnline()) {
            trackPending(task)
            return true
        }
        return try {
            withTimeout(12_000) { task.await() }
            false
        } catch (_: TimeoutCancellationException) {
            trackPending(task)
            true
        }
    }

    private fun trackPending(task: Task<*>) {
        val count = pendingWrites.incrementAndGet()
        FirebaseInstrumentation.recordWrite(1, "write", "firestore:write")
        _syncStatus.value = SyncStatus(pendingWrites = count)
        task.addOnCompleteListener { completed ->
            val remaining = pendingWrites.updateAndGet { current -> (current - 1).coerceAtLeast(0) }
            _syncStatus.value = SyncStatus(
                pendingWrites = remaining,
                lastError = completed.exception?.message.orEmpty(),
            )
        }
    }

    fun groupListChanges(): Flow<Unit> = callbackFlow {
        var initialized = false
        val unreg = FirebaseInstrumentation.registerListener("groups:members")
        val registration = db.collection("groups").whereArrayContains("members", uid).addSnapshotListener(com.google.firebase.firestore.MetadataChanges.INCLUDE) { snapshot, error ->
            if (error != null) close(error)
            else {
                snapshot?.let {
                    FirebaseInstrumentation.recordRead(it.documents.size, it.metadata.isFromCache, signature = "groups:members")
                }
                if (initialized) trySend(Unit) else initialized = true
            }
        }
        awaitClose {
            registration.remove()
            unreg()
        }
    }

    fun notificationChanges(): Flow<List<AppNotification>> = callbackFlow {
        var initialized = false
        val unreg = FirebaseInstrumentation.registerListener("notifications:to")
        val registration = db.collection("notifications")
            .whereEqualTo("to", uid)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(CursorPagination.NOTIFICATIONS_INITIAL.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) close(error)
                else if (snapshot != null) {
                    FirebaseInstrumentation.recordRead(
                        count = if (initialized) snapshot.documentChanges.size else snapshot.documents.size,
                        fromCache = snapshot.metadata.isFromCache,
                        signature = "notifications:to"
                    )
                    initialized = true
                    val items = snapshot.documents.map {
                        AppNotification(
                            it.id,
                            it.getString("title") ?: "paymatrix",
                            it.getString("message").orEmpty(),
                            it.getString("type").orEmpty(),
                            it.getBoolean("read") ?: it.getBoolean("isRead") ?: false,
                            timestamp(it.get("createdAt")),
                            it.getString("groupId").orEmpty(),
                            it.getString("url").orEmpty()
                        )
                    }
                    trySend(items)
                }
            }
        awaitClose {
            registration.remove()
            unreg()
        }
    }

    fun featureFlagChanges(): Flow<Unit> = callbackFlow {
        var initialized = false
        val unreg = FirebaseInstrumentation.registerListener("config:featureFlags")
        val registration = db.collection("config").document("featureFlags").addSnapshotListener { snapshot, error ->
            if (error != null) close(error)
            else {
                snapshot?.let {
                    FirebaseInstrumentation.recordRead(1, it.metadata.isFromCache, signature = "config:featureFlags")
                }
                if (initialized) trySend(Unit) else initialized = true
            }
        }
        awaitClose {
            registration.remove()
            unreg()
        }
    }

    fun groupChanges(groupId: String): Flow<Unit> = callbackFlow {
        val group = db.collection("groups").document(groupId)
        var groupInitialized = false
        var expensesInitialized = false
        var settlementsInitialized = false
        var logsInitialized = false
        val unregGroup = FirebaseInstrumentation.registerListener("groups:groupId")
        val unregExp = FirebaseInstrumentation.registerListener("groups:groupId:expenses")
        val unregStl = FirebaseInstrumentation.registerListener("groups:groupId:settlements")
        val unregLogs = FirebaseInstrumentation.registerListener("groups:groupId:logs")
        val registrations = listOf(
            group.addSnapshotListener { snapshot, error ->
                if (error != null) close(error) else {
                    snapshot?.let { FirebaseInstrumentation.recordRead(1, it.metadata.isFromCache, signature = "groups:groupId") }
                    if (groupInitialized) trySend(Unit) else groupInitialized = true
                }
            },
            group.collection("expenses").addSnapshotListener { snapshot, error ->
                if (error != null) close(error) else {
                    snapshot?.let { FirebaseInstrumentation.recordRead(if (expensesInitialized) it.documentChanges.size else it.documents.size, it.metadata.isFromCache, signature = "groups:groupId:expenses") }
                    if (expensesInitialized) trySend(Unit) else expensesInitialized = true
                }
            },
            group.collection("settlements").addSnapshotListener { snapshot, error ->
                if (error != null) close(error) else {
                    snapshot?.let { FirebaseInstrumentation.recordRead(if (settlementsInitialized) it.documentChanges.size else it.documents.size, it.metadata.isFromCache, signature = "groups:groupId:settlements") }
                    if (settlementsInitialized) trySend(Unit) else settlementsInitialized = true
                }
            },
            group.collection("logs").addSnapshotListener { snapshot, error ->
                if (error != null) close(error) else {
                    snapshot?.let { FirebaseInstrumentation.recordRead(if (logsInitialized) it.documentChanges.size else it.documents.size, it.metadata.isFromCache, signature = "groups:groupId:logs") }
                    if (logsInitialized) trySend(Unit) else logsInitialized = true
                }
            },
        )
        awaitClose {
            registrations.forEach { it.remove() }
            unregGroup()
            unregExp()
            unregStl()
            unregLogs()
        }
    }


    suspend fun cachedHome(): Pair<List<Group>, DashboardSummary>? {
        val cached = db.collection("groups").whereArrayContains("members", uid)
            .get(com.google.firebase.firestore.Source.CACHE).await()
        if (cached.isEmpty) return null // No known snapshot: do not invent a zero balance.
        val groups = cached.documents.map(::groupFrom).filter { it.status != "deleted" }
        val stored = LocalSummaryStore.read(appContext, uid, groups.map { it.id }.toSet())
        return groups to (stored ?: dashboardSummary(groups, cachedOnly = true))
    }

    suspend fun groups(): List<Group> = coroutineScope {
        val groups = db.collection("groups").whereArrayContains("members", uid).displaySnapshot { savedReads.incrementAndGet() }.documents
            .map(::groupFrom).filter { it.status != "deleted" }.sortedByDescending { it.createdAt }
        val previewIds = groups.flatMap { it.members.take(4) }.distinct()
        val profiles = previewIds.map { member -> async { member to runCatching { publicProfile(member) }.getOrElse { UserProfile(uid = member) } } }.awaitAll().toMap()
        groups.map { group -> group.copy(memberProfiles = group.members.associateWith { profiles[it] ?: UserProfile(uid = it) }) }
    }

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
        val snapshot = groupSnapshot(groupId, displayOnly = false)
        require(kotlin.math.abs(snapshot.balances[memberUid] ?: 0L) <= 1L) { "Settle this member's balance before removing them." }
        require(snapshot.group.admin != memberUid) { "Transfer administration before removing the group admin." }
        db.collection("groups").document(groupId).update(mapOf("members" to FieldValue.arrayRemove(memberUid), "updatedAt" to now())).await()
    }

    suspend fun leaveGroup(groupId: String) {
        val snapshot = groupSnapshot(groupId, displayOnly = false)
        require(kotlin.math.abs(snapshot.balances[uid] ?: 0L) <= 1L) { "Settle your balance before leaving." }
        require(snapshot.group.admin != uid) { "The group admin cannot leave until administration is transferred." }
        db.collection("groups").document(groupId).update(mapOf("members" to FieldValue.arrayRemove(uid), "updatedAt" to now())).await()
    }

    suspend fun deleteGroup(groupId: String) {
        val snapshot = groupSnapshot(groupId, displayOnly = false)
        require(snapshot.group.admin == uid) { "Only the group admin can delete this group." }
        require(snapshot.balances.values.all { kotlin.math.abs(it) <= 1L }) { "Reconcile all balances before deleting this group." }
        db.collection("groups").document(groupId).update(mapOf("status" to "deleted", "deletedAt" to now(), "updatedAt" to now())).await()
    }

    suspend fun groupSnapshot(groupId: String, displayOnly: Boolean = true): GroupSnapshot = coroutineScope {
        val groupDoc = async { db.collection("groups").document(groupId).let { if (displayOnly) it.displaySnapshot { savedReads.incrementAndGet() } else it.get().await() } }
        val expenses = async { db.collection("groups").document(groupId).collection("expenses").orderBy("createdAt", Query.Direction.DESCENDING).let { if (displayOnly) it.displaySnapshot { savedReads.incrementAndGet() } else it.get().await() }.documents.map { expenseFrom(it, groupId) } }
        val settlements = async { db.collection("groups").document(groupId).collection("settlements").orderBy("createdAt", Query.Direction.DESCENDING).let { if (displayOnly) it.displaySnapshot { savedReads.incrementAndGet() } else it.get().await() }.documents.map { settlementFrom(it, groupId) } }
        val activity = async { groupActivity(groupId) }
        val group = groupFrom(groupDoc.await())
        val profiles = group.members.map { member -> async { member to publicProfile(member) } }.awaitAll().toMap()
        val expenseList = expenses.await()
        val settlementList = settlements.await()
        val balances = BalanceEngine.computeBalances(expenseList, settlementList, group.members)
        GroupSnapshot(group, profiles, expenseList, settlementList, balances, BalanceEngine.simplify(balances), activity.await())
    }

    suspend fun dashboardSummary(sourceGroups: List<Group>? = null, cachedOnly: Boolean = false): DashboardSummary {
        val resolvedGroups = sourceGroups ?: groups()
        val rows = coroutineScope {
            resolvedGroups.map { group ->
                async {
                    val expenses = async {
                        db.collection("groups").document(group.id).collection("expenses")
                            .let { if (cachedOnly) it.get(com.google.firebase.firestore.Source.CACHE).await() else it.displaySnapshot { savedReads.incrementAndGet() } }.documents.map { expenseFrom(it, group.id) }
                    }
                    val settlements = async {
                        db.collection("groups").document(group.id).collection("settlements")
                            .let { if (cachedOnly) it.get(com.google.firebase.firestore.Source.CACHE).await() else it.displaySnapshot { savedReads.incrementAndGet() } }.documents.map { settlementFrom(it, group.id) }
                    }
                    Triple(group, expenses.await(), settlements.await())
                }
            }.awaitAll()
        }
        var owed = 0L
        var owe = 0L
        var shared = 0L
        var thisMonth = 0L
        var previousMonth = 0L
        val categories = linkedMapOf<String, Long>()
        val groupBalances = linkedMapOf<String, Long>()
        val currentMonth = java.time.YearMonth.now()
        for ((group, expenses, settlements) in rows) {
            val activeExpenses = expenses.filter { it.status != "deleted" && it.status != "archived" }
            val balances = BalanceEngine.computeBalances(activeExpenses, settlements, group.members)
            val mine = balances[uid] ?: 0L
            groupBalances[group.id] = mine
            if (mine > 0) owed += mine else owe += -mine
            activeExpenses.forEach { expense ->
                val share = expense.splits.firstOrNull { it.user == uid }?.amountPaise ?: 0L
                shared += share
                if (share > 0) categories[expense.category] = (categories[expense.category] ?: 0L) + share
                val instant = runCatching { Instant.parse(expense.date.ifBlank { expense.createdAt }) }.getOrNull()
                val month = instant?.atZone(ZoneId.systemDefault())?.let { java.time.YearMonth.from(it) }
                if (month == currentMonth) thisMonth += share
                if (month == currentMonth.minusMonths(1)) previousMonth += share
            }
        }
        val summary = DashboardSummary(
            totalOwedPaise = owed,
            totalOwePaise = owe,
            netBalancePaise = owed - owe,
            totalSharedPaise = shared,
            categories = categories.map { CategoryTotal(it.key, it.value) }.sortedByDescending { it.amountPaise },
            groupBalances = groupBalances,
            thisMonthPaise = thisMonth,
            previousMonthPaise = previousMonth,
        )
        if (!cachedOnly) LocalSummaryStore.save(appContext, uid, summary)
        return summary
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

    suspend fun groupActivity(groupId: String, limit: Long = 100): List<ActivityItem> {
        val docs = runCatching {
            db.collection("groups").document(groupId)
                .collection("logs").displaySnapshot { savedReads.incrementAndGet() }.documents
        }.getOrDefault(emptyList())

        return docs.map { activityItemFrom(it, groupId) }
            .sortedByDescending { parseEpochMillis(it.createdAt) }
            .take(limit.toInt())
    }

    suspend fun allActivity(sourceGroups: List<Group>? = null): List<ActivityItem> = coroutineScope {
        val resolvedGroups = sourceGroups ?: groups()
        resolvedGroups.map { group -> async { groupActivity(group.id, 50) } }
            .awaitAll()
            .flatten()
            .sortedByDescending { parseEpochMillis(it.createdAt) }
            .take(50)
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
        paidBy: String = "",
        paidByName: String = "",
        payers: List<ExpensePayer> = emptyList(),
    ): MutationResult {
        val totalPaise = com.paymatrix.app.domain.Money.toPaise(amountText)
        require(totalPaise in 1..100_000_000) { "Amount must be between ₹0.01 and ₹10,00,000." }
        require(title.trim().isNotEmpty() && title.length <= 100) { "Title is required." }
        require(participants.isNotEmpty()) { "Choose at least one participant." }
        val splits = BalanceEngine.calculateSplits(totalPaise, splitType, splitValues, participants)
        val expenseRef = db.collection("groups").document(groupId).collection("expenses").document()
        val logRef = db.collection("groups").document(groupId).collection("logs").document()
        val groupRef = db.collection("groups").document(groupId)
        val actor = publicProfile(uid).name
        val stamp = FieldValue.serverTimestamp()
        val effectivePaidBy = if (payers.isNotEmpty()) payers.first().user else paidBy.ifBlank { uid }
        val effectivePaidByName = if (payers.isNotEmpty()) {
            if (payers.size == 1) {
                if (effectivePaidBy == uid) actor else publicProfile(effectivePaidBy).name
            } else {
                val names = mutableListOf<String>()
                for (payer in payers) {
                    names.add(if (payer.user == uid) "You" else publicProfile(payer.user).name)
                }
                names.joinToString(" & ")
            }
        } else {
            paidByName.ifBlank { if (effectivePaidBy == uid) actor else publicProfile(effectivePaidBy).name }
        }
        val payload = mutableMapOf<String, Any>(
            "title" to title.trim(), "description" to "", "amount" to totalPaise / 100.0,
            "amountPaise" to totalPaise, "currency" to "INR", "date" to date.ifBlank { now() }, "paidBy" to effectivePaidBy,
            "paidByName" to effectivePaidByName, "createdBy" to uid, "admin" to uid, "splitType" to splitType,
            "splitData" to splitValues, "participants" to participants, "splitUserIds" to splits.map { it.user },
            "splits" to splits.map { split ->
                val m = mutableMapOf<String, Any>("user" to split.user, "amount" to split.amount, "amountPaise" to split.amountPaise)
                split.percent?.let { m["percent"] = it }
                split.shares?.let { m["shares"] = it }
                split.dishPaise?.let { m["dishPaise"] = it }
                m
            },
            "category" to category.take(50), "attachments" to emptyList<String>(), "notes" to notes.take(500),
            "groupId" to groupId, "status" to "active", "createdAt" to now(), "updatedAt" to now(),
            "lastMutationAt" to stamp, "lastMutationId" to logRef.id, "lastMutationType" to "expense_added",
            "lastEditedBy" to uid, "version" to 1,
        )
        if (payers.isNotEmpty()) {
            payload["payers"] = payers.map { payer ->
                val m = mutableMapOf<String, Any>("user" to payer.user, "amount" to payer.amount, "amountPaise" to payer.amountPaise)
                payer.percent?.let { m["percent"] = it }
                m
            }
        }
        val queued = finishWrite(db.runBatch { batch ->
            batch.set(expenseRef, payload)
            batch.set(logRef, audit("expense_added", "$actor added \"${title.trim()}\" (${com.paymatrix.app.domain.Money.format(totalPaise)})", expenseRef.id, groupId, actor, stamp))
            batch.update(groupRef, "updatedAt", stamp)
        })
        if (!queued) {
            participants.filter { it != uid }.forEach { recipientId ->
                runCatching {
                    val notifId = "expense_added_${expenseRef.id}_$recipientId"
                    db.collection("notifications").document(notifId).set(
                        mapOf(
                            "to" to recipientId,
                            "createdBy" to uid,
                            "message" to "A group member added an expense.",
                            "type" to "expense_added",
                            "relatedId" to expenseRef.id,
                            "groupId" to groupId,
                            "read" to false,
                            "createdAt" to FieldValue.serverTimestamp(),
                        )
                    )
                }
            }
        }
        return MutationResult(expenseRef.id, queued)
    }

    suspend fun updateExpense(expense: Expense, draft: ExpenseDraft): MutationResult {
        enforceMutationThrottle(expense.id)
        val totalPaise = com.paymatrix.app.domain.Money.toPaise(draft.amount)
        require(totalPaise in 1..100_000_000) { "Amount must be between ₹0.01 and ₹10,00,000." }
        require(draft.title.trim().isNotEmpty() && draft.participants.isNotEmpty()) { "Title and participants are required." }
        val splits = if (draft.splitType == expense.splitType && totalPaise == expense.amountPaise && draft.participants == expense.participants && draft.splitValues.isEmpty()) {
            expense.splits
        } else {
            BalanceEngine.calculateSplits(totalPaise, draft.splitType, draft.splitValues, draft.participants)
        }
        val record = db.collection("groups").document(expense.groupId).collection("expenses").document(expense.id)
        val current = record.get().await()
        val currentVersion = (current.get("version") as? Number)?.toLong() ?: 1L
        if (currentVersion != draft.initialVersion) {
            throw StaleEditConflictException("This transaction was modified by another member. Please refresh before saving.")
        }
        val log = db.collection("groups").document(expense.groupId).collection("logs").document()
        val groupRef = db.collection("groups").document(expense.groupId)
        val actor = publicProfile(uid).name
        val stamp = FieldValue.serverTimestamp()
        val effectivePayers = if (draft.payers.isNotEmpty()) draft.payers else expense.payers
        val effectivePaidBy = if (effectivePayers.isNotEmpty()) effectivePayers.first().user else draft.paidBy.ifBlank { expense.paidBy }
        val effectivePaidByName = if (effectivePayers.isNotEmpty()) {
            if (effectivePayers.size == 1) {
                if (effectivePaidBy == uid) actor else publicProfile(effectivePaidBy).name
            } else {
                val names = mutableListOf<String>()
                for (payer in effectivePayers) {
                    names.add(if (payer.user == uid) "You" else publicProfile(payer.user).name)
                }
                names.joinToString(" & ")
            }
        } else {
            draft.paidByName.ifBlank {
                if (effectivePaidBy == uid) actor else publicProfile(effectivePaidBy).name
            }
        }
        val auditChanges = mutableListOf<String>()
        if (draft.title.trim() != expense.title) auditChanges.add("title")
        if (totalPaise != expense.amountPaise) auditChanges.add("amount")
        if (effectivePaidBy != expense.paidBy) auditChanges.add("payer changed to $effectivePaidByName")
        if (draft.category != expense.category) auditChanges.add("category")
        if (draft.splitType != expense.splitType) auditChanges.add("split mode (${draft.splitType})")
        val changeDesc = if (auditChanges.isNotEmpty()) " (${auditChanges.joinToString(", ")})" else ""

        val changes = mutableMapOf<String, Any>(
            "title" to draft.title.trim(), "amount" to totalPaise / 100.0, "amountPaise" to totalPaise,
            "splitType" to draft.splitType, "splitData" to draft.splitValues, "participants" to draft.participants,
            "splitUserIds" to splits.map { it.user }, "splits" to splits.map { split ->
                val m = mutableMapOf<String, Any>("user" to split.user, "amount" to split.amount, "amountPaise" to split.amountPaise)
                split.percent?.let { m["percent"] = it }
                split.shares?.let { m["shares"] = it }
                split.dishPaise?.let { m["dishPaise"] = it }
                m
            },
            "category" to draft.category.take(50), "notes" to draft.notes.take(500), "date" to draft.date.ifBlank { expense.date }, "updatedAt" to stamp,
            "version" to (draft.initialVersion + 1L), "lastMutationAt" to stamp,
            "lastMutationId" to log.id, "lastMutationType" to "expense_updated", "lastEditedBy" to uid,
            "paidBy" to effectivePaidBy,
            "paidByName" to effectivePaidByName,
        )
        if (effectivePayers.isNotEmpty()) {
            changes["payers"] = effectivePayers.map { payer ->
                val m = mutableMapOf<String, Any>("user" to payer.user, "amount" to payer.amount, "amountPaise" to payer.amountPaise)
                payer.percent?.let { m["percent"] = it }
                m
            }
        }
        val queued = finishWrite(db.runBatch { batch ->
            batch.update(record, changes)
            batch.set(log, audit("expense_updated", "$actor edited \"${draft.title.trim()}\"$changeDesc", expense.id, expense.groupId, actor, stamp))
            batch.update(groupRef, "updatedAt", stamp)
        })
        lastMutationTime[expense.id] = System.currentTimeMillis()
        return MutationResult(expense.id, queued)
    }

    suspend fun archiveExpense(groupId: String, expense: Expense) = mutateFinancial(groupId, "expenses", expense.id, "expense_deleted", "Deleted ${expense.title}", "deleted")

    suspend fun restoreExpense(groupId: String, expense: Expense) = mutateFinancial(groupId, "expenses", expense.id, "expense_restored", "Restored ${expense.title}", "active")

    suspend fun archiveSettlement(groupId: String, settlement: Settlement) = mutateFinancial(groupId, "settlements", settlement.id, "settlement_deleted", "Deleted settlement", "deleted")

    suspend fun restoreSettlement(groupId: String, settlement: Settlement) = mutateFinancial(groupId, "settlements", settlement.id, "settlement_restored", "Restored settlement", "active")

    suspend fun settle(groupId: String, payee: String, amountText: String, note: String): String {
        require(isOnline()) { "Connect to the internet before confirming a settlement." }
        require(payee.isNotBlank() && payee != uid) { "Choose another group member." }
        val amountPaise = com.paymatrix.app.domain.Money.toPaise(amountText)
        require(amountPaise in 1..100_000_000) { "Enter a valid settlement amount." }
        db.collection("groups").document(groupId).get(com.google.firebase.firestore.Source.SERVER).await()
        val operationId = "native_${UUID.randomUUID()}".replace("-", "_")
        val settlementRef = db.collection("groups").document(groupId).collection("settlements").document(operationId)
        val logRef = db.collection("groups").document(groupId).collection("logs").document()
        val groupRef = db.collection("groups").document(groupId)
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
            batch.update(groupRef, "updatedAt", stamp)
        }.await()
        runCatching {
            val notifId = "settlement_received_${settlementRef.id}_$payee"
            db.collection("notifications").document(notifId).set(
                mapOf(
                    "to" to payee,
                    "createdBy" to uid,
                    "message" to "A group member recorded a payer-confirmed settlement.",
                    "type" to "settlement_received",
                    "relatedId" to settlementRef.id,
                    "groupId" to groupId,
                    "read" to false,
                    "createdAt" to FieldValue.serverTimestamp(),
                )
            )
        }
        return operationId
    }

    fun friendSnapshots(): Flow<Pair<List<String>, List<DocumentSnapshot>>> = callbackFlow {
        val actor = uid
        var friends: List<String>? = null
        var incoming: List<DocumentSnapshot>? = null
        var outgoing: List<DocumentSnapshot>? = null
        fun emitReady() { if (friends != null && incoming != null && outgoing != null) trySend(friends!! to (incoming!! + outgoing!!)) }
        val registrations = listOf(
            db.collection("users").document(actor).addSnapshotListener { snapshot, error ->
                if (error != null) close(error) else { friends = strings(snapshot?.get("friends")); emitReady() }
            },
            db.collection("friendRequests").whereEqualTo("to", actor).whereEqualTo("status", "pending").addSnapshotListener { snapshot, error ->
                if (error != null) close(error) else { incoming = snapshot?.documents.orEmpty(); emitReady() }
            },
            db.collection("friendRequests").whereEqualTo("from", actor).whereEqualTo("status", "pending").addSnapshotListener { snapshot, error ->
                if (error != null) close(error) else { outgoing = snapshot?.documents.orEmpty(); emitReady() }
            },
        )
        awaitClose { registrations.forEach { it.remove() } }
    }

    suspend fun resolveFriends(friendIds: List<String>, requests: List<DocumentSnapshot>, actor: String): Pair<List<UserProfile>, List<FriendRequest>> = coroutineScope {
        val ids = (friendIds + requests.mapNotNull { if (it.getString("from") == actor) it.getString("to") else it.getString("from") }).distinct()
        val profiles = ids.map { id -> async { id to publicProfile(id) } }.awaitAll().toMap()
        friendIds.mapNotNull { profiles[it] } to requests.map { doc ->
            val other = if (doc.getString("from") == actor) doc.getString("to") else doc.getString("from")
            FriendRequest(doc.id, doc.getString("from").orEmpty(), doc.getString("to").orEmpty(), doc.getString("status").orEmpty(), doc.getString("createdAt").orEmpty(), profiles[other])
        }
    }

    fun logChanges(groupId: String): Flow<Unit> = callbackFlow {
        val registration = db.collection("logGroups").document(groupId).addSnapshotListener { _, error ->
            if (error != null) close(error) else trySend(Unit)
        }
        awaitClose { registration.remove() }
    }

    suspend fun friends(): Pair<List<UserProfile>, List<FriendRequest>> = coroutineScope {
        val actor = uid
        val me = async { auth.profile() }
        val incoming = async { db.collection("friendRequests").whereEqualTo("to", actor).whereEqualTo("status", "pending").displaySnapshot { savedReads.incrementAndGet() }.documents }
        val outgoing = async { db.collection("friendRequests").whereEqualTo("from", actor).whereEqualTo("status", "pending").displaySnapshot { savedReads.incrementAndGet() }.documents }
        resolveFriends(me.await().friends, incoming.await() + outgoing.await(), actor)
    }

    suspend fun sendFriendRequestToMember(groupId: String, memberId: String) {
        val group = db.collection("groups").document(groupId).get(com.google.firebase.firestore.Source.SERVER).await()
        val members = strings(group.get("members"))
        require(uid in members && memberId in members && uid != memberId) { "This member is no longer available." }
        sendFriendRequestToUser(memberId)
    }

    suspend fun sendFriendRequest(friendCode: String) {
        val codeDoc = db.collection("friendCodes").document(friendCode.trim().uppercase()).get().await()
        val target = codeDoc.getString("uid") ?: codeDoc.getString("userId") ?: error("Friend code not found.")
        sendFriendRequestToUser(target)
    }

    private suspend fun sendFriendRequestToUser(target: String) {
        require(target != uid) { "You cannot connect with your own account." }
        val id = "${uid}_$target"
        val ref = db.collection("friendRequests").document(id)
        val existing = db.collection("friendRequests").whereEqualTo("from", uid).whereEqualTo("to", target).limit(1).get().await().documents.firstOrNull()
        if (existing?.getString("status") == "pending") return
        ref.set(mapOf("from" to uid, "to" to target, "status" to "pending", "createdAt" to now())).await()
        runCatching {
            val notifId = "friend_request_${uid}_$target"
            db.collection("notifications").document(notifId).set(
                mapOf(
                    "to" to target,
                    "createdBy" to uid,
                    "message" to "A PayMatrix member sent you a friend request.",
                    "type" to "friend_request",
                    "relatedId" to null,
                    "groupId" to null,
                    "read" to false,
                    "createdAt" to FieldValue.serverTimestamp(),
                )
            )
        }
    }

    suspend fun respondToFriend(request: FriendRequest, accept: Boolean) {
        require(request.to == uid) { "Only the recipient can respond." }
        val requestRef = db.collection("friendRequests").document(request.id)
        if (accept) {
            db.runBatch { batch ->
                batch.update(requestRef, mapOf("status" to "accepted", "respondedAt" to now()))
                batch.update(db.collection("users").document(request.from), "friends", FieldValue.arrayUnion(request.to))
                batch.update(db.collection("users").document(request.to), "friends", FieldValue.arrayUnion(request.from))
            }.await()
            runCatching {
                val notifId = "friend_accepted_${request.from}_$uid"
                db.collection("notifications").document(notifId).set(
                    mapOf(
                        "to" to request.from,
                        "createdBy" to uid,
                        "message" to "A PayMatrix member accepted your friend request.",
                        "type" to "friend_accepted",
                        "relatedId" to null,
                        "groupId" to null,
                        "read" to false,
                        "createdAt" to FieldValue.serverTimestamp(),
                    )
                )
            }
        } else {
            requestRef.update(mapOf("status" to "rejected", "respondedAt" to now())).await()
        }
    }

    suspend fun removeFriend(friendUid: String) {
        require(friendUid.isNotBlank() && friendUid != uid)
        db.runBatch { batch ->
            batch.update(db.collection("users").document(uid), "friends", FieldValue.arrayRemove(friendUid))
            batch.update(db.collection("users").document(friendUid), "friends", FieldValue.arrayRemove(uid))
        }.await()
    }

    suspend fun notifications(limit: Int = CursorPagination.NOTIFICATIONS_INITIAL): List<AppNotification> = db.collection("notifications")
        .whereEqualTo("to", uid)
        .orderBy("createdAt", Query.Direction.DESCENDING)
        .limit(limit.toLong())
        .displaySnapshot { savedReads.incrementAndGet() }.documents.map {
            AppNotification(
                it.id,
                it.getString("title") ?: "paymatrix",
                it.getString("message").orEmpty(),
                it.getString("type").orEmpty(),
                it.getBoolean("read") ?: it.getBoolean("isRead") ?: false,
                timestamp(it.get("createdAt")),
                it.getString("groupId").orEmpty(),
                it.getString("url").orEmpty()
            )
        }

    suspend fun earlierNotifications(lastId: String, limit: Int = CursorPagination.NOTIFICATIONS_PAGE): List<AppNotification> {
        val lastDoc = runCatching { db.collection("notifications").document(lastId).get().await() }.getOrNull()
        val q = if (lastDoc != null && lastDoc.exists() && lastDoc.get("createdAt") != null) {
            db.collection("notifications")
                .whereEqualTo("to", uid)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .startAfter(lastDoc)
                .limit(limit.toLong())
        } else {
            db.collection("notifications")
                .whereEqualTo("to", uid)
                .limit(limit.toLong())
        }
        return q.displaySnapshot { savedReads.incrementAndGet() }.documents.map {
            AppNotification(
                it.id,
                it.getString("title") ?: "paymatrix",
                it.getString("message").orEmpty(),
                it.getString("type").orEmpty(),
                it.getBoolean("read") ?: it.getBoolean("isRead") ?: false,
                timestamp(it.get("createdAt")),
                it.getString("groupId").orEmpty(),
                it.getString("url").orEmpty()
            )
        }
    }


    suspend fun markNotificationRead(id: String) = db.collection("notifications").document(id).update("read", true).await()

    suspend fun markAllNotificationsRead() {
        val unread = db.collection("notifications").whereEqualTo("to", uid).get().await().documents.filter {
            !(it.getBoolean("read") ?: it.getBoolean("isRead") ?: false)
        }
        if (unread.isEmpty()) return
        unread.chunked(450).forEach { chunk ->
            db.runBatch { batch ->
                chunk.forEach { batch.update(it.reference, "read", true) }
            }.await()
        }
    }

    suspend fun logGroups(): List<LogGroup> = db.collection("logGroups").whereArrayContains("members", uid).displaySnapshot { savedReads.incrementAndGet() }.documents.map {
        LogGroup(it.id, it.getString("name") ?: "Log", it.getString("ownerId").orEmpty(), strings(it.get("members")), timestamp(it.get("updatedAt")), it.getString("status") ?: "active")
    }.filter { it.status != "deleted" }.sortedByDescending { parseEpochMillis(it.updatedAt) }

    suspend fun createLogGroup(name: String): String {
        require(name.trim().isNotEmpty()) { "Log name is required." }
        val data = mapOf("name" to name.trim().take(100), "ownerId" to uid, "members" to listOf(uid), "status" to "active", "createdAt" to now(), "updatedAt" to now())
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

    suspend fun deleteLogGroup(groupId: String) = db.collection("logGroups").document(groupId).update(mapOf("status" to "deleted", "deletedAt" to FieldValue.serverTimestamp(), "updatedAt" to FieldValue.serverTimestamp())).await()

    suspend fun logEntries(groupId: String): List<LogEntry> = db.collection("logGroups").document(groupId).collection("entries").displaySnapshot { savedReads.incrementAndGet() }.documents
        .filter { it.getString("status") != "deleted" }
        .map {
        LogEntry(
            id = it.id,
            title = it.getString("title") ?: "Entry",
            amountPaise = paise(it, "amountPaise", "amount"),
            category = it.getString("category") ?: "Other",
            place = it.getString("place").orEmpty(),
            note = it.getString("note").orEmpty(),
            date = it.getString("date").orEmpty(),
            type = it.getString("type") ?: "manual",
            addedBy = it.getString("addedBy").orEmpty(),
            addedByName = it.getString("addedByName") ?: "Member",
            transactionType = it.getString("transactionType") ?: "expense",
            currency = it.getString("currency") ?: "INR",
            accountId = it.getString("accountId") ?: "account_cash",
            accountName = it.getString("accountName") ?: "Cash",
            categoryId = it.getString("categoryId").orEmpty(),
            toAccountId = it.getString("toAccountId").orEmpty(),
            toAccountName = it.getString("toAccountName").orEmpty(),
            friendId = it.getString("friendId").orEmpty(), friendName = it.getString("friendName").orEmpty(),
            sourceGroupId = it.getString("sourceGroupId").orEmpty(), sourceGroupName = it.getString("sourceGroupName").orEmpty(),
            sourceExpenseId = it.getString("sourceExpenseId").orEmpty(),
        )
    }.sortedByDescending { it.date }

    suspend fun logActivity(groupId: String): List<LogActivity> = runCatching {
        db.collection("logGroups").document(groupId)
            .collection("activity").orderBy("createdAt", Query.Direction.DESCENDING).limit(50).displaySnapshot { savedReads.incrementAndGet() }.documents.map {
                val msg = when (val m = it.get("message")) {
                    is String -> m
                    is Map<*, *> -> m["message"]?.toString() ?: m.toString()
                    else -> m?.toString().orEmpty()
                }
                val actor = when (val a = it.get("actorName")) {
                    is String -> a
                    is Map<*, *> -> a["name"]?.toString() ?: a["displayName"]?.toString() ?: "Member"
                    else -> a?.toString() ?: "Member"
                }
                LogActivity(
                    id = it.id,
                    type = it.getString("type").orEmpty(),
                    message = msg,
                    actorId = it.getString("actorId").orEmpty(),
                    actorName = actor,
                    relatedId = it.getString("relatedId").orEmpty(),
                    groupId = groupId,
                    createdAt = timestamp(it.get("createdAt")),
                )
            }.sortedByDescending { parseEpochMillis(it.createdAt) }.take(50)
    }.getOrDefault(emptyList())

    suspend fun saveLogTransaction(groupId: String, draft: LogTransactionDraft, editingId: String? = null): MutationResult {
        val actorId = uid
        val fields = draft.fields()
        val logGroup = db.collection("logGroups").document(groupId)
        val entry = editingId?.let { logGroup.collection("entries").document(it) } ?: logGroup.collection("entries").document()
        val event = logGroup.collection("activity").document()
        val actor = auth.currentUser?.displayName?.takeIf { it.isNotBlank() } ?: "Member"
        val stamp = FieldValue.serverTimestamp()
        val mutation = if (editingId == null) "entry_added" else "entry_updated"
        val payload = fields + mapOf("updatedAt" to stamp, "lastMutationId" to event.id,
            "lastMutationType" to mutation, "lastMutationAt" to stamp, "lastEditedBy" to actorId)
        val queued = finishWrite(db.runBatch { batch ->
            if (editingId == null) {
                val source = if (draft.sourceGroupId.isBlank()) emptyMap() else mapOf(
                    "sourceGroupId" to draft.sourceGroupId, "sourceGroupName" to draft.sourceGroupName, "sourceExpenseId" to draft.sourceExpenseId)
                batch.set(entry, payload + source + mapOf("type" to "manual", "status" to "active", "addedBy" to actorId, "addedByName" to actor, "createdAt" to stamp))
            } else batch.update(entry, payload)
            batch.set(event, logEntryAudit(mutation, "$actor ${if (editingId == null) "added" else "edited"} \"${fields["title"]}\"", entry.id, groupId, actor, stamp))
            batch.update(logGroup, "updatedAt", stamp)
        })
        return MutationResult(entry.id, queued)
    }

    fun logCatalog(): Flow<List<LogCatalogItem>> = callbackFlow {
        val owner = uid
        val registration = db.collection("users").document(owner).collection("logCatalog").addSnapshotListener { snapshot, error ->
            if (error != null) { close(error); return@addSnapshotListener }
            val records = snapshot?.documents.orEmpty().map { LogCatalogItem(it.id, it.getString("name").orEmpty(), it.getString("kind").orEmpty(), it.getBoolean("archived") ?: false, true) }
            trySend((LogDefaults.catalog + records).associateBy { it.id }.values.toList())
        }
        awaitClose { registration.remove() }
    }

    suspend fun saveLogCatalogItem(item: LogCatalogItem, name: String, archived: Boolean): Boolean {
        val trimmed = name.trim()
        require(trimmed.length in 1..50 && item.kind in listOf("account", "category")) { "Use a name between 1 and 50 characters." }
        if (item.persisted && item.name == trimmed && item.archived == archived) return false
        val ref = db.collection("users").document(uid).collection("logCatalog").document(item.id)
        val fields = mapOf("name" to trimmed, "archived" to archived, "updatedAt" to FieldValue.serverTimestamp())
        return finishWrite(if (item.persisted) ref.update(fields) else ref.set(fields + mapOf("kind" to item.kind, "currency" to "INR", "createdAt" to FieldValue.serverTimestamp())))
    }

    suspend fun cancelFriendRequest(request: FriendRequest) {
        val actor = uid
        val ref = db.collection("friendRequests").document(request.id)
        db.runTransaction { transaction ->
            val snapshot = transaction.get(ref)
            if (snapshot.exists()) {
                require(snapshot.getString("from") == actor && snapshot.getString("status") == "pending") { "Only your pending outgoing requests can be cancelled." }
                transaction.delete(ref)
            }
        }.await()
    }

    suspend fun deleteLogEntry(groupId: String, entry: LogEntry): MutationResult {
        val record = db.collection("logGroups").document(groupId).collection("entries").document(entry.id)
        val event = db.collection("logGroups").document(groupId).collection("activity").document()
        val logGroup = db.collection("logGroups").document(groupId)
        val actor = publicProfile(uid).name
        val stamp = FieldValue.serverTimestamp()
        val queued = finishWrite(db.runBatch { batch ->
            batch.update(record, mapOf(
                "status" to "deleted", "deletedAt" to stamp, "updatedAt" to stamp,
                "lastMutationId" to event.id, "lastMutationType" to "entry_deleted",
                "lastMutationAt" to stamp, "lastEditedBy" to uid,
            ))
            batch.set(event, logEntryAudit("entry_deleted", "$actor deleted \"${entry.title}\"", entry.id, groupId, actor, stamp))
            batch.update(logGroup, "updatedAt", stamp)
        })
        return MutationResult(entry.id, queued)
    }

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

    suspend fun addExpenseShareToLog(logGroupId: String, share: ExpenseShare): MutationResult {
        val entryId = "exp_${uid}_${share.sourceGroupId}_${share.sourceExpenseId}"
        val entry = db.collection("logGroups").document(logGroupId).collection("entries").document(entryId)
        val event = db.collection("logGroups").document(logGroupId).collection("activity").document()
        val logGroup = db.collection("logGroups").document(logGroupId)
        val actor = publicProfile(uid).name
        val stamp = FieldValue.serverTimestamp()
        val payload = mapOf(
            "type" to "expense", "title" to share.title, "amount" to share.amountPaise / 100.0,
            "amountPaise" to share.amountPaise, "currency" to "INR", "transactionType" to "expense",
            "accountId" to "account_cash", "accountName" to "Cash", "categoryId" to "category_${share.category.lowercase(Locale.ROOT)}",
            "category" to share.category, "place" to "", "note" to "", "date" to share.date,
            "addedBy" to uid, "addedByName" to actor, "sourceGroupId" to share.sourceGroupId,
            "sourceGroupName" to share.sourceGroupName, "sourceExpenseId" to share.sourceExpenseId,
            "createdAt" to now(), "updatedAt" to now(),
            "status" to "active", "lastMutationId" to event.id, "lastMutationType" to "expense_entry_added",
            "lastMutationAt" to stamp, "lastEditedBy" to uid,
        )
        val queued = finishWrite(db.runBatch { batch ->
            batch.set(entry, payload)
            batch.set(event, logEntryAudit("expense_entry_added", "$actor added \"${share.title}\" from ${share.sourceGroupName}", entryId, logGroupId, actor, stamp))
            batch.update(logGroup, "updatedAt", stamp)
        })
        return MutationResult(entryId, queued)
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
        val logHistory = db.collection("logGroups").whereArrayContains("members", uid).get().await().documents
        val groupsJson = JSONArray()
        for (group in history) {
            val value = JSONObject(jsonSafe(group.data) as Map<*, *>).put("id", group.id)
            val membersList = strings(group.get("members"))
            val isCurrentMember = membersList.contains(uid)
            if (isCurrentMember) {
                runCatching {
                    value.put("expenses", JSONArray(group.reference.collection("expenses").get().await().documents.map { JSONObject(jsonSafe(it.data) as Map<*, *>).put("id", it.id) }))
                    value.put("settlements", JSONArray(group.reference.collection("settlements").get().await().documents.map { JSONObject(jsonSafe(it.data) as Map<*, *>).put("id", it.id) }))
                    value.put("auditLog", JSONArray(group.reference.collection("logs").get().await().documents.map { JSONObject(jsonSafe(it.data) as Map<*, *>).put("id", it.id) }))
                }.onFailure {
                    value.put("subcollectionsAccess", "read_restricted")
                    value.put("expenses", JSONArray())
                    value.put("settlements", JSONArray())
                    value.put("auditLog", JSONArray())
                }
            } else {
                value.put("subcollectionsAccess", "historical_former_member_restricted")
                value.put("expenses", JSONArray())
                value.put("settlements", JSONArray())
                value.put("auditLog", JSONArray())
            }
            groupsJson.put(value)
        }
        val logsJson = JSONArray()
        for (logGroup in logHistory) {
            val value = JSONObject(jsonSafe(logGroup.data) as Map<*, *>).put("id", logGroup.id)
            value.put("entries", JSONArray(logGroup.reference.collection("entries").get().await().documents.map { JSONObject(jsonSafe(it.data) as Map<*, *>).put("id", it.id) }))
            value.put("activity", JSONArray(logGroup.reference.collection("activity").get().await().documents.map { JSONObject(jsonSafe(it.data) as Map<*, *>).put("id", it.id) }))
            logsJson.put(value)
        }
        return JSONObject().put("exportedAt", now()).put("profile", JSONObject(jsonSafe(profile.data.orEmpty()) as Map<*, *>)).put("publicProfile", JSONObject(jsonSafe(publicProfile.data.orEmpty()) as Map<*, *>)).put("groups", groupsJson).put("spendingLogs", logsJson).toString(2)
    }

    private suspend fun mutateFinancial(groupId: String, collection: String, id: String, type: String, message: String, status: String): MutationResult {
        enforceMutationThrottle(id)
        val record = db.collection("groups").document(groupId).collection(collection).document(id)
        val current = record.get().await()
        val log = db.collection("groups").document(groupId).collection("logs").document()
        val groupRef = db.collection("groups").document(groupId)
        val actor = publicProfile(uid).name
        val stamp = FieldValue.serverTimestamp()
        val queued = finishWrite(db.runBatch { batch ->
            batch.update(record, mapOf("status" to status, "updatedAt" to stamp, "version" to (((current.get("version") as? Number)?.toLong() ?: 1L) + 1L), "lastMutationAt" to stamp, "lastMutationId" to log.id, "lastMutationType" to type, "lastEditedBy" to uid))
            batch.set(log, audit(type, message, id, groupId, actor, stamp))
            batch.update(groupRef, "updatedAt", stamp)
        })
        lastMutationTime[id] = System.currentTimeMillis()
        return MutationResult(id, queued)
    }

    private fun audit(type: String, message: String, relatedId: String, groupId: String, actor: String, stamp: Any) = mapOf(
        "type" to type, "message" to message.take(500), "actorId" to uid, "actorName" to actor,
        "relatedId" to relatedId.take(128), "groupId" to groupId, "createdAt" to stamp,
    )

    private fun logEntryAudit(type: String, message: String, relatedId: String, groupId: String, actor: String, stamp: Any) = mapOf(
        "type" to type,
        "message" to message.take(500),
        "actorId" to uid,
        "actorName" to actor,
        "relatedId" to relatedId.take(128),
        "groupId" to groupId,
        "createdAt" to stamp,
    )

    private suspend fun publicProfile(userId: String): UserProfile {
        val public = db.collection("publicProfiles").document(userId).displaySnapshot { savedReads.incrementAndGet() }
        val privateProfile = runCatching { db.collection("users").document(userId).displaySnapshot { savedReads.incrementAndGet() } }.getOrNull()
        return UserProfile(
            uid = userId,
            name = privateProfile?.getString("name") ?: privateProfile?.getString("displayName") ?: public.getString("name") ?: public.getString("displayName") ?: "Member",
            email = privateProfile?.getString("email").orEmpty(),
            avatar = allowedAvatar(privateProfile?.getString("avatar"), privateProfile?.getString("photoURL"), public.getString("avatar"), public.getString("photoURL")),
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
            Split(
                user = user,
                amountPaise = number(map["amountPaise"])?.toLong() ?: ((number(map["amount"])?.toDouble() ?: 0.0) * 100).toLong(),
                percent = number(map["percent"])?.toDouble() ?: number(map["percentage"])?.toDouble(),
                shares = number(map["shares"])?.toInt(),
                dishPaise = number(map["dishPaise"])?.toLong(),
            )
        }.orEmpty()
        val payers = (doc.get("payers") as? List<*>)?.mapNotNull { raw ->
            val map = raw as? Map<*, *> ?: return@mapNotNull null
            val user = when (val value = map["user"]) { is String -> value; is Map<*, *> -> value["uid"] as? String ?: value["_id"] as? String; else -> null } ?: return@mapNotNull null
            ExpensePayer(
                user = user,
                amountPaise = number(map["amountPaise"])?.toLong() ?: ((number(map["amount"])?.toDouble() ?: 0.0) * 100).toLong(),
                percent = number(map["percent"])?.toDouble() ?: number(map["percentage"])?.toDouble(),
            )
        }.orEmpty()
        val version = doc.getLong("version") ?: 1L
        return Expense(doc.id, groupId, doc.getString("title") ?: "Expense", doc.getString("description").orEmpty(), paise(doc, "amountPaise", "amount"), doc.getString("currency") ?: "INR", idValue(doc.get("paidBy")), doc.getString("paidByName") ?: "Member", payers, doc.getString("createdBy") ?: doc.getString("admin").orEmpty(), doc.getString("splitType") ?: "equal", strings(doc.get("participants")), splits, doc.getString("category") ?: "Other", doc.getString("notes").orEmpty(), timestamp(doc.get("date")), timestamp(doc.get("createdAt")), doc.getString("status") ?: "active", version)
    }

    private fun settlementFrom(doc: DocumentSnapshot, groupId: String) = Settlement(doc.id, groupId, idValue(doc.get("payer") ?: doc.get("createdBy")), idValue(doc.get("payee") ?: doc.get("recipient") ?: doc.get("to")), paise(doc, "amountPaise", "amount"), doc.getString("confirmationStatus") ?: "confirmed", doc.getString("status") ?: "active", doc.getString("notes").orEmpty(), timestamp(doc.get("createdAt")))

    private fun allowedAvatar(vararg values: String?): String = values.firstOrNull { value ->
        value?.startsWith("https://lh3.googleusercontent.com/") == true || value?.startsWith("https://firebasestorage.googleapis.com/") == true
    }.orEmpty()

    private fun strings(value: Any?) = (value as? List<*>)?.mapNotNull { when (it) { is String -> it; is Map<*, *> -> idValue(it); else -> null } }.orEmpty()
    private fun idValue(value: Any?): String = when (value) { is String -> value; is Map<*, *> -> (value["uid"] ?: value["_id"] ?: value["id"])?.toString().orEmpty(); else -> "" }
    private fun number(value: Any?) = value as? Number
    private fun paise(doc: DocumentSnapshot, paiseField: String, amountField: String): Long = doc.getLong(paiseField) ?: ((doc.getDouble(amountField) ?: doc.getLong(amountField)?.toDouble() ?: 0.0) * 100).toLong()
    fun parseEpochMillis(value: Any?): Long {
        if (value == null) return 0L
        return when (value) {
            is com.google.firebase.Timestamp -> value.toDate().time
            is java.util.Date -> value.time
            is Number -> value.toLong()
            is String -> {
                if (value.isBlank()) return 0L
                runCatching { Instant.parse(value).toEpochMilli() }
                    .recoverCatching { java.time.OffsetDateTime.parse(value).toInstant().toEpochMilli() }
                    .recoverCatching { java.time.LocalDateTime.parse(value).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() }
                    .recoverCatching { value.toLong() }
                    .getOrDefault(0L)
            }
            else -> 0L
        }
    }

    private fun timestamp(value: Any?): String {
        if (value == null) return now()
        val millis = parseEpochMillis(value)
        return if (millis > 0) runCatching { Instant.ofEpochMilli(millis).toString() }.getOrDefault(now())
        else when (value) {
            is String -> value.ifBlank { now() }
            is com.google.firebase.Timestamp -> value.toDate().toInstant().toString()
            else -> now()
        }
    }

    private fun activityItemFrom(doc: DocumentSnapshot, groupId: String): ActivityItem {
        val message = when (val m = doc.get("message")) {
            is String -> m
            is Map<*, *> -> m["message"]?.toString() ?: m.toString()
            else -> m?.toString().orEmpty()
        }
        val actorName = when (val a = doc.get("actorName")) {
            is String -> a
            is Map<*, *> -> a["name"]?.toString() ?: a["displayName"]?.toString() ?: "Member"
            else -> a?.toString() ?: "Member"
        }
        val type = doc.getString("type").orEmpty()
        val actorId = doc.getString("actorId").orEmpty()
        val relatedId = doc.getString("relatedId").orEmpty()
        val createdAt = timestamp(doc.get("createdAt"))
        return ActivityItem(doc.id, type, message, actorId, actorName, relatedId, groupId, createdAt)
    }

    private fun jsonSafe(value: Any?): Any? = when (value) {
        is com.google.firebase.Timestamp -> value.toDate().toInstant().toString()
        is Map<*, *> -> value.entries.associate { it.key.toString() to jsonSafe(it.value) }
        is List<*> -> value.map(::jsonSafe)
        else -> value
    }
    private fun randomInviteCode(): String = (1..8).map { "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".random() }.joinToString("")
}
