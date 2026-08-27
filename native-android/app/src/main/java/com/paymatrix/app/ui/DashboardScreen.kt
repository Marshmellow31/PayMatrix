@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.data.Group
import com.paymatrix.app.domain.Money

@Composable
fun DashboardScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    LaunchedEffect(Unit) { vm.refreshHome() }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 30.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { AccountCard(state) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                BalanceCard("You owe", state.summary.totalOwePaise, positive = false, Modifier.weight(1f))
                BalanceCard("You are owed", state.summary.totalOwedPaise, positive = true, Modifier.weight(1f))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (state.flags.billScanning) QuickAction(Icons.Default.CameraAlt, "Scan bill", "Use a receipt photo", true, Modifier.weight(1f)) { nav.navigate("scanner") }
                QuickAction(Icons.Default.ReceiptLong, "Record", "Enter manually", false, Modifier.weight(1f)) {
                    state.groups.firstOrNull()?.let { nav.navigate("expense/${it.id}") } ?: nav.navigate("groups")
                }
            }
        }
        if (state.flags.settlements) item {
            SectionTitle("Settle up", "Outstanding balances") {
                TextButton(onClick = { nav.navigate("groups") }) { Text("View groups", color = MutedText, fontSize = 12.sp) }
            }
        }
        val unsettled = if (state.flags.settlements) state.groups.filter { kotlin.math.abs(state.summary.groupBalances[it.id] ?: 0L) > 1L } else emptyList()
        if (state.flags.settlements && unsettled.isEmpty()) item { ObsidianCard { Text("You're all settled", color = Color.White, fontWeight = FontWeight.SemiBold); Text("Nothing needs your attention right now.", color = QuietText, fontSize = 12.sp) } }
        else if (state.flags.settlements) items(unsettled.take(3), key = { it.id }) { group -> SettlementGroupRow(group, state.summary.groupBalances[group.id] ?: 0L) { nav.navigate("group/${group.id}") } }
        item {
            SectionTitle("Groups", "${state.groups.size} active") {
                IconButton(onClick = { nav.navigate("groups") }) { Icon(Icons.Default.Add, "Create group", tint = MutedText) }
                TextButton(onClick = { nav.navigate("groups") }) { Text("See all", color = MutedText, fontSize = 12.sp) }
            }
        }
        item {
            if (state.groups.isEmpty()) EmptyState("No groups yet", "Create one when you have an expense to share.")
            else LazyRow(horizontalArrangement = Arrangement.spacedBy(14.dp)) { items(state.groups.take(8), key = { it.id }) { DashboardGroup(it) { nav.navigate("group/${it.id}") } } }
        }
        item {
            SectionTitle("Recent activity", "Updates from your account") {
                TextButton(onClick = { nav.navigate("activity") }) { Text("View all", color = MutedText, fontSize = 12.sp) }
            }
        }
        item {
            ObsidianCard(contentPadding = PaddingValues(0.dp)) {
                if (state.notifications.isEmpty()) EmptyState("Nothing new yet", "Your latest account activity will appear here.")
                state.notifications.take(5).forEachIndexed { index, item ->
                    Row(Modifier.fillMaxWidth().clickable { nav.navigate("activity") }.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = .05f)), contentAlignment = Alignment.Center) { Icon(Icons.Default.Timeline, null, tint = MutedText, modifier = Modifier.size(17.dp)) }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) { Text(item.message.ifBlank { item.title }, color = Color.White.copy(alpha = .8f), fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis); Text(shortDate(item.createdAt), color = QuietText, fontSize = 10.sp) }
                        Icon(Icons.Default.ChevronRight, null, tint = Color.White.copy(alpha = .18f), modifier = Modifier.size(16.dp))
                    }
                    if (index < minOf(4, state.notifications.lastIndex)) HorizontalDivider(color = Hairline)
                }
            }
        }
    }
}

@Composable
private fun AccountCard(state: PayMatrixState) {
    Box(
        Modifier.fillMaxWidth().heightIn(min = 205.dp).clip(RoundedCornerShape(23.dp))
            .background(Brush.linearGradient(listOf(Color(0xFFF5F5F3), Color(0xFFE4E5E2), Color(0xFFCDD0CD))))
            .border(1.dp, Color.White.copy(alpha = .7f), RoundedCornerShape(23.dp)).padding(22.dp),
    ) {
        Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
            Row {
                Column(Modifier.weight(1f)) {
                    Text("USER ID", color = Color.Black.copy(alpha = .38f), fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                    Text(state.user?.friendCode?.chunked(4)?.joinToString(" ")?.ifBlank { "GENERATING…" } ?: "GENERATING…", color = Color.Black.copy(alpha = .76f), fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, letterSpacing = 1.8.sp)
                }
                Row(Modifier.clip(CircleShape).background(Color.White.copy(alpha = .28f)).padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF18864B))); Spacer(Modifier.width(5.dp)); Text("Online", color = Color.Black.copy(alpha = .5f), fontSize = 10.sp) }
            }
            Column(Modifier.padding(vertical = 18.dp)) {
                Text("Net balance", color = Color.Black.copy(alpha = .45f), fontSize = 12.sp)
                Text(Money.format(kotlin.math.abs(state.summary.netBalancePaise)), color = Color.Black.copy(alpha = .88f), fontSize = 38.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1.8).sp)
            }
            HorizontalDivider(color = Color.Black.copy(alpha = .09f))
            Row(Modifier.padding(top = 13.dp)) {
                Column(Modifier.weight(1f)) { Text("Account", color = Color.Black.copy(alpha = .38f), fontSize = 11.sp); Text(state.user?.name ?: "Member", color = Color.Black.copy(alpha = .72f), fontWeight = FontWeight.Medium, maxLines = 1) }
                Column(horizontalAlignment = Alignment.End) { Text("Member since", color = Color.Black.copy(alpha = .38f), fontSize = 11.sp); Text(memberSince(state.user?.createdAt.orEmpty()), color = Color.Black.copy(alpha = .72f), fontWeight = FontWeight.Medium) }
            }
        }
    }
}

@Composable
private fun QuickAction(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String, light: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Row(modifier.height(94.dp).clip(RoundedCornerShape(18.dp)).background(if (light) Color.White else ObsidianSurface).border(1.dp, if (light) Color.Transparent else Hairline, RoundedCornerShape(18.dp)).clickable(onClick = onClick).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(39.dp).clip(RoundedCornerShape(12.dp)).background(if (light) Color.Black.copy(alpha = .06f) else Color.White.copy(alpha = .06f)), contentAlignment = Alignment.Center) { Icon(icon, null, tint = if (light) Color.Black else Color.White, modifier = Modifier.size(18.dp)) }
        Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) { Text(title, color = if (light) Color.Black else Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(subtitle, color = if (light) Color.Black.copy(alpha = .45f) else QuietText, fontSize = 10.sp, maxLines = 1) }
    }
}

@Composable
private fun SettlementGroupRow(group: Group, amount: Long, onClick: () -> Unit) {
    ObsidianCard(Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(13.dp)).background(Color.White.copy(alpha = .05f)), contentAlignment = Alignment.Center) { Icon(categoryIcon(group.category), null, tint = MutedText, modifier = Modifier.size(18.dp)) }
            Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(group.name, color = Color.White, fontWeight = FontWeight.SemiBold); Text(if (amount < 0) "You owe" else "You are owed", color = QuietText, fontSize = 11.sp) }
            MoneyText(amount)
        }
    }
}

@Composable
private fun DashboardGroup(group: Group, onClick: () -> Unit) {
    Column(Modifier.width(68.dp).clickable(onClick = onClick), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(50.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFF171717)).border(1.dp, Hairline, RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) { Icon(categoryIcon(group.category), null, tint = MutedText, modifier = Modifier.size(20.dp)) }
        Spacer(Modifier.height(7.dp)); Text(group.name, color = MutedText, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}
