@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.data.ExpenseDraft
import com.paymatrix.app.domain.BalanceEngine
import com.paymatrix.app.domain.Money
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

private val expenseCategories = listOf("General", "Travel", "Food", "Household", "Sports", "Shopping", "Entertainment")

@Composable
fun ExpenseFormScreen(groupId: String, expenseId: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    LaunchedEffect(groupId) { if (state.group?.group?.id != groupId) vm.loadGroup(groupId) }
    val snapshot = state.group?.takeIf { it.group.id == groupId }
    val editing = snapshot?.expenses?.firstOrNull { it.id == expenseId }
    val scan = state.billScan
    var amount by remember(editing, scan) { mutableStateOf(editing?.let { "%.2f".format(it.amountPaise / 100.0) } ?: scan?.total.orEmpty()) }
    var title by remember(editing, scan) { mutableStateOf(editing?.title ?: scan?.merchant.orEmpty()) }
    var category by remember(editing) { mutableStateOf(editing?.category ?: "General") }
    var notes by remember(editing, scan) { mutableStateOf(editing?.notes ?: scan?.items?.take(5)?.joinToString(", ").orEmpty()) }
    var splitType by remember(editing) { mutableStateOf(editing?.splitType?.takeIf { it in listOf("equal", "exact", "itemized") } ?: "equal") }
    var date by remember(editing, scan) { mutableStateOf(editing?.date ?: scan?.date.orEmpty().ifBlank { Instant.now().toString() }) }
    val selected = remember(snapshot, editing) { mutableStateMapOf<String, Boolean>().apply { snapshot?.group?.members?.forEach { put(it, editing?.participants?.contains(it) ?: true) } } }
    val values = remember(editing) { mutableStateMapOf<String, String>().apply { editing?.splits?.forEach { split -> put(split.user, "%.2f".format(if (splitType == "itemized") (split.dishPaise ?: split.amountPaise) / 100.0 else split.amountPaise / 100.0)) } } }
    var showDate by remember { mutableStateOf(false) }
    val participants = selected.filterValues { it }.keys.toList()
    val splitValues = participants.associateWith { values[it]?.toDoubleOrNull() ?: if (splitType == "equal") 1.0 else 0.0 }
    val totalPaise = runCatching { Money.toPaise(amount) }.getOrDefault(0L)
    val preview = runCatching { BalanceEngine.calculateSplits(totalPaise, splitType, splitValues, participants) }.getOrNull()
    val valid = title.isNotBlank() && totalPaise > 0 && participants.isNotEmpty() && preview != null

    Scaffold(containerColor = CanvasBlack, topBar = { TopAppBar(title = { Column(horizontalAlignment = Alignment.CenterHorizontally) { Text(if (editing == null) "Record Transaction" else "Edit Transaction", fontWeight = FontWeight.Bold); Text("FOCUSED SESSION", color = QuietText, fontSize = 8.sp, letterSpacing = 1.4.sp) } }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Default.Close, "Close") } }, colors = TopAppBarDefaults.topAppBarColors(containerColor = ObsidianSurface)) }) { padding ->
        if (snapshot == null) Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color.White) }
        else Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Spacer(Modifier.height(4.dp))
            ObsidianCard(contentPadding = PaddingValues(20.dp)) {
                Text("TOTAL AMOUNT", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
                OutlinedTextField(amount, { amount = it.filter { ch -> ch.isDigit() || ch == '.' }.take(12) }, prefix = { Text("₹", color = MutedText, fontSize = 30.sp) }, textStyle = LocalTextStyle.current.copy(fontSize = 38.sp, fontWeight = FontWeight.Bold), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true, modifier = Modifier.fillMaxWidth(), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color.Transparent, unfocusedBorderColor = Color.Transparent), placeholder = { Text("0.00", color = Color.White.copy(alpha = .12f)) })
                FormField(title, { title = it.take(100) }, "What was it for?", leading = { Icon(Icons.Default.Description, null) })
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) { expenseCategories.forEach { value -> FilterChip(category == value, { category = value }, { Text(value) }, leadingIcon = { Icon(categoryIcon(value), null, Modifier.size(15.dp)) }) } }
                FormField(notes, { notes = it.take(500) }, "Add a note (optional)", singleLine = false)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(onClick = { showDate = true }, label = { Text(shortDate(date)) }, leadingIcon = { Icon(Icons.Default.CalendarMonth, null, Modifier.size(15.dp)) })
                    AssistChip(onClick = {}, label = { Text(snapshot.group.name, maxLines = 1) }, leadingIcon = { Icon(Icons.Default.Groups, null, Modifier.size(15.dp)) })
                }
            }

            ObsidianCard(contentPadding = PaddingValues(18.dp)) {
                Row { Text("Split with", Modifier.weight(1f), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp); TextButton(onClick = { snapshot.group.members.forEach { selected[it] = true } }) { Text("SELECT ALL", color = MutedText, fontSize = 9.sp) } }
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    snapshot.group.members.forEach { uid ->
                        val checked = selected[uid] == true
                        Column(Modifier.width(58.dp).clickable { selected[uid] = !checked }, horizontalAlignment = Alignment.CenterHorizontally) {
                            Box { UserAvatar(snapshot.profiles[uid], 48); if (checked) Box(Modifier.size(18.dp).clip(CircleShape).background(Color.White).align(Alignment.BottomEnd), contentAlignment = Alignment.Center) { Icon(Icons.Default.Check, null, tint = Color.Black, modifier = Modifier.size(13.dp)) } }
                            Spacer(Modifier.height(5.dp)); Text(if (uid == state.user?.uid) "You" else snapshot.profiles[uid]?.name?.substringBefore(' ') ?: "Member", color = if (checked) Color.White else QuietText, fontSize = 10.sp, maxLines = 1)
                        }
                    }
                }
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf("equal" to "Equal", "exact" to "Exact", "itemized" to "GST").forEachIndexed { index, pair -> SegmentedButton(splitType == pair.first, { splitType = pair.first; values.clear() }, SegmentedButtonDefaults.itemShape(index, 3)) { Text(pair.second) } }
                }
                if (splitType != "equal") {
                    Text(if (splitType == "exact") "Enter each person's final share" else "Enter each person's dish subtotal; GST/discount is distributed proportionally", color = QuietText, fontSize = 10.sp, lineHeight = 14.sp)
                    participants.forEach { uid ->
                        OutlinedTextField(values[uid].orEmpty(), { values[uid] = it.filter { ch -> ch.isDigit() || ch == '.' }.take(12) }, label = { Text(snapshot.profiles[uid]?.name ?: "Member") }, prefix = { Text("₹") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp))
                    }
                    val entered = participants.sumOf { Money.toPaise(values[it]?.toDoubleOrNull() ?: 0.0) }
                    Text(if (splitType == "exact") "${if (entered == totalPaise) "Balanced" else "Remaining"}: ${Money.format(kotlin.math.abs(totalPaise - entered))}" else "Dishes ${Money.format(entered)} · GST / discount ${Money.format(totalPaise - entered)}", color = if (preview != null) Positive else Negative, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                } else preview?.forEach { split -> Row { Text(snapshot.profiles[split.user]?.name ?: "Member", Modifier.weight(1f), color = MutedText); Text(Money.format(split.amountPaise), color = Color.White, fontWeight = FontWeight.SemiBold) } }
            }

            PrimaryAction(if (editing == null) "Create expense" else "Save changes", {
                vm.saveExpense(groupId, ExpenseDraft(title, amount, category, notes, participants, splitType, splitValues, date), editing) { vm.setBillScan(null); nav.popBackStack() }
            }, Modifier.fillMaxWidth(), enabled = valid, icon = { Icon(Icons.Default.Send, null, Modifier.size(18.dp)) })
            if (!valid && amount.isNotBlank()) Text("Complete the amount, title, participants, and balanced split before saving.", color = Negative, fontSize = 11.sp)
            Spacer(Modifier.height(32.dp))
        }
    }

    if (showDate) {
        val initial = runCatching { Instant.parse(date).toEpochMilli() }.getOrDefault(System.currentTimeMillis())
        val picker = rememberDatePickerState(initialSelectedDateMillis = initial)
        DatePickerDialog(onDismissRequest = { showDate = false }, confirmButton = { TextButton(onClick = { picker.selectedDateMillis?.let { date = Instant.ofEpochMilli(it).toString() }; showDate = false }) { Text("Done") } }, dismissButton = { TextButton(onClick = { showDate = false }) { Text("Cancel") } }) { DatePicker(picker) }
    }
}
