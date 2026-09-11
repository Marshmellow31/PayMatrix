@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.paymatrix.app.ui

import android.app.DatePickerDialog
import android.app.TimePickerDialog
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.data.*
import com.paymatrix.app.domain.Money
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

private fun logDate(value: String) = runCatching { Instant.parse(value).atZone(ZoneId.systemDefault()) }
    .getOrElse { runCatching { LocalDate.parse(value.take(10)).atStartOfDay(ZoneId.systemDefault()) }.getOrElse { Instant.EPOCH.atZone(ZoneId.systemDefault()) } }
private fun logDay(value: String): String {
    val date = logDate(value).toLocalDate()
    return when (date) { LocalDate.now() -> "Today"; LocalDate.now().minusDays(1) -> "Yesterday"; else -> date.format(DateTimeFormatter.ofPattern("d MMM yyyy")) }
}
private fun logAmount(entry: LogEntry) = if (entry.currency == "INR") Money.format(entry.amountPaise) else "${entry.currency} ${java.math.BigDecimal.valueOf(entry.amountPaise, 2).toPlainString()}"
private fun categoryId(entry: LogEntry) = entry.categoryId.ifBlank { "category_${entry.category.lowercase(java.util.Locale.ROOT)}" }

private data class LogFilters(
    val type: String = "", val category: String = "", val account: String = "",
    val group: String = "", val friend: String = "", val from: String = "", val to: String = "",
    val min: String = "", val max: String = "",
) {
    val count get() = listOf(type, category, account, group, friend, from, to, min, max).count { it.isNotBlank() }
    fun matches(entry: LogEntry): Boolean {
        val date = logDate(entry.date).toLocalDate().toString()
        val minimum = min.takeIf { it.isNotBlank() }?.let { runCatching { Money.toPaise(it) }.getOrNull() }
        val maximum = max.takeIf { it.isNotBlank() }?.let { runCatching { Money.toPaise(it) }.getOrNull() }
        return (type.isBlank() || entry.transactionType == type) &&
            (category.isBlank() || categoryId(entry) == category) &&
            (account.isBlank() || entry.accountId == account || entry.toAccountId == account) &&
            (group.isBlank() || entry.sourceGroupId == group) &&
            (friend.isBlank() || entry.friendId.ifBlank { entry.friendName } == friend) &&
            (from.isBlank() || date >= from) && (to.isBlank() || date <= to) &&
            (min.isBlank() || minimum != null && entry.amountPaise >= minimum) &&
            (max.isBlank() || maximum != null && entry.amountPaise <= maximum)
    }
}

@Composable
fun LogEntriesScreen(id: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val group = state.logGroups.firstOrNull { it.id == id }
    val entries = if (state.activeLogId == id) state.logEntries else emptyList()
    var refresh by remember(id) { mutableStateOf(0) }
    var showForm by remember(id) { mutableStateOf(false) }
    var seed by remember(id) { mutableStateOf<LogEntry?>(null) }
    var duplicate by remember(id) { mutableStateOf(false) }
    var selected by remember(id) { mutableStateOf<LogEntry?>(null) }
    var remove by remember(id) { mutableStateOf<LogEntry?>(null) }
    var pick by remember(id) { mutableStateOf(false) }
    var manage by remember(id) { mutableStateOf(false) }
    var catalog by remember(id) { mutableStateOf(false) }
    var showFilters by remember(id) { mutableStateOf(false) }
    var filters by remember(id) { mutableStateOf(LogFilters()) }
    var search by remember(id) { mutableStateOf("") }
    LaunchedEffect(id, state.user?.uid, refresh) { vm.observeLogEntries(id) }
    LaunchedEffect(id, state.user?.uid, refresh) { vm.observeLogCatalog() }
    LaunchedEffect(group == null) { if (group == null) vm.loadLogGroups() }
    val visible = remember(entries, search, filters) {
        entries.filter { entry ->
            val text = listOf(entry.title, entry.note, entry.category, entry.accountName, entry.toAccountName, entry.sourceGroupName, entry.friendName).joinToString(" ")
            text.contains(search.trim(), ignoreCase = true) && filters.matches(entry)
        }.sortedByDescending { logDate(it.date).toInstant() }
    }
    val spending = entries.filter { it.transactionType == "expense" && it.currency == "INR" && java.time.YearMonth.from(logDate(it.date)) == java.time.YearMonth.now() }.sumOf { it.amountPaise }
    Scaffold(containerColor = CanvasBlack, topBar = {
        BackBar(group?.name ?: "Log", nav, subtitle = "${entries.size} transactions", actions = {
            IconButton(enabled = !LocalActionBusy.current && group != null, onClick = { manage = true }) { Icon(Icons.Default.Settings, "Manage log") }
        })
    }) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.TopCenter) {
            LazyColumn(Modifier.widthIn(max = 900.dp).fillMaxSize(), contentPadding = PaddingValues(18.dp, 12.dp, 18.dp, 100.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) { Text("Spent this month", color = MutedText, fontSize = 13.sp); Text(if (state.logEntriesLoading) "Loading…" else if (state.logEntriesError.isNotBlank()) "Unavailable" else Money.format(spending), color = Ink, fontWeight = FontWeight.SemiBold, fontSize = 26.sp) }
                        TextButton(enabled = !LocalActionBusy.current, onClick = { catalog = true }) { Text("Accounts & categories", fontSize = 12.sp) }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PrimaryAction("New transaction", { seed = null; duplicate = false; showForm = true }, Modifier.weight(1f))
                        SecondaryAction("From split share", { vm.loadExpenseShares(); pick = true }, Modifier.weight(1f))
                    }
                }
                item { OutlinedTextField(search, { search = it }, Modifier.fillMaxWidth(), label = { Text("Search transactions") }, placeholder = { Text("Note, category, account or person") }, singleLine = true, leadingIcon = { Icon(Icons.Default.Search, null) }) }
                item { Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text("${visible.size} of ${entries.size} loaded", color = MutedText, fontSize = 12.sp, modifier = Modifier.weight(1f))
                    TextButton(onClick = { showFilters = true }) { Icon(Icons.Default.FilterList, null, Modifier.size(18.dp)); Text("Filters${if (filters.count > 0) " (${filters.count})" else ""}") }
                } }
                if (state.logEntriesError.isNotBlank() || state.logCatalogError.isNotBlank()) item {
                    Column { Text(state.logEntriesError.ifBlank { state.logCatalogError }, color = Negative, fontSize = 13.sp); TextButton(onClick = { refresh += 1 }) { Text("Retry") } }
                }
                if (state.logEntriesLoading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
                else if (visible.isEmpty()) item { EmptyState("No transactions to show", "Record a transaction or adjust your search and filters.") }
                visible.groupBy { logDate(it.date).toLocalDate() }.forEach { (_, dayEntries) ->
                    item { Text(logDay(dayEntries.first().date), color = MutedText, fontSize = 13.sp, fontWeight = FontWeight.Medium) }
                    items(dayEntries, key = { it.id }) { entry ->
                        Row(Modifier.fillMaxWidth().clickable { selected = entry }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(when (entry.transactionType) { "income" -> Icons.Default.SouthWest; "transfer" -> Icons.Default.SwapHoriz; else -> Icons.Default.NorthEast }, null, tint = MutedText, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(entry.note.ifBlank { entry.title }, color = Ink, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("${if (entry.transactionType == "transfer") "Transfer" else entry.category} · ${entry.accountName}", color = MutedText, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                            Spacer(Modifier.width(8.dp))
                            Column(Modifier.widthIn(max = 170.dp), horizontalAlignment = Alignment.End) {
                                Text("${if (entry.transactionType == "income") "+" else if (entry.transactionType == "expense") "−" else ""}${logAmount(entry)}", color = if (entry.transactionType == "income") Positive else Ink, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text("${entry.transactionType.replaceFirstChar { it.uppercase() }} · ${logDate(entry.date).format(DateTimeFormatter.ofPattern("HH:mm"))}", color = MutedText, fontSize = 11.sp)
                            }
                        }
                        HorizontalDivider(color = Hairline)
                    }
                }
                if (state.activeLogId == id && state.logActivity.isNotEmpty()) {
                    item { SectionTitle("Activity", "Immutable audit history") }
                    items(state.logActivity, key = { "activity_${it.id}" }) { event ->
                        Column(Modifier.padding(vertical = 6.dp)) { Text(event.message, color = MutedText, fontSize = 13.sp); Text(shortDate(event.createdAt), color = QuietText, fontSize = 12.sp) }
                    }
                }
            }
        }
    }
    if (showForm) NativeLogEntryDialog(seed, duplicate, state, { showForm = false }) { draft -> vm.saveLogEntry(id, draft, if (duplicate) null else seed) { showForm = false } }
    if (catalog) NativeLogCatalogDialog(state, vm) { catalog = false }
    if (showFilters) NativeLogFiltersDialog(filters, entries, { filters = it }, { showFilters = false })
    if (pick) ExpenseShareDialog(state.expenseShares, { pick = false }) { vm.addExpenseShareToLog(id, it); pick = false }
    if (manage && group != null) ManageLogDialog(group, state, vm, nav) { manage = false }
    selected?.let { entry ->
        val canChange = entry.addedBy == state.user?.uid || group?.ownerId == state.user?.uid
        NativeLogDetailsDialog(entry, canChange, { selected = null },
            edit = { seed = entry; duplicate = false; selected = null; showForm = true },
            duplicate = { seed = entry; duplicate = true; selected = null; showForm = true },
            delete = { selected = null; remove = entry },
            source = { selected = null; nav.navigate("group/${android.net.Uri.encode(entry.sourceGroupId)}") })
    }
    remove?.let { entry -> ConfirmDialog("Delete transaction?", "Remove ${entry.title} from this log? Its audit history will remain.", "Delete", { remove = null }, destructive = true) { vm.deleteLogEntry(id, entry); remove = null } }
}

@Composable
private fun LogSelect(label: String, selected: String, choices: List<Pair<String, String>>, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box(Modifier.fillMaxWidth()) {
        OutlinedButton(onClick = { expanded = true }, enabled = !LocalActionBusy.current, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
            Column(Modifier.weight(1f)) { Text(label, fontSize = 12.sp, color = MutedText); Text(choices.firstOrNull { it.first == selected }?.second ?: "Choose", color = Ink, maxLines = 2) }
            Icon(Icons.Default.ExpandMore, null)
        }
        DropdownMenu(expanded, { expanded = false }, Modifier.heightIn(max = 340.dp)) {
            choices.distinctBy { it.first }.forEach { (id, name) -> DropdownMenuItem(text = { Text(name) }, onClick = { onSelect(id); expanded = false }) }
        }
    }
}

@Composable
private fun NativeLogEntryDialog(entry: LogEntry?, duplicate: Boolean, state: PayMatrixState, onDismiss: () -> Unit, onSave: (LogTransactionDraft) -> Unit) {
    var draft by remember(entry, duplicate) { mutableStateOf(entry?.let { LogTransactionDraft.from(it, duplicate) } ?: LogTransactionDraft()) }
    var error by remember { mutableStateOf("") }
    var advanced by remember { mutableStateOf(false) }
    var allCategories by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val accounts = state.logCatalog.filter { it.kind == "account" }
    val categories = state.logCatalog.filter { it.kind == "category" }
    LaunchedEffect(state.logCatalog, state.logCatalogLoading) {
        if (entry == null && !state.logCatalogLoading) {
            val account = accounts.firstOrNull { !it.archived && it.id == draft.accountId } ?: accounts.firstOrNull { !it.archived }
            val category = categories.firstOrNull { !it.archived && it.id == draft.categoryId } ?: categories.firstOrNull { !it.archived }
            draft = draft.copy(accountId = account?.id.orEmpty(), accountName = account?.name.orEmpty(), categoryId = category?.id.orEmpty(), category = category?.name.orEmpty())
        }
    }
    fun options(items: List<LogCatalogItem>, selected: String, name: String): List<Pair<String, String>> {
        val available = items.filter { !it.archived || entry != null && it.id == selected }.map { it.id to (it.name + if (it.archived) " (archived)" else "") }
        return if (selected.isNotBlank() && available.none { it.first == selected }) available + (selected to name) else available
    }
    val close = { if (!state.loading) onDismiss() }
    AlertDialog(onDismissRequest = close, containerColor = ModalSurface,
        title = { Text(if (duplicate) "Duplicate transaction" else if (entry != null) "Edit transaction" else "New transaction") },
        text = { Column(Modifier.imePadding().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { listOf("expense", "income", "transfer").forEach { kind -> FilterChip(draft.transactionType == kind, { draft = draft.copy(transactionType = kind) }, label = { Text(kind.replaceFirstChar { it.uppercase() }, fontSize = 12.sp) }, modifier = Modifier.weight(1f)) } }
            OutlinedTextField(draft.amount, { draft = draft.copy(amount = it) }, Modifier.fillMaxWidth(), label = { Text("Amount (INR)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), textStyle = MaterialTheme.typography.headlineMedium)
            LogSelect(if (draft.transactionType == "transfer") "From account" else "Account", draft.accountId, options(accounts, draft.accountId, draft.accountName)) { id -> draft = draft.copy(accountId = id, accountName = accounts.firstOrNull { it.id == id }?.name ?: draft.accountName) }
            if (draft.transactionType == "transfer") {
                LogSelect("To account", draft.toAccountId, options(accounts, draft.toAccountId, draft.toAccountName).filter { it.first != draft.accountId }) { id -> draft = draft.copy(toAccountId = id, toAccountName = accounts.firstOrNull { it.id == id }?.name ?: draft.toAccountName) }
                Text("Transfers are excluded from spending and do not change group balances.", color = MutedText, fontSize = 12.sp)
            } else {
                val recent = state.logEntries.map { categoryId(it) }.distinct().take(3)
                if (recent.isNotEmpty()) {
                    Text("Recently used", color = MutedText, fontSize = 12.sp)
                    Column { categories.filter { !it.archived && it.id in recent }.forEach { item -> TextButton(onClick = { draft = draft.copy(categoryId = item.id, category = item.name) }) { Text(item.name) } } }
                }
                if (allCategories) LogSelect("Category", draft.categoryId, options(categories, draft.categoryId, draft.category)) { id -> draft = draft.copy(categoryId = id, category = categories.firstOrNull { it.id == id }?.name ?: draft.category) }
                else OutlinedButton(onClick = { allCategories = true }, modifier = Modifier.fillMaxWidth()) { Text(draft.category.ifBlank { "Choose category" }, Modifier.weight(1f)); Text("View all", fontSize = 12.sp) }
            }
            FormField(draft.note, { draft = draft.copy(note = it) }, "Note (optional)")
            val date = logDate(draft.date)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { DatePickerDialog(context, { _, year, month, day -> draft = draft.copy(date = date.withYear(year).withMonth(month + 1).withDayOfMonth(day).toInstant().toString()) }, date.year, date.monthValue - 1, date.dayOfMonth).show() }, modifier = Modifier.weight(1f)) { Text(date.format(DateTimeFormatter.ofPattern("d MMM yyyy")), fontSize = 12.sp) }
                OutlinedButton(onClick = { TimePickerDialog(context, { _, hour, minute -> draft = draft.copy(date = date.withHour(hour).withMinute(minute).withSecond(0).toInstant().toString()) }, date.hour, date.minute, true).show() }, modifier = Modifier.weight(1f)) { Text(date.format(DateTimeFormatter.ofPattern("HH:mm"))) }
            }
            TextButton(onClick = { advanced = !advanced }) { Text(if (advanced) "Fewer details" else "More details") }
            if (advanced) {
                FormField(draft.title, { draft = draft.copy(title = it) }, "Title (optional)")
                FormField(draft.place, { draft = draft.copy(place = it) }, "Place (optional)")
                FormField(draft.friendName, { draft = draft.copy(friendName = it, friendId = "") }, "Friend name (optional reference)")
                Text("Use From split share to include an existing group expense. This transaction is visible to members of this log.", color = MutedText, fontSize = 12.sp)
            }
            if (state.logCatalogError.isNotBlank()) Text(state.logCatalogError, color = MutedText, fontSize = 12.sp)
            if (error.isNotBlank()) Text(error, color = Negative)
        } },
        confirmButton = { Button(enabled = !LocalActionBusy.current && !state.logCatalogLoading, onClick = {
            val failure = runCatching { draft.fields() }.exceptionOrNull()
            if (failure != null) error = failure.message ?: "Check the transaction fields." else onSave(draft)
        }) { Text(if (entry != null && !duplicate) "Save changes" else "Add transaction") } },
        dismissButton = { TextButton(enabled = !LocalActionBusy.current, onClick = close) { Text("Cancel") } })
}

@Composable
private fun NativeLogDetailsDialog(entry: LogEntry, canChange: Boolean, onDismiss: () -> Unit, edit: () -> Unit, duplicate: () -> Unit, delete: () -> Unit, source: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, containerColor = ModalSurface, title = { Text(logAmount(entry), fontWeight = FontWeight.SemiBold) }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val fields = listOf("Type" to entry.transactionType, "Account" to entry.accountName, "Category" to entry.category, "Title" to entry.title, "Note" to entry.note.ifBlank { "—" }, "Date and time" to logDate(entry.date).format(DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm"))) +
                listOf("To account" to entry.toAccountName, "Friend" to entry.friendName, "Source group" to entry.sourceGroupName, "Split" to if (entry.sourceGroupId.isNotBlank()) "Recorded share of the source expense" else "").filter { it.second.isNotBlank() }
            fields.forEach { (label, value) -> Column { Text(label, color = MutedText, fontSize = 12.sp); Text(value, color = Ink, fontSize = 14.sp) } }
            if (entry.sourceGroupId.isNotBlank()) TextButton(onClick = source) { Text("Open source group") }
            Row { if (canChange && entry.type == "manual") TextButton(onClick = edit) { Text("Edit") }; TextButton(onClick = duplicate) { Text("Duplicate") }; if (canChange) TextButton(onClick = delete) { Text("Delete", color = Negative) } }
        }
    }, confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } })
}

@Composable
private fun NativeLogFiltersDialog(filters: LogFilters, entries: List<LogEntry>, change: (LogFilters) -> Unit, close: () -> Unit) {
    val context = LocalContext.current
    fun chooseDate(value: String, selected: (String) -> Unit) {
        val date = runCatching { LocalDate.parse(value) }.getOrDefault(LocalDate.now())
        DatePickerDialog(context, { _, year, month, day -> selected(LocalDate.of(year, month + 1, day).toString()) }, date.year, date.monthValue - 1, date.dayOfMonth).show()
    }
    AlertDialog(onDismissRequest = close, containerColor = ModalSurface, title = { Text("Filter transactions") }, text = {
        Column(Modifier.imePadding().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            LogSelect("Type", filters.type, listOf("" to "All", "expense" to "Expense", "income" to "Income", "transfer" to "Transfer")) { change(filters.copy(type = it)) }
            LogSelect("Category", filters.category, listOf("" to "All") + entries.map { categoryId(it) to it.category }) { change(filters.copy(category = it)) }
            LogSelect("Account", filters.account, listOf("" to "All") + entries.map { it.accountId to it.accountName } + entries.filter { it.toAccountId.isNotBlank() }.map { it.toAccountId to it.toAccountName }) { change(filters.copy(account = it)) }
            LogSelect("Source group", filters.group, listOf("" to "All") + entries.filter { it.sourceGroupId.isNotBlank() }.map { it.sourceGroupId to it.sourceGroupName }) { change(filters.copy(group = it)) }
            LogSelect("Friend", filters.friend, listOf("" to "All") + entries.filter { it.friendName.isNotBlank() }.map { it.friendId.ifBlank { it.friendName } to it.friendName }) { change(filters.copy(friend = it)) }
            OutlinedButton(onClick = { chooseDate(filters.from) { change(filters.copy(from = it)) } }, modifier = Modifier.fillMaxWidth()) { Text("From: ${filters.from.ifBlank { "Any date" }}") }
            OutlinedButton(onClick = { chooseDate(filters.to) { change(filters.copy(to = it)) } }, modifier = Modifier.fillMaxWidth()) { Text("To: ${filters.to.ifBlank { "Any date" }}") }
            OutlinedTextField(filters.min, { change(filters.copy(min = it)) }, label = { Text("Minimum amount (INR)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
            OutlinedTextField(filters.max, { change(filters.copy(max = it)) }, label = { Text("Maximum amount (INR)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
        }
    }, confirmButton = { Button(onClick = close) { Text("Show transactions") } }, dismissButton = { TextButton(onClick = { change(LogFilters()) }) { Text("Clear filters") } })
}

@Composable
private fun NativeLogCatalogDialog(state: PayMatrixState, vm: PayMatrixViewModel, close: () -> Unit) {
    var kind by remember { mutableStateOf("account") }
    var editing by remember { mutableStateOf<LogCatalogItem?>(null) }
    var name by remember { mutableStateOf("") }
    val enabled = !LocalActionBusy.current && !state.logCatalogLoading && state.logCatalogError.isBlank()
    AlertDialog(onDismissRequest = { if (!state.loading) close() }, containerColor = ModalSurface, title = { Text("Accounts & categories") }, text = {
        Column(Modifier.imePadding().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("account" to "Accounts", "category" to "Categories").forEach { (value, label) -> FilterChip(kind == value, { kind = value; editing = null; name = "" }, label = { Text(label) }) } }
            Text("Personal to your account. Renaming keeps the same ID; archive hides unused items from new entries. Historical labels remain readable.", color = MutedText, fontSize = 12.sp)
            FormField(name, { name = it }, if (editing == null) "New $kind" else "Rename")
            Row { Button(enabled = enabled && name.trim().length in 1..50, onClick = {
                val item = editing ?: LogCatalogItem("${kind}_${UUID.randomUUID()}", "", kind)
                vm.saveLogCatalogItem(item, name) { editing = null; name = "" }
            }) { Text(if (editing == null) "Create" else "Save") }; if (editing != null) TextButton(onClick = { editing = null; name = "" }) { Text("Cancel") } }
            if (state.logCatalogError.isNotBlank()) Text(state.logCatalogError, color = Negative, fontSize = 12.sp)
            state.logCatalog.filter { it.kind == kind }.forEach { item ->
                Column { Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text(item.name, color = Ink); if (item.archived) Text("Archived", color = MutedText, fontSize = 12.sp) }
                    TextButton(enabled = enabled, onClick = { editing = item; name = item.name }) { Text("Rename", fontSize = 12.sp) }
                    TextButton(enabled = enabled, onClick = { vm.saveLogCatalogItem(item, item.name, !item.archived) }) { Text(if (item.archived) "Restore" else "Archive", fontSize = 12.sp) }
                }; HorizontalDivider(color = Hairline) }
            }
        }
    }, confirmButton = { TextButton(enabled = !LocalActionBusy.current, onClick = close) { Text("Done") } })
}
