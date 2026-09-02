@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.data.ActivityItem
import com.paymatrix.app.data.AppNotification
import com.paymatrix.app.data.UserProfile
import com.paymatrix.app.domain.Money

@Composable
fun FriendsScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    var code by remember { mutableStateOf("") }
    var remove by remember { mutableStateOf<UserProfile?>(null) }
    var inviteOpen by remember { mutableStateOf(false) }
    var tab by remember { mutableIntStateOf(0) }
    val clipboard = LocalClipboardManager.current
    val pendingRequestsCount = state.friendRequests.count { it.to == state.user?.uid }

    LaunchedEffect(Unit) { vm.loadFriends() }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp, 16.dp, 18.dp, 100.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Friends", style = MaterialTheme.typography.headlineLarge, color = Color.White)
                    Spacer(Modifier.height(3.dp))
                    Text("People you trust to share expenses with", color = MutedText, fontSize = 12.sp)
                }
                Button(
                    onClick = { inviteOpen = !inviteOpen },
                    shape = RoundedCornerShape(16.dp),
                    colors = if (inviteOpen) ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black)
                             else ButtonDefaults.buttonColors(containerColor = RaisedSurface, contentColor = Color.White),
                    border = if (inviteOpen) null else androidx.compose.foundation.BorderStroke(1.dp, Hairline),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    Icon(if (inviteOpen) Icons.Default.Close else Icons.Default.PersonAdd, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(if (inviteOpen) "Hide" else "Add friend", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        if (inviteOpen) item {
            ObsidianCard(contentPadding = PaddingValues(18.dp)) {
                Text("YOUR FRIEND CODE", color = QuietText, fontSize = 8.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
                        .background(Color.White.copy(alpha = .04f))
                        .border(1.dp, Hairline, RoundedCornerShape(16.dp))
                        .clickable { clipboard.setText(AnnotatedString(state.user?.friendCode.orEmpty())) }
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        state.user?.friendCode?.chunked(4)?.joinToString(" ")?.ifBlank { "GENERATING" } ?: "GENERATING",
                        Modifier.weight(1f),
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 20.sp,
                        letterSpacing = 2.sp
                    )
                    Icon(Icons.Default.ContentCopy, "Copy code", tint = Color.White.copy(alpha = .6f), modifier = Modifier.size(18.dp))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Shield, null, tint = Positive, modifier = Modifier.size(13.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Peer-to-peer friend code active", color = Positive.copy(alpha = .8f), fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                }
                HorizontalDivider(color = Hairline)
                Text("ADD FRIEND BY CODE", color = QuietText, fontSize = 8.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                FormField(
                    value = code,
                    onValueChange = { code = it.uppercase().filter { ch -> ch.isLetterOrDigit() }.take(8) },
                    label = "Enter their 8-character code",
                    leading = { Icon(Icons.Default.Tag, null, tint = MutedText) }
                )
                PrimaryAction(
                    label = "Send connection request",
                    onClick = { vm.sendFriendRequest(code); code = "" },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = code.length == 8,
                    icon = { Icon(Icons.Default.Send, null, Modifier.size(16.dp)) }
                )
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.Bottom) {
                FriendTab("FRIENDS", state.friends.size, tab == 0, isPendingAlert = false) { tab = 0 }
                FriendTab("REQUESTS", state.friendRequests.size, tab == 1, isPendingAlert = pendingRequestsCount > 0) { tab = 1 }
                Spacer(Modifier.weight(1f))
            }
            HorizontalDivider(color = Hairline)
        }

        if (tab == 1) {
            if (state.friendRequests.isEmpty()) item {
                EmptyState("No pending requests", "When someone adds your friend code, requests will appear here.")
            }
            items(state.friendRequests, key = { it.id }) { request ->
                ObsidianCard(contentPadding = PaddingValues(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        UserAvatar(request.profile, 48)
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(request.profile?.name ?: "Member", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Spacer(Modifier.height(2.dp))
                            Text(
                                if (request.to == state.user?.uid) "Wants to connect with you" else "Outgoing request pending",
                                color = if (request.to == state.user?.uid) PrimaryBlue else QuietText,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    if (request.to == state.user?.uid) {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 4.dp)) {
                            PrimaryAction("Accept", { vm.respond(request, true) }, Modifier.weight(1f), icon = { Icon(Icons.Default.Check, null, Modifier.size(16.dp)) })
                            SecondaryAction("Decline", { vm.respond(request, false) }, Modifier.weight(1f), icon = { Icon(Icons.Default.Close, null, Modifier.size(16.dp)) })
                        }
                    }
                }
            }
        } else {
            if (state.friends.isEmpty()) item {
                EmptyState("No friends added yet", "Tap 'Add friend' above to share your code or connect with friends.")
            }
            items(state.friends, key = { it.uid }) { friend ->
                val sharedGroups = state.groups.filter { friend.uid in it.members }
                ObsidianCard(contentPadding = PaddingValues(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        UserAvatar(friend, 50)
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(friend.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.height(3.dp))
                            Text("${sharedGroups.size} shared group${if (sharedGroups.size == 1) "" else "s"}", color = QuietText, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                        }
                        if (sharedGroups.isNotEmpty()) {
                            IconButton(
                                onClick = { nav.navigate("group/${sharedGroups.first().id}") },
                                modifier = Modifier.size(38.dp).clip(CircleShape).background(Color.White.copy(alpha = .06f))
                            ) {
                                Icon(Icons.Default.ChevronRight, "Open shared group", tint = Color.White.copy(alpha = .8f), modifier = Modifier.size(18.dp))
                            }
                            Spacer(Modifier.width(4.dp))
                        }
                        IconButton(
                            onClick = { remove = friend },
                            modifier = Modifier.size(38.dp)
                        ) {
                            Icon(Icons.Default.PersonRemove, "Remove friend", tint = Color.White.copy(alpha = .28f), modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
    remove?.let { friend ->
        ConfirmDialog("Remove friend?", "Remove ${friend.name} from your friends? Shared group history remains intact.", "Remove", { remove = null }, destructive = true) {
            vm.removeFriend(friend.uid) { remove = null }
        }
    }
}

@Composable
private fun FriendTab(label: String, count: Int, selected: Boolean, isPendingAlert: Boolean = false, onClick: () -> Unit) {
    Column(
        Modifier.widthIn(min = 100.dp).clickable(onClick = onClick).padding(top = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                label,
                color = if (selected) Color.White else Color.White.copy(alpha = .35f),
                fontSize = 11.sp,
                fontWeight = if (selected) FontWeight.Black else FontWeight.Bold,
                letterSpacing = 2.sp
            )
            Box(
                Modifier.clip(RoundedCornerShape(8.dp))
                    .background(
                        if (isPendingAlert) PrimaryBlue
                        else if (selected) Color.White.copy(alpha = .12f)
                        else Color.White.copy(alpha = .04f)
                    )
                    .border(
                        1.dp,
                        if (isPendingAlert) PrimaryBlue else Hairline,
                        RoundedCornerShape(8.dp)
                    )
                    .padding(horizontal = 7.dp, vertical = 2.dp)
            ) {
                Text(
                    count.toString(),
                    color = if (isPendingAlert) Color.White else if (selected) Color.White else QuietText,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Box(
            Modifier.fillMaxWidth().height(2.5.dp).clip(CircleShape)
                .background(if (selected) Color.White else Color.Transparent)
        )
    }
}

@Composable
fun ActivityScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    LaunchedEffect(Unit) { vm.loadActivity(); vm.loadNotifications() }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { PageTitle("Activity", "Your financial narrative, curated.") { IconButton(onClick = { vm.loadActivity() }) { Icon(Icons.Default.Refresh, "Refresh") } } }
        if (state.notifications.isEmpty() && state.activity.isEmpty()) item { EmptyState("Nothing here yet", "Expenses, settlements, members, and alerts will appear here.") }
        if (state.notifications.any { !it.isRead }) item { TextButton(onClick = { vm.markAllRead() }) { Text("Mark all notifications read") } }
        items(state.notifications, key = { "notification_${it.id}" }) { notification -> NotificationTimelineRow(notification) { if (!notification.isRead) vm.markRead(notification.id) } }
        items(state.activity, key = { "audit_${it.id}_${it.groupId}" }) { activity -> AuditTimelineRow(activity) { activity.groupId.takeIf { it.isNotBlank() }?.let { nav.navigate("group/$it") } } }
    }
}

@Composable private fun NotificationTimelineRow(item: AppNotification, onClick: () -> Unit) {
    ObsidianCard(Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(44.dp).clip(CircleShape).background(if (item.isRead) Color.White.copy(alpha = .05f) else Color.White), contentAlignment = Alignment.Center) { Icon(Icons.Default.Notifications, null, tint = if (item.isRead) MutedText else Color.Black, modifier = Modifier.size(18.dp)) }
            Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(item.title.ifBlank { "paymatrix" }, color = Color.White, fontWeight = FontWeight.Bold); Text(item.message, color = MutedText, maxLines = 2, overflow = TextOverflow.Ellipsis); Text(shortDate(item.createdAt), color = QuietText, fontSize = 9.sp) }
            if (!item.isRead) Box(Modifier.size(7.dp).clip(CircleShape).background(Color.White))
        }
    }
}

@Composable private fun AuditTimelineRow(item: ActivityItem, onClick: () -> Unit) {
    ObsidianCard(Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(44.dp).clip(CircleShape).background(Color.White.copy(alpha = .08f)), contentAlignment = Alignment.Center) { Icon(if (item.type.contains("settlement")) Icons.Default.Payments else if (item.type.contains("member")) Icons.Default.GroupAdd else Icons.Default.ReceiptLong, null, tint = MutedText, modifier = Modifier.size(18.dp)) }
            Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(item.message, color = Color.White, fontWeight = FontWeight.SemiBold); Text(shortDate(item.createdAt), color = QuietText, fontSize = 9.sp) }; Icon(Icons.Default.ChevronRight, null, tint = Color.White.copy(alpha = .18f))
        }
    }
}

@Composable
fun AnalyticsScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    LaunchedEffect(Unit) { vm.loadAnalytics() }
    val analytics = state.analytics
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageTitle("Analytics", "Your spending intelligence") { IconButton(onClick = { vm.loadAnalytics() }) { Icon(Icons.Default.Refresh, "Refresh") } } }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { BalanceCard("Total shared", analytics.summary.totalSharedPaise, true, Modifier.weight(1f)); BalanceCard("Net balance", analytics.summary.netBalancePaise, true, Modifier.weight(1f)) } }
        item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { MetricTile("EXPENSES", analytics.expenseCount.toString(), Modifier.weight(1f)); MetricTile("SETTLEMENTS", analytics.settlementCount.toString(), Modifier.weight(1f)) } }
        item { SectionTitle("Spending trend", "Recent months") }
        item { ObsidianCard { SpendingBars(analytics.trends.map { it.label to it.amountPaise }) } }
        item { SectionTitle("Categories", "Your actual share") }
        val max = analytics.summary.categories.maxOfOrNull { it.amountPaise }?.coerceAtLeast(1L) ?: 1L
        items(analytics.summary.categories, key = { it.name }) { category -> ObsidianCard { Row { Icon(categoryIcon(category.name), null, tint = MutedText); Spacer(Modifier.width(10.dp)); Text(category.name, Modifier.weight(1f), color = Color.White, fontWeight = FontWeight.SemiBold); Text(Money.format(category.amountPaise), color = Color.White) }; LinearProgressIndicator({ category.amountPaise.toFloat() / max }, Modifier.fillMaxWidth(), color = Color.White, trackColor = Color.White.copy(alpha = .08f)) } }
    }
}

@Composable private fun MetricTile(label: String, value: String, modifier: Modifier) { ObsidianCard(modifier) { Text(label, color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold); Text(value, color = Color.White, fontWeight = FontWeight.Black, fontSize = 28.sp) } }

@Composable private fun SpendingBars(points: List<Pair<String, Long>>) {
    val max = points.maxOfOrNull { it.second }?.coerceAtLeast(1L) ?: 1L
    if (points.isEmpty()) { EmptyState("Not enough data", "Add expenses to reveal a trend."); return }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) { points.takeLast(6).forEach { (label, value) -> Row(verticalAlignment = Alignment.CenterVertically) { Text(label, color = QuietText, fontSize = 10.sp, modifier = Modifier.width(42.dp)); Box(Modifier.weight(1f).height(8.dp).clip(CircleShape).background(Color.White.copy(alpha = .06f))) { Box(Modifier.fillMaxHeight().fillMaxWidth(value.toFloat() / max).clip(CircleShape).background(Color.White)) }; Spacer(Modifier.width(8.dp)); Text(Money.format(value), color = MutedText, fontSize = 10.sp) } } }
}

@Composable
fun NotificationsScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) vm.enablePush(context) }
    LaunchedEffect(Unit) { vm.loadNotifications() }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { PageTitle("Notifications", "Device and account alerts") }
        item { PrimaryAction("Enable push on this device", { if (Build.VERSION.SDK_INT >= 33) permission.launch(Manifest.permission.POST_NOTIFICATIONS) else vm.enablePush(context) }, Modifier.fillMaxWidth(), icon = { Icon(Icons.Default.NotificationsActive, null, Modifier.size(17.dp)) }) }
        if (state.notifications.any { !it.isRead }) item { SecondaryAction("Mark all read", { vm.markAllRead() }, Modifier.fillMaxWidth()) }
        items(state.notifications, key = { it.id }) { item -> NotificationTimelineRow(item) { if (!item.isRead) vm.markRead(item.id) } }
    }
}
