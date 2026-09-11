package com.paymatrix.app

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.google.firebase.messaging.FirebaseMessaging
import com.paymatrix.app.data.*
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.Job
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.FlowPreview
import java.time.Instant

data class PayMatrixState(
    val user: UserProfile? = null,
    val groups: List<Group> = emptyList(),
    val summary: DashboardSummary = DashboardSummary(),
    val summaryLoaded: Boolean = false,
    val analytics: AnalyticsSnapshot = AnalyticsSnapshot(),
    val activity: List<ActivityItem> = emptyList(),
    val group: GroupSnapshot? = null,
    val groupCache: Map<String, GroupSnapshot> = emptyMap(),
    val friends: List<UserProfile> = emptyList(),
    val friendRequests: List<FriendRequest> = emptyList(),
    val notifications: List<AppNotification> = emptyList(),
    val logGroups: List<LogGroup> = emptyList(),
    val logEntries: List<LogEntry> = emptyList(),
    val logActivity: List<LogActivity> = emptyList(),
    val logCatalog: List<LogCatalogItem> = LogDefaults.catalog,
    val logCatalogLoading: Boolean = true,
    val logCatalogError: String = "",
    val activeLogId: String? = null,
    val logEntriesLoading: Boolean = false,
    val logEntriesError: String = "",
    val expenseShares: List<ExpenseShare> = emptyList(),
    val flags: FeatureFlags = FeatureFlags(),
    val billScan: BillScanResult? = null,
    val syncStatus: SyncStatus = SyncStatus(),
    val lastSyncedAt: String = "",
    val loading: Boolean = false,
    val loadingLabel: String = "",
    val message: String? = null,
    val error: String? = null,
    val verificationEmail: String = "",
    val pendingInviteCode: String? = null,
)

@OptIn(FlowPreview::class)
class PayMatrixViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(PayMatrixState(loading = true, loadingLabel = "Loading your account"))
    val state: StateFlow<PayMatrixState> = _state.asStateFlow()
    private var homeRealtimeJob: Job? = null
    private var groupRealtimeJob: Job? = null
    private val foregroundActions = ForegroundActionGate()

    init {
        viewModelScope.launch {
            container.repository.syncStatus.collect { status ->
                _state.value = _state.value.copy(syncStatus = status)
            }
        }
        refreshSession()
    }

    fun clearFeedback() { _state.value = _state.value.copy(message = null, error = null) }
    fun clearMessage(message: String) {
        if (_state.value.message == message) _state.value = _state.value.copy(message = null)
    }

    fun refreshSession() = action("Loading your account") {
        val user = container.auth.currentVerifiedProfile()
        FirebaseInstrumentation.setUser(null, user?.uid)
        _state.value = _state.value.copy(user = user, verificationEmail = if (user == null) container.auth.pendingVerificationEmail() else "")
        if (user != null) {
            container.repository.watchPendingWrites()
            val saved = runCatching { container.repository.cachedHome() }.getOrNull()
            if (saved != null) {
                _state.value = _state.value.copy(groups = saved.first, summary = saved.second, summaryLoaded = true, loading = false,
                    message = "Showing saved data. Updates will appear when connected.")
                startHomeRealtime()
                viewModelScope.launch { runCatching { refreshHomeInternal() }.onFailure { reportFailure(it, "Refresh failed") } }
            } else { refreshHomeInternal(); startHomeRealtime() }
        } else {
            homeRealtimeJob?.cancel(); homeRealtimeJob = null
            groupRealtimeJob?.cancel(); groupRealtimeJob = null
        }
    }

    fun signIn(context: Context, webClientId: String) = action("Signing in", timeoutMs = 60_000L) {
        val profile = container.auth.signInWithGoogle(context, webClientId)
        FirebaseInstrumentation.setUser(context, profile.uid)
        _state.value = _state.value.copy(user = profile, verificationEmail = "", message = "Welcome, ${profile.name}")
        container.repository.watchPendingWrites(); refreshHomeInternal(); startHomeRealtime()
    }

    fun createEmailAccount(name: String, email: String, password: String) = action("Creating account") {
        val address = container.auth.createEmailAccount(name, email, password)
        _state.value = _state.value.copy(user = null, verificationEmail = address, message = "Verification email sent")
    }

    fun signInWithEmail(email: String, password: String) = action("Signing in") {
        val profile = container.auth.signInWithEmail(email, password)
        if (profile == null) {
            _state.value = _state.value.copy(user = null, verificationEmail = container.auth.pendingVerificationEmail(), message = "Verify your email to continue")
        } else {
            FirebaseInstrumentation.setUser(null, profile.uid)
            _state.value = _state.value.copy(user = profile, verificationEmail = "", message = "Welcome, ${profile.name}")
            container.repository.watchPendingWrites(); refreshHomeInternal(); startHomeRealtime()
        }
    }

    fun checkEmailVerification() = action("Checking email") {
        val profile = container.auth.refreshEmailVerification()
        if (profile == null) {
            _state.value = _state.value.copy(verificationEmail = container.auth.pendingVerificationEmail(), message = "Not verified yet")
        } else {
            FirebaseInstrumentation.setUser(null, profile.uid)
            _state.value = _state.value.copy(user = profile, verificationEmail = "", message = "Welcome, ${profile.name}")
            container.repository.watchPendingWrites(); refreshHomeInternal(); startHomeRealtime()
        }
    }

    fun resendEmailVerification() = action("Sending email") {
        val address = container.auth.resendEmailVerification()
        _state.value = _state.value.copy(verificationEmail = address, message = "Verification email resent")
    }

    fun sendPasswordReset(email: String) = action("Sending reset email") {
        container.auth.sendPasswordReset(email)
        _state.value = _state.value.copy(message = "If that address has an account, a reset email is on its way")
    }

    fun useAnotherAccount(context: Context) = action("Signing out") {
        container.auth.signOut(context)
        _state.value = PayMatrixState()
    }

    fun signOut(context: Context, done: () -> Unit = {}) = action("Signing out") {
        homeRealtimeJob?.cancel(); groupRealtimeJob?.cancel()
        container.auth.signOut(context)
        _state.value = PayMatrixState()
        done()
    }

    fun usesPasswordProvider(): Boolean = container.auth.usesPasswordProvider()

    fun linkEmailPassword(password: String, done: () -> Unit = {}) = action("Adding email sign-in") {
        container.auth.linkEmailPassword(password)
        _state.value = _state.value.copy(message = "Email sign-in added without changing your account")
        done()
    }

    fun deleteAccount(context: Context, webClientId: String, password: String = "", done: () -> Unit) = action("Deleting your account") {
        container.auth.deleteAccount(context, webClientId, password)
        _state.value = PayMatrixState(message = "Account deleted")
        done()
    }

    fun refreshHome() = action("Refreshing") { refreshHomeInternal() }

    private suspend fun refreshHomeInternal() = coroutineScope {
        val savedReadCount = container.repository.cachedDisplayReadCount
        val groups = container.repository.groups()
        val summary = async { container.repository.dashboardSummary(groups) }
        val notifications = async { container.repository.notifications() }
        val flags = async { runCatching { container.repository.featureFlags() }.getOrDefault(FeatureFlags()) }
        _state.value = _state.value.copy(
            groups = groups,
            summary = summary.await(),
            summaryLoaded = true,
            notifications = notifications.await(),
            flags = flags.await(),
            lastSyncedAt = if (container.repository.isOnline() && container.repository.cachedDisplayReadCount == savedReadCount) Instant.now().toString() else _state.value.lastSyncedAt,
        )
    }

    fun loadGroups() = action("Loading groups", showLoading = false) {
        val groups = container.repository.groups()
        _state.value = _state.value.copy(groups = groups, summary = container.repository.dashboardSummary(groups), summaryLoaded = true)
    }

    fun createGroup(name: String, description: String, category: String, members: List<String> = emptyList(), done: (String) -> Unit) = action("Creating group") {
        val id = container.repository.createGroup(name, description, category)
        val failedMembers = mutableListOf<String>()
        members.distinct().forEach { member ->
            runCatching { container.repository.addGroupMember(id, member) }
                .onFailure { failedMembers.add(member) }
        }
        if (failedMembers.isNotEmpty()) {
            _state.value = _state.value.copy(message = "Group created, but ${failedMembers.size} member(s) could not be added.")
        }
        done(id)
        refreshAfterSave { loadGroupsInternal() }
    }

    fun joinGroup(code: String, done: (String) -> Unit) = action("Joining group") {
        val id = container.repository.joinGroup(code)
        clearPendingInvite()
        done(id)
        refreshAfterSave { loadGroupsInternal() }
    }

    fun updateGroup(id: String, name: String, description: String, category: String, done: () -> Unit) = action("Saving group") {
        container.repository.updateGroup(id, name, description, category)
        done()
        refreshAfterSave {
            reloadGroup(id)
            loadGroupsInternal()
        }
    }

    fun addGroupMember(id: String, memberUid: String, done: () -> Unit = {}) = action("Adding member") {
        container.repository.addGroupMember(id, memberUid)
        done()
        refreshAfterSave { reloadGroup(id) }
    }

    fun removeGroupMember(id: String, memberUid: String) = action("Removing member") { container.repository.removeGroupMember(id, memberUid); reloadGroup(id) }

    fun leaveGroup(id: String, done: () -> Unit) = action("Leaving group") { container.repository.leaveGroup(id); loadGroupsInternal(); done() }

    fun deleteGroup(id: String, done: () -> Unit) = action("Deleting group") { container.repository.deleteGroup(id); loadGroupsInternal(); done() }

    fun loadGroup(id: String) = action("Loading group", showLoading = false) {
        _state.value.groupCache[id]?.let { cached ->
            if (_state.value.group?.group?.id != id) {
                _state.value = _state.value.copy(group = cached)
            }
        }
        reloadGroup(id)
        startGroupRealtime(id)
    }
    private suspend fun reloadGroup(id: String) {
        val snapshot = container.repository.groupSnapshot(id)
        _state.value = _state.value.copy(
            group = snapshot,
            groupCache = _state.value.groupCache + (id to snapshot)
        )
    }
    private suspend fun loadGroupsInternal() { _state.value = _state.value.copy(groups = container.repository.groups()) }

    fun saveExpense(groupId: String, draft: ExpenseDraft, editing: Expense? = null, done: () -> Unit) = action(if (editing == null) "Recording expense" else "Updating expense") {
        val result = if (editing == null) container.repository.addExpense(
            groupId, draft.title, draft.amount, draft.category, draft.notes,
            draft.participants, draft.splitType, draft.splitValues, draft.date,
            draft.paidBy, draft.paidByName, draft.payers
        )
        else container.repository.updateExpense(editing, draft)
        _state.value = _state.value.copy(message = when {
            result.queued -> "Saved on this device · awaiting sync"
            editing == null -> "Expense recorded"
            else -> "Expense updated"
        })
        done()
        refreshAfterSave { reloadGroup(groupId) }
    }

    fun archiveExpense(expense: Expense) = action("Deleting expense") { val result = container.repository.archiveExpense(expense.groupId, expense); reloadGroup(expense.groupId); _state.value = _state.value.copy(message = if (result.queued) "Deleted offline · audit pending sync" else "Expense deleted · restore it from Activity") }
    fun restoreExpense(expense: Expense) = action("Restoring expense") { val result = container.repository.restoreExpense(expense.groupId, expense); reloadGroup(expense.groupId); if (result.queued) _state.value = _state.value.copy(message = "Restore pending sync") }
    fun archiveSettlement(settlement: Settlement) = action("Deleting settlement") { val result = container.repository.archiveSettlement(settlement.groupId, settlement); reloadGroup(settlement.groupId); if (result.queued) _state.value = _state.value.copy(message = "Settlement deletion pending sync") }
    fun restoreSettlement(settlement: Settlement) = action("Restoring settlement") { val result = container.repository.restoreSettlement(settlement.groupId, settlement); reloadGroup(settlement.groupId); if (result.queued) _state.value = _state.value.copy(message = "Settlement restore pending sync") }

    fun settle(groupId: String, payee: String, amount: String, note: String, done: () -> Unit) = action("Recording settlement") {
        container.repository.settle(groupId, payee, amount, note)
        _state.value = _state.value.copy(message = "Payment recorded after your confirmation")
        done()
        refreshAfterSave { reloadGroup(groupId) }
    }

    fun loadFriends() = action("Loading friends", showLoading = false) { loadFriendsInternal() }
    private suspend fun loadFriendsInternal() { val result = container.repository.friends(); _state.value = _state.value.copy(friends = result.first, friendRequests = result.second) }
    fun sendFriendRequestToMember(groupId: String, memberId: String) = action("Sending request") {
        container.repository.sendFriendRequestToMember(groupId, memberId)
        loadFriendsInternal()
        _state.value = _state.value.copy(message = "Friend request sent")
    }
    fun sendFriendRequest(code: String) = action("Sending request") { container.repository.sendFriendRequest(code); loadFriendsInternal(); _state.value = _state.value.copy(message = "Friend request sent") }
    fun respond(request: FriendRequest, accept: Boolean) = action("Updating request") { container.repository.respondToFriend(request, accept); loadFriendsInternal() }
    fun removeFriend(friendUid: String, done: () -> Unit = {}) = action("Removing friend") { container.repository.removeFriend(friendUid); loadFriendsInternal(); done() }

    fun loadNotifications(force: Boolean = false) = action("Loading activity", showLoading = false) {
        if (force || _state.value.notifications.isEmpty()) {
            _state.value = _state.value.copy(notifications = container.repository.notifications())
        }
    }

    fun loadEarlierNotifications(done: (Boolean) -> Unit = {}) = viewModelScope.launch {
        val current = _state.value.notifications
        val lastId = current.lastOrNull()?.id ?: run { done(false); return@launch }
        runCatching { container.repository.earlierNotifications(lastId, CursorPagination.NOTIFICATIONS_PAGE) }
            .onSuccess { earlier ->
                val merged = (current + earlier).distinctBy { it.id }
                    .sortedWith { a, b -> CursorPagination.compareRecords(CursorPagination.parseEpochMillis(a.createdAt), a.id, CursorPagination.parseEpochMillis(b.createdAt), b.id) }
                _state.value = _state.value.copy(notifications = merged)
                done(earlier.isNotEmpty())
            }
            .onFailure {
                reportFailure(it, "Could not load earlier notifications")
                done(false)
            }
    }
    fun markRead(id: String) = action("Updating activity", false) { container.repository.markNotificationRead(id); _state.value = _state.value.copy(notifications = container.repository.notifications()) }
    fun markAllRead() = action("Marking all read") { container.repository.markAllNotificationsRead(); _state.value = _state.value.copy(notifications = container.repository.notifications()) }
    fun loadActivity() = action("Loading activity", showLoading = false) { _state.value = _state.value.copy(activity = container.repository.allActivity(_state.value.groups.ifEmpty { container.repository.groups() })) }
    fun loadAnalytics() = action("Calculating analytics", showLoading = false) { _state.value = _state.value.copy(analytics = container.repository.analytics(_state.value.groups.ifEmpty { container.repository.groups() })) }

    fun enablePush(context: Context) = action("Enabling notifications") {
        val token = FirebaseMessaging.getInstance().token.await(); container.auth.savePushToken(context, token)
        _state.value = _state.value.copy(message = "Push notifications enabled")
    }

    fun loadLogGroups() = action("Loading logs", showLoading = false) { _state.value = _state.value.copy(logGroups = container.repository.logGroups()) }
    fun createLogGroup(name: String, members: List<String> = emptyList(), done: (String) -> Unit = {}) = action("Creating log") {
        val id = container.repository.createLogGroup(name)
        members.distinct().forEach { member -> runCatching { container.repository.addLogGroupMembers(id, listOf(member)) } }
        done(id)
        refreshAfterSave { _state.value = _state.value.copy(logGroups = container.repository.logGroups()) }
    }
    fun renameLogGroup(id: String, name: String) = action("Renaming log") { container.repository.renameLogGroup(id, name); _state.value = _state.value.copy(logGroups = container.repository.logGroups()) }
    fun leaveLogGroup(id: String, done: () -> Unit) = action("Leaving log") { _state.value.user?.uid?.let { container.repository.removeLogGroupMember(id, it) }; _state.value = _state.value.copy(logGroups = container.repository.logGroups()); done() }
    fun deleteLogGroup(id: String, done: () -> Unit) = action("Deleting log") { container.repository.deleteLogGroup(id); _state.value = _state.value.copy(logGroups = container.repository.logGroups()); done() }
    fun loadLogEntries(groupId: String) = action("Loading entries", showLoading = false) {
        _state.value = _state.value.copy(
            logEntries = container.repository.logEntries(groupId),
            logActivity = container.repository.logActivity(groupId),
        )
    }
    fun saveLogEntry(groupId: String, draft: LogTransactionDraft, editing: LogEntry? = null, done: () -> Unit = {}) = action("Saving transaction") {
        val result = container.repository.saveLogTransaction(groupId, draft, editing?.id)
        done()
        _state.value = _state.value.copy(message = if (result.queued) "Saved on this device · awaiting sync" else "Transaction saved")
    }
    suspend fun observeLogCatalog() {
        val actor = _state.value.user?.uid ?: return
        _state.value = _state.value.copy(logCatalog = LogDefaults.catalog, logCatalogLoading = true, logCatalogError = "")
        try {
            container.repository.logCatalog().collect { items ->
                if (_state.value.user?.uid == actor) _state.value = _state.value.copy(logCatalog = items, logCatalogLoading = false)
            }
        } catch (cancelled: CancellationException) { throw cancelled }
        catch (error: Exception) {
            if (_state.value.user?.uid == actor) _state.value = _state.value.copy(logCatalogLoading = false, logCatalogError = "Custom accounts and categories could not load. Default selections are available.")
        }
    }
    suspend fun observeLogEntries(groupId: String) {
        val actor = _state.value.user?.uid ?: return
        _state.value = _state.value.copy(activeLogId = groupId, logEntries = emptyList(), logActivity = emptyList(), logEntriesLoading = true, logEntriesError = "")
        try {
            container.repository.logChanges(groupId).debounce(150L).collect {
                val result = coroutineScope {
                    val entries = async { container.repository.logEntries(groupId) }
                    val activity = async { container.repository.logActivity(groupId) }
                    entries.await() to activity.await()
                }
                if (_state.value.user?.uid == actor && _state.value.activeLogId == groupId) _state.value = _state.value.copy(logEntries = result.first, logActivity = result.second, logEntriesLoading = false)
            }
        } catch (cancelled: CancellationException) { throw cancelled }
        catch (error: Exception) {
            if (_state.value.user?.uid == actor && _state.value.activeLogId == groupId) _state.value = _state.value.copy(logEntriesError = "Could not refresh this log. Reconnect and retry.")
            reportFailure(error, "Could not refresh this log")
        }
        finally { if (_state.value.activeLogId == groupId) _state.value = _state.value.copy(logEntriesLoading = false) }
    }
    suspend fun observeFriends() {
        val actor = _state.value.user?.uid ?: return
        _state.value = _state.value.copy(friends = emptyList(), friendRequests = emptyList())
        try {
            container.repository.friendSnapshots().debounce(150L).collect { (ids, documents) ->
                val result = container.repository.resolveFriends(ids, documents, actor)
                if (_state.value.user?.uid == actor) _state.value = _state.value.copy(friends = result.first, friendRequests = result.second)
            }
        } catch (cancelled: CancellationException) { throw cancelled }
        catch (error: Exception) { reportFailure(error, "Could not refresh connections") }
    }
    fun saveLogCatalogItem(item: LogCatalogItem, name: String, archived: Boolean = item.archived, done: () -> Unit = {}) = action("Saving selection") {
        val queued = container.repository.saveLogCatalogItem(item, name, archived)
        _state.value = _state.value.copy(message = if (queued) "Saved on this device · awaiting sync" else "Selection saved")
        done()
    }
    fun cancelFriendRequest(request: FriendRequest) = action("Cancelling request") { container.repository.cancelFriendRequest(request) }
    fun deleteLogEntry(groupId: String, entry: LogEntry) = action("Deleting entry") {
        val result = container.repository.deleteLogEntry(groupId, entry)
        _state.value = _state.value.copy(
            logEntries = _state.value.logEntries.filterNot { it.id == entry.id },
            message = if (result.queued) "Deleted offline · audit pending sync" else "Entry deleted · audit history preserved",
        )
    }
    fun loadExpenseShares() = action("Loading transactions", showLoading = false) { _state.value = _state.value.copy(expenseShares = container.repository.myExpenseShares(_state.value.groups.ifEmpty { container.repository.groups() })) }
    fun addExpenseShareToLog(groupId: String, share: ExpenseShare) = action("Adding transaction") {
        val result = container.repository.addExpenseShareToLog(groupId, share)
        _state.value = _state.value.copy(message = if (result.queued) "Added offline · pending sync" else "Transaction added to log")
    }

    fun updateProfile(name: String, upi: String, phone: String, done: () -> Unit = {}) = action("Updating profile") {
        container.auth.updateProfile(name, upi, phone)
        _state.value = _state.value.copy(user = _state.value.user?.copy(name = name.trim(), upiId = upi.trim(), phone = phone.trim()), message = "Profile updated")
        done()
    }

    fun setBillScan(result: BillScanResult?) { _state.value = _state.value.copy(billScan = result) }
    fun exportData(done: (String) -> Unit) = action("Preparing your export", timeoutMs = 45000L) { done(container.repository.exportMyData()) }

    fun setPendingInvite(code: String) {
        val sanitized = code.trim().uppercase()
        if (sanitized.isNotBlank()) {
            _state.value = _state.value.copy(pendingInviteCode = sanitized)
        }
    }

    fun clearPendingInvite() {
        _state.value = _state.value.copy(pendingInviteCode = null)
    }

    private fun startHomeRealtime() {
        homeRealtimeJob?.cancel()
        homeRealtimeJob = viewModelScope.launch {
            launch {
                container.repository.groupListChanges().debounce(500).collect {
                    runCatching { refreshHomeInternal() }.onFailure { reportFailure(it, "Live refresh failed") }
                }
            }
            launch {
                container.repository.notificationChanges().debounce(250).collect { liveNotifications ->
                    val current = _state.value.notifications
                    val merged = (liveNotifications + current).distinctBy { it.id }
                        .sortedWith { a, b -> CursorPagination.compareRecords(CursorPagination.parseEpochMillis(a.createdAt), a.id, CursorPagination.parseEpochMillis(b.createdAt), b.id) }
                    _state.value = _state.value.copy(notifications = merged)
                }
            }
            launch {
                container.repository.featureFlagChanges().debounce(250).collect {
                    runCatching { container.repository.featureFlags() }
                        .onSuccess { flags -> _state.value = _state.value.copy(flags = flags) }
                        .onFailure { reportFailure(it, "Feature refresh failed") }
                }
            }
        }
    }

    fun stopGroupRealtime() {
        groupRealtimeJob?.cancel()
        groupRealtimeJob = null
    }

    private fun startGroupRealtime(groupId: String) {
        groupRealtimeJob?.cancel()
        groupRealtimeJob = viewModelScope.launch {
            container.repository.groupChanges(groupId).debounce(350).collect {
                runCatching { reloadGroup(groupId) }.onFailure { reportFailure(it, "Group refresh failed") }
            }
        }
    }

    private fun reportFailure(error: Throwable, label: String) {
        rethrowCancellation(error)
        if (error is androidx.credentials.exceptions.GetCredentialCancellationException && !isGoogleReauthFailure(error)) return
        // Keep diagnostics free of user data and SDK exception messages.
        com.google.firebase.crashlytics.FirebaseCrashlytics.getInstance().apply {
            log("action_failed: $label")
            val code = (error as? com.google.firebase.firestore.FirebaseFirestoreException)?.code?.name
                ?: (error as? com.google.firebase.auth.FirebaseAuthException)?.errorCode
                ?: (error as? androidx.credentials.exceptions.GetCredentialException)?.type
                ?: "UNEXPECTED"
            recordException(IllegalStateException("Action failure: $label [$code]").apply { stackTrace = error.stackTrace })
        }
        _state.value = _state.value.copy(error = actionErrorMessage(error))
    }

    private fun action(label: String, showLoading: Boolean = true, timeoutMs: Long = 15000L, block: suspend () -> Unit) {
        // Set before launch: repeated taps cannot enqueue duplicate financial writes.
        if (showLoading && !foregroundActions.tryBegin()) return
        if (showLoading) {
            _state.value = _state.value.copy(loading = true, loadingLabel = label, error = null)
        }
        viewModelScope.launch {
            try {
                withTimeout(timeoutMs) {
                    block()
                }
            } catch (error: TimeoutCancellationException) {
                reportFailure(error, label)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure(error, label)
            } finally {
                // A background fetch must never clear a save operation's busy state.
                if (showLoading) {
                    foregroundActions.finish()
                    _state.value = _state.value.copy(loading = false, loadingLabel = "")
                }
            }
        }
    }

    private fun refreshAfterSave(block: suspend () -> Unit) {
        viewModelScope.launch {
            try { block() }
            catch (error: CancellationException) { throw error }
            catch (error: Exception) {
                _state.value = _state.value.copy(error = "Your change was saved, but the view could not refresh. Refresh to see it.")
            }
        }
    }

    class Factory(private val container: AppContainer) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = PayMatrixViewModel(container) as T
    }
}
