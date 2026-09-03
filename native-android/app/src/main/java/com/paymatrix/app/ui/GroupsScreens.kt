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

data class GroupCategoryItem(val name: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val color: Color)

val allGroupCategories = listOf(
    GroupCategoryItem("Trip & Travel", Icons.Default.Flight, Color(0xFF38BDF8)),
    GroupCategoryItem("Food & Dining", Icons.Default.Restaurant, Color(0xFFFB923C)),
    GroupCategoryItem("Roommates & Flat", Icons.Default.Home, Color(0xFF4ADE80)),
    GroupCategoryItem("Friends & Gang", Icons.Default.Whatshot, Color(0xFFF472B6)),
    GroupCategoryItem("Work & Office", Icons.Default.Work, Color(0xFF60A5FA)),
    GroupCategoryItem("Events & Party", Icons.Default.Celebration, Color(0xFFFACC15)),
    GroupCategoryItem("Couple & Partner", Icons.Default.Favorite, Color(0xFFF43F5E)),
    GroupCategoryItem("Sports & Fitness", Icons.Default.EmojiEvents, Color(0xFF2DD4BF)),
    GroupCategoryItem("Entertainment", Icons.Default.Movie, Color(0xFFA855F7)),
)

private val categories = allGroupCategories.map { it.name }

@Composable
fun GroupsScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    var create by remember { mutableStateOf(false) }
    var join by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.loadGroups(); vm.loadFriends() }

    androidx.activity.compose.BackHandler(enabled = create || join) {
        when {
            create -> create = false
            join -> join = false
        }
    }

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
    }
    if (create) CreateGroupDialog(state, { create = false }) { name, description, category, members -> vm.createGroup(name, description, category, members) { id -> create = false; nav.navigate("group/$id") } }
    if (join) TextEntryDialog("Join a group", "Invite code", "Join", { join = false }) { code -> vm.joinGroup(code) { id -> join = false; nav.navigate("group/$id") } }
}

@Composable
private fun GroupListCard(group: Group, balance: Long, onClick: () -> Unit) {
    ObsidianCard(Modifier.clickable(onClick = onClick), PaddingValues(20.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(group.name, color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.clip(RoundedCornerShape(6.dp))
                            .background(categoryColor(group.category).copy(alpha = 0.16f))
                            .padding(horizontal = 7.dp, vertical = 3.dp)
                    ) {
                        Text(
                            group.category.uppercase(),
                            color = categoryColor(group.category),
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1
                        )
                    }
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "•  ${group.members.size} members",
                        color = QuietText,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }
            Spacer(Modifier.width(10.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text("YOUR BALANCE", color = Color.White.copy(alpha = .65f), fontSize = 8.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "${if (balance >= 0) "+" else "−"}${Money.format(kotlin.math.abs(balance))}",
                    color = if (balance < 0) Color(0xFFFF737B) else if (balance > 0) Positive else Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp
                )
            }
        }
        Spacer(Modifier.height(18.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            AvatarStack(group.members, group.memberProfiles, 34)
            Spacer(Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, "Open ${group.name}", tint = Color.White.copy(alpha = .6f), modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
fun GroupScreen(id: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current
    val clipboard = androidx.compose.ui.platform.LocalClipboardManager.current
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

    androidx.activity.compose.BackHandler(enabled = settle || editGroup || addMember || menu || leaveConfirm || deleteConfirm) {
        when {
            deleteConfirm -> deleteConfirm = false
            leaveConfirm -> leaveConfirm = false
            menu -> menu = false
            addMember -> addMember = false
            editGroup -> editGroup = false
            settle -> settle = false
        }
    }

    Scaffold(
        containerColor = CanvasBlack,
        topBar = {
            BackBar(
                title = snapshot?.group?.name ?: "Group",
                nav = nav,
                subtitle = snapshot?.group?.category?.let { "$it · ${snapshot.group.members.size} members" },
                actions = {
                    if (snapshot != null) {
                        IconButton(onClick = { addMember = true }) {
                            Icon(Icons.Default.PersonAdd, "Add member", tint = Color.White.copy(alpha = .78f))
                        }
                        IconButton(onClick = { menu = true }) {
                            Icon(Icons.Default.MoreVert, "Group menu", tint = Color.White.copy(alpha = .78f))
                        }
                        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }, containerColor = ModalSurface) {
                            DropdownMenuItem(
                                text = { Text("Share invite") },
                                onClick = {
                                    menu = false
                                    val link = "https://pay-matrix.vercel.app/join/${snapshot.group.inviteCode}"
                                    context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, link) }, "Share group invite"))
                                },
                                leadingIcon = { Icon(Icons.Default.Share, null) }
                            )
                            DropdownMenuItem(
                                text = { Text("Edit group") },
                                onClick = { menu = false; editGroup = true },
                                leadingIcon = { Icon(Icons.Default.Edit, null) }
                            )
                            DropdownMenuItem(
                                text = { Text("Leave group") },
                                onClick = { menu = false; leaveConfirm = true },
                                leadingIcon = { Icon(Icons.Default.Logout, null) }
                            )
                            if (snapshot.group.admin == state.user?.uid) {
                                DropdownMenuItem(
                                    text = { Text("Delete group", color = Negative) },
                                    onClick = { menu = false; deleteConfirm = true },
                                    leadingIcon = { Icon(Icons.Default.DeleteOutline, null, tint = Negative) }
                                )
                            }
                        }
                    }
                }
            )
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            if (snapshot == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color.White)
                }
            } else {
                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp, 10.dp, 16.dp, 100.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item {
                        GroupHero(
                            snapshot = snapshot,
                            myUid = state.user?.uid.orEmpty(),
                            onCopyInvite = {
                                clipboard.setText(androidx.compose.ui.text.AnnotatedString(snapshot.group.inviteCode))
                            },
                            onInvite = {
                                val link = "https://pay-matrix.vercel.app/join/${snapshot.group.inviteCode}"
                                context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, link) }, "Share group invite"))
                            },
                            onSettings = { editGroup = true },
                            onDelete = { deleteConfirm = true },
                            onRecord = { nav.navigate("expense/$id") },
                            onScan = { nav.navigate("scanner") },
                            onSettle = { settle = true },
                        )
                    }
                    item {
                        ScrollableTabRow(
                            selectedTabIndex = tab,
                            containerColor = CanvasBlack,
                            contentColor = Color.White,
                            edgePadding = 4.dp,
                            divider = { HorizontalDivider(color = Hairline) },
                            indicator = { positions -> TabRowDefaults.SecondaryIndicator(Modifier.tabIndicatorOffset(positions[tab]), color = Color.White) }
                        ) {
                            listOf("Expenses", "Members", "Logs", "Insights").forEachIndexed { index, label ->
                                Tab(
                                    selected = tab == index,
                                    onClick = { tab = index },
                                    text = { Text(label, fontSize = 13.sp, fontWeight = if (tab == index) FontWeight.Bold else FontWeight.Medium) }
                                )
                            }
                        }
                    }
                    when (tab) {
                        0 -> expenseItems(snapshot, state.user?.uid.orEmpty(), mineOnly, { mineOnly = !mineOnly }, vm, nav)
                        1 -> memberItems(snapshot, state, vm, { addMember = true })
                        2 -> activityItems(snapshot, vm)
                        else -> insightItems(snapshot)
                    }
                }
            }
        }
    }

    if (settle && snapshot != null) SettlementDialog(snapshot, state.user?.uid.orEmpty(), { settle = false }) { payee, amount, note -> vm.settle(id, payee, amount, note) { settle = false } }
    if (editGroup && snapshot != null) EditGroupDialog(snapshot.group, { editGroup = false }) { name, description, category -> vm.updateGroup(id, name, description, category) { editGroup = false } }
    if (addMember && snapshot != null) AddMemberDialog(snapshot, state.friends, { addMember = false }) { uid -> vm.addGroupMember(id, uid) { addMember = false } }
    if (leaveConfirm) ConfirmDialog("Exit group?", "You can leave only when your balance is ₹0.00. This does not erase historical records.", "Leave", { leaveConfirm = false }) { vm.leaveGroup(id) { leaveConfirm = false; nav.popBackStack() } }
    if (deleteConfirm) ConfirmDialog("Delete group?", "All balances must be reconciled. The group is archived so members can retain historical records.", "Delete", { deleteConfirm = false }, destructive = true) { vm.deleteGroup(id) { deleteConfirm = false; nav.popBackStack() } }
}

@Composable
private fun GroupHero(
    snapshot: GroupSnapshot,
    myUid: String,
    onCopyInvite: () -> Unit,
    onInvite: () -> Unit,
    onSettings: () -> Unit,
    onDelete: () -> Unit,
    onRecord: () -> Unit,
    onScan: () -> Unit,
    onSettle: () -> Unit,
) {
    val myBalance = snapshot.balances[myUid] ?: 0L
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        // Top Group Header Card
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
                .background(CardSurface)
                .border(1.dp, Hairline, RoundedCornerShape(24.dp))
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(48.dp).clip(RoundedCornerShape(16.dp))
                        .background(categoryColor(snapshot.group.category).copy(alpha = .15f))
                        .border(1.dp, categoryColor(snapshot.group.category).copy(alpha = .3f), RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(categoryIcon(snapshot.group.category), null, tint = categoryColor(snapshot.group.category), modifier = Modifier.size(24.dp))
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        snapshot.group.name,
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 19.sp,
                        letterSpacing = (-.3).sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.clip(CircleShape).background(categoryColor(snapshot.group.category).copy(alpha = .14f))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(categoryIcon(snapshot.group.category), null, tint = categoryColor(snapshot.group.category), modifier = Modifier.size(10.dp))
                                Text(snapshot.group.category.uppercase(), color = categoryColor(snapshot.group.category), fontSize = 8.5.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    Spacer(Modifier.height(3.dp))
                    Text(
                        "${snapshot.group.members.size} members · Created by ${if (snapshot.group.admin == myUid) "You" else snapshot.profiles[snapshot.group.admin]?.name ?: "Admin"}",
                        color = QuietText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Action Pill Row: Code, Invite, Settings, Delete
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Share code pill
                Row(
                    Modifier.clip(RoundedCornerShape(100.dp))
                        .background(Color.White.copy(alpha = .05f))
                        .border(1.dp, Hairline, RoundedCornerShape(100.dp))
                        .clickable(onClick = onCopyInvite)
                        .padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.Share, null, tint = PrimaryBlue, modifier = Modifier.size(13.dp))
                    Text(snapshot.group.inviteCode, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Icon(Icons.Default.ContentCopy, null, tint = MutedText, modifier = Modifier.size(11.dp))
                }

                // Invite button
                Row(
                    Modifier.clip(RoundedCornerShape(100.dp))
                        .background(Color.White.copy(alpha = .05f))
                        .border(1.dp, Hairline, RoundedCornerShape(100.dp))
                        .clickable(onClick = onInvite)
                        .padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Icon(Icons.Default.PersonAdd, null, tint = Color.White, modifier = Modifier.size(13.dp))
                    Text("Invite", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.weight(1f))

                // Settings cog button
                IconButton(
                    onClick = onSettings,
                    modifier = Modifier.size(34.dp).clip(CircleShape).background(Color.White.copy(alpha = .05f)).border(1.dp, Hairline, CircleShape)
                ) {
                    Icon(Icons.Default.Settings, "Settings", tint = Color.White.copy(alpha = .8f), modifier = Modifier.size(15.dp))
                }

                // Delete button
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(34.dp).clip(CircleShape).background(Color.White.copy(alpha = .05f)).border(1.dp, Hairline, CircleShape)
                ) {
                    Icon(Icons.Default.DeleteOutline, "Delete", tint = Color(0xFFFF737B), modifier = Modifier.size(15.dp))
                }
            }
        }

        // Your Group Balance Card (matching Web)
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
                .background(CardSurface)
                .border(1.dp, Hairline, RoundedCornerShape(24.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text("YOUR GROUP BALANCE", color = QuietText, fontSize = 8.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
            Spacer(Modifier.height(2.dp))
            Text(
                text = when {
                    myBalance > 0 -> "+${Money.format(myBalance)}"
                    myBalance < 0 -> "−${Money.format(kotlin.math.abs(myBalance))}"
                    else -> "₹0.00"
                },
                color = when {
                    myBalance > 0 -> Positive
                    myBalance < 0 -> Color(0xFFFBBF24)
                    else -> Color.White
                },
                fontWeight = FontWeight.Black,
                fontSize = 28.sp,
                letterSpacing = (-.6).sp
            )
            Text(
                text = when {
                    myBalance > 0 -> "You are owed in this group"
                    myBalance < 0 -> "You owe in this group"
                    else -> "All settled up in this group"
                },
                color = when {
                    myBalance > 0 -> Positive.copy(alpha = .8f)
                    myBalance < 0 -> Color(0xFFFBBF24).copy(alpha = .85f)
                    else -> QuietText
                },
                fontSize = 11.5.sp,
                fontWeight = FontWeight.Medium
            )
        }

        // Action Buttons Row: [+ ADD EXPENSE] & [SCAN BILL]
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Button(
                onClick = onRecord,
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black),
                contentPadding = PaddingValues(vertical = 12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Add, null, modifier = Modifier.size(17.dp))
                Spacer(Modifier.width(6.dp))
                Text("ADD EXPENSE", fontWeight = FontWeight.Black, fontSize = 12.sp, letterSpacing = 0.5.sp)
            }
            Button(
                onClick = onScan,
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.05f), contentColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, Hairline),
                contentPadding = PaddingValues(vertical = 12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.DocumentScanner, null, modifier = Modifier.size(17.dp))
                Spacer(Modifier.width(6.dp))
                Text("SCAN BILL", fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 0.5.sp)
            }
        }

        // Full width [SETTLE UP] button
        Button(
            onClick = onSettle,
            shape = RoundedCornerShape(100.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.05f), contentColor = Color.White),
            border = androidx.compose.foundation.BorderStroke(1.dp, Hairline),
            contentPadding = PaddingValues(vertical = 13.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.AccountBalanceWallet, null, modifier = Modifier.size(17.dp))
            Spacer(Modifier.width(8.dp))
            Text("SETTLE UP", fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 0.5.sp)
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
    items(active, key = { it.id }) { expense -> ExpenseRow(expense, snapshot, state.user?.uid.orEmpty(), { nav.navigate("expense/${snapshot.group.id}?expenseId=${expense.id}") }, { vm.archiveExpense(expense) }) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.expenseItems(snapshot: GroupSnapshot, uid: String, mineOnly: Boolean, onToggleMine: () -> Unit, vm: PayMatrixViewModel, nav: NavHostController) {
    item { SectionTitle("Expenses", if (mineOnly) "Showing your expenses" else "Recent first") { TextButton(onClick = onToggleMine) { Text(if (mineOnly) "Show all" else "Show yours", color = MutedText, fontSize = 11.sp) } } }
    val active = snapshot.expenses.filter { it.status != "deleted" && it.status != "archived" && (!mineOnly || it.paidBy == uid || it.participants.contains(uid)) }
    if (active.isEmpty()) item { EmptyState("No expenses", "Tap + to record the first one.") }
    items(active, key = { it.id }) { expense -> ExpenseRow(expense, snapshot, uid, { nav.navigate("expense/${snapshot.group.id}?expenseId=${expense.id}") }, { vm.archiveExpense(expense) }) }
}

@Composable
private fun ExpenseRow(expense: Expense, snapshot: GroupSnapshot, myUid: String, onEdit: () -> Unit, onDelete: () -> Unit) {
    var menu by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    ObsidianCard(
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(categoryColor(expense.category).copy(alpha = .14f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(categoryIcon(expense.category), null, tint = categoryColor(expense.category), modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(expense.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(2.dp))
                val paidByName = if (expense.paidBy == myUid) "You" else snapshot.profiles[expense.paidBy]?.name ?: expense.paidByName.ifBlank { "Member" }
                val dateStr = shortDate(expense.date.ifBlank { expense.createdAt })
                Text("Paid by $paidByName · $dateStr", color = QuietText, fontSize = 10.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(Money.format(expense.amountPaise), color = Color.White, fontWeight = FontWeight.Black, fontSize = 15.sp)
                val mySplit = expense.splits.firstOrNull { it.user == myUid }
                if (mySplit != null && mySplit.amountPaise > 0) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        "YOU: ${Money.format(mySplit.amountPaise)}",
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Box {
                IconButton(onClick = { menu = true }, modifier = Modifier.size(34.dp)) {
                    Icon(Icons.Default.MoreVert, "Expense menu", tint = Color.White.copy(alpha = .5f), modifier = Modifier.size(17.dp))
                }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }, containerColor = ModalSurface) {
                    DropdownMenuItem(
                        text = { Text("Edit") },
                        onClick = { menu = false; onEdit() },
                        leadingIcon = { Icon(Icons.Default.Edit, null) }
                    )
                    DropdownMenuItem(
                        text = { Text("Delete", color = Negative) },
                        onClick = { menu = false; confirmDelete = true },
                        leadingIcon = { Icon(Icons.Default.DeleteOutline, null, tint = Negative) }
                    )
                }
            }
        }
    }
    if (confirmDelete) {
        ConfirmDialog(
            title = "Delete expense?",
            message = "${expense.title} will be removed from balances. An immutable Activity record lets the group restore it.",
            confirm = "Delete",
            onDismiss = { confirmDelete = false },
            destructive = true
        ) {
            confirmDelete = false
            onDelete()
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.memberItems(snapshot: GroupSnapshot, state: PayMatrixState, vm: PayMatrixViewModel, onAdd: () -> Unit) {
    item { SectionTitle("Members", "${snapshot.group.members.size} people") { IconButton(onClick = onAdd) { Icon(Icons.Default.PersonAdd, "Add member") } } }
    items(snapshot.group.members, key = { it }) { memberUid ->
        val profile = snapshot.profiles[memberUid]
        val balance = snapshot.balances[memberUid] ?: 0L
        ObsidianCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                UserAvatar(profile, 42)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(profile?.name ?: "Member", color = Color.White, fontWeight = FontWeight.Bold)
                        if (memberUid == snapshot.group.admin) {
                            Spacer(Modifier.width(6.dp))
                            Text("ADMIN", color = PrimaryBlue, fontSize = 8.sp, fontWeight = FontWeight.Black)
                        }
                    }
                    Text(if (memberUid == state.user?.uid) "You" else profile?.email.orEmpty().ifBlank { "Member" }, color = QuietText, fontSize = 11.sp)
                }
                Text(
                    text = "${if (balance >= 0) "+" else "−"}${Money.format(kotlin.math.abs(balance))}",
                    color = if (balance < 0) Negative else if (balance > 0) Positive else Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.activityItems(snapshot: GroupSnapshot, vm: PayMatrixViewModel) {
    item { SectionTitle("Activity & Audit", "Immutable event history") }
    if (snapshot.activity.isEmpty()) item { EmptyState("No activity yet", "Changes to expenses and settlements are audited here.") }
    items(snapshot.activity, key = { it.id }) { item -> GroupActivityCard(item, snapshot, vm) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.insightItems(snapshot: GroupSnapshot) {
    item { SectionTitle("Group Insights", "Spending breakdown") }
    val active = snapshot.expenses.filter { it.status != "deleted" && it.status != "archived" }
    val total = active.sumOf { it.amountPaise }
    item {
        ObsidianCard {
            Text("TOTAL GROUP SPEND", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
            Spacer(Modifier.height(4.dp))
            Text(Money.format(total), color = Color.White, fontWeight = FontWeight.Black, fontSize = 26.sp)
        }
    }
    val categoriesMap = active.groupBy { it.category }.mapValues { it.value.sumOf(Expense::amountPaise) }.toList().sortedByDescending { it.second }
    items(categoriesMap, key = { it.first }) { (cat, amount) ->
        ObsidianCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(36.dp).clip(CircleShape).background(categoryColor(cat).copy(alpha = .12f)), contentAlignment = Alignment.Center) {
                    Icon(categoryIcon(cat), null, tint = categoryColor(cat), modifier = Modifier.size(16.dp))
                }
                Spacer(Modifier.width(10.dp))
                Text(cat, color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text(Money.format(amount), color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun GroupActivityCard(item: ActivityItem, snapshot: GroupSnapshot, vm: PayMatrixViewModel) {
    var confirmDelete by remember { mutableStateOf<Settlement?>(null) }
    ObsidianCard(contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(34.dp).clip(CircleShape).background(Color.White.copy(alpha = .08f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.History, null, tint = Color.White, modifier = Modifier.size(16.dp))
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(item.message, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                Spacer(Modifier.height(2.dp))
                Text("${item.actorName} · ${shortDate(item.createdAt)}", color = QuietText, fontSize = 10.sp)
            }
        }
        when (item.type) {
            "expense_deleted" -> snapshot.expenses.firstOrNull { it.id == item.relatedId }?.let { TextButton(onClick = { vm.restoreExpense(it) }) { Text("Restore") } }
            "settlement_deleted" -> snapshot.settlements.firstOrNull { it.id == item.relatedId }?.let { TextButton(onClick = { vm.restoreSettlement(it) }) { Text("Restore") } }
            "settlement_added" -> snapshot.settlements.firstOrNull { it.id == item.relatedId && it.status != "deleted" }?.let { settlement -> TextButton(onClick = { confirmDelete = settlement }) { Text("Delete", color = Negative) } }
        }
    }
    confirmDelete?.let { settlement -> ConfirmDialog("Delete settlement record?", "This changes group balances but does not affect a bank or UPI payment. The audit event remains restorable.", "Delete", { confirmDelete = null }, destructive = true) { confirmDelete = null; vm.archiveSettlement(settlement) } }
}

@Composable
private fun CreateGroupDialog(state: PayMatrixState, onDismiss: () -> Unit, onConfirm: (String, String, String, List<String>) -> Unit) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Trip & Travel") }
    val selected = remember { mutableStateMapOf<String, Boolean>() }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF141416),
        shape = RoundedCornerShape(24.dp),
        title = {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("CREATE GROUP", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 0.5.sp)
                IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.08f))) {
                    Icon(Icons.Default.Close, "Close", tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
        },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                FormField(name, { name = it.take(100) }, "Group name")
                FormField(description, { description = it.take(300) }, "Description (optional)", singleLine = false)
                Text("CATEGORY", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                val chunked = allGroupCategories.chunked(3)
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    chunked.forEach { rowItems ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            rowItems.forEach { cat ->
                                val isSelected = category.equals(cat.name, ignoreCase = true)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(72.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(if (isSelected) Color.White else Color.White.copy(alpha = 0.04f))
                                        .border(1.dp, if (isSelected) Color.White else Color.White.copy(alpha = 0.08f), RoundedCornerShape(14.dp))
                                        .clickable { category = cat.name }
                                        .padding(4.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                        Box(
                                            modifier = Modifier.size(26.dp).clip(CircleShape).background(if (isSelected) Color.Black.copy(alpha = 0.08f) else cat.color.copy(alpha = 0.15f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(cat.icon, null, tint = if (isSelected) Color.Black else cat.color, modifier = Modifier.size(15.dp))
                                        }
                                        Spacer(Modifier.height(4.dp))
                                        Text(cat.name, color = if (isSelected) Color.Black else Color.White.copy(alpha = 0.85f), fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium, fontSize = 8.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                            }
                        }
                    }
                }
                if (state.friends.isNotEmpty()) {
                    Text("ADD FRIENDS", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                    state.friends.forEach { friend ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(selected[friend.uid] == true, { selected[friend.uid] = it })
                            UserAvatar(friend, 30)
                            Spacer(Modifier.width(8.dp))
                            Text(friend.name)
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(name, description, category, selected.filterValues { it }.keys.toList()) },
                enabled = name.isNotBlank(),
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black)
            ) {
                Text("Create", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        },
        dismissButton = {
            Button(onClick = onDismiss, shape = RoundedCornerShape(100.dp), colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.06f), contentColor = Color.White)) {
                Text("Cancel", fontWeight = FontWeight.Medium, fontSize = 13.sp)
            }
        }
    )
}

@Composable
private fun EditGroupDialog(group: Group, onDismiss: () -> Unit, onConfirm: (String, String, String) -> Unit) {
    var name by remember { mutableStateOf(group.name) }
    var description by remember { mutableStateOf(group.description) }
    var selectedCategory by remember { mutableStateOf(group.category.ifBlank { "Trip & Travel" }) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF141416),
        shape = RoundedCornerShape(24.dp),
        title = {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("EDIT GROUP DETAILS", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 0.5.sp)
                IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.08f))) {
                    Icon(Icons.Default.Close, "Close", tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
        },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("Group Name", color = QuietText, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it.take(100) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White.copy(alpha = 0.06f),
                        unfocusedContainerColor = Color.White.copy(alpha = 0.04f),
                        focusedBorderColor = Color.White.copy(alpha = 0.3f),
                        unfocusedBorderColor = Color.Transparent,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Text("CATEGORY", color = QuietText, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                
                // 3x3 Grid of Category Cards matching Web
                val chunked = allGroupCategories.chunked(3)
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    chunked.forEach { rowItems ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            rowItems.forEach { cat ->
                                val isSelected = selectedCategory.equals(cat.name, ignoreCase = true) ||
                                    (cat.name.startsWith(selectedCategory, ignoreCase = true) && selectedCategory.length > 2)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(78.dp)
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(if (isSelected) Color.White else Color.White.copy(alpha = 0.04f))
                                        .border(1.dp, if (isSelected) Color.White else Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                                        .clickable { selectedCategory = cat.name }
                                        .padding(6.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                        Box(
                                            modifier = Modifier
                                                .size(30.dp)
                                                .clip(CircleShape)
                                                .background(if (isSelected) Color.Black.copy(alpha = 0.08f) else cat.color.copy(alpha = 0.15f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                cat.icon,
                                                null,
                                                tint = if (isSelected) Color.Black else cat.color,
                                                modifier = Modifier.size(17.dp)
                                            )
                                        }
                                        Spacer(Modifier.height(5.dp))
                                        Text(
                                            cat.name,
                                            color = if (isSelected) Color.Black else Color.White.copy(alpha = 0.85f),
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            fontSize = 9.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(name, description, selectedCategory) },
                enabled = name.isNotBlank(),
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black),
                contentPadding = PaddingValues(horizontal = 22.dp, vertical = 10.dp)
            ) {
                Text("Save Changes", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        },
        dismissButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.06f), contentColor = Color.White),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Text("Cancel", fontWeight = FontWeight.Medium, fontSize = 13.sp)
            }
        }
    )
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

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF141416),
        shape = RoundedCornerShape(24.dp),
        title = {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("SETTLE UP", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 0.5.sp)
                IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.08f))) {
                    Icon(Icons.Default.Close, "Close", tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
        },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("SELECT PAYEE", color = QuietText, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                val otherMembers = snapshot.group.members.filter { it != currentUid }
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    otherMembers.forEach { uid ->
                        val isSelected = (payee == uid)
                        val profile = snapshot.profiles[uid]
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (isSelected) Color.White else Color.White.copy(alpha = 0.04f))
                                .border(1.dp, if (isSelected) Color.White else Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                                .clickable { payee = uid }
                                .padding(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                UserAvatar(profile, 30)
                                Text(
                                    profile?.name?.substringBefore(' ') ?: "Member",
                                    color = if (isSelected) Color.Black else Color.White,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }

                Text("AMOUNT", color = QuietText, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it.filter { ch -> ch.isDigit() || ch == '.' }.take(12) },
                    prefix = { Text("₹", color = MutedText, fontSize = 22.sp) },
                    textStyle = LocalTextStyle.current.copy(fontSize = 24.sp, fontWeight = FontWeight.Bold),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White.copy(alpha = 0.06f),
                        unfocusedContainerColor = Color.White.copy(alpha = 0.04f),
                        focusedBorderColor = Color.White.copy(alpha = 0.3f),
                        unfocusedBorderColor = Color.Transparent,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                FormField(note, { note = it.take(100) }, "Note")

                val profile = snapshot.profiles[payee]
                if (profile != null && !profile.upiId.isNullOrBlank()) {
                    Button(
                        onClick = { runCatching { UpiLauncher.pay(context, profile.upiId, profile.name, Money.toPaise(amount), note) } },
                        shape = RoundedCornerShape(100.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue, contentColor = Color.White),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.OpenInNew, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Pay via UPI App", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }

                Text(
                    "PayMatrix is an informational calculation ledger. Recording a settlement here updates your shared balance, but does not execute a bank transfer. Confirm after completing your payment.",
                    color = QuietText,
                    fontSize = 10.sp,
                    lineHeight = 14.sp
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(payee, amount, note) },
                enabled = payee.isNotBlank() && amount.isNotBlank(),
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black),
                contentPadding = PaddingValues(horizontal = 22.dp, vertical = 10.dp)
            ) {
                Text("Record Settlement", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        },
        dismissButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.06f), contentColor = Color.White),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Text("Cancel", fontWeight = FontWeight.Medium, fontSize = 13.sp)
            }
        }
    )
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
