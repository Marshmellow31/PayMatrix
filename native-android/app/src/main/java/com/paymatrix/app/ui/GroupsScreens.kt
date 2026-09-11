@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.ui.graphics.asImageBitmap
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
import androidx.compose.ui.text.TextStyle
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
        LazyColumn(Modifier.fillMaxSize(), contentPadding = AppSpacing.pagePadding, verticalArrangement = Arrangement.spacedBy(AppSpacing.section)) {
            item {
                PageTitle(
                    title = "Groups",
                    subtitle = "Manage shared expenses and collective balances",
                    action = {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Button(
                                enabled = !LocalActionBusy.current,
                                onClick = { create = true },
                                shape = RoundedCornerShape(999.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = RaisedSurface, contentColor = Ink),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Hairline),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.Add, null, Modifier.size(15.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("NEW GROUP", fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 0.5.sp)
                            }
                            Button(
                                enabled = !LocalActionBusy.current,
                                onClick = { join = true },
                                shape = RoundedCornerShape(999.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = RaisedSurface, contentColor = Ink),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Hairline),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.Link, null, Modifier.size(15.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("JOIN", fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 0.5.sp)
                            }
                        }
                    }
                )
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
                Text(group.name, color = Ink, fontWeight = FontWeight.Black, fontSize = 20.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(24.dp).clip(CircleShape)
                            .background(categoryColor(group.category).copy(alpha = 0.16f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            categoryIcon(group.category),
                            null,
                            tint = categoryColor(group.category),
                            modifier = Modifier.size(13.dp)
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "•  ${group.members.size} members",
                        color = QuietText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }
            Spacer(Modifier.width(10.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text("YOUR BALANCE", color = Ink.copy(alpha = .65f), fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "${if (balance >= 0) "+" else "−"}${Money.format(kotlin.math.abs(balance))}",
                    color = if (balance < 0) Color(0xFFFF737B) else if (balance > 0) Positive else Ink,
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    style = TextStyle(fontFeatureSettings = "tnum")
                )
            }
        }
        Spacer(Modifier.height(18.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            AvatarStack(group.members, group.memberProfiles, 34)
            Spacer(Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, "Open ${group.name}", tint = Ink.copy(alpha = .6f), modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
fun GroupScreen(id: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current
    val clipboard = androidx.compose.ui.platform.LocalClipboardManager.current
    LaunchedEffect(id) { vm.loadGroup(id); vm.loadFriends() }
    DisposableEffect(id) {
        onDispose {
            vm.stopGroupRealtime()
        }
    }
    val snapshot = state.groupCache[id] ?: state.group?.takeIf { it.group.id == id }
    var tab by remember { mutableIntStateOf(0) }
    var settle by remember { mutableStateOf(false) }
    var editGroup by remember { mutableStateOf(false) }
    var addMember by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    var leaveConfirm by remember { mutableStateOf(false) }
    var deleteConfirm by remember { mutableStateOf(false) }
    var mineOnly by remember { mutableStateOf(false) }
    var visibleExpenseCount by remember(id) { mutableIntStateOf(CursorPagination.EXPENSES_INITIAL) }
    var visibleLogCount by remember(id) { mutableIntStateOf(CursorPagination.LOGS_INITIAL) }
    var selectedMember by remember { mutableStateOf<UserProfile?>(null) }

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
                title = "Back",
                nav = nav,
                actions = {
                    if (snapshot != null) {
                        IconButton(enabled = !LocalActionBusy.current, onClick = { addMember = true }) {
                            Icon(Icons.Default.PersonAdd, "Add member", tint = Ink.copy(alpha = .78f))
                        }
                        IconButton(enabled = !LocalActionBusy.current, onClick = { menu = true }) {
                            Icon(Icons.Default.MoreVert, "Group menu", tint = Ink.copy(alpha = .78f))
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
                            if (snapshot.group.admin == state.user?.uid) {
                                DropdownMenuItem(
                                    text = { Text("Edit group") },
                                    onClick = { menu = false; editGroup = true },
                                    leadingIcon = { Icon(Icons.Default.Edit, null) }
                                )
                            }
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
                GroupDetailSkeleton()
            } else {
                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = AppSpacing.pagePadding,
                    verticalArrangement = Arrangement.spacedBy(if (tab == 1 || tab == 2) 0.dp else AppSpacing.item)
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
                            onScan = { nav.navigate("scanner?groupId=$id") },
                            onSettle = { settle = true },
                        )
                    }
                    item {
                        ScrollableTabRow(
                            selectedTabIndex = tab,
                            containerColor = CanvasBlack,
                            contentColor = Ink,
                            edgePadding = 4.dp,
                            divider = { HorizontalDivider(color = Hairline) },
                            indicator = { positions -> TabRowDefaults.SecondaryIndicator(Modifier.tabIndicatorOffset(positions[tab]), color = Ink) }
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
                        0 -> expenseItems(
                            snapshot, state.user?.uid.orEmpty(), mineOnly, { mineOnly = !mineOnly },
                            visibleExpenseCount, { visibleExpenseCount += CursorPagination.EXPENSES_PAGE },
                            vm, nav
                        )
                        1 -> memberItems(snapshot, state, vm, { addMember = true }, { selectedMember = it })
                        2 -> activityItems(
                            snapshot, visibleLogCount, { visibleLogCount += CursorPagination.LOGS_PAGE }, vm
                        )
                        else -> insightItems(snapshot)
                    }
                }
            }
        }
    }

    selectedMember?.let { member -> snapshot?.let { group ->
        MemberDetailsSheet(member, group, state, vm, nav) { selectedMember = null }
    } }
    if (settle && snapshot != null) SettlementDialog(
        snapshot = snapshot,
        currentUid = state.user?.uid.orEmpty(),
        friends = state.friends,
        onAddFriend = { code -> vm.sendFriendRequest(code) },
        onDismiss = { settle = false }
    ) { payee, amount, note ->
        vm.settle(id, payee, amount, note) { settle = false }
    }
    if (editGroup && snapshot != null && snapshot.group.admin == state.user?.uid) EditGroupDialog(snapshot.group, { editGroup = false }) { name, description, category -> vm.updateGroup(id, name, description, category) { editGroup = false } }
    if (addMember && snapshot != null) AddMemberDialog(snapshot, state.friends, { addMember = false }) { uid -> vm.addGroupMember(id, uid) { addMember = false } }
    if (leaveConfirm) ConfirmDialog("Exit group?", "You can leave only when your balance is ₹0.00. This does not erase historical records.", "Leave", { leaveConfirm = false }) { vm.leaveGroup(id) { leaveConfirm = false; nav.popBackStack() } }
    if (deleteConfirm && snapshot != null && snapshot.group.admin == state.user?.uid) {
        val hasPending = snapshot.balances.values.any { kotlin.math.abs(it) > 0L } || snapshot.debts.isNotEmpty()
        if (hasPending) {
            ConfirmDialog(
                title = "Cannot Delete Group",
                message = "This group has unsettled debts. All members must settle up before the group can be permanently deleted.",
                confirm = "Understood",
                onDismiss = { deleteConfirm = false },
                showDismiss = false
            ) { deleteConfirm = false }
        } else {
            ConfirmDialog(
                title = "Delete group?",
                message = "Are you sure you want to delete this group? All recorded expenses and settlement histories will be permanently removed.",
                confirm = "Delete Group",
                onDismiss = { deleteConfirm = false },
                destructive = true
            ) {
                vm.deleteGroup(id) {
                    deleteConfirm = false
                    nav.popBackStack()
                }
            }
        }
    }
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
            Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp))
                .background(CardSurface)
                .border(1.dp, Hairline, RoundedCornerShape(22.dp))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
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
                        color = Ink,
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
                            Text(
                                snapshot.group.category.uppercase(),
                                color = categoryColor(snapshot.group.category),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(Modifier.height(3.dp))
                    Text(
                        "${snapshot.group.members.size} members · Created by ${if (snapshot.group.admin == myUid) "You" else snapshot.profiles[snapshot.group.admin]?.name ?: "Admin"}",
                        color = QuietText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
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
                        .background(Ink.copy(alpha = .05f))
                        .border(1.dp, Hairline, RoundedCornerShape(100.dp))
                        .clickable(onClick = onCopyInvite)
                        .padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.Share, null, tint = PrimaryBlue, modifier = Modifier.size(13.dp))
                    Text(snapshot.group.inviteCode, color = Ink, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Icon(Icons.Default.ContentCopy, null, tint = MutedText, modifier = Modifier.size(11.dp))
                }

                // Invite button
                Row(
                    Modifier.clip(RoundedCornerShape(100.dp))
                        .background(Ink.copy(alpha = .05f))
                        .border(1.dp, Hairline, RoundedCornerShape(100.dp))
                        .clickable(onClick = onInvite)
                        .padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Icon(Icons.Default.PersonAdd, null, tint = Ink, modifier = Modifier.size(13.dp))
                    Text("Invite", color = Ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }

                if (snapshot.group.admin == myUid) {
                    Spacer(Modifier.weight(1f))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Settings cog button
                        IconButton(
                            onClick = onSettings,
                            modifier = Modifier.size(48.dp)
                        ) {
                            Box(
                                Modifier.size(36.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Ink.copy(alpha = .06f))
                                    .border(1.dp, Hairline, RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Settings, "Settings", tint = Ink.copy(alpha = .8f), modifier = Modifier.size(17.dp))
                            }
                        }

                        // Delete button
                        IconButton(
                            onClick = onDelete,
                            modifier = Modifier.size(48.dp)
                        ) {
                            Box(
                                Modifier.size(36.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Negative.copy(alpha = .12f))
                                    .border(1.dp, Negative.copy(alpha = .25f), RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.DeleteOutline, "Delete", tint = Color(0xFFFF737B), modifier = Modifier.size(17.dp))
                            }
                        }
                    }
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
                    else -> Ink
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
            Button(enabled = !LocalActionBusy.current,
                onClick = onRecord,
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ActionContainer, contentColor = ActionContent),
                contentPadding = PaddingValues(vertical = 12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Add, null, modifier = Modifier.size(17.dp))
                Spacer(Modifier.width(6.dp))
                Text("ADD EXPENSE", fontWeight = FontWeight.Black, fontSize = 12.sp, letterSpacing = 0.5.sp)
            }
            Button(enabled = !LocalActionBusy.current,
                onClick = onScan,
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Ink.copy(alpha = 0.05f), contentColor = Ink),
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
        Button(enabled = !LocalActionBusy.current,
            onClick = onSettle,
            shape = RoundedCornerShape(100.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Ink.copy(alpha = 0.05f), contentColor = Ink),
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
    ObsidianCard(modifier) { Icon(icon, null, tint = MutedText, modifier = Modifier.size(18.dp)); Text(label, color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp); Text(value, color = Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp, style = TextStyle(fontFeatureSettings = "tnum")) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.overviewItems(snapshot: GroupSnapshot, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController, settlementsEnabled: Boolean, onSettle: () -> Unit) {
    if (settlementsEnabled) item { SectionTitle("Suggested settlements", "Simplified repayment plan") }
    if (settlementsEnabled && snapshot.debts.isEmpty()) item { ObsidianCard { Text("All clear", color = Ink, fontWeight = FontWeight.Bold); Text("There are no outstanding balances.", color = QuietText) } }
    if (settlementsEnabled) items(snapshot.debts, key = { "${it.from}_${it.to}" }) { debt ->
        ObsidianCard(Modifier.clickable { if (debt.from == state.user?.uid) onSettle() }) {
            Row(verticalAlignment = Alignment.CenterVertically) { UserAvatar(snapshot.profiles[debt.from], 38); Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) { Text("${snapshot.profiles[debt.from]?.name ?: "Member"} pays", color = QuietText, fontSize = 12.sp); Text(snapshot.profiles[debt.to]?.name ?: "Member", color = Ink, fontWeight = FontWeight.Bold) }; Text(Money.format(debt.amountPaise), color = Ink, fontWeight = FontWeight.Bold, style = TextStyle(fontFeatureSettings = "tnum")) }
        }
    }
    item { SectionTitle("Expense timeline", "Recent first") }
    val active = snapshot.expenses.filter { it.status != "deleted" && it.status != "archived" }.take(5)
    if (active.isEmpty()) item { EmptyState("No expenses", "Record the first shared transaction.") }
    items(active, key = { it.id }) { expense -> ExpenseRow(expense, snapshot, state.user?.uid.orEmpty(), { nav.navigate("expense/${snapshot.group.id}?expenseId=${expense.id}") }, { vm.archiveExpense(expense) }) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.expenseItems(
    snapshot: GroupSnapshot,
    uid: String,
    mineOnly: Boolean,
    onToggleMine: () -> Unit,
    visibleCount: Int,
    onLoadEarlier: () -> Unit,
    vm: PayMatrixViewModel,
    nav: NavHostController
) {
    item { SectionTitle("Expenses", if (mineOnly) "Showing your expenses" else "Recent first") { TextButton(enabled = !LocalActionBusy.current, onClick = onToggleMine) { Text(if (mineOnly) "Show all" else "Show yours", color = MutedText, fontSize = 12.sp) } } }
    val active = snapshot.expenses
        .filter { it.status != "deleted" && it.status != "archived" && (!mineOnly || it.paidBy == uid || it.participants.contains(uid)) }
        .sortedWith { a, b ->
            CursorPagination.compareRecords(
                CursorPagination.parseEpochMillis(a.createdAt), a.id,
                CursorPagination.parseEpochMillis(b.createdAt), b.id
            )
        }
    if (active.isEmpty()) item { EmptyState("No expenses", "Tap + to record the first one.") }
    val displayed = active.take(visibleCount)
    items(displayed, key = { it.id }) { expense -> ExpenseRow(expense, snapshot, uid, { nav.navigate("expense/${snapshot.group.id}?expenseId=${expense.id}") }, { vm.archiveExpense(expense) }) }
    if (visibleCount < active.size) item {
        Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
            OutlinedButton(
                onClick = onLoadEarlier,
                shape = RoundedCornerShape(999.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Hairline),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Ink)
            ) {
                Text("Load earlier", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
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
                Text(expense.title, color = Ink, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(2.dp))
                val paidByName = if (expense.paidBy == myUid) "You" else snapshot.profiles[expense.paidBy]?.name ?: expense.paidByName.ifBlank { "Member" }
                val dateStr = shortDate(expense.date.ifBlank { expense.createdAt })
                Text("Paid by $paidByName · $dateStr", color = QuietText, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(Money.format(expense.amountPaise), color = Ink, fontWeight = FontWeight.Black, fontSize = 15.sp)
                val mySplit = expense.splits.firstOrNull { it.user == myUid }
                if (mySplit != null && mySplit.amountPaise > 0) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        "YOU: ${Money.format(mySplit.amountPaise)}",
                        color = Ink.copy(alpha = 0.6f),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Box {
                IconButton(enabled = !LocalActionBusy.current, onClick = { menu = true }, modifier = Modifier.size(34.dp)) {
                    Icon(Icons.Default.MoreVert, "Expense menu", tint = QuietText, modifier = Modifier.size(17.dp))
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

private fun androidx.compose.foundation.lazy.LazyListScope.memberItems(snapshot: GroupSnapshot, state: PayMatrixState, vm: PayMatrixViewModel, onAdd: () -> Unit, onMember: (UserProfile) -> Unit) {
    item { SectionTitle("Members", "${snapshot.group.members.size} people") { TextButton(onClick = onAdd) { Text("Add") } } }
    items(snapshot.group.members, key = { it }) { memberUid ->
        val profile = snapshot.profiles[memberUid] ?: UserProfile(uid = memberUid)
        val balance = snapshot.balances[memberUid] ?: 0L
        Row(Modifier.fillMaxWidth().heightIn(min = 64.dp).clickable { onMember(profile) }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            UserAvatar(profile, 40)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(profile.name, color = Ink, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(if (memberUid == state.user?.uid) "You" else if (memberUid == snapshot.group.admin) "Group admin" else "Member", color = QuietText, style = MaterialTheme.typography.bodySmall)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(Money.format(kotlin.math.abs(balance)), color = if (balance < 0) Negative else if (balance > 0) Positive else Ink, style = MaterialTheme.typography.titleSmall)
                Text(if (balance < 0) "owes" else if (balance > 0) "gets back" else "settled", color = QuietText, style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.width(8.dp)); Icon(Icons.Default.ChevronRight, "Member details", tint = QuietText, modifier = Modifier.size(18.dp))
        }
        HorizontalDivider(color = Hairline)
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.activityItems(
    snapshot: GroupSnapshot,
    visibleCount: Int,
    onLoadEarlier: () -> Unit,
    vm: PayMatrixViewModel
) {
    item { SectionTitle("Activity", "Tap an entry for details") }
    val sorted = snapshot.activity.sortedWith { a, b ->
        CursorPagination.compareRecords(
            CursorPagination.parseEpochMillis(a.createdAt), a.id,
            CursorPagination.parseEpochMillis(b.createdAt), b.id
        )
    }
    if (sorted.isEmpty()) item { EmptyState("No activity yet", "Changes to expenses and settlements are audited here.") }
    val displayed = sorted.take(visibleCount)
    items(displayed, key = { it.id }) { item -> GroupActivityCard(item, snapshot, vm) }
    if (visibleCount < sorted.size) item {
        Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
            OutlinedButton(
                onClick = onLoadEarlier,
                shape = RoundedCornerShape(999.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Hairline),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Ink)
            ) {
                Text("Load earlier", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.insightItems(snapshot: GroupSnapshot) {
    item { SectionTitle("Group Insights", "Spending breakdown") }
    val active = snapshot.expenses.filter { it.status != "deleted" && it.status != "archived" }
    val total = active.sumOf { it.amountPaise }
    item {
        ObsidianCard {
            Text("TOTAL GROUP SPEND", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
            Spacer(Modifier.height(4.dp))
            Text(Money.format(total), color = Ink, fontWeight = FontWeight.Black, fontSize = 26.sp, style = TextStyle(fontFeatureSettings = "tnum"))
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
                Text(cat, color = Ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text(Money.format(amount), color = Ink, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun GroupActivityCard(item: ActivityItem, snapshot: GroupSnapshot, vm: PayMatrixViewModel) {
    var confirmDelete by remember { mutableStateOf<Settlement?>(null) }
    val isDeletion = item.type == "expense_deleted" || item.type == "settlement_deleted"
    val isRestored = item.type == "expense_restored" || item.type == "settlement_restored"
    val isSettlement = item.type == "settlement_added"
    val icon = when {
        isDeletion -> Icons.Default.DeleteOutline
        isRestored -> Icons.Default.Restore
        isSettlement -> Icons.Default.ReceiptLong
        item.type == "expense_updated" -> Icons.Default.Edit
        else -> Icons.Default.History
    }
    val iconTint = when {
        isDeletion -> Negative
        isRestored -> Positive
        isSettlement -> PrimaryBlue
        item.type == "expense_updated" -> Color(0xFFF59E0B)
        else -> Ink
    }
    var expanded by remember(item.id) { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().heightIn(min = 64.dp).clickable { expanded = !expanded }.padding(vertical = 8.dp), verticalAlignment = Alignment.Top) {
            Box(Modifier.size(32.dp).clip(CircleShape).background(iconTint.copy(alpha = .12f)), contentAlignment = Alignment.Center) { Icon(icon, null, tint = iconTint, modifier = Modifier.size(16.dp)) }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.message, color = Ink, style = MaterialTheme.typography.bodyMedium, maxLines = if (expanded) Int.MAX_VALUE else 2, overflow = TextOverflow.Ellipsis)
                Text("${item.actorName} · ${shortDate(item.createdAt)}", color = QuietText, style = MaterialTheme.typography.bodySmall)
            }
            Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, if (expanded) "Collapse details" else "Expand details", tint = QuietText, modifier = Modifier.size(20.dp))
        }
        if (expanded) when (item.type) {
            "expense_deleted" -> snapshot.expenses.firstOrNull { it.id == item.relatedId }?.let { TextButton(enabled = !LocalActionBusy.current, onClick = { vm.restoreExpense(it) }) { Text("Restore expense") } }
            "settlement_deleted" -> snapshot.settlements.firstOrNull { it.id == item.relatedId }?.let { TextButton(enabled = !LocalActionBusy.current, onClick = { vm.restoreSettlement(it) }) { Text("Restore settlement") } }
            "settlement_added" -> snapshot.settlements.firstOrNull { it.id == item.relatedId && it.status != "deleted" }?.let { settlement -> TextButton(enabled = !LocalActionBusy.current, onClick = { confirmDelete = settlement }) { Text("Delete settlement", color = Negative) } }
        }
        HorizontalDivider(color = Hairline)
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
        containerColor = CardSurface,
        shape = RoundedCornerShape(24.dp),
        title = {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("CREATE GROUP", color = Ink, fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 0.5.sp)
                IconButton(enabled = !LocalActionBusy.current, onClick = onDismiss, modifier = Modifier.size(32.dp).clip(CircleShape).background(Ink.copy(alpha = 0.08f))) {
                    Icon(Icons.Default.Close, "Close", tint = Ink, modifier = Modifier.size(16.dp))
                }
            }
        },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                FormField(name, { name = it.take(100) }, "Group name")
                FormField(description, { description = it.take(300) }, "Description (optional)", singleLine = false)
                Text("CATEGORY", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
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
                                        .background(if (isSelected) Ink else Ink.copy(alpha = 0.04f))
                                        .border(1.dp, if (isSelected) Ink else Ink.copy(alpha = 0.08f), RoundedCornerShape(14.dp))
                                        .clickable { category = cat.name }
                                        .padding(4.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                        Box(
                                            modifier = Modifier.size(26.dp).clip(CircleShape).background(if (isSelected) CanvasBlack.copy(alpha = 0.08f) else cat.color.copy(alpha = 0.15f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(cat.icon, null, tint = if (isSelected) CanvasBlack else cat.color, modifier = Modifier.size(15.dp))
                                        }
                                        Spacer(Modifier.height(4.dp))
                                        Text(cat.name, color = if (isSelected) CanvasBlack else Ink.copy(alpha = 0.85f), fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                            }
                        }
                    }
                }
                if (state.friends.isNotEmpty()) {
                    Text("ADD FRIENDS", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
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
                enabled = !LocalActionBusy.current && (name.isNotBlank()),
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ActionContainer, contentColor = ActionContent)
            ) {
                Text("Create", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        },
        dismissButton = {
            Button(enabled = !LocalActionBusy.current, onClick = onDismiss, shape = RoundedCornerShape(100.dp), colors = ButtonDefaults.buttonColors(containerColor = Ink.copy(alpha = 0.06f), contentColor = Ink)) {
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
        containerColor = CardSurface,
        shape = RoundedCornerShape(24.dp),
        title = {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("EDIT GROUP DETAILS", color = Ink, fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 0.5.sp)
                IconButton(enabled = !LocalActionBusy.current, onClick = onDismiss, modifier = Modifier.size(32.dp).clip(CircleShape).background(Ink.copy(alpha = 0.08f))) {
                    Icon(Icons.Default.Close, "Close", tint = Ink, modifier = Modifier.size(16.dp))
                }
            }
        },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("Group Name", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it.take(100) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Ink.copy(alpha = 0.06f),
                        unfocusedContainerColor = Ink.copy(alpha = 0.04f),
                        focusedBorderColor = Ink.copy(alpha = 0.3f),
                        unfocusedBorderColor = Color.Transparent,
                        focusedTextColor = Ink,
                        unfocusedTextColor = Ink
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Text("CATEGORY", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                
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
                                        .background(if (isSelected) Ink else Ink.copy(alpha = 0.04f))
                                        .border(1.dp, if (isSelected) Ink else Ink.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                                        .clickable { selectedCategory = cat.name }
                                        .padding(6.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                        Box(
                                            modifier = Modifier
                                                .size(30.dp)
                                                .clip(CircleShape)
                                                .background(if (isSelected) CanvasBlack.copy(alpha = 0.08f) else cat.color.copy(alpha = 0.15f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                cat.icon,
                                                null,
                                                tint = if (isSelected) CanvasBlack else cat.color,
                                                modifier = Modifier.size(17.dp)
                                            )
                                        }
                                        Spacer(Modifier.height(5.dp))
                                        Text(
                                            cat.name,
                                            color = if (isSelected) CanvasBlack else Ink.copy(alpha = 0.85f),
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            fontSize = 12.sp,
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
                enabled = !LocalActionBusy.current && (name.isNotBlank()),
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ActionContainer, contentColor = ActionContent),
                contentPadding = PaddingValues(horizontal = 22.dp, vertical = 10.dp)
            ) {
                Text("Save Changes", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        },
        dismissButton = {
            Button(enabled = !LocalActionBusy.current,
                onClick = onDismiss,
                shape = RoundedCornerShape(100.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Ink.copy(alpha = 0.06f), contentColor = Ink),
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
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text("Add member") }, text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { Text("SELECT FROM FRIENDS", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Bold); if (available.isEmpty()) Text("No available friends. Connect on the Friends page first.", color = MutedText) else available.forEach { friend -> Row(Modifier.fillMaxWidth().clickable { onAdd(friend.uid) }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) { UserAvatar(friend, 38); Spacer(Modifier.width(10.dp)); Text(friend.name, Modifier.weight(1f)); Icon(Icons.Default.Add, null) } }; HorizontalDivider(color = Hairline); Text("Invite code", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Bold); Text(snapshot.group.inviteCode.chunked(4).joinToString(" "), color = Ink, fontWeight = FontWeight.Bold, letterSpacing = 2.sp) } }, confirmButton = {}, dismissButton = { TextButton(enabled = !LocalActionBusy.current, onClick = onDismiss) { Text("Done") } })
}

private data class UpiQrTarget(
    val uid: String,
    val name: String,
    val upiId: String,
    val amountPaise: Long,
    val note: String,
)

@Composable
private fun SettlementDialog(
    snapshot: GroupSnapshot,
    currentUid: String,
    friends: List<UserProfile> = emptyList(),
    onAddFriend: ((String) -> Unit)? = null,
    onDismiss: () -> Unit,
    onConfirm: (String, String, String) -> Unit
) {
    val context = LocalContext.current
    var view by remember { mutableStateOf("main") } // "main" or "custom"
    val myDebts = remember(snapshot, currentUid) {
        snapshot.debts.filter { it.from == currentUid }
    }
    val totalOwePaise = remember(myDebts) {
        myDebts.sumOf { it.amountPaise }
    }
    var partialDebtTarget by remember { mutableStateOf<String?>(null) }
    var partialAmountText by remember { mutableStateOf("") }
    var qrTarget by remember { mutableStateOf<UpiQrTarget?>(null) }

    val otherMembers = remember(snapshot, currentUid) {
        snapshot.group.members.filter { it != currentUid }
    }
    var customPayee by remember { mutableStateOf(otherMembers.firstOrNull().orEmpty()) }
    var customAmount by remember { mutableStateOf("") }
    var customNote by remember { mutableStateOf("Settled up") }

    if (qrTarget != null) {
        UpiQrModal(
            target = qrTarget!!,
            onDismiss = { qrTarget = null },
            onMarkPaid = { payee, amount, note ->
                qrTarget = null
                onConfirm(payee, amount, note)
            }
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = CardSurface,
        shape = RoundedCornerShape(24.dp),
        title = {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (view == "custom") {
                        IconButton(enabled = !LocalActionBusy.current,
                            onClick = { view = "main" },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(Icons.Default.ArrowBack, "Back", tint = Ink, modifier = Modifier.size(18.dp))
                        }
                    }
                    Text(
                        if (view == "custom") "CUSTOM SETTLEMENT" else "SETTLE UP",
                        color = Ink,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        letterSpacing = 0.5.sp
                    )
                }
                IconButton(enabled = !LocalActionBusy.current,
                    onClick = onDismiss,
                    modifier = Modifier.size(32.dp).clip(CircleShape).background(Ink.copy(alpha = 0.08f))
                ) {
                    Icon(Icons.Default.Close, "Close", tint = Ink, modifier = Modifier.size(16.dp))
                }
            }
        },
        text = {
            Column(
                Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                if (view == "main") {
                    if (myDebts.isEmpty()) {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .padding(vertical = 24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(54.dp)
                                    .clip(CircleShape)
                                    .background(MintGreen.copy(alpha = 0.15f))
                                    .border(1.dp, MintGreen.copy(alpha = 0.3f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.CheckCircle, null, tint = MintGreen, modifier = Modifier.size(28.dp))
                            }
                            Text(
                                "You are all settled up",
                                fontWeight = FontWeight.Bold,
                                color = Ink,
                                fontSize = 16.sp
                            )
                            Text(
                                "You have no outstanding dues in this group.",
                                color = QuietText,
                                fontSize = 12.sp
                            )
                        }
                    } else {
                        // Total You Owe Banner with Settle All button
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(18.dp))
                                .background(MintGreen.copy(alpha = 0.10f))
                                .border(1.dp, MintGreen.copy(alpha = 0.25f), RoundedCornerShape(18.dp))
                                .padding(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        "TOTAL YOU OWE",
                                        color = MintGreen,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        letterSpacing = 1.5.sp
                                    )
                                    Spacer(Modifier.height(2.dp))
                                    Text(
                                        Money.format(totalOwePaise),
                                        color = Ink,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 24.sp
                                    )
                                }
                                Button(enabled = !LocalActionBusy.current,
                                    onClick = {
                                        myDebts.forEach { debt ->
                                            onConfirm(debt.to, "%.2f".format(debt.amountPaise / 100.0), "Settled all dues")
                                        }
                                    },
                                    shape = RoundedCornerShape(100.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = ActionContainer, contentColor = ActionContent),
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                                ) {
                                    Text("Settle All", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        }

                        // Informational Disclaimer
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Ink.copy(alpha = 0.03f))
                                .border(1.dp, Ink.copy(alpha = 0.06f), RoundedCornerShape(12.dp))
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(Icons.Default.Info, null, tint = MintGreen.copy(alpha = 0.7f), modifier = Modifier.size(15.dp))
                            Text(
                                "PayMatrix is an informational calculation ledger. Recording a settlement updates your balance but does not execute a bank transfer. Confirm after completing your payment.",
                                color = QuietText,
                                fontSize = 12.sp,
                                lineHeight = 14.sp
                            )
                        }

                        Text(
                            "RECOMMENDED PAYMENTS",
                            color = QuietText,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.4.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )

                        // Debt cards
                        myDebts.forEach { debt ->
                            val payeeProfile = snapshot.profiles[debt.to]
                            val payeeName = payeeProfile?.name ?: "Member"
                            val hasUpi = !payeeProfile?.upiId.isNullOrBlank()
                            val isFriend = friends.any { it.uid == debt.to }
                            val friendCode = payeeProfile?.friendCode.orEmpty()
                            val isPartialActive = partialDebtTarget == debt.to

                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Ink.copy(alpha = 0.03f))
                                    .border(1.dp, Ink.copy(alpha = 0.07f), RoundedCornerShape(16.dp))
                                    .padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    UserAvatar(payeeProfile, 38)
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text("You should pay", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(Money.format(debt.amountPaise), color = Color(0xFFFCA5A5), fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                            Text("→", color = QuietText, fontSize = 12.sp)
                                            Text(payeeName, color = Ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 1)
                                        }
                                    }
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (hasUpi) MintGreen.copy(alpha = 0.12f) else Color(0xFFF59E0B).copy(alpha = 0.12f))
                                            .border(1.dp, if (hasUpi) MintGreen.copy(alpha = 0.25f) else Color(0xFFF59E0B).copy(alpha = 0.25f), RoundedCornerShape(8.dp))
                                            .padding(horizontal = 8.dp, vertical = 3.dp)
                                    ) {
                                        Text(
                                            if (hasUpi) "READY" else "NO ID",
                                            color = if (hasUpi) MintGreen else Color(0xFFFBBF24),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Black,
                                            letterSpacing = 0.8.sp
                                        )
                                    }
                                }

                                if (!hasUpi) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Ink.copy(alpha = 0.04f))
                                            .padding(horizontal = 10.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            if (!isFriend) "UPI ID hidden by privacy. Add as friend to view UPI." else "Payee has not added their UPI ID yet.",
                                            color = QuietText,
                                            fontSize = 12.sp,
                                            modifier = Modifier.weight(1f)
                                        )
                                        if (!isFriend && friendCode.isNotBlank() && onAddFriend != null) {
                                            Spacer(Modifier.width(8.dp))
                                            TextButton(
                                                onClick = { onAddFriend(friendCode) },
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                            ) {
                                                Text("Add Friend", color = MintGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }

                                if (isPartialActive) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(CanvasBlack.copy(alpha = 0.4f))
                                            .border(1.dp, Ink.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                                            .padding(10.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OutlinedTextField(
                                            value = partialAmountText,
                                            onValueChange = { partialAmountText = it.filter { ch -> ch.isDigit() || ch == '.' }.take(12) },
                                            prefix = { Text("₹", color = MutedText, fontSize = 16.sp) },
                                            label = { Text("Amount to Pay", fontSize = 12.sp) },
                                            textStyle = LocalTextStyle.current.copy(fontSize = 16.sp, fontWeight = FontWeight.Bold),
                                            singleLine = true,
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            OutlinedButton(enabled = !LocalActionBusy.current,
                                                onClick = { partialDebtTarget = null },
                                                modifier = Modifier.weight(1f).height(36.dp),
                                                shape = RoundedCornerShape(8.dp),
                                                contentPadding = PaddingValues(0.dp)
                                            ) {
                                                Text("Cancel", fontSize = 12.sp, color = Ink)
                                            }
                                            Button(enabled = !LocalActionBusy.current,
                                                onClick = {
                                                    val clean = partialAmountText.trim()
                                                    if (clean.isNotBlank() && (clean.toDoubleOrNull() ?: 0.0) > 0) {
                                                        onConfirm(debt.to, clean, "Partial settlement")
                                                        partialDebtTarget = null
                                                    }
                                                },
                                                modifier = Modifier.weight(1f).height(36.dp),
                                                shape = RoundedCornerShape(8.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = MintGreen, contentColor = CanvasBlack),
                                                contentPadding = PaddingValues(0.dp)
                                            ) {
                                                Text("Confirm", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                } else {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OutlinedButton(enabled = !LocalActionBusy.current,
                                            onClick = {
                                                partialDebtTarget = debt.to
                                                partialAmountText = "%.2f".format(debt.amountPaise / 100.0)
                                            },
                                            modifier = Modifier.weight(1f).height(36.dp),
                                            shape = RoundedCornerShape(10.dp),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Ink.copy(alpha = 0.12f)),
                                            contentPadding = PaddingValues(0.dp)
                                        ) {
                                            Text("Partial", fontSize = 12.sp, color = Ink)
                                        }
                                        Button(enabled = !LocalActionBusy.current,
                                            onClick = {
                                                onConfirm(debt.to, "%.2f".format(debt.amountPaise / 100.0), "Settled up")
                                            },
                                            modifier = Modifier.weight(1f).height(36.dp),
                                            shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = ActionContainer, contentColor = ActionContent),
                                            contentPadding = PaddingValues(0.dp)
                                        ) {
                                            Text("Mark Paid", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    Button(enabled = !LocalActionBusy.current,
                                        onClick = {
                                            qrTarget = UpiQrTarget(
                                                uid = debt.to,
                                                name = payeeName,
                                                upiId = payeeProfile?.upiId.orEmpty(),
                                                amountPaise = debt.amountPaise,
                                                note = "Settled up"
                                            )
                                        },
                                        modifier = Modifier.fillMaxWidth().height(40.dp),
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (hasUpi) MintGreen.copy(alpha = 0.15f) else Ink.copy(alpha = 0.04f),
                                            contentColor = if (hasUpi) MintGreen else Ink.copy(alpha = 0.4f)
                                        ),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, if (hasUpi) MintGreen.copy(alpha = 0.3f) else Ink.copy(alpha = 0.08f)),
                                        contentPadding = PaddingValues(0.dp)
                                    ) {
                                        Icon(Icons.Default.QrCode, null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text("Pay via UPI / QR", fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
                                    }
                                }
                            }
                        }
                    }

                    // Custom Settlement Entry Link
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Ink.copy(alpha = 0.03f))
                            .border(1.dp, Ink.copy(alpha = 0.06f), RoundedCornerShape(14.dp))
                            .clickable { view = "custom" }
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF8B5CF6).copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Tune, null, tint = Color(0xFFA78BFA), modifier = Modifier.size(16.dp))
                            }
                            Column {
                                Text("Custom Settlement", fontWeight = FontWeight.Bold, color = Ink, fontSize = 13.sp)
                                Text("Settle a custom amount with any member", color = QuietText, fontSize = 12.sp)
                            }
                        }
                        Icon(Icons.Default.ChevronRight, null, tint = MutedText, modifier = Modifier.size(18.dp))
                    }
                } else {
                    // ─── CUSTOM SETTLEMENT VIEW ─────────────────────────────────
                    Text("SELECT PAYEE", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        otherMembers.forEach { uid ->
                            val isSelected = (customPayee == uid)
                            val profile = snapshot.profiles[uid]
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(if (isSelected) Ink else Ink.copy(alpha = 0.04f))
                                    .border(1.dp, if (isSelected) Ink else Ink.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                                    .clickable { customPayee = uid }
                                    .padding(horizontal = 14.dp, vertical = 10.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    UserAvatar(profile, 30)
                                    Text(
                                        profile?.name?.substringBefore(' ') ?: "Member",
                                        color = if (isSelected) CanvasBlack else Ink,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    }

                    Text("AMOUNT", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                    OutlinedTextField(
                        value = customAmount,
                        onValueChange = { customAmount = it.filter { ch -> ch.isDigit() || ch == '.' }.take(12) },
                        prefix = { Text("₹", color = MutedText, fontSize = 22.sp) },
                        textStyle = LocalTextStyle.current.copy(fontSize = 24.sp, fontWeight = FontWeight.Bold),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Ink.copy(alpha = 0.06f),
                            unfocusedContainerColor = Ink.copy(alpha = 0.04f),
                            focusedBorderColor = Ink.copy(alpha = 0.3f),
                            unfocusedBorderColor = Color.Transparent,
                            focusedTextColor = Ink,
                            unfocusedTextColor = Ink
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    FormField(customNote, { customNote = it.take(100) }, "Note")

                    val profile = snapshot.profiles[customPayee]
                    val customPaise = runCatching { Money.toPaise(customAmount) }.getOrDefault(0L)
                    if (profile != null && !profile.upiId.isNullOrBlank() && customPaise > 0) {
                        Button(enabled = !LocalActionBusy.current,
                            onClick = {
                                qrTarget = UpiQrTarget(
                                    uid = customPayee,
                                    name = profile.name,
                                    upiId = profile.upiId,
                                    amountPaise = customPaise,
                                    note = customNote
                                )
                            },
                            shape = RoundedCornerShape(100.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MintGreen.copy(alpha = 0.2f), contentColor = MintGreen),
                            border = androidx.compose.foundation.BorderStroke(1.dp, MintGreen.copy(alpha = 0.4f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.QrCode, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Open UPI / QR Code", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(enabled = !LocalActionBusy.current,
                            onClick = { view = "main" },
                            modifier = Modifier.weight(1f).height(46.dp),
                            shape = RoundedCornerShape(100.dp)
                        ) {
                            Text("Back", color = Ink)
                        }
                        Button(
                            onClick = { onConfirm(customPayee, customAmount, customNote) },
                            enabled = !LocalActionBusy.current && (customPayee.isNotBlank() && customAmount.isNotBlank() && customPaise > 0),
                            shape = RoundedCornerShape(100.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ActionContainer, contentColor = ActionContent),
                            modifier = Modifier.weight(1.5f).height(46.dp)
                        ) {
                            Text("Record Settlement", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {}
    )
}

@Composable
private fun UpiQrModal(
    target: UpiQrTarget,
    onDismiss: () -> Unit,
    onMarkPaid: (String, String, String) -> Unit
) {
    val context = LocalContext.current
    val showFeedback = LocalAppFeedback.current
    val qrContent = remember(target) {
        if (target.upiId.isNotBlank()) {
            UpiLauncher.getUpiString(target.upiId, target.name, target.amountPaise, target.note)
        } else ""
    }
    val qrBitmap = remember(qrContent) {
        if (qrContent.isNotBlank()) QrCodeHelper.generateQrBitmap(qrContent, 600) else null
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = CardSurface,
        shape = RoundedCornerShape(28.dp),
        title = {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Scan to Pay",
                    color = Ink,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp
                )
                IconButton(enabled = !LocalActionBusy.current,
                    onClick = onDismiss,
                    modifier = Modifier.size(32.dp).clip(CircleShape).background(Ink.copy(alpha = 0.08f))
                ) {
                    Icon(Icons.Default.Close, "Close", tint = Ink, modifier = Modifier.size(16.dp))
                }
            }
        },
        text = {
            Column(
                Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = androidx.compose.ui.text.buildAnnotatedString {
                        append("Pay ")
                        pushStyle(androidx.compose.ui.text.SpanStyle(fontWeight = FontWeight.Bold, color = Ink))
                        append(target.name)
                        pop()
                        append(" ")
                        pushStyle(androidx.compose.ui.text.SpanStyle(fontWeight = FontWeight.Black, color = MintGreen))
                        append(Money.format(target.amountPaise))
                        pop()
                    },
                    fontSize = 14.sp,
                    color = Ink.copy(alpha = 0.7f),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )

                Box(
                    modifier = Modifier
                        .size(220.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color.White)
                        .padding(14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (qrBitmap != null) {
                        Image(
                            bitmap = qrBitmap.asImageBitmap(),
                            contentDescription = "UPI QR Code",
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Text(
                            "UPI ID is private or not configured. Add them as a friend to view their UPI ID.",
                            color = CanvasBlack.copy(alpha = 0.6f),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }

                Text(
                    "Open any UPI app and scan this code. Or save it to your gallery and use “scan from gallery” in your UPI app.",
                    color = QuietText,
                    fontSize = 12.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    lineHeight = 15.sp
                )

                if (target.upiId.isNotBlank()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Ink.copy(alpha = 0.05f))
                            .border(1.dp, Ink.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.AlternateEmail, null, tint = QuietText, modifier = Modifier.size(14.dp))
                            Text(
                                target.upiId,
                                color = Ink.copy(alpha = 0.8f),
                                fontSize = 12.sp,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        TextButton(enabled = !LocalActionBusy.current,
                            onClick = {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                clipboard.setPrimaryClip(ClipData.newPlainText("UPI ID", target.upiId))
                                showFeedback("UPI ID copied")
                            },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, null, tint = MintGreen, modifier = Modifier.size(13.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Copy", color = MintGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            if (target.upiId.isNotBlank()) {
                                val launched = UpiLauncher.pay(context, target.upiId, target.name, target.amountPaise, target.note)
                                if (!launched) {
                                    showFeedback("No UPI app found. Scan or save the QR code instead.")
                                }
                            } else {
                                showFeedback("Recipient has no UPI ID")
                            }
                        },
                        enabled = !LocalActionBusy.current && (target.upiId.isNotBlank()),
                        modifier = Modifier.weight(1f).height(44.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue, contentColor = Ink),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Icon(Icons.Default.Smartphone, null, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Pay via App", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = {
                            if (qrBitmap != null) {
                                val saved = QrCodeHelper.saveQrToGallery(context, qrBitmap, target.name)
                                if (saved) {
                                    showFeedback("QR saved to Gallery")
                                } else {
                                    showFeedback("Could not save QR")
                                }
                            }
                        },
                        enabled = !LocalActionBusy.current && (qrBitmap != null),
                        modifier = Modifier.weight(1f).height(44.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MintGreen.copy(alpha = 0.2f), contentColor = MintGreen),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MintGreen.copy(alpha = 0.4f)),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Icon(Icons.Default.Download, null, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Save QR", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Button(enabled = !LocalActionBusy.current,
                    onClick = {
                        onMarkPaid(target.uid, "%.2f".format(target.amountPaise / 100.0), target.note)
                    },
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ActionContainer, contentColor = ActionContent)
                ) {
                    Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("I Have Paid · Confirm Settlement", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {},
        dismissButton = {}
    )
}

@Composable
fun TextEntryDialog(title: String, label: String, confirm: String, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var value by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, shape = RoundedCornerShape(28.dp), title = { Text(title) }, text = { FormField(value, { value = it }, label) }, confirmButton = { Button(onClick = { onConfirm(value) }, enabled = !LocalActionBusy.current && (value.isNotBlank())) { Text(confirm) } }, dismissButton = { TextButton(enabled = !LocalActionBusy.current, onClick = onDismiss) { Text("Cancel") } })
}

@Composable
fun ConfirmDialog(title: String, message: String, confirm: String, onDismiss: () -> Unit, destructive: Boolean = false, showDismiss: Boolean = true, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = ModalSurface,
        shape = RoundedCornerShape(28.dp),
        title = { Text(title) },
        text = { Text(message, color = MutedText) },
        confirmButton = {
            Button(enabled = !LocalActionBusy.current, onClick = onConfirm, colors = if (destructive) ButtonDefaults.buttonColors(containerColor = Negative, contentColor = CanvasBlack) else ButtonDefaults.buttonColors()) {
                Text(confirm)
            }
        },
        dismissButton = if (showDismiss) {
            { TextButton(enabled = !LocalActionBusy.current, onClick = onDismiss) { Text("Cancel") } }
        } else null
    )
}

@Composable
fun GroupDetailSkeleton() {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 10.dp, 16.dp, 100.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            // Group Hero Card Skeleton
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp))
                    .background(CardSurface)
                    .border(1.dp, Hairline, RoundedCornerShape(22.dp))
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SkeletonBox(Modifier.size(48.dp), shape = RoundedCornerShape(16.dp))
                    Spacer(Modifier.width(14.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        SkeletonBox(Modifier.size(130.dp, 18.dp), shape = RoundedCornerShape(6.dp))
                        SkeletonBox(Modifier.size(70.dp, 14.dp), shape = CircleShape)
                        SkeletonBox(Modifier.size(100.dp, 11.dp), shape = RoundedCornerShape(4.dp))
                    }
                }
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SkeletonBox(Modifier.size(100.dp, 34.dp), shape = RoundedCornerShape(100.dp))
                    SkeletonBox(Modifier.size(75.dp, 34.dp), shape = RoundedCornerShape(100.dp))
                    Spacer(Modifier.weight(1f))
                    SkeletonBox(Modifier.size(34.dp), shape = RoundedCornerShape(10.dp))
                    SkeletonBox(Modifier.size(34.dp), shape = RoundedCornerShape(10.dp))
                }
            }
        }

        item {
            // Balance Card Skeleton
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
                    .background(CardSurface)
                    .border(1.dp, Hairline, RoundedCornerShape(24.dp))
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SkeletonBox(Modifier.size(110.dp, 11.dp), shape = RoundedCornerShape(4.dp))
                SkeletonBox(Modifier.size(160.dp, 30.dp), shape = RoundedCornerShape(8.dp))
                SkeletonBox(Modifier.size(130.dp, 12.dp), shape = RoundedCornerShape(4.dp))
            }
        }

        item {
            // Action Buttons Skeleton
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SkeletonBox(Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(100.dp))
                SkeletonBox(Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(100.dp))
            }
        }

        item {
            // Settle up Skeleton
            SkeletonBox(Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(100.dp))
        }

        item {
            // Tabs Row Skeleton
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(4) {
                    SkeletonBox(Modifier.weight(1f).height(32.dp), shape = RoundedCornerShape(8.dp))
                }
            }
        }

        items(3) {
            // Expense List Item Skeletons
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp))
                    .background(CardSurface)
                    .border(1.dp, Hairline, RoundedCornerShape(18.dp))
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SkeletonBox(Modifier.size(40.dp), shape = RoundedCornerShape(12.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    SkeletonBox(Modifier.size(120.dp, 15.dp), shape = RoundedCornerShape(6.dp))
                    SkeletonBox(Modifier.size(80.dp, 11.dp), shape = RoundedCornerShape(4.dp))
                }
                SkeletonBox(Modifier.size(65.dp, 20.dp), shape = RoundedCornerShape(6.dp))
            }
        }
    }
}
