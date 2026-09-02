@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import android.Manifest
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.navigation.NavHostController
import com.paymatrix.app.BuildConfig
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.R
import com.paymatrix.app.data.*
import com.paymatrix.app.domain.Money
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun LogGroupsScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    var create by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.loadLogGroups(); vm.loadFriends() }

    androidx.activity.compose.BackHandler(enabled = create) {
        create = false
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp, 16.dp, 18.dp, 100.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Spending logs", style = MaterialTheme.typography.headlineLarge, color = Color.White)
                    Spacer(Modifier.height(3.dp))
                    Text("Simple timelines for personal or shared spending", color = MutedText, fontSize = 12.sp)
                }
                if (state.logGroups.isNotEmpty()) {
                    Button(
                        onClick = { create = true },
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                    ) {
                        Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Create log", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }

        if (state.logGroups.isEmpty()) {
            item {
                // Rich Onboarding & Explainer Card for New Users
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(26.dp))
                        .background(CardSurface)
                        .border(1.dp, Hairline, RoundedCornerShape(26.dp))
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.size(48.dp).clip(RoundedCornerShape(16.dp))
                                .background(PrimaryBlue.copy(alpha = .15f))
                                .border(1.dp, PrimaryBlue.copy(alpha = .3f), RoundedCornerShape(16.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.ReceiptLong, null, tint = PrimaryBlue, modifier = Modifier.size(24.dp))
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text("What are Spending Logs?", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Spacer(Modifier.height(2.dp))
                            Text("Transparent spending timelines without debt calculations", color = QuietText, fontSize = 11.sp)
                        }
                    }

                    Text(
                        "Unlike shared groups that split bills and calculate who owes whom, Spending Logs are clear, chronological spending feeds. Perfect for keeping family or parents in the loop with where money went, or maintaining personal ledgers with zero awkward maths.",
                        color = MutedText,
                        fontSize = 12.5.sp,
                        lineHeight = 18.sp
                    )

                    HorizontalDivider(color = Hairline)

                    Text("HOW TO USE IN 3 EASY STEPS", color = QuietText, fontSize = 8.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)

                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        LogExplainerStep(
                            number = "1",
                            title = "Create a Timeline",
                            description = "Name it e.g. 'Parents / Allowance', 'Personal Budget', or 'Roommate Utilities'."
                        )
                        LogExplainerStep(
                            number = "2",
                            title = "Invite Members or Keep Private",
                            description = "Share the feed with family so they see updates in real-time, or use it solo."
                        )
                        LogExplainerStep(
                            number = "3",
                            title = "1-Tap Entry & Group Import",
                            description = "Record manual expenses or pull your exact share from split groups with 1 tap."
                        )
                    }

                    Spacer(Modifier.height(4.dp))

                    PrimaryAction(
                        label = "Create your first log",
                        onClick = { create = true },
                        modifier = Modifier.fillMaxWidth(),
                        icon = { Icon(Icons.Default.Add, null, Modifier.size(17.dp)) }
                    )
                }
            }
        } else {
            items(state.logGroups, key = { it.id }) { group ->
                ObsidianCard(
                    Modifier.clickable { nav.navigate("logs/${group.id}") },
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.size(48.dp).clip(RoundedCornerShape(16.dp))
                                .background(Color.White.copy(alpha = .08f))
                                .border(1.dp, Hairline, RoundedCornerShape(16.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(group.name.firstOrNull()?.uppercase() ?: "?", color = Color.White, fontWeight = FontWeight.Black, fontSize = 18.sp)
                        }
                        Spacer(Modifier.width(16.dp))
                        Column(Modifier.weight(1f)) {
                            Text(group.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.height(3.dp))
                            Text("${group.members.size} MEMBER${if (group.members.size == 1) "" else "S"}", color = QuietText, fontSize = 9.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
                        }
                        Icon(Icons.Default.ChevronRight, "Open ${group.name}", tint = Color.White.copy(alpha = .4f), modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
    if (create) CreateLogDialog(state.friends, { create = false }) { name, members -> vm.createLogGroup(name, members) { id -> create = false; nav.navigate("logs/$id") } }
}

@Composable
private fun LogExplainerStep(number: String, title: String, description: String) {
    Row(verticalAlignment = Alignment.Top) {
        Box(
            Modifier.size(24.dp).clip(CircleShape).background(Color.White.copy(alpha = .08f)),
            contentAlignment = Alignment.Center
        ) {
            Text(number, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            Spacer(Modifier.height(1.dp))
            Text(description, color = QuietText, fontSize = 11.sp, lineHeight = 15.sp)
        }
    }
}

@Composable
fun LogEntriesScreen(id: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val group = state.logGroups.firstOrNull { it.id == id }
    var add by remember { mutableStateOf(false) }
    var pick by remember { mutableStateOf(false) }
    var edit by remember { mutableStateOf<LogEntry?>(null) }
    var remove by remember { mutableStateOf<LogEntry?>(null) }
    var manage by remember { mutableStateOf(false) }
    LaunchedEffect(id) { vm.loadLogEntries(id) }

    androidx.activity.compose.BackHandler(enabled = add || pick || edit != null || remove != null || manage) {
        when {
            remove != null -> remove = null
            edit != null -> edit = null
            add -> add = false
            pick -> pick = false
            manage -> manage = false
        }
    }

    Scaffold(
        containerColor = CanvasBlack,
        topBar = {
            BackBar(
                title = group?.name ?: "Log",
                nav = nav,
                subtitle = "${state.logEntries.size} entries",
                actions = {
                    IconButton(onClick = { manage = true }) {
                        Icon(Icons.Default.Settings, "Manage log", tint = Color.White.copy(alpha = .78f))
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(18.dp, 12.dp, 18.dp, 100.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PrimaryAction("Record manually", { add = true }, Modifier.weight(1f), icon = { Icon(Icons.Default.Add, null, Modifier.size(16.dp)) })
                    SecondaryAction("From split share", { vm.loadExpenseShares(); pick = true }, Modifier.weight(1f), icon = { Icon(Icons.Default.Download, null, Modifier.size(16.dp)) })
                }
            }
            if (state.logEntries.isEmpty()) item {
                EmptyState("No entries yet", "Record an amount or pull in one of your expense shares.")
            }
            items(state.logEntries, key = { it.id }) { entry ->
                val canChange = entry.addedBy == state.user?.uid || group?.ownerId == state.user?.uid
                ObsidianCard {
                    Row(verticalAlignment = Alignment.Top) {
                        Box(Modifier.size(42.dp).clip(CircleShape).background(categoryColor(entry.category).copy(alpha = .12f)), contentAlignment = Alignment.Center) {
                            Icon(categoryIcon(entry.category), null, tint = categoryColor(entry.category), modifier = Modifier.size(20.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(entry.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Spacer(Modifier.height(2.dp))
                            Text(listOf(entry.category, entry.place).filter { it.isNotBlank() }.joinToString(" · "), color = QuietText, fontSize = 11.sp)
                            if (entry.note.isNotBlank()) {
                                Spacer(Modifier.height(4.dp))
                                Text(entry.note, color = MutedText, fontSize = 11.5.sp, maxLines = 2)
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(listOf(shortDate(entry.date), entry.addedByName.takeIf { it.isNotBlank() }).filterNotNull().joinToString(" · "), color = QuietText, fontSize = 9.5.sp)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(Money.format(entry.amountPaise), color = Color.White, fontWeight = FontWeight.Black, fontSize = 16.sp)
                            if (canChange) {
                                Row {
                                    if (entry.type != "expense") {
                                        IconButton(onClick = { edit = entry }, Modifier.size(36.dp)) {
                                            Icon(Icons.Default.Edit, "Edit", tint = MutedText, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                    IconButton(onClick = { remove = entry }, Modifier.size(36.dp)) {
                                        Icon(Icons.Default.DeleteOutline, "Delete", tint = Negative, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (state.logActivity.isNotEmpty()) item {
                SectionTitle("Activity log", "Immutable audit history")
            }
            items(state.logActivity, key = { "log_activity_${it.id}" }) { event ->
                Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(34.dp).clip(CircleShape).background(Color.White.copy(alpha = .05f)), contentAlignment = Alignment.Center) {
                        Icon(if (event.type == "entry_deleted") Icons.Default.DeleteOutline else Icons.Default.History, null, tint = if (event.type == "entry_deleted") Negative else MutedText, modifier = Modifier.size(15.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(event.message, color = Color.White.copy(alpha = .8f), fontWeight = FontWeight.Medium, fontSize = 12.sp)
                        Text(shortDate(event.createdAt), color = QuietText, fontSize = 9.sp)
                    }
                }
            }
        }
    }
    if (add || edit != null) LogEntryDialog(edit, { add = false; edit = null }) { title, amount, category, place, note -> vm.saveLogEntry(id, title, amount, category, place, note, edit); add = false; edit = null }
    if (pick) ExpenseShareDialog(state.expenseShares, { pick = false }) { share -> vm.addExpenseShareToLog(id, share); pick = false }
    remove?.let { entry -> ConfirmDialog("Delete entry?", "This removes ${entry.title} from the timeline and keeps an immutable audit event.", "Delete", { remove = null }, destructive = true) { vm.deleteLogEntry(id, entry); remove = null } }
    if (manage && group != null) ManageLogDialog(group, state, vm, nav) { manage = false }
}

@Composable
private fun CreateLogDialog(friends: List<UserProfile>, onDismiss: () -> Unit, onConfirm: (String, List<String>) -> Unit) {
    var name by remember { mutableStateOf("") }; val selected = remember { mutableStateMapOf<String, Boolean>() }
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text("Create log group") }, text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) { FormField(name, { name = it }, "e.g. Parents / Allowance"); if (friends.isNotEmpty()) { Text("MEMBERS (OPTIONAL)", color = QuietText, fontSize = 8.5.sp, fontWeight = FontWeight.Bold); friends.forEach { friend -> Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(selected[friend.uid] == true, { selected[friend.uid] = it }); UserAvatar(friend, 30); Spacer(Modifier.width(8.dp)); Text(friend.name) } } } } }, confirmButton = { Button(onClick = { onConfirm(name, selected.filterValues { it }.keys.toList()) }, enabled = name.isNotBlank()) { Text("Create") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
private fun LogEntryDialog(editing: LogEntry?, onDismiss: () -> Unit, onConfirm: (String, String, String, String, String) -> Unit) {
    var title by remember(editing) { mutableStateOf(editing?.title.orEmpty()) }; var amount by remember(editing) { mutableStateOf(editing?.let { "%.2f".format(it.amountPaise / 100.0) }.orEmpty()) }; var category by remember(editing) { mutableStateOf(editing?.category ?: "Other") }; var place by remember(editing) { mutableStateOf(editing?.place.orEmpty()) }; var note by remember(editing) { mutableStateOf(editing?.note.orEmpty()) }
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text(if (editing == null) "Record spending" else "Edit entry") }, text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) { FormField(amount, { amount = it }, "Amount", leading = { Text("₹", fontWeight = FontWeight.Bold) }); FormField(title, { title = it }, "e.g. Groceries"); FormField(place, { place = it }, "e.g. Supermarket"); Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) { expenseLogCategories.forEach { value -> FilterChip(category == value, { category = value }, { Text(value) }) } }; FormField(note, { note = it }, "Any extra details (optional)", singleLine = false) } }, confirmButton = { Button(onClick = { onConfirm(title, amount, category, place, note) }, enabled = title.isNotBlank() && amount.toDoubleOrNull()?.let { it > 0 } == true) { Text("Save") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

private val expenseLogCategories = listOf("Other", "Food", "Travel", "Shopping", "Household", "Health")

@Composable
private fun ExpenseShareDialog(shares: List<ExpenseShare>, onDismiss: () -> Unit, onPick: (ExpenseShare) -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text("From split transaction") }, text = { LazyColumn(Modifier.heightIn(max = 430.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { if (shares.isEmpty()) item { Text("No eligible expense shares found.", color = MutedText) }; items(shares, key = { "${it.sourceGroupId}_${it.sourceExpenseId}" }) { share -> Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable { onPick(share) }.padding(10.dp), verticalAlignment = Alignment.CenterVertically) { Icon(categoryIcon(share.category), null, tint = MutedText); Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) { Text(share.title, color = Color.White, fontWeight = FontWeight.Bold); Text(share.sourceGroupName, color = QuietText, fontSize = 10.sp) }; Text(Money.format(share.amountPaise), color = Color.White, fontWeight = FontWeight.Bold) } } } }, confirmButton = {}, dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } })
}

@Composable
private fun ManageLogDialog(group: LogGroup, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController, onDismiss: () -> Unit) {
    var rename by remember { mutableStateOf(group.name) }; var delete by remember { mutableStateOf(false) }
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text("Manage log") }, text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) { FormField(rename, { rename = it }, "Group name"); if (group.ownerId == state.user?.uid) PrimaryAction("Save name", { vm.renameLogGroup(group.id, rename) }, Modifier.fillMaxWidth()); Text("${group.members.size} members", color = QuietText); if (group.ownerId == state.user?.uid) SecondaryAction("Delete log group", { delete = true }, Modifier.fillMaxWidth()) else SecondaryAction("Leave log group", { vm.leaveLogGroup(group.id) { onDismiss(); nav.popBackStack() } }, Modifier.fillMaxWidth()) } }, confirmButton = {}, dismissButton = { TextButton(onClick = onDismiss) { Text("Done") } })
    if (delete) ConfirmDialog("Delete log group?", "This removes the log from active views while retaining entries and immutable activity for audit and data export.", "Delete", { delete = false }, destructive = true) { vm.deleteLogGroup(group.id) { delete = false; onDismiss(); nav.popBackStack() } }
}

@Composable
fun ProfileScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current
    var edit by remember { mutableStateOf(false) }
    var signOut by remember { mutableStateOf(false) }
    var exportContent by remember { mutableStateOf<String?>(null) }
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri -> uri?.let { target -> exportContent?.let { content -> context.contentResolver.openOutputStream(target)?.use { it.write(content.toByteArray()) } } } }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) vm.enablePush(context) }
    val hasUpi = !state.user?.upiId.isNullOrBlank()

    androidx.activity.compose.BackHandler(enabled = edit || signOut) {
        when {
            signOut -> signOut = false
            edit -> edit = false
        }
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp, 16.dp, 18.dp, 100.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Profile Header
        item {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                UserAvatar(state.user, 84)
                Spacer(Modifier.height(12.dp))
                Text(state.user?.name ?: "Member", color = Color.White, fontWeight = FontWeight.Black, fontSize = 24.sp, letterSpacing = (-.4).sp)
                Spacer(Modifier.height(2.dp))
                Text(state.user?.email.orEmpty(), color = MutedText, fontSize = 12.sp)
                Spacer(Modifier.height(8.dp))
                Box(
                    Modifier.clip(CircleShape)
                        .background(if (hasUpi) Positive.copy(alpha = .12f) else Negative.copy(alpha = .12f))
                        .border(1.dp, if (hasUpi) Positive.copy(alpha = .25f) else Negative.copy(alpha = .25f), CircleShape)
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text(
                        if (hasUpi) "● UPI Ready" else "⚠ Missing UPI ID",
                        color = if (hasUpi) Positive else Negative,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Metrics Row (Properly aligned)
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricTileProfile("TOTAL SHARED", Money.format(state.summary.totalSharedPaise), Modifier.weight(1f))
                MetricTileProfile("ACTIVE GROUPS", state.groups.size.toString(), Modifier.weight(1f))
            }
        }

        // UPI Payment Details Card
        item {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp))
                    .background(CardSurface)
                    .border(1.dp, Hairline, RoundedCornerShape(22.dp))
                    .padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(38.dp).clip(CircleShape).background(Color.White.copy(alpha = .06f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.AccountBalance, null, tint = PrimaryBlue, modifier = Modifier.size(18.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("UPI Payment Details", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(
                            if (hasUpi) state.user?.upiId.orEmpty() else "No payment address configured",
                            color = if (hasUpi) Positive else MutedText,
                            fontSize = 12.sp,
                            fontWeight = if (hasUpi) FontWeight.SemiBold else FontWeight.Normal
                        )
                    }
                    OutlinedButton(
                        onClick = { edit = true },
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Hairline),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text("Edit", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Text("GPay, PhonePe, Paytm, BHIM compatible for one-tap settlement QR codes.", color = QuietText, fontSize = 10.5.sp, lineHeight = 14.sp)
            }
        }

        // System Settings
        item { SectionTitle("Account settings") }
        item {
            ObsidianCard(contentPadding = PaddingValues(0.dp)) {
                SettingsRow(Icons.Default.Person, "Edit Profile & Phone", "Update your display name and contact") { edit = true }
                HorizontalDivider(color = Hairline)
                SettingsRow(Icons.Default.Notifications, "Notifications", "Device push alerts and updates") {
                    if (Build.VERSION.SDK_INT >= 33) permission.launch(Manifest.permission.POST_NOTIFICATIONS) else vm.enablePush(context)
                }
                if (state.flags.analytics) {
                    HorizontalDivider(color = Hairline)
                    SettingsRow(Icons.Default.QueryStats, "Analytics", "Spending breakdown and trends") { nav.navigate("analytics") }
                }
                HorizontalDivider(color = Hairline)
                SettingsRow(Icons.Default.Description, "Terms of Service", "Non-custodial calculation ledger terms") { nav.navigate("terms") }
                HorizontalDivider(color = Hairline)
                SettingsRow(Icons.Default.PrivacyTip, "Security & Privacy", "Data policy and protection") { nav.navigate("privacy") }
            }
        }

        // Data Management
        item { SectionTitle("Data & privacy") }
        item {
            ObsidianCard(contentPadding = PaddingValues(0.dp)) {
                SettingsRow(Icons.Default.Download, "Export my data", "Download JSON ledger history") {
                    vm.exportData { json -> exportContent = json; exportLauncher.launch("paymatrix-data-${java.time.LocalDate.now()}.json") }
                }
                HorizontalDivider(color = Hairline)
                SettingsRow(Icons.Default.DeleteForever, "Delete account", "Permanently anonymize and remove account", tint = Negative) {
                    nav.navigate("delete-account")
                }
            }
        }

        item {
            SecondaryAction(
                label = "Sign out",
                onClick = { signOut = true },
                modifier = Modifier.fillMaxWidth(),
                icon = { Icon(Icons.Default.Logout, null, Modifier.size(17.dp)) }
            )
        }

        item {
            Box(Modifier.fillMaxWidth().padding(vertical = 4.dp), contentAlignment = Alignment.Center) {
                Text(
                    "paymatrix ${BuildConfig.VERSION_NAME} · native Android",
                    color = Color.White.copy(alpha = .25f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }

    if (edit) ProfileEditDialog(state.user, { edit = false }) { name, upi, phone -> vm.updateProfile(name, upi, phone); edit = false }
    if (signOut) ConfirmDialog("Sign out?", "Your Firebase session and this device's push token will be cleared.", "Sign out", { signOut = false }) {
        vm.signOut(context) { signOut = false; nav.navigate("login") { popUpTo(0) } }
    }
}

@Composable
private fun MetricTileProfile(label: String, value: String, modifier: Modifier) {
    Column(
        modifier.clip(RoundedCornerShape(20.dp))
            .background(CardSurface)
            .border(1.dp, Hairline, RoundedCornerShape(20.dp))
            .padding(vertical = 16.dp, horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(value, color = Color.White, fontWeight = FontWeight.Black, fontSize = 21.sp, letterSpacing = (-.3).sp)
        Spacer(Modifier.height(4.dp))
        Text(label, color = QuietText, fontSize = 8.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
    }
}

@Composable
private fun SettingsRow(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String, tint: Color = MutedText, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(38.dp).clip(CircleShape).background(Color.White.copy(alpha = .06f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(17.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = if (tint == Negative) Negative else Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Spacer(Modifier.height(1.dp))
            Text(subtitle, color = QuietText, fontSize = 10.5.sp)
        }
        Icon(Icons.Default.ChevronRight, null, tint = Color.White.copy(alpha = .25f), modifier = Modifier.size(17.dp))
    }
}

@Composable
private fun ProfileEditDialog(profile: UserProfile?, onDismiss: () -> Unit, onSave: (String, String, String) -> Unit) {
    var name by remember(profile) { mutableStateOf(profile?.name.orEmpty()) }
    var upi by remember(profile) { mutableStateOf(profile?.upiId.orEmpty()) }
    var phone by remember(profile) { mutableStateOf(profile?.phone.orEmpty()) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = ModalSurface,
        shape = RoundedCornerShape(28.dp),
        title = { Text("Profile & UPI") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                FormField(name, { name = it }, "Display name")
                FormField(upi, { upi = it }, "UPI ID (e.g. user@okhdfc)", leading = { Text("₹", fontWeight = FontWeight.Bold) })
                FormField(phone, { phone = it }, "Phone number (optional)", leading = { Icon(Icons.Default.Phone, null, Modifier.size(16.dp)) })
                Text("Your UPI ID is used by friends to generate instant QR codes. You still verify and confirm every payment.", color = QuietText, fontSize = 9.5.sp, lineHeight = 13.sp)
            }
        },
        confirmButton = { Button(onClick = { onSave(name, upi, phone) }, enabled = name.isNotBlank()) { Text("Save changes") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun ScannerScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var image by remember { mutableStateOf<Bitmap?>(null) }; var error by remember { mutableStateOf<String?>(null) }; var busy by remember { mutableStateOf(false) }; var result by remember { mutableStateOf<BillScanResult?>(null) }
    val photoUri = remember { createBillPhotoUri(context) }
    fun loadUri(uri: Uri) { image = context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) } }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok -> if (ok) loadUri(photoUri) }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> uri?.let(::loadUri) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) camera.launch(photoUri) else error = "Camera permission is required to scan directly." }
    val scanner = remember { BillScanner() }
    Scaffold(containerColor = CanvasBlack, topBar = { BackBar("Scan bill", nav) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            PageTitle("Receipt scanner", "Camera-first, Firebase-authenticated AI extraction")
            ObsidianCard {
                Text("Your image is compressed on this phone and sent with your Firebase ID token to the existing protected scanner endpoint. The AI key is never stored in the APK.", color = MutedText, fontSize = 11.sp, lineHeight = 16.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) { PrimaryAction("Open camera", { permission.launch(Manifest.permission.CAMERA) }, Modifier.weight(1f), icon = { Icon(Icons.Default.CameraAlt, null, Modifier.size(17.dp)) }); SecondaryAction("Gallery", { gallery.launch("image/*") }, icon = { Icon(Icons.Default.PhotoLibrary, null, Modifier.size(17.dp)) }) }
            }
            image?.let { bitmap -> Image(bitmap.asImageBitmap(), "Captured receipt", Modifier.fillMaxWidth().height(300.dp).clip(RoundedCornerShape(20.dp)).background(Color.Black), contentScale = ContentScale.Fit); PrimaryAction("Analyze bill", { scope.launch { busy = true; error = null; runCatching { scanner.scan(bitmap) }.onSuccess { result = it; vm.setBillScan(it) }.onFailure { error = it.message }; busy = false } }, Modifier.fillMaxWidth(), enabled = !busy, icon = { Icon(Icons.Default.AutoAwesome, null, Modifier.size(17.dp)) }) }
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth(), color = Color.White)
            error?.let { Text(it, color = Negative) }
            result?.let { scan -> ObsidianCard { Text(scan.merchant.ifBlank { "Scanned bill" }, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp); Text("Total ${scan.total}", color = MutedText); if (scan.date.isNotBlank()) Text(scan.date, color = QuietText); scan.items.take(8).forEach { Text("• $it", color = MutedText, fontSize = 11.sp) }; Text("Choose the group to continue", color = Color.White, fontWeight = FontWeight.Bold); state.groups.forEach { group -> SecondaryAction(group.name, { nav.navigate("expense/${group.id}") }, Modifier.fillMaxWidth()) } } }
        }
    }
}

private fun createBillPhotoUri(context: Context): Uri { val directory = File(context.cacheDir, "bill-scans").apply { mkdirs() }; val file = File.createTempFile("receipt-", ".jpg", directory); return FileProvider.getUriForFile(context, "${context.packageName}.files", file) }

@Composable
fun JoinGroupScreen(code: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    var joining by remember { mutableStateOf(false) }
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) { ObsidianCard { Icon(Icons.Default.GroupAdd, null, tint = Color.White, modifier = Modifier.size(34.dp)); Text("Join this group?", color = Color.White, fontWeight = FontWeight.Black, fontSize = 26.sp); Text("Invite code ${code.chunked(4).joinToString(" ")}", color = MutedText); PrimaryAction("Join group", { joining = true; vm.joinGroup(code) { id -> nav.navigate("group/$id") { popUpTo("join/$code") { inclusive = true } } } }, Modifier.fillMaxWidth(), enabled = !joining); SecondaryAction("Not now", { nav.navigate(if (state.user == null) "login" else "dashboard") }, Modifier.fillMaxWidth()) } }
}

@Composable
fun TermsScreen(nav: NavHostController) {
    val sections = listOf(
        "1. Nature of the Service" to "PayMatrix is an informational calculation ledger and debt-simplification tool. PayMatrix is NOT a bank, payment processor, or money transmitter and never holds or moves money.",
        "2. Google Authentication" to "Authentication uses Google Sign-In via AndroidX Credential Manager. PayMatrix accesses only your basic name, email, and avatar to identify you within groups.",
        "3. Group Ledgers & Balances" to "Debt simplification calculations are automated suggestions based on user-entered splits. All entries must be accurate and agreed upon by group members.",
        "4. UPI Settlements" to "UPI QR generation and 'Mark Paid' are peer-to-peer user confirmations. Recording a payment does not execute or verify a bank transfer.",
        "5. AI Receipt OCR" to "Receipt photos are ephemerally processed via Google Gemini AI without persistent storage in Firestore.",
        "6. Data Rights & DPDP 2023" to "You have the right to export your financial data or permanently delete and anonymize your account at any time via Profile > Delete account.",
        "7. Limitation of Liability" to "The service is provided 'AS IS'. PayMatrix is not liable for external banking failures, disputes among group members, or data inaccuracies."
    )
    Scaffold(containerColor = CanvasBlack, topBar = { BackBar("Terms of Service", nav) }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { PageTitle("Terms of service", "Effective 31 August 2026 · Non-custodial ledger") }
            items(sections) { (title, body) ->
                ObsidianCard {
                    Text(title, color = Color.White, fontWeight = FontWeight.Bold)
                    Text(body, color = MutedText, lineHeight = 20.sp)
                }
            }
        }
    }
}

@Composable
fun PrivacyScreen(nav: NavHostController) {
    val sections = listOf(
        "What paymatrix is" to "paymatrix helps people record shared expenses, balances, settlements, friend connections, and personal spending logs.",
        "Data we store" to "Firebase stores your profile, groups, expenses, settlements, friend relationships, notifications, push-token records, and audit history required by the product.",
        "Receipt scanning and AI" to "A selected receipt image is sent to the protected scanner endpoint for extraction. Review the returned merchant, amount, date, and items before saving.",
        "Payments" to "paymatrix can open an installed UPI app, but it cannot prove a transfer completed. A settlement enters the ledger only after you explicitly confirm it.",
        "Retention and deletion" to "Account deletion immediately anonymizes your profile and creates a delayed-deletion request so shared financial history remains intelligible to other group members.",
        "Diagnostics" to "Firebase Crashlytics and Performance Monitoring can collect app version, device and OS details, crash traces, screen rendering, and network timing. Financial text, UPI IDs, receipt images, and credentials are not intentionally attached to diagnostics.",
        "Offline data" to "Previously loaded Firebase data can remain cached on this device. Supported expense and spending-log edits may remain pending until Firebase confirms synchronization. Settlement confirmation, invitations, sign-in, and receipt AI require a connection.",
        "Security and choices" to "Firestore rules and App Check protect backend access. Export your data or request deletion from Profile at any time. The project is operated by Marshmellow31; privacy requests can be opened through the GitHub support tracker.",
    )
    Scaffold(containerColor = CanvasBlack, topBar = { BackBar("Privacy", nav) }) { padding -> LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { PageTitle("Privacy policy", "Native Android · same Firebase backend") }; items(sections) { (title, body) -> ObsidianCard { Text(title, color = Color.White, fontWeight = FontWeight.Bold); Text(body, color = MutedText, lineHeight = 20.sp) } } } }
}

@Composable
fun DeleteAccountScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current; val clientId = stringResource(R.string.default_web_client_id); var phrase by remember { mutableStateOf("") }; var confirm by remember { mutableStateOf(false) }
    Scaffold(containerColor = CanvasBlack, topBar = { BackBar("Delete account", nav) }) { padding -> Column(Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) { PageTitle("Delete your paymatrix account", "This is a destructive privacy workflow"); ObsidianCard { Text("What happens", color = Color.White, fontWeight = FontWeight.Bold); Text("Your profile is anonymized, friend code removed, this device's push token deleted, and a delayed backend cleanup request is created. Shared group records remain as Deleted user so other members' ledgers stay valid.", color = MutedText, lineHeight = 20.sp) }; FormField(phrase, { phrase = it }, "Type DELETE to continue"); PrimaryAction("Delete my account", { confirm = true }, Modifier.fillMaxWidth(), enabled = phrase == "DELETE"); SecondaryAction("Cancel", { nav.popBackStack() }, Modifier.fillMaxWidth()) } }
    if (confirm) ConfirmDialog("Final confirmation", "Google will ask you to reauthenticate. After that, your profile is anonymized and Firebase Authentication account deleted.", "Delete forever", { confirm = false }, destructive = true) { vm.deleteAccount(context, clientId) { confirm = false; nav.navigate("login") { popUpTo(0) } } }
}
