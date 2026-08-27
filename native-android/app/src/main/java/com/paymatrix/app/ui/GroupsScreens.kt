@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.data.*
import com.paymatrix.app.domain.Money

private val categories = listOf("General", "Travel", "Food", "Household", "Sports", "Shopping", "Entertainment")

@Composable
fun GroupsScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    var create by remember { mutableStateOf(false) }
    var join by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.loadGroups(); vm.loadFriends() }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp, 22.dp, 20.dp, 110.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            item { PageTitle("Groups", "Manage shared expenses and collective balances") }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PrimaryAction("Create group", { create = true }, Modifier.weight(1f), icon = { Icon(Icons.Default.Add, null, Modifier.size(17.dp)) })
                    SecondaryAction("Join", { join = true }, icon = { Icon(Icons.Default.Link, null, Modifier.size(17.dp)) })
                }
            }
            if (state.groups.isEmpty()) item { EmptyState("No active groups", "Create a group or join one using an invite code.") }
            items(state.groups, key = { it.id }) { group -> GroupListCard(group, state.summary.groupBalances[group.id] ?: 0L) { nav.navigate("group/${group.id}") } }
        }
        FloatingActionButton(onClick = { create = true }, containerColor = Color.White, contentColor = Color.Black, modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp)) { Icon(Icons.Default.GroupAdd, "Create group") }
    }
    if (create) CreateGroupDialog(state, { create = false }) { name, description, category, members -> vm.createGroup(name, description, category, members) { id -> create = false; nav.navigate("group/$id") } }
    if (join) TextEntryDialog("Join a group", "Invite code", "Join", { join = false }) { code -> vm.joinGroup(code) { id -> join = false; nav.navigate("group/$id") } }
}

@Composable
private fun GroupListCard(group: Group, balance: Long, onClick: () -> Unit) {
    ObsidianCard(Modifier.clickable(onClick = onClick), PaddingValues(24.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(group.name, color = Color.White, fontWeight = FontWeight.Black, fontSize = 21.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(6.dp)); Text("${group.category.uppercase()}  •  ${group.members.size} MEMBERS", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("●  YOUR BALANCE", color = Color.White.copy(alpha = .68f), fontSize = 8.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                Spacer(Modifier.height(5.dp))
                Text("${if (balance >= 0) "+" else "−"}${Money.format(kotlin.math.abs(balance))}", color = if (balance < 0) Color(0xFFFF737B) else Color.White, fontWeight = FontWeight.Black, fontSize = 22.sp)
            }
        }
        Spacer(Modifier.height(22.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            AvatarStack(group.members, group.memberProfiles, 36)
            Spacer(Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, "Open ${group.name}", tint = Color.White.copy(alpha = .7f))
        }
    }
}

@Composable
fun GroupScreen(id: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current
    LaunchedEffect(id) { vm.loadGroup(id); vm.loadFriends() }
    val snapshot = state.group?.takeIf { it.group.id == id }
    var tab by remember { mutableIntStateOf(0) }
    var settle by remember { mutableStateOf(false) }
    var editGroup by remember { mutableStateOf(false) }
    var addMember by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    var leaveConfirm by remember { mutableStateOf(false) }
    var deleteConfirm by remember { mutableStateOf(false) }
    var mineOnly by remember { mutableStateOf(false) }

    Box(Modifier.fillMaxSize()) {
        if (snapshot == null) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color.White) }
        else LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp, 22.dp, 20.dp, 120.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                GroupHero(
                    snapshot = snapshot,
                    onRecord = { nav.navigate("expense/$id") },
                    onSettle = { settle = true },
                    onAddMember = { addMember = true },
                    onMenu = { menu = true },
                )
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.TopEnd) {
                    DropdownMenu(expanded = menu, onDismissRequest = { menu = false }, containerColor = ModalSurface) {
                        DropdownMenuItem({ Text("Edit group") }, { menu = false; editGroup = true }, leadingIcon = { Icon(Icons.Default.Edit, null) })
                        DropdownMenuItem({ Text("Share invite") }, {
                            menu = false
                            val link = "https://pay-matrix.vercel.app/join/${snapshot.group.inviteCode}"
                            context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, link) }, "Share group invite"))
                        }, leadingIcon = { Icon(Icons.Default.Share, null) })
                        DropdownMenuItem({ Text("Leave group") }, { menu = false; leaveConfirm = true }, leadingIcon = { Icon(Icons.Default.Logout, null) })
                        if (snapshot.group.admin == state.user?.uid) DropdownMenuItem({ Text("Delete group", color = Negative) }, { menu = false; deleteConfirm = true }, leadingIcon = { Icon(Icons.Default.DeleteOutline, null, tint = Negative) })
                    }
                }
            }
            item {
                ScrollableTabRow(selectedTabIndex = tab, containerColor = CanvasBlack, contentColor = Color.White, edgePadding = 14.dp, divider = {}, indicator = { positions -> TabRowDefaults.SecondaryIndicator(Modifier.tabIndicatorOffset(positions[tab]), color = Color.White) }) {
                    listOf("Expenses", "Members", "Logs", "Insights").forEachIndexed { index, label -> Tab(tab == index, { tab = index }, text = { Text(label, fontSize = 12.sp, fontWeight = if (tab == index) FontWeight.Bold else FontWeight.Medium) }) }
                }
            }
            when (tab) {
                0 -> expenseItems(snapshot, state.user?.uid.orEmpty(), mineOnly, { mineOnly = !mineOnly }, vm, nav)
                1 -> memberItems(snapshot, state, vm, { addMember = true })
                2 -> activityItems(snapshot, vm)
                else -> insightItems(snapshot)
            }
        }
        if (state.flags.billScanning && snapshot != null) ExtendedFloatingActionButton(
            onClick = { nav.navigate("scanner") },
            icon = { Icon(Icons.Default.DocumentScanner, null) },
            text = { Text("SCAN BILL", fontWeight = FontWeight.Bold, letterSpacing = 1.sp) },
            containerColor = ObsidianSurface,
            contentColor = Color.White,
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        )
    }

    if (settle && snapshot != null) SettlementDialog(snapshot, state.user?.uid.orEmpty(), { settle = false }) { payee, amount, note -> vm.settle(id, payee, amount, note) { settle = false } }
    if (editGroup && snapshot != null) EditGroupDialog(snapshot.group, { editGroup = false }) { name, description, category -> vm.updateGroup(id, name, description, category) { editGroup = false } }
    if (addMember && snapshot != null) AddMemberDialog(snapshot, state.friends, { addMember = false }) { uid -> vm.addGroupMember(id, uid) { addMember = false } }
    if (leaveConfirm) ConfirmDialog("Exit group?", "You can leave only when your balance is ₹0.00. This does not erase historical records.", "Leave", { leaveConfirm = false }) { vm.leaveGroup(id) { leaveConfirm = false; nav.navigate("groups") { popUpTo("groups") { inclusive = true } } } }
    if (deleteConfirm) ConfirmDialog("Delete group?", "All balances must be reconciled. The group is archived so members can retain historical records.", "Delete", { deleteConfirm = false }, destructive = true) { vm.deleteGroup(id) { deleteConfirm = false; nav.navigate("groups") { popUpTo("groups") { inclusive = true } } } }
}

@Composable
private fun GroupHero(snapshot: GroupSnapshot, onRecord: () -> Unit, onSettle: () -> Unit, onAddMember: () -> Unit, onMenu: () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(32.dp)).background(Color(0xFF131313)).border(1.dp, Hairline, RoundedCornerShape(32.dp)).padding(20.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(58.dp).clip(RoundedCornerShape(18.dp)).background(categoryColor(snapshot.group.category).copy(alpha = .12f)).border(1.dp, categoryColor(snapshot.group.category).copy(alpha = .25f), RoundedCornerShape(18.dp)), contentAlignment = Alignment.Center) {
                Icon(categoryIcon(snapshot.group.category), null, tint = categoryColor(snapshot.group.category), modifier = Modifier.size(30.dp))
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(snapshot.group.name.uppercase(), color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(5.dp))
                Text("${snapshot.group.category.uppercase()}  •  ${snapshot.group.members.size} MEMBERS", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
            }
            IconButton(onClick = onAddMember, modifier = Modifier.border(1.dp, Hairline, CircleShape)) { Icon(Icons.Default.PersonAdd, "Add member", tint = MutedText) }
            IconButton(onClick = onMenu) { Icon(Icons.Default.MoreVert, "Group menu", tint = MutedText) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            PrimaryAction("RECORD", onRecord, Modifier.weight(1f), icon = { Icon(Icons.Default.Add, null) })
            SecondaryAction("SETTLE", onSettle, Modifier.weight(1f), icon = { Icon(Icons.Default.AccountBalanceWallet, null) })
        }
    }
}

@Composable private fun GroupMetric(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier) {
    ObsidianCard(modifier) { Icon(icon, null, tint = MutedText, modifier = Modifier.size(18.dp)); Text(label, color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold); Text(value, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.overviewItems(snapshot: GroupSnapshot, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController, settlementsEnabled: Boolean, onSettle: () -> Unit) {
    if (settlementsEnabled) item { SectionTitle("Suggested settlements", "Simplified repayment plan") }
    if (settlementsEnabled && snapshot.debts.isEmpty()) item { ObsidianCard { Text("All clear", color = Color.White, fontWeight = FontWeight.Bold); Text("There are no outstanding balances.", color = QuietText) } }
    if (settlementsEnabled) items(snapshot.debts, key = { "${it.from}_${it.to}" }) { debt ->
        ObsidianCard(Modifier.clickable { if (debt.from == state.user?.uid) onSettle() }) {
            Row(verticalAlignment = Alignment.CenterVertically) { UserAvatar(snapshot.profiles[debt.from], 38); Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) { Text("${snapshot.profiles[debt.from]?.name ?: "Member"} pays", color = QuietText, fontSize = 11.sp); Text(snapshot.profiles[debt.to]?.name ?: "Member", color = Color.White, fontWeight = FontWeight.Bold) }; Text(Money.format(debt.amountPaise), color = Color.White, fontWeight = FontWeight.Bold) }
        }
    }
    item { SectionTitle("Expense timeline", "Recent first") }
    val active = snapshot.expenses.filter { it.status != "deleted" && it.status != "archived" }.take(5)
    if (active.isEmpty()) item { EmptyState("No expenses", "Record the first shared transaction.") }
    items(active, key = { it.id }) { expense -> ExpenseRow(expense, snapshot, { nav.navigate("expense/${snapshot.group.id}?expenseId=${expense.id}") }, { vm.archiveExpense(expense) }) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.expenseItems(snapshot: GroupSnapshot, uid: String, mineOnly: Boolean, onToggleMine: () -> Unit, vm: PayMatrixViewModel, nav: NavHostController) {
    item { SectionTitle("CHRONICLE") { SecondaryAction(if (mineOnly) "VIEW ALL" else "VIEW YOURS", onToggleMine, icon = { Icon(Icons.Default.PersonOutline, null, Modifier.size(15.dp)) }) } }
    val active = snapshot.expenses.filter { it.status != "deleted" && it.status != "archived" && (!mineOnly || it.paidBy == uid || it.participants.contains(uid)) }
    if (active.isEmpty()) item { EmptyState("No expenses", "Tap + to record the first one.") }
    items(active, key = { it.id }) { expense -> ExpenseRow(expense, snapshot, { nav.navigate("expense/${snapshot.group.id}?expenseId=${expense.id}") }, { vm.archiveExpense(expense) }) }
}

@Composable private fun ExpenseRow(expense: Expense, snapshot: GroupSnapshot, onEdit: () -> Unit, onDelete: () -> Unit) {
    var menu by remember { mutableStateOf(false) }
    ObsidianCard {
        Row(verticalAlignment = Alignment.Top) {
            Box(Modifier.size(48.dp).clip(CircleShape).background(categoryColor(expense.category).copy(alpha = .12f)), contentAlignment = Alignment.Center) { Icon(categoryIcon(expense.category), null, tint = categoryColor(expense.category), modifier = Modifier.size(22.dp)) }
            Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(expense.title, color = Color.White, fontWeight = FontWeight.Bold); Text(shortDate(expense.date.ifBlank { expense.createdAt }), color = QuietText, fontSize = 10.sp); Spacer(Modifier.height(8.dp)); Text("Paid by ${snapshot.profiles[expense.paidBy]?.name ?: expense.paidByName}", color = MutedText, fontSize = 11.sp) }
            Column(horizontalAlignment = Alignment.End) { Text(Money.format(expense.amountPaise), color = Color.White, fontWeight = FontWeight.Black, fontSize = 17.sp); Box { IconButton(onClick = { menu = true }, Modifier.size(32.dp)) { Icon(Icons.Default.MoreHoriz, "Expense menu", tint = MutedText) }; DropdownMenu(menu, { menu = false }, containerColor = ModalSurface) { DropdownMenuItem({ Text("Edit") }, { menu = false; onEdit() }, leadingIcon = { Icon(Icons.Default.Edit, null) }); DropdownMenuItem({ Text("Delete", color = Negative) }, { menu = false; onDelete() }, leadingIcon = { Icon(Icons.Default.DeleteOutline, null, tint = Negative) }) } } }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.memberItems(snapshot: GroupSnapshot, state: PayMatrixState, vm: PayMatrixViewModel, onAdd: () -> Unit) {
    item { SectionTitle("Members", "${snapshot.group.members.size} people") { IconButton(onClick = onAdd) { Icon(Icons.Default.PersonAdd, "Add member") } } }
    items(snapshot.group.members, key = { it }) { memberUid ->
        val profile = snapshot.profiles[memberUid]
        val balance = snapshot.balances[memberUid] ?: 0L
        ObsidianCard {
            Row(verticalAlignment = Alignment.CenterVertically) { UserAvatar(profile, 44); Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(if (memberUid == state.user?.uid) "${profile?.name ?: "Member"} (You)" else profile?.name ?: "Member", color = Color.White, fontWeight = FontWeight.Bold); Text(if (memberUid == snapshot.group.admin) "Group admin" else "Member", color = QuietText, fontSize = 10.sp) }; MoneyText(balance); if (snapshot.group.admin == state.user?.uid && memberUid != state.user.uid && memberUid != snapshot.group.admin) IconButton(onClick = { vm.removeGroupMember(snapshot.group.id, memberUid) }) { Icon(Icons.Default.PersonRemove, "Remove", tint = Negative) } }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.insightItems(snapshot: GroupSnapshot) {
    val active = snapshot.expenses.filter { it.status != "deleted" }
    val total = active.sumOf { it.amountPaise }.coerceAtLeast(1L)
    val categories = active.groupBy { it.category }.mapValues { it.value.sumOf(Expense::amountPaise) }.toList().sortedByDescending { it.second }
    item { SectionTitle("Group insights", "Shared spending patterns") }
    item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { GroupMetric("TRANSACTIONS", active.size.toString(), Icons.Default.ReceiptLong, Modifier.weight(1f)); GroupMetric("TOTAL", Money.format(active.sumOf { it.amountPaise }), Icons.Default.AccountBalanceWallet, Modifier.weight(1f)) } }
    item { SectionTitle("Categories") }
    items(categories, key = { it.first }) { (name, amount) -> ObsidianCard { Row { Icon(categoryIcon(name), null, tint = MutedText); Spacer(Modifier.width(10.dp)); Text(name, Modifier.weight(1f), color = Color.White, fontWeight = FontWeight.SemiBold); Text(Money.format(amount), color = Color.White) }; LinearProgressIndicator(progress = { amount.toFloat() / total }, modifier = Modifier.fillMaxWidth(), color = Color.White, trackColor = Color.White.copy(alpha = .08f)) } }
    item { SectionTitle("Member positions") }
    items(snapshot.group.members, key = { "insight_$it" }) { uid -> ObsidianCard { Row(verticalAlignment = Alignment.CenterVertically) { UserAvatar(snapshot.profiles[uid], 36); Spacer(Modifier.width(10.dp)); Text(snapshot.profiles[uid]?.name ?: "Member", Modifier.weight(1f), color = Color.White); MoneyText(snapshot.balances[uid] ?: 0L) } } }
}

private fun androidx.compose.foundation.lazy.LazyListScope.activityItems(snapshot: GroupSnapshot, vm: PayMatrixViewModel) {
    item { SectionTitle("Activity", "Audited changes in this group") }
    if (snapshot.activity.isEmpty()) item { EmptyState("No activity yet", "Changes will appear here.") }
    items(snapshot.activity, key = { it.id }) { item ->
        ObsidianCard {
            Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(38.dp).clip(CircleShape).background(Color.White.copy(alpha = .06f)), contentAlignment = Alignment.Center) { Icon(Icons.Default.History, null, tint = MutedText, modifier = Modifier.size(17.dp)) }; Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(item.message, color = Color.White, fontWeight = FontWeight.Medium); Text(shortDate(item.createdAt), color = QuietText, fontSize = 10.sp) } }
            when (item.type) {
                "expense_deleted" -> snapshot.expenses.firstOrNull { it.id == item.relatedId }?.let { TextButton(onClick = { vm.restoreExpense(it) }) { Text("Restore") } }
                "settlement_deleted" -> snapshot.settlements.firstOrNull { it.id == item.relatedId }?.let { TextButton(onClick = { vm.restoreSettlement(it) }) { Text("Restore") } }
                "settlement_added" -> snapshot.settlements.firstOrNull { it.id == item.relatedId && it.status != "deleted" }?.let { TextButton(onClick = { vm.archiveSettlement(it) }) { Text("Delete", color = Negative) } }
            }
        }
    }
}

@Composable
private fun CreateGroupDialog(state: PayMatrixState, onDismiss: () -> Unit, onConfirm: (String, String, String, List<String>) -> Unit) {
    var name by remember { mutableStateOf("") }; var description by remember { mutableStateOf("") }; var category by remember { mutableStateOf("General") }; val selected = remember { mutableStateMapOf<String, Boolean>() }
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text("Create group") }, text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        FormField(name, { name = it }, "Group name"); FormField(description, { description = it }, "Description", singleLine = false)
        Text("CATEGORY", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) { items(categories) { value -> FilterChip(category == value, { category = value }, { Text(value) }, leadingIcon = { Icon(categoryIcon(value), null, Modifier.size(15.dp)) }) } }
        if (state.friends.isNotEmpty()) { Text("ADD FRIENDS", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp); state.friends.forEach { friend -> Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(selected[friend.uid] == true, { selected[friend.uid] = it }); UserAvatar(friend, 30); Spacer(Modifier.width(8.dp)); Text(friend.name) } } }
    } }, confirmButton = { Button(onClick = { onConfirm(name, description, category, selected.filterValues { it }.keys.toList()) }, enabled = name.isNotBlank()) { Text("Create") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
private fun EditGroupDialog(group: Group, onDismiss: () -> Unit, onConfirm: (String, String, String) -> Unit) {
    var name by remember { mutableStateOf(group.name) }; var description by remember { mutableStateOf(group.description) }; var category by remember { mutableStateOf(group.category) }
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text("Edit group") }, text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) { FormField(name, { name = it }, "Group name"); FormField(description, { description = it }, "Description", singleLine = false); Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(7.dp)) { categories.forEach { value -> FilterChip(category == value, { category = value }, { Text(value) }) } } } }, confirmButton = { Button(onClick = { onConfirm(name, description, category) }, enabled = name.isNotBlank()) { Text("Save changes") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
private fun AddMemberDialog(snapshot: GroupSnapshot, friends: List<UserProfile>, onDismiss: () -> Unit, onAdd: (String) -> Unit) {
    val available = friends.filter { it.uid !in snapshot.group.members }
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text("Add member") }, text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { Text("SELECT FROM FRIENDS", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold); if (available.isEmpty()) Text("No available friends. Connect on the Friends page first.", color = MutedText) else available.forEach { friend -> Row(Modifier.fillMaxWidth().clickable { onAdd(friend.uid) }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) { UserAvatar(friend, 38); Spacer(Modifier.width(10.dp)); Text(friend.name, Modifier.weight(1f)); Icon(Icons.Default.Add, null) } }; HorizontalDivider(color = Hairline); Text("Invite code", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold); Text(snapshot.group.inviteCode.chunked(4).joinToString(" "), color = Color.White, fontWeight = FontWeight.Bold, letterSpacing = 2.sp) } }, confirmButton = {}, dismissButton = { TextButton(onClick = onDismiss) { Text("Done") } })
}

@Composable
private fun SettlementDialog(snapshot: GroupSnapshot, currentUid: String, onDismiss: () -> Unit, onConfirm: (String, String, String) -> Unit) {
    var payee by remember { mutableStateOf(snapshot.debts.firstOrNull { it.from == currentUid }?.to ?: snapshot.group.members.firstOrNull { it != currentUid }.orEmpty()) }
    val suggested = snapshot.debts.firstOrNull { it.from == currentUid && it.to == payee }?.amountPaise
    var amount by remember(suggested) { mutableStateOf(suggested?.let { "%.2f".format(it / 100.0) }.orEmpty()) }
    var note by remember { mutableStateOf("Settled up") }
    val context = LocalContext.current
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text("Settle up") }, text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Choose who you paid", color = MutedText)
        snapshot.group.members.filter { it != currentUid }.forEach { uid -> Row(Modifier.fillMaxWidth().clickable { payee = uid }, verticalAlignment = Alignment.CenterVertically) { RadioButton(payee == uid, { payee = uid }); UserAvatar(snapshot.profiles[uid], 30); Spacer(Modifier.width(8.dp)); Text(snapshot.profiles[uid]?.name ?: "Member") } }
        FormField(amount, { amount = it }, "Amount in ₹"); FormField(note, { note = it }, "Note")
        val profile = snapshot.profiles[payee]
        if (!profile?.upiId.isNullOrBlank()) SecondaryAction("Open UPI app", { runCatching { UpiLauncher.pay(context, profile!!.upiId, profile.name, Money.toPaise(amount), note) } }, Modifier.fillMaxWidth(), icon = { Icon(Icons.Default.OpenInNew, null, Modifier.size(16.dp)) })
        Text("Opening a payment app does not prove money moved. Record only after checking the completed payment in your UPI or bank history.", color = QuietText, fontSize = 10.sp, lineHeight = 14.sp)
    } }, confirmButton = { Button(onClick = { onConfirm(payee, amount, note) }, enabled = payee.isNotBlank() && amount.isNotBlank()) { Text("I verified payment — record") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
fun TextEntryDialog(title: String, label: String, confirm: String, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var value by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text(title) }, text = { FormField(value, { value = it }, label) }, confirmButton = { Button(onClick = { onConfirm(value) }, enabled = value.isNotBlank()) { Text(confirm) } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
fun ConfirmDialog(title: String, message: String, confirm: String, onDismiss: () -> Unit, destructive: Boolean = false, onConfirm: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text(title) }, text = { Text(message, color = MutedText) }, confirmButton = { Button(onClick = onConfirm, colors = if (destructive) ButtonDefaults.buttonColors(containerColor = Negative, contentColor = Color.Black) else ButtonDefaults.buttonColors()) { Text(confirm) } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}
