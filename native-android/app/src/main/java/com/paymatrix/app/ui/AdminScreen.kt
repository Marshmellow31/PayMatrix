@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.data.*

private val adminTabs = listOf("Overview", "Users", "Groups", "Notify", "Security", "Flags", "AI scans")

@Composable
fun AdminScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    var tab by remember { mutableStateOf("Overview") }
    LaunchedEffect(state.isAdmin) { if (state.isAdmin) vm.loadAdmin() }
    Scaffold(containerColor = CanvasBlack, topBar = { BackBar("Admin console", nav) { IconButton(onClick = { vm.loadAdmin() }) { Icon(Icons.Default.Refresh, "Refresh") } } }) { padding ->
        if (!state.isAdmin) Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { ObsidianCard(Modifier.padding(20.dp)) { Icon(Icons.Default.GppBad, null, tint = Negative); Text("Admin access denied", color = Color.White, fontWeight = FontWeight.Bold); Text("This route requires a Firebase admin custom claim.", color = MutedText) } }
        else Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(7.dp)) { adminTabs.forEach { item -> FilterChip(tab == item, { tab = item }, { Text(item) }) } }
            when (tab) {
                "Overview" -> AdminOverview(state)
                "Users" -> AdminUsers(state, vm)
                "Groups" -> AdminGroups(state, vm)
                "Notify" -> AdminNotify(state, vm)
                "Security" -> AdminRecords("Security logs", state.adminSecurity)
                "Flags" -> AdminFlags(state, vm)
                else -> AdminRecords("AI scanner requests", state.adminAiRequests)
            }
        }
    }
}

@Composable private fun AdminOverview(state: PayMatrixState) { val stats = state.adminStats; LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { PageTitle("Overview", "Live Firebase platform totals") }; item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { AdminMetric("USERS", stats.totalUsers, Icons.Default.People, Modifier.weight(1f)); AdminMetric("GROUPS", stats.totalGroups, Icons.Default.Groups, Modifier.weight(1f)) } }; item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { AdminMetric("ACTIVE", stats.activeGroups, Icons.Default.CheckCircle, Modifier.weight(1f)); AdminMetric("ALERTS", stats.totalNotifications, Icons.Default.Notifications, Modifier.weight(1f)) } }; item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { AdminMetric("SECURITY", stats.totalSecurityEvents, Icons.Default.Security, Modifier.weight(1f)); AdminMetric("AI SCANS", stats.totalAiRequests, Icons.Default.AutoAwesome, Modifier.weight(1f)) } }; item { Text("All privileged mutations below call admin-claim-protected Cloud Functions or claim-protected Firestore paths.", color = QuietText, fontSize = 10.sp) } } }
@Composable private fun AdminMetric(label: String, value: Long, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier) { ObsidianCard(modifier) { Icon(icon, null, tint = MutedText); Text(value.toString(), color = Color.White, fontWeight = FontWeight.Black, fontSize = 28.sp); Text(label, color = QuietText, fontSize = 8.sp, fontWeight = FontWeight.Bold) } }

@Composable private fun AdminUsers(state: PayMatrixState, vm: PayMatrixViewModel) { var query by remember { mutableStateOf("") }; LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { item { PageTitle("Users", "Manage authentication and claims") }; item { FormField(query, { query = it }, "Search by name or email", leading = { Icon(Icons.Default.Search, null) }) }; items(state.adminUsers.filter { query.isBlank() || it.name.contains(query, true) || it.email.contains(query, true) }, key = { it.uid }) { user -> AdminUserRow(user, vm) } } }

@Composable private fun AdminUserRow(user: AdminUser, vm: PayMatrixViewModel) { var menu by remember { mutableStateOf(false) }; ObsidianCard { Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(42.dp).clip(CircleShape).background(Color.White.copy(alpha = .07f)), contentAlignment = Alignment.Center) { Text(initials(user.name), color = Color.White, fontWeight = FontWeight.Bold) }; Spacer(Modifier.width(11.dp)); Column(Modifier.weight(1f)) { Text(user.name, color = Color.White, fontWeight = FontWeight.Bold); Text(user.email, color = QuietText, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis); Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) { if (user.isAdmin) Text("ADMIN", color = Positive, fontSize = 8.sp, fontWeight = FontWeight.Bold); if (user.disabled) Text("DISABLED", color = Negative, fontSize = 8.sp, fontWeight = FontWeight.Bold) } }; Box { IconButton(onClick = { menu = true }) { Icon(Icons.Default.MoreVert, "Manage user") }; DropdownMenu(menu, { menu = false }) { val actions = listOf((if (user.disabled) "Enable" else "Disable") to (if (user.disabled) "enable" else "disable"), "Clear push tokens" to "clearFcm", (if (user.isAdmin) "Revoke admin" else "Grant admin") to (if (user.isAdmin) "revokeAdmin" else "grantAdmin")); actions.forEach { (label, action) -> DropdownMenuItem({ Text(label) }, { menu = false; vm.adminManageUser(user.uid, action) }) } } } } } }

@Composable private fun AdminGroups(state: PayMatrixState, vm: PayMatrixViewModel) { var query by remember { mutableStateOf("") }; var action by remember { mutableStateOf<Pair<AdminGroup, Boolean>?>(null) }; LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { item { PageTitle("Groups", "Platform group operations") }; item { FormField(query, { query = it }, "Search groups", leading = { Icon(Icons.Default.Search, null) }) }; items(state.adminGroups.filter { query.isBlank() || it.name.contains(query, true) }, key = { it.id }) { group -> ObsidianCard { Row(verticalAlignment = Alignment.CenterVertically) { Icon(categoryIcon("General"), null, tint = MutedText); Spacer(Modifier.width(11.dp)); Column(Modifier.weight(1f)) { Text(group.name, color = Color.White, fontWeight = FontWeight.Bold); Text("${group.members} members · ${group.status}", color = QuietText, fontSize = 10.sp) }; IconButton(onClick = { action = group to false }) { Icon(Icons.Default.Archive, "Archive", tint = MutedText) }; IconButton(onClick = { action = group to true }) { Icon(Icons.Default.DeleteForever, "Delete", tint = Negative) } } } } }; action?.let { (group, delete) -> ConfirmDialog(if (delete) "Force delete group?" else "Archive group?", "This privileged action affects ${group.name} and is enforced by an admin Cloud Function.", if (delete) "Delete" else "Archive", { action = null }, destructive = delete) { vm.adminManageGroup(group.id, delete); action = null } } }

@Composable private fun AdminNotify(state: PayMatrixState, vm: PayMatrixViewModel) { var title by remember { mutableStateOf("") }; var body by remember { mutableStateOf("") }; var url by remember { mutableStateOf("/dashboard") }; var target by remember { mutableStateOf("") }; LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { PageTitle("Notifications", "Compose a broadcast or targeted alert") }; item { ObsidianCard { FormField(title, { title = it }, "Notification title"); FormField(body, { body = it }, "Notification body", singleLine = false); FormField(url, { url = it }, "Action URL"); FormField(target, { target = it }, "Target UID (blank = broadcast)"); PrimaryAction("Send notification", { vm.adminBroadcast(title, body, url, target) { title = ""; body = "" } }, Modifier.fillMaxWidth(), enabled = title.isNotBlank() && body.isNotBlank()) } }; item { SectionTitle("Send history") }; items(state.adminNotifications, key = { it.id }) { AdminRecordRow(it) } } }

@Composable private fun AdminRecords(title: String, records: List<AdminRecord>) { LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { item { PageTitle(title, "Most recent 100 records") }; if (records.isEmpty()) item { EmptyState("No records", "Nothing has been recorded yet.") }; items(records, key = { it.id }) { AdminRecordRow(it) } } }
@Composable private fun AdminRecordRow(record: AdminRecord) { ObsidianCard { Row { Column(Modifier.weight(1f)) { Text(record.title, color = Color.White, fontWeight = FontWeight.Bold); if (record.body.isNotBlank()) Text(record.body, color = MutedText, maxLines = 3, overflow = TextOverflow.Ellipsis); Text(shortDate(record.timestamp), color = QuietText, fontSize = 9.sp) }; if (record.status.isNotBlank()) Text(record.status.uppercase(), color = if (record.status == "passed" || record.status == "success") Positive else MutedText, fontSize = 8.sp, fontWeight = FontWeight.Bold) }; if (record.detail.isNotBlank()) Text("Duration: ${record.detail} ms", color = QuietText, fontSize = 9.sp) } }

@Composable private fun AdminFlags(state: PayMatrixState, vm: PayMatrixViewModel) { val values = listOf("billScanning" to state.flags.billScanning, "analytics" to state.flags.analytics, "settlements" to state.flags.settlements, "logs" to state.flags.logs, "maintenanceMode" to state.flags.maintenanceMode); LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { item { PageTitle("Feature flags", "Changes affect all clients using this config") }; items(values, key = { it.first }) { (key, value) -> ObsidianCard { Row(verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f)) { Text(key, color = Color.White, fontWeight = FontWeight.Bold); Text(if (value) "Enabled" else "Disabled", color = QuietText, fontSize = 10.sp) }; Switch(value, { vm.adminSetFlag(key, it) }) } } } } }
