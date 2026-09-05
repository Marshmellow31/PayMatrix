package com.paymatrix.app.ui

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.data.Group
import com.paymatrix.app.domain.Money
import kotlin.math.abs

private data class DashboardAction(
    val icon: ImageVector,
    val title: String,
    val body: String,
    val tone: Color,
    val route: String,
)

@Composable
fun DashboardScreen(state: PayMatrixState, nav: NavHostController) {
    val unsettled = state.groups.filter { abs(state.summary.groupBalances[it.id] ?: 0L) > 1L }
    val unread = state.notifications.count { !it.isRead }
    val actions = buildList {
        if (state.syncStatus.pendingWrites > 0) add(DashboardAction(Icons.Default.CloudUpload, "Sync pending", "${state.syncStatus.pendingWrites} secure change${if (state.syncStatus.pendingWrites == 1) "" else "s"} waiting for a connection", Color(0xFFF6C85F), "activity"))
        unsettled.take(2).forEach { group ->
            val balance = state.summary.groupBalances[group.id] ?: 0L
            add(DashboardAction(Icons.Default.AccountBalanceWallet, if (balance < 0) "Settle ${group.name}" else "Balance in ${group.name}", if (balance < 0) "You owe ${Money.format(abs(balance))}" else "You are owed ${Money.format(balance)}", if (balance < 0) Negative else Positive, "group/${group.id}"))
        }
        if (unread > 0) add(DashboardAction(Icons.Default.NotificationsActive, "Review activity", "$unread unread update${if (unread == 1) "" else "s"}", ElectricBlue, "activity"))
    }.take(3)

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 16.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        item { DashboardIntro(state) }
        item { PositionCard(state) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (state.flags.billScanning) DashboardQuickAction(Icons.Default.DocumentScanner, "Scan receipt", "Camera or gallery", true, Modifier.weight(1f)) { nav.navigate("scanner") }
                DashboardQuickAction(Icons.Default.Add, "Add expense", "Record manually", false, Modifier.weight(1f)) {
                    state.groups.firstOrNull()?.let { nav.navigate("expense/${it.id}") } ?: nav.navigate("groups")
                }
            }
        }

        if (actions.isNotEmpty()) {
            item { SectionTitle("Needs attention", "The next useful actions") }
            items(actions, key = { "${it.route}_${it.title}" }) { action -> AttentionRow(action) { nav.navigate(action.route) } }
        } else {
            item { CalmStateCard(Icons.Default.DoneAll, "Everything is clear", "No pending sync, unread activity, or balances need your attention.") }
        }

        item {
            SectionTitle("Active groups", "Balances ordered by what matters") {
                TextButton(enabled = !LocalActionBusy.current, onClick = { nav.navigate("groups") }) { Text("See all", color = MutedText, fontSize = 12.sp) }
            }
        }
        if (state.groups.isEmpty()) {
            item { EmptyState("No groups yet", "Create a group when you have something to share.") }
        } else {
            items(
                state.groups.sortedWith(compareByDescending<Group> { abs(state.summary.groupBalances[it.id] ?: 0L) }.thenByDescending { it.updatedAt }).take(5),
                key = { it.id },
            ) { group -> ActiveGroupRow(group, state.summary.groupBalances[group.id] ?: 0L) { nav.navigate("group/${group.id}") } }
        }

        item { MonthCard(state) }

        item {
            SectionTitle("Recent activity", "Latest account updates") {
                TextButton(enabled = !LocalActionBusy.current, onClick = { nav.navigate("activity") }) { Text("View all", color = MutedText, fontSize = 12.sp) }
            }
        }
        item {
            ObsidianCard(contentPadding = PaddingValues(0.dp)) {
                if (state.notifications.isEmpty()) EmptyState("Nothing new yet", "Your latest account activity will appear here.")
                state.notifications.take(5).forEachIndexed { index, notification ->
                    Row(
                        Modifier.fillMaxWidth().clickable { nav.navigate("activity") }.padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.size(40.dp).clip(RoundedCornerShape(13.dp)).background(Color.White.copy(alpha = .05f)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Timeline, null, tint = if (notification.isRead) QuietText else Color.White, modifier = Modifier.size(18.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(notification.message.ifBlank { notification.title }, color = Color.White.copy(alpha = if (notification.isRead) .62f else .88f), fontWeight = if (notification.isRead) FontWeight.Medium else FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, fontSize = 13.sp)
                            Text(shortDate(notification.createdAt), color = QuietText, fontSize = 10.sp)
                        }
                        if (!notification.isRead) Box(Modifier.size(7.dp).clip(CircleShape).background(Color.White))
                    }
                    if (index < minOf(4, state.notifications.lastIndex)) HorizontalDivider(color = Hairline)
                }
            }
        }
    }
}

@Composable
private fun DashboardIntro(state: PayMatrixState) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text("Welcome back", color = QuietText, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            Text(state.user?.name?.substringBefore(' ') ?: "Member", color = Color.White, fontWeight = FontWeight.Black, fontSize = 28.sp, letterSpacing = (-.7).sp)
        }
        Row(
            Modifier.clip(CircleShape).background(Color.White.copy(alpha = .045f)).border(1.dp, Hairline, CircleShape).padding(horizontal = 11.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(7.dp).clip(CircleShape).background(if (state.syncStatus.pendingWrites > 0) Color(0xFFF6C85F) else Positive))
            Spacer(Modifier.width(7.dp))
            Text(if (state.syncStatus.pendingWrites > 0) "Pending sync" else state.lastSyncedAt.takeIf { it.isNotBlank() }?.let { "Synced ${shortDate(it)}" } ?: "Preparing", color = MutedText, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun PositionCard(state: PayMatrixState) {
    val balance = state.summary.netBalancePaise
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(30.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF111111), Color(0xFF1D1D1D), Color(0xFF252525))))
            .border(1.dp, Color.White.copy(alpha = .1f), RoundedCornerShape(30.dp))
            .padding(22.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("YOUR POSITION", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.8.sp)
                Spacer(Modifier.height(5.dp))
                Text(when { balance > 1 -> "Overall, you are owed"; balance < -1 -> "Overall, you owe"; else -> "You are settled" }, color = MutedText, fontSize = 12.sp)
            }
            Icon(Icons.Default.AccountBalanceWallet, null, tint = Color.White.copy(alpha = .3f), modifier = Modifier.size(22.dp))
        }
        Text(Money.format(abs(balance)), color = Color.White, fontWeight = FontWeight.Black, fontSize = 40.sp, letterSpacing = (-1.8).sp)
        HorizontalDivider(color = Color.White.copy(alpha = .09f))
        Row(Modifier.fillMaxWidth()) {
            PositionMetric("YOU OWE", state.summary.totalOwePaise, Negative, Modifier.weight(1f))
            VerticalDivider(color = Hairline, modifier = Modifier.height(44.dp))
            PositionMetric("YOU ARE OWED", state.summary.totalOwedPaise, Positive, Modifier.weight(1f).padding(start = 18.dp))
        }
    }
}

@Composable
private fun PositionMetric(label: String, value: Long, color: Color, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(label, color = QuietText, fontSize = 8.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.1.sp)
        Spacer(Modifier.height(5.dp))
        Text(Money.format(value), color = color, fontWeight = FontWeight.Bold, fontSize = 18.sp)
    }
}

@Composable
private fun DashboardQuickAction(icon: ImageVector, title: String, body: String, primary: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) .97f else 1f, spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium), label = "dashboardAction")
    Column(
        modifier.heightIn(min = 118.dp).graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(24.dp))
            .background(if (primary) Color.White else CardSurface)
            .border(1.dp, if (primary) Color.Transparent else Hairline, RoundedCornerShape(24.dp))
            .clickable(interactionSource = interaction, indication = ripple(), onClick = onClick)
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Box(Modifier.size(40.dp).clip(RoundedCornerShape(13.dp)).background(if (primary) Color.Black.copy(alpha = .06f) else Color.White.copy(alpha = .06f)), contentAlignment = Alignment.Center) { Icon(icon, null, tint = if (primary) Color.Black else Color.White, modifier = Modifier.size(19.dp)) }
        Column { Text(title, color = if (primary) Color.Black else Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp); Text(body, color = if (primary) Color.Black.copy(alpha = .48f) else QuietText, fontSize = 10.sp) }
    }
}

@Composable
private fun AttentionRow(action: DashboardAction, onClick: () -> Unit) {
    ObsidianCard(Modifier.clickable(onClick = onClick), contentPadding = PaddingValues(15.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(44.dp).clip(RoundedCornerShape(14.dp)).background(action.tone.copy(alpha = .1f)), contentAlignment = Alignment.Center) { Icon(action.icon, null, tint = action.tone, modifier = Modifier.size(20.dp)) }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) { Text(action.title, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp); Text(action.body, color = MutedText, fontSize = 11.sp) }
            Icon(Icons.Default.ChevronRight, null, tint = QuietText, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun ActiveGroupRow(group: Group, balance: Long, onClick: () -> Unit) {
    ObsidianCard(Modifier.clickable(onClick = onClick), contentPadding = PaddingValues(15.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clip(RoundedCornerShape(16.dp)).background(categoryColor(group.category).copy(alpha = .11f)), contentAlignment = Alignment.Center) { Icon(categoryIcon(group.category), null, tint = categoryColor(group.category), modifier = Modifier.size(22.dp)) }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text(group.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(3.dp))
                Row(verticalAlignment = Alignment.CenterVertically) { AvatarStack(group.members, group.memberProfiles, size = 20, max = 3); Spacer(Modifier.width(8.dp)); Text(group.updatedAt.takeIf { it.isNotBlank() }?.let(::shortDate) ?: "${group.members.size} members", color = QuietText, fontSize = 9.sp) }
            }
            Column(horizontalAlignment = Alignment.End) { Text(when { balance < -1 -> "You owe"; balance > 1 -> "You are owed"; else -> "Settled" }, color = QuietText, fontSize = 9.sp); Text(Money.format(abs(balance)), color = when { balance < -1 -> Negative; balance > 1 -> Positive; else -> Color.White.copy(alpha = .7f) }, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
        }
    }
}

@Composable
private fun MonthCard(state: PayMatrixState) {
    val current = state.summary.thisMonthPaise
    val previous = state.summary.previousMonthPaise
    val delta = if (previous > 0) ((current - previous) * 100 / previous).toInt() else null
    val top = state.summary.categories.firstOrNull()
    ObsidianCard(contentPadding = PaddingValues(20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f)) { Text("This month", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp); Text("Your share across active groups", color = QuietText, fontSize = 11.sp) }; Icon(Icons.Default.QueryStats, null, tint = Color.White.copy(alpha = .25f), modifier = Modifier.size(21.dp)) }
        Text(Money.format(current), color = Color.White, fontWeight = FontWeight.Black, fontSize = 30.sp, letterSpacing = (-.8).sp)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MonthMetric("TOP CATEGORY", top?.name ?: "No spending", top?.let { Money.format(it.amountPaise) }.orEmpty(), Modifier.weight(1f))
            MonthMetric("VS LAST MONTH", delta?.let { "${if (it > 0) "+" else ""}$it%" } ?: "Not enough data", if (previous > 0) Money.format(previous) else "", Modifier.weight(1f))
        }
    }
}

@Composable
private fun MonthMetric(label: String, value: String, supporting: String, modifier: Modifier = Modifier) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = .035f)).padding(13.dp)) {
        Text(label, color = QuietText, fontSize = 8.sp, fontWeight = FontWeight.Bold, letterSpacing = .9.sp)
        Spacer(Modifier.height(6.dp))
        Text(value, color = Color.White.copy(alpha = .82f), fontWeight = FontWeight.SemiBold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (supporting.isNotBlank()) Text(supporting, color = QuietText, fontSize = 9.sp, maxLines = 1)
    }
}

@Composable
private fun CalmStateCard(icon: ImageVector, title: String, body: String) {
    Row(
        Modifier.fillMaxWidth().animateContentSize().clip(RoundedCornerShape(22.dp)).background(Positive.copy(alpha = .055f)).border(1.dp, Positive.copy(alpha = .13f), RoundedCornerShape(22.dp)).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(42.dp).clip(CircleShape).background(Positive.copy(alpha = .11f)), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Positive, modifier = Modifier.size(19.dp)) }
        Spacer(Modifier.width(13.dp))
        Column { Text(title, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp); Text(body, color = MutedText, fontSize = 10.sp, lineHeight = 14.sp) }
    }
}
