@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import android.Manifest
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.R
import com.paymatrix.app.data.*
import com.paymatrix.app.domain.Money
import kotlinx.coroutines.launch

private data class NavItem(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)
private val navItems = listOf(NavItem("dashboard", "Home", Icons.Default.Home), NavItem("groups", "Groups", Icons.Default.Groups), NavItem("friends", "Friends", Icons.Default.People), NavItem("more", "More", Icons.Default.Menu))

@Composable fun PayMatrixApp(viewModel: PayMatrixViewModel, deepLink: Uri?) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    LaunchedEffect(state.user) {
        if (state.user != null && nav.currentDestination?.route == "login") {
            nav.navigate("dashboard") { popUpTo("login") { inclusive = true } }
        }
    }
    LaunchedEffect(state.message, state.error) {
        val text = state.error ?: state.message
        if (text != null) { snackbar.showSnackbar(text); viewModel.clearFeedback() }
    }
    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { outer ->
        Box(Modifier.fillMaxSize().padding(outer)) {
            NavHost(nav, startDestination = "gate") {
                composable("gate") { GateScreen(state, nav, deepLink) }
                composable("login") { LoginScreen(state, viewModel) }
                composable("dashboard") { MainScaffold("dashboard", nav) { DashboardScreen(state, viewModel, nav) } }
                composable("groups") { MainScaffold("groups", nav) { GroupsScreen(state, viewModel, nav) } }
                composable("friends") { MainScaffold("friends", nav) { FriendsScreen(state, viewModel) } }
                composable("more") { MainScaffold("more", nav) { MoreScreen(nav) } }
                composable("group/{id}") { GroupScreen(it.arguments?.getString("id").orEmpty(), state, viewModel, nav) }
                composable("expense/{groupId}") { ExpenseFormScreen(it.arguments?.getString("groupId").orEmpty(), state, viewModel, nav) }
                composable("profile") { ProfileScreen(state, viewModel, nav) }
                composable("notifications") { NotificationsScreen(state, viewModel, nav) }
                composable("logs") { LogGroupsScreen(state, viewModel, nav) }
                composable("logs/{id}") { LogEntriesScreen(it.arguments?.getString("id").orEmpty(), state, viewModel, nav) }
                composable("scanner") { ScannerScreen(nav) }
                composable("learn") { LearningScreen(nav) }
            }
            BusyOverlay(state.loading)
        }
    }
}

@Composable private fun GateScreen(state: PayMatrixState, nav: NavHostController, deepLink: Uri?) {
    LaunchedEffect(state.user) {
        val route = if (state.user == null) "login" else deepLink?.lastPathSegment?.takeIf { deepLink.pathSegments.firstOrNull() == "join" }?.let { "groups?invite=$it" } ?: "dashboard"
        nav.navigate(route.substringBefore("?")) { popUpTo("gate") { inclusive = true } }
    }
}

@Composable private fun LoginScreen(state: PayMatrixState, vm: PayMatrixViewModel) {
    val context = LocalContext.current
    val clientId = stringResource(R.string.default_web_client_id)
    LaunchedEffect(state.user) { }
    Box(Modifier.fillMaxSize().padding(28.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(20.dp)) {
            Image(painterResource(R.drawable.logo), "paymatrix logo", Modifier.size(104.dp))
            Text("paymatrix", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black)
            Text("Shared expenses, native Android speed.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            ObsidianCard {
                Text("How this version works", fontWeight = FontWeight.Bold)
                Text("Compose draws every screen directly. ViewModels keep UI state. Repositories talk to the same Firebase Auth, Firestore and Cloud Functions used by the web app.")
            }
            Button(onClick = { vm.signIn(context, clientId) }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.AccountCircle, null); Spacer(Modifier.width(8.dp)); Text("Continue with Google") }
        }
    }
}

@Composable private fun MainScaffold(route: String, nav: NavHostController, content: @Composable (PaddingValues) -> Unit) {
    Scaffold(bottomBar = {
        NavigationBar {
            navItems.forEach { item -> NavigationBarItem(selected = item.route == route, onClick = { if (item.route != route) nav.navigate(item.route) { popUpTo("dashboard") { saveState = true }; launchSingleTop = true; restoreState = true } }, icon = { Icon(item.icon, null) }, label = { Text(item.label) }) }
        }
    }, content = content)
}

@Composable private fun DashboardScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    LaunchedEffect(Unit) { vm.loadGroups() }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageTitle("Hello, ${state.user?.name?.substringBefore(' ') ?: "Member"}", "Your shared-money workspace") }
        item { ObsidianCard { Text("Active groups", color = MaterialTheme.colorScheme.onSurfaceVariant); Text(state.groups.size.toString(), style = MaterialTheme.typography.displayMedium, fontWeight = FontWeight.Bold); Button(onClick = { nav.navigate("groups") }) { Text("Manage groups") } } }
        item { Text("Recent groups", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        if (state.groups.isEmpty()) item { EmptyState("No groups yet", "Create one or join with an invite code.") }
        items(state.groups.take(5), key = { it.id }) { group -> GroupRow(group) { nav.navigate("group/${group.id}") } }
        item { ObsidianCard { Text("Native performance", fontWeight = FontWeight.Bold); Text("No WebView: lists, gestures and transitions are rendered by Compose. Firebase still handles realtime cloud data and offline writes.") } }
    }
}

@Composable private fun GroupRow(group: Group, onClick: () -> Unit) {
    ObsidianCard(Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Group, null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(group.name, fontWeight = FontWeight.Bold); Text("${group.members.size} members · ${group.category}", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            Icon(Icons.Default.ChevronRight, null)
        }
    }
}

@Composable private fun GroupsScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    var create by remember { mutableStateOf(false) }; var join by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.loadGroups() }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageTitle("Groups", "Create, join and manage expense circles") }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { Button(onClick = { create = true }, Modifier.weight(1f)) { Icon(Icons.Default.Add, null); Text(" Create") }; OutlinedButton(onClick = { join = true }, Modifier.weight(1f)) { Icon(Icons.Default.Link, null); Text(" Join") } } }
        items(state.groups, key = { it.id }) { GroupRow(it) { nav.navigate("group/${it.id}") } }
    }
    if (create) GroupDialog(
        title = "Create group",
        confirm = "Create",
        onConfirm = { name, detail -> vm.createGroup(name, detail, "General") { create = false; nav.navigate("group/$it") } },
        onDismiss = { create = false },
    )
    if (join) SimpleInputDialog("Join with code", "8-character invite code", "Join", { code -> vm.joinGroup(code) { join = false; nav.navigate("group/$it") } }) { join = false }
}

@Composable private fun GroupScreen(id: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    LaunchedEffect(id) { vm.loadGroup(id) }
    val snapshot = state.group?.takeIf { it.group.id == id }
    var settle by remember { mutableStateOf(false) }
    Scaffold(topBar = { TopAppBar(title = { Text(snapshot?.group?.name ?: "Group") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Default.ArrowBack, null) } }, actions = { IconButton(onClick = { vm.loadGroup(id) }) { Icon(Icons.Default.Refresh, null) } }) }, floatingActionButton = { FloatingActionButton(onClick = { nav.navigate("expense/$id") }) { Icon(Icons.Default.Add, null) } }) { padding ->
        if (snapshot == null) return@Scaffold
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item { ObsidianCard { Text("Net position", color = MaterialTheme.colorScheme.onSurfaceVariant); val mine = snapshot.balances[state.user?.uid] ?: 0; MoneyText(mine); Text(if (mine > 0) "You are owed" else if (mine < 0) "You owe" else "All settled") } }
            item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { Button(onClick = { settle = true }, Modifier.weight(1f)) { Text("Settle up") }; OutlinedButton(onClick = { }) { Text("Invite ${snapshot.group.inviteCode}") } } }
            item { Text("Suggested settlements", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
            if (snapshot.debts.isEmpty()) item { EmptyState("All clear", "There are no outstanding balances.") }
            items(snapshot.debts) { debt -> ObsidianCard { Text("${snapshot.profiles[debt.from]?.name ?: "Member"} pays ${snapshot.profiles[debt.to]?.name ?: "Member"}"); MoneyText(debt.amountPaise) } }
            item { Text("Expenses", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
            if (snapshot.expenses.none { it.status != "deleted" }) item { EmptyState("No expenses", "Tap + to add the first expense.") }
            items(snapshot.expenses.filter { it.status != "deleted" }, key = { it.id }) { expense ->
                ObsidianCard { Row { Column(Modifier.weight(1f)) { Text(expense.title, fontWeight = FontWeight.Bold); Text("Paid by ${snapshot.profiles[expense.paidBy]?.name ?: expense.paidByName} · ${expense.category}", color = MaterialTheme.colorScheme.onSurfaceVariant) }; MoneyText(expense.amountPaise) }; TextButton(onClick = { vm.archiveExpense(expense) }) { Text("Archive") } }
            }
        }
    }
    if (settle && snapshot != null) SettlementDialog(snapshot, state.user?.uid.orEmpty(), onDismiss = { settle = false }) { payee, amount, note -> vm.settle(id, payee, amount, note) { settle = false } }
}

@Composable private fun ExpenseFormScreen(groupId: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    LaunchedEffect(groupId) { if (state.group?.group?.id != groupId) vm.loadGroup(groupId) }
    val snap = state.group
    var title by remember { mutableStateOf("") }; var amount by remember { mutableStateOf("") }; var category by remember { mutableStateOf("General") }; var notes by remember { mutableStateOf("") }
    val selected = remember(snap) { mutableStateMapOf<String, Boolean>().apply { snap?.group?.members?.forEach { put(it, true) } } }
    Scaffold(topBar = { TopAppBar(title = { Text("Add expense") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Default.Close, null) } }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("The payer is always your signed-in account, matching the current Firestore security rule.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            FormField(title, { title = it }, "Title")
            OutlinedTextField(amount, { amount = it }, label = { Text("Amount in ₹") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
            FormField(category, { category = it }, "Category")
            FormField(notes, { notes = it }, "Notes", singleLine = false)
            Text("Split equally between", fontWeight = FontWeight.Bold)
            snap?.group?.members?.forEach { uid -> Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(selected[uid] == true, { selected[uid] = it }); Text(snap.profiles[uid]?.name ?: "Member") } }
            Button(onClick = { vm.addExpense(groupId, title, amount, category, notes, selected.filterValues { it }.keys.toList()) { nav.popBackStack() } }, Modifier.fillMaxWidth()) { Text("Save expense") }
        }
    }
}

@Composable private fun FriendsScreen(state: PayMatrixState, vm: PayMatrixViewModel) {
    var code by remember { mutableStateOf("") }; LaunchedEffect(Unit) { vm.loadFriends() }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageTitle("Friends", "Connect using a private friend code") }
        item { ObsidianCard { FormField(code, { code = it.uppercase() }, "Friend code"); Button(onClick = { vm.sendFriendRequest(code); code = "" }) { Text("Send request") } } }
        item { Text("Requests", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        items(state.friendRequests, key = { it.id }) { request -> ObsidianCard { Text(request.profile?.name ?: "Member", fontWeight = FontWeight.Bold); Text(if (request.to == state.user?.uid) "Wants to connect" else "Request pending"); if (request.to == state.user?.uid) Row { Button(onClick = { vm.respond(request, true) }) { Text("Accept") }; TextButton(onClick = { vm.respond(request, false) }) { Text("Reject") } } } }
        item { Text("Your friends", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        items(state.friends, key = { it.uid }) { friend -> ObsidianCard { Text(friend.name, fontWeight = FontWeight.Bold); if (friend.email.isNotBlank()) Text(friend.email) } }
    }
}

@Composable private fun MoreScreen(nav: NavHostController) {
    val links = listOf("Personal logs" to "logs", "Notifications" to "notifications", "Scan a bill" to "scanner", "Profile & UPI" to "profile", "How the native app works" to "learn")
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageTitle("More", "Native tools and settings") }
        items(links) { (label, route) -> ObsidianCard(Modifier.clickable { nav.navigate(route) }) { Row { Text(label, Modifier.weight(1f), fontWeight = FontWeight.Bold); Icon(Icons.Default.ChevronRight, null) } } }
    }
}

@Composable private fun ProfileScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current; var name by remember(state.user) { mutableStateOf(state.user?.name.orEmpty()) }; var upi by remember(state.user) { mutableStateOf(state.user?.upiId.orEmpty()) }; var phone by remember(state.user) { mutableStateOf(state.user?.phone.orEmpty()) }
    Scaffold(topBar = { BackBar("Profile", nav) }) { padding -> Column(Modifier.padding(padding).padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        PageTitle("Your profile", state.user?.email); FormField(name, { name = it }, "Name"); FormField(upi, { upi = it }, "UPI ID"); FormField(phone, { phone = it }, "Phone"); Button(onClick = { vm.updateProfile(name, upi, phone) }, Modifier.fillMaxWidth()) { Text("Save profile") }; OutlinedButton(onClick = { vm.signOut(context); nav.navigate("login") { popUpTo(0) } }, Modifier.fillMaxWidth()) { Text("Sign out") }
    } }
}

@Composable private fun NotificationsScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { if (it) vm.enablePush(context) }
    LaunchedEffect(Unit) { vm.loadNotifications() }
    Scaffold(topBar = { BackBar("Notifications", nav) }) { padding -> LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Button(onClick = { if (Build.VERSION.SDK_INT >= 33) permission.launch(Manifest.permission.POST_NOTIFICATIONS) else vm.enablePush(context) }, Modifier.fillMaxWidth()) { Text("Enable push on this device") } }
        items(state.notifications, key = { it.id }) { notification -> ObsidianCard(Modifier.clickable { if (!notification.isRead) vm.markRead(notification.id) }) { Text(notification.title, fontWeight = FontWeight.Bold); Text(notification.message); if (!notification.isRead) AssistChip(onClick = { vm.markRead(notification.id) }, label = { Text("Mark read") }) } }
    } }
}

@Composable private fun LogGroupsScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    var create by remember { mutableStateOf(false) }; LaunchedEffect(Unit) { vm.loadLogGroups() }
    Scaffold(topBar = { BackBar("Personal logs", nav) }, floatingActionButton = { FloatingActionButton(onClick = { create = true }) { Icon(Icons.Default.Add, null) } }) { padding -> LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { items(state.logGroups, key = { it.id }) { log -> ObsidianCard(Modifier.clickable { nav.navigate("logs/${log.id}") }) { Text(log.name, fontWeight = FontWeight.Bold); Text("${log.members.size} members") } } } }
    if (create) SimpleInputDialog("New log", "Log name", "Create", { vm.createLogGroup(it); create = false }) { create = false }
}

@Composable private fun LogEntriesScreen(id: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    var add by remember { mutableStateOf(false) }; LaunchedEffect(id) { vm.loadLogEntries(id) }
    Scaffold(topBar = { BackBar("Log entries", nav) }, floatingActionButton = { FloatingActionButton(onClick = { add = true }) { Icon(Icons.Default.Add, null) } }) { padding -> LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { items(state.logEntries, key = { it.id }) { entry -> ObsidianCard { Row { Column(Modifier.weight(1f)) { Text(entry.title, fontWeight = FontWeight.Bold); Text(entry.category) }; MoneyText(entry.amountPaise) } } } } }
    if (add) EntryDialog(
        onConfirm = { title, amount, note -> vm.addLogEntry(id, title, amount, "Other", note); add = false },
        onDismiss = { add = false },
    )
}

@Composable private fun ScannerScreen(nav: NavHostController) {
    var image by remember { mutableStateOf<android.graphics.Bitmap?>(null) }; var result by remember { mutableStateOf<BillScanResult?>(null) }; var error by remember { mutableStateOf<String?>(null) }; var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope(); val scanner = remember { BillScanner() }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { image = it }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { if (it) camera.launch(null) else error = "Camera permission is required to scan directly." }
    Scaffold(topBar = { BackBar("Scan bill", nav) }) { padding -> Column(Modifier.padding(padding).padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("The image is compressed locally, then sent with your Firebase ID token to the existing server-side Gemini endpoint. The API key never enters the APK.")
        Button(onClick = { permission.launch(Manifest.permission.CAMERA) }, Modifier.fillMaxWidth()) { Icon(Icons.Default.CameraAlt, null); Text(" Open camera") }
        image?.let { Image(it.asImageBitmap(), "captured bill", Modifier.fillMaxWidth().height(280.dp), contentScale = ContentScale.Fit); Button(onClick = { scope.launch { busy = true; runCatching { scanner.scan(it) }.onSuccess { scan -> result = scan }.onFailure { failure -> error = failure.message }; busy = false } }, Modifier.fillMaxWidth()) { Text("Analyze bill") } }
        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        result?.let { ObsidianCard { Text(it.merchant.ifBlank { "Scanned bill" }, fontWeight = FontWeight.Bold); Text("Total: ${it.total}"); Text("Date: ${it.date}"); it.items.forEach { item -> Text("• $item") } } }
    } }
}

@Composable private fun LearningScreen(nav: NavHostController) {
    Scaffold(topBar = { BackBar("How it works", nav) }) { padding -> LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageTitle("Native architecture", "Follow one expense from tap to cloud") }
        items(listOf(
            "1. Compose screen" to "Your tap changes local screen state and calls the ViewModel. Compose redraws only affected UI nodes.",
            "2. ViewModel" to "The ViewModel owns loading, data and error state. Rotation does not destroy it.",
            "3. Domain engine" to "Money becomes integer paise. Split and balance algorithms run as pure Kotlin and are unit-tested.",
            "4. Repository" to "The repository converts domain objects into the exact Firestore document shape required by your rules.",
            "5. Atomic Firebase write" to "Expense and audit log are committed in one batch. Either both succeed or neither does.",
            "6. Offline cache" to "Firestore stores readable data and queued writes locally, then synchronizes when the network returns.",
            "7. Cloud Functions" to "Notifications and admin-only work remain trusted server operations. Their secrets never ship in the APK.",
            "8. Release update" to "The release build keeps com.paymatrix.app, the same signing key and a higher versionCode, so Android can install it as an update."
        )) { (title, body) -> ObsidianCard { Text(title, fontWeight = FontWeight.Bold); Text(body) } }
    } }
}

@Composable private fun BackBar(title: String, nav: NavHostController) = TopAppBar(title = { Text(title) }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Default.ArrowBack, null) } })

@Composable private fun GroupDialog(title: String, confirm: String, onConfirm: (String, String) -> Unit, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }; var detail by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(title) }, text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { FormField(name, { name = it }, "Name"); FormField(detail, { detail = it }, "Description") } }, confirmButton = { Button(onClick = { onConfirm(name, detail) }) { Text(confirm) } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable private fun SimpleInputDialog(title: String, label: String, confirm: String, onConfirm: (String) -> Unit, onDismiss: () -> Unit) {
    var value by remember { mutableStateOf("") }; AlertDialog(onDismissRequest = onDismiss, title = { Text(title) }, text = { FormField(value, { value = it }, label) }, confirmButton = { Button(onClick = { onConfirm(value) }) { Text(confirm) } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable private fun SettlementDialog(snapshot: GroupSnapshot, currentUid: String, onDismiss: () -> Unit, onConfirm: (String, String, String) -> Unit) {
    var payee by remember { mutableStateOf(snapshot.group.members.firstOrNull { it != currentUid }.orEmpty()) }; var amount by remember { mutableStateOf("") }; var note by remember { mutableStateOf("Settled up") }; val context = LocalContext.current
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Confirm settlement") }, text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { Text("Choose the person you paid. This records a user-confirmed ledger entry; an Android intent result never proves money moved."); snapshot.group.members.filter { it != currentUid }.forEach { uid -> Row(verticalAlignment = Alignment.CenterVertically) { RadioButton(payee == uid, { payee = uid }); Text(snapshot.profiles[uid]?.name ?: "Member") } }; FormField(amount, { amount = it }, "Amount in ₹"); FormField(note, { note = it }, "Note"); val profile = snapshot.profiles[payee]; if (!profile?.upiId.isNullOrBlank()) OutlinedButton(onClick = { runCatching { UpiLauncher.pay(context, profile!!.upiId, profile.name, Money.toPaise(amount), note) } }, Modifier.fillMaxWidth()) { Text("Open UPI app (optional)") } } }, confirmButton = { Button(onClick = { onConfirm(payee, amount, note) }) { Text("I verified payment — record") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable private fun EntryDialog(onConfirm: (String, String, String) -> Unit, onDismiss: () -> Unit) {
    var title by remember { mutableStateOf("") }; var amount by remember { mutableStateOf("") }; var note by remember { mutableStateOf("") }; AlertDialog(onDismissRequest = onDismiss, title = { Text("Add log entry") }, text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { FormField(title, { title = it }, "Title"); FormField(amount, { amount = it }, "Amount"); FormField(note, { note = it }, "Note") } }, confirmButton = { Button(onClick = { onConfirm(title, amount, note) }) { Text("Add") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}
