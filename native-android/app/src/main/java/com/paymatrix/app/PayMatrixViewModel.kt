package com.paymatrix.app

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.google.firebase.messaging.FirebaseMessaging
import com.paymatrix.app.data.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class PayMatrixState(
    val user: UserProfile? = null,
    val groups: List<Group> = emptyList(),
    val group: GroupSnapshot? = null,
    val friends: List<UserProfile> = emptyList(),
    val friendRequests: List<FriendRequest> = emptyList(),
    val notifications: List<AppNotification> = emptyList(),
    val logGroups: List<LogGroup> = emptyList(),
    val logEntries: List<LogEntry> = emptyList(),
    val loading: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)

class PayMatrixViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(PayMatrixState())
    val state: StateFlow<PayMatrixState> = _state.asStateFlow()

    init { refreshSession() }

    fun clearFeedback() { _state.value = _state.value.copy(message = null, error = null) }

    fun refreshSession() = launch("Loading your account") {
        val user = container.auth.currentUser?.let { container.auth.profile(it.uid) }
        _state.value = _state.value.copy(user = user)
        if (user != null) loadGroupsInternal()
    }

    fun signIn(context: Context, webClientId: String) = launch("Signing in") {
        val profile = container.auth.signInWithGoogle(context, webClientId)
        _state.value = _state.value.copy(user = profile, message = "Welcome, ${profile.name}")
        loadGroupsInternal()
    }

    fun signOut(context: Context) = launch("Signing out") {
        container.auth.signOut(context)
        _state.value = PayMatrixState()
    }

    fun loadGroups() = launch("Loading groups") { loadGroupsInternal() }
    private suspend fun loadGroupsInternal() { _state.value = _state.value.copy(groups = container.repository.groups()) }

    fun createGroup(name: String, description: String, category: String, done: (String) -> Unit) = launch("Creating group") {
        val id = container.repository.createGroup(name, description, category)
        loadGroupsInternal(); done(id)
    }

    fun joinGroup(code: String, done: (String) -> Unit) = launch("Joining group") {
        val id = container.repository.joinGroup(code)
        loadGroupsInternal(); done(id)
    }

    fun loadGroup(id: String) = launch("Loading group") { _state.value = _state.value.copy(group = container.repository.groupSnapshot(id)) }

    fun addExpense(groupId: String, title: String, amount: String, category: String, notes: String, participants: List<String>, done: () -> Unit) = launch("Saving expense") {
        container.repository.addExpense(groupId, title, amount, category, notes, participants)
        _state.value = _state.value.copy(group = container.repository.groupSnapshot(groupId), message = "Expense saved")
        done()
    }

    fun archiveExpense(expense: Expense) = launch("Archiving expense") {
        container.repository.archiveExpense(expense.groupId, expense)
        _state.value = _state.value.copy(group = container.repository.groupSnapshot(expense.groupId), message = "Expense archived")
    }

    fun settle(groupId: String, payee: String, amount: String, note: String, done: () -> Unit) = launch("Recording settlement") {
        container.repository.settle(groupId, payee, amount, note)
        _state.value = _state.value.copy(group = container.repository.groupSnapshot(groupId), message = "Settlement recorded after your confirmation")
        done()
    }

    fun loadFriends() = launch("Loading friends") {
        val (friends, requests) = container.repository.friends()
        _state.value = _state.value.copy(friends = friends, friendRequests = requests)
    }

    fun sendFriendRequest(code: String) = launch("Sending request") {
        container.repository.sendFriendRequest(code); loadFriendsInternal(); _state.value = _state.value.copy(message = "Friend request sent")
    }

    fun respond(request: FriendRequest, accept: Boolean) = launch("Updating request") {
        container.repository.respondToFriend(request, accept); loadFriendsInternal()
    }

    private suspend fun loadFriendsInternal() {
        val (friends, requests) = container.repository.friends(); _state.value = _state.value.copy(friends = friends, friendRequests = requests)
    }

    fun loadNotifications() = launch("Loading notifications") { _state.value = _state.value.copy(notifications = container.repository.notifications()) }
    fun markRead(id: String) = launch("Updating notification") { container.repository.markNotificationRead(id); _state.value = _state.value.copy(notifications = container.repository.notifications()) }

    fun enablePush(context: Context) = launch("Enabling notifications") {
        val token = FirebaseMessaging.getInstance().token.await(); container.auth.savePushToken(context, token)
        _state.value = _state.value.copy(message = "Push notifications enabled on this device")
    }

    fun loadLogGroups() = launch("Loading logs") { _state.value = _state.value.copy(logGroups = container.repository.logGroups()) }
    fun createLogGroup(name: String) = launch("Creating log") { container.repository.createLogGroup(name); _state.value = _state.value.copy(logGroups = container.repository.logGroups()) }
    fun loadLogEntries(groupId: String) = launch("Loading entries") { _state.value = _state.value.copy(logEntries = container.repository.logEntries(groupId)) }
    fun addLogEntry(groupId: String, title: String, amount: String, category: String, note: String) = launch("Adding entry") {
        container.repository.addLogEntry(groupId, title, amount, category, note); _state.value = _state.value.copy(logEntries = container.repository.logEntries(groupId))
    }

    fun updateProfile(name: String, upi: String, phone: String) = launch("Updating profile") {
        container.auth.updateProfile(name, upi, phone); _state.value = _state.value.copy(user = container.auth.profile(), message = "Profile updated")
    }

    private fun launch(label: String, action: suspend () -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            runCatching { action() }
                .onFailure { _state.value = _state.value.copy(error = it.message ?: "$label failed") }
            _state.value = _state.value.copy(loading = false)
        }
    }

    class Factory(private val container: AppContainer) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = PayMatrixViewModel(container) as T
    }
}
