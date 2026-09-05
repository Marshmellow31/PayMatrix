@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.runtime.saveable.rememberSaveable
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

private val expenseCategories = listOf("General", "Travel", "Food", "Household", "Sports", "Shopping", "Entertainment")

@Composable
fun ExpenseFormScreen(groupId: String, expenseId: String, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    LaunchedEffect(groupId) { if (state.group?.group?.id != groupId) vm.loadGroup(groupId) }
    val snapshot = state.groupCache[groupId] ?: state.group?.takeIf { it.group.id == groupId }
    val editing = snapshot?.expenses?.firstOrNull { it.id == expenseId }
    val scan = state.billScan

    val initialVersion = remember(expenseId) { editing?.version ?: 1L }
    var currentStep by rememberSaveable { mutableIntStateOf(1) }
    var amount by rememberSaveable { mutableStateOf(editing?.let { Money.formatDecimal(it.amountPaise) } ?: scan?.total.orEmpty()) }
    var title by rememberSaveable { mutableStateOf(editing?.title ?: scan?.merchant.orEmpty()) }
    var category by rememberSaveable { mutableStateOf(editing?.category ?: "General") }
    var notes by rememberSaveable { mutableStateOf(editing?.notes ?: scan?.items?.take(5)?.joinToString(", ").orEmpty()) }
    var splitType by rememberSaveable { mutableStateOf(editing?.splitType ?: "equal") }
    var date by rememberSaveable { mutableStateOf(editing?.date ?: scan?.date.orEmpty().ifBlank { Instant.now().toString() }) }
    var paidBy by rememberSaveable { mutableStateOf(editing?.paidBy?.ifBlank { state.user?.uid.orEmpty() } ?: state.user?.uid.orEmpty()) }
    val selected = remember(expenseId) {
        mutableStateMapOf<String, Boolean>().apply {
            snapshot?.group?.members?.forEach { put(it, editing?.participants?.contains(it) ?: true) }
        }
    }
    val values = remember(expenseId) {
        mutableStateMapOf<String, String>().apply {
            if (editing != null) {
                when (editing.splitType) {
                    "percentage" -> editing.splits.forEach { split ->
                        put(split.user, split.percent?.let { "%.2f".format(it) } ?: "")
                    }
                    "shares" -> editing.splits.forEach { split ->
                        put(split.user, split.shares?.toString() ?: "1")
                    }
                    "itemized" -> editing.splits.forEach { split ->
                        val amt = split.dishPaise ?: split.amountPaise
                        put(split.user, Money.formatDecimal(amt))
                    }
                    else -> editing.splits.forEach { split ->
                        put(split.user, Money.formatDecimal(split.amountPaise))
                    }
                }
            }
        }
    }

    LaunchedEffect(snapshot?.group?.members) {
        snapshot?.group?.members?.forEach { uid ->
            if (!selected.containsKey(uid)) {
                selected[uid] = editing?.participants?.contains(uid) ?: true
            }
        }
    }

    var showDate by remember { mutableStateOf(false) }

    val participants = selected.filterValues { it }.keys.toList()
    val splitValues = participants.associateWith { uid ->
        when (splitType) {
            "equal" -> 1.0
            "percentage" -> values[uid]?.toDoubleOrNull() ?: 0.0
            "shares" -> (values[uid]?.toDoubleOrNull() ?: 1.0).coerceAtLeast(1.0)
            "itemized", "exact" -> (values[uid]?.toDoubleOrNull() ?: 0.0)
            else -> 1.0
        }
    }
    val totalPaise = runCatching { Money.toPaise(amount) }.getOrDefault(0L)
    val preview = runCatching { BalanceEngine.calculateSplits(totalPaise, splitType, splitValues, participants) }.getOrNull()
    val step1Valid = title.isNotBlank() && totalPaise > 0
    val step2Valid = participants.isNotEmpty() && preview != null && paidBy.isNotBlank()
    val allValid = step1Valid && step2Valid

    BackHandler {
        if (currentStep > 1) {
            currentStep = 1
        } else {
            nav.popBackStack()
        }
    }

    Scaffold(
        containerColor = CanvasBlack,
        topBar = {
            TopAppBar(
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            if (editing == null) "Record Transaction" else "Edit Transaction",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp
                        )
                        Text(
                            if (currentStep == 1) "STEP 1 OF 2 · ESSENTIALS" else "STEP 2 OF 2 · SPLIT & PAY",
                            color = MintGreen,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.4.sp
                        )
                    }
                },
                navigationIcon = {
                    IconButton(enabled = !LocalActionBusy.current, onClick = {
                        if (currentStep > 1) currentStep = 1 else nav.popBackStack()
                    }) {
                        Icon(if (currentStep > 1) Icons.Default.ArrowBack else Icons.Default.Close, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ObsidianSurface)
            )
        }
    ) { padding ->
        if (snapshot == null) {
            ExpenseFormSkeleton(padding)
        } else {
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Spacer(Modifier.height(2.dp))

                // Step Indicator Pills
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(if (currentStep >= 1) MintGreen else Color.White.copy(alpha = 0.15f))
                    )
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(if (currentStep >= 2) MintGreen else Color.White.copy(alpha = 0.15f))
                    )
                }

                if (editing != null && editing.version > initialVersion) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Negative.copy(alpha = 0.15f),
                        border = BorderStroke(1.dp, Negative),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = Negative, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(
                                "This transaction was updated by another member in the background. Saving may overwrite recent changes.",
                                color = Negative,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }

                if (currentStep == 1) {
                    // ─── STEP 1: ESSENTIALS & CATEGORY ───────────────────────────
                    ObsidianCard(contentPadding = PaddingValues(20.dp)) {
                        Text(
                            "TOTAL AMOUNT",
                            color = QuietText,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp,
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        )
                        OutlinedTextField(
                            amount,
                            { amount = it.filter { ch -> ch.isDigit() || ch == '.' }.take(12) },
                            prefix = { Text("₹", color = MutedText, fontSize = 30.sp) },
                            textStyle = LocalTextStyle.current.copy(fontSize = 38.sp, fontWeight = FontWeight.Bold),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent
                            ),
                            placeholder = { Text("0.00", color = Color.White.copy(alpha = .12f)) }
                        )
                        FormField(title, { title = it.take(100) }, "What was it for?", leading = { Icon(Icons.Default.Description, null) })
                        Text(
                            "CATEGORY",
                            color = QuietText,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.5.sp,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                        Row(
                            Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            expenseCategories.forEach { value ->
                                FilterChip(
                                    selected = category == value,
                                    onClick = { category = value },
                                    label = { Text(value) },
                                    leadingIcon = { Icon(categoryIcon(value), null, Modifier.size(15.dp)) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MintGreen.copy(alpha = 0.2f),
                                        selectedLabelColor = MintGreen,
                                        selectedLeadingIconColor = MintGreen
                                    )
                                )
                            }
                        }
                        FormField(notes, { notes = it.take(500) }, "Add a note (optional)", singleLine = false)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            AssistChip(
                                onClick = { showDate = true },
                                label = { Text(shortDate(date)) },
                                leadingIcon = { Icon(Icons.Default.CalendarMonth, null, Modifier.size(15.dp)) }
                            )
                            AssistChip(
                                onClick = {},
                                label = { Text(snapshot.group.name, maxLines = 1) },
                                leadingIcon = { Icon(Icons.Default.Groups, null, Modifier.size(15.dp)) }
                            )
                        }
                    }

                    PrimaryAction(
                        "Next: Split Details",
                        onClick = {
                            if (step1Valid) currentStep = 2
                        },
                        Modifier.fillMaxWidth(),
                        enabled = step1Valid,
                        icon = { Icon(Icons.Default.ArrowForward, null, Modifier.size(18.dp)) }
                    )

                    if (!step1Valid && (amount.isNotBlank() || title.isNotBlank())) {
                        Text(
                            "Enter a valid amount and description to proceed to split details.",
                            color = Negative,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )
                    }
                } else {
                    // ─── STEP 2: SPLIT METHOD, PAID BY & DISTRIBUTION PREVIEW ─────
                    // Compact Expense Summary Bar
                    ObsidianCard(contentPadding = PaddingValues(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp, maxLines = 1)
                                Text(
                                    "${category} · ${Money.format(totalPaise)}",
                                    color = MintGreen,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                            }
                            TextButton(enabled = !LocalActionBusy.current, onClick = { currentStep = 1 }) {
                                Icon(Icons.Default.Edit, "Edit", tint = MutedText, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Edit", color = MutedText, fontSize = 12.sp)
                            }
                        }
                    }

                    // PAID BY SECTION
                    ObsidianCard(contentPadding = PaddingValues(18.dp)) {
                        Text("PAID BY", color = QuietText, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.6.sp)
                        Spacer(Modifier.height(8.dp))
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            snapshot.group.members.forEach { uid ->
                                val isSelected = (paidBy == uid)
                                val name = if (uid == state.user?.uid) "You" else snapshot.profiles[uid]?.name?.substringBefore(' ') ?: "Member"
                                FilterChip(
                                    selected = isSelected,
                                    enabled = !LocalActionBusy.current,
                                    onClick = { paidBy = uid },
                                    label = { Text(name, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                                    leadingIcon = { UserAvatar(snapshot.profiles[uid], 22) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = Color.White,
                                        selectedLabelColor = Color.Black,
                                        containerColor = Color.White.copy(alpha = 0.05f),
                                        labelColor = Color.White,
                                        disabledSelectedContainerColor = Color.White.copy(alpha = 0.8f),
                                        disabledLabelColor = Color.White.copy(alpha = 0.5f)
                                    )
                                )
                            }
                        }
                    }

                    // SPLIT WITH & DISTRIBUTION PREVIEW
                    ObsidianCard(contentPadding = PaddingValues(18.dp)) {
                        val allSelected = snapshot.group.members.all { selected[it] == true }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Split with", Modifier.weight(1f), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            // Dynamic SELECT ALL / DESELECT ALL Button
                            TextButton(enabled = !LocalActionBusy.current, onClick = {
                                if (allSelected) {
                                    snapshot.group.members.forEach { selected[it] = false }
                                } else {
                                    snapshot.group.members.forEach { selected[it] = true }
                                }
                            }) {
                                Text(
                                    if (allSelected) "DESELECT ALL" else "SELECT ALL",
                                    color = if (allSelected) Negative else MintGreen,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                )
                            }
                        }

                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            snapshot.group.members.forEach { uid ->
                                val checked = selected[uid] == true
                                Column(
                                    Modifier
                                        .width(58.dp)
                                        .clickable { selected[uid] = !checked },
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Box {
                                        UserAvatar(snapshot.profiles[uid], 48)
                                        if (checked) {
                                            Box(
                                                Modifier
                                                    .size(18.dp)
                                                    .clip(CircleShape)
                                                    .background(MintGreen)
                                                    .align(Alignment.BottomEnd),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(Icons.Default.Check, null, tint = Color.Black, modifier = Modifier.size(13.dp))
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(5.dp))
                                    Text(
                                        if (uid == state.user?.uid) "You" else snapshot.profiles[uid]?.name?.substringBefore(' ') ?: "Member",
                                        color = if (checked) Color.White else QuietText,
                                        fontSize = 10.sp,
                                        maxLines = 1
                                    )
                                }
                            }
                        }

                        Spacer(Modifier.height(14.dp))

                        val splitModes = listOf(
                            "equal" to "Equal",
                            "percentage" to "% Percent",
                            "exact" to "₹ Exact",
                            "shares" to "Shares",
                            "itemized" to "GST (Itemized)"
                        )

                        Row(
                            Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            splitModes.forEach { (mode, label) ->
                                FilterChip(
                                    selected = splitType == mode,
                                    onClick = {
                                        if (splitType != mode) {
                                            splitType = mode
                                            values.clear()
                                            if (mode == "exact" && participants.isNotEmpty()) {
                                                val perPerson = totalPaise / participants.size
                                                participants.forEach { p -> values[p] = Money.formatDecimal(perPerson) }
                                            } else if (mode == "percentage" && participants.isNotEmpty()) {
                                                val perPerson = 100.0 / participants.size
                                                participants.forEach { p -> values[p] = "%.1f".format(perPerson) }
                                            } else if (mode == "shares") {
                                                participants.forEach { p -> values[p] = "1" }
                                            }
                                        }
                                    },
                                    label = { Text(label, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MintGreen.copy(alpha = 0.2f),
                                        selectedLabelColor = MintGreen,
                                    )
                                )
                            }
                        }

                        if (splitType != "equal") {
                            val helperText = when (splitType) {
                                "exact" -> "Enter each person's exact share"
                                "percentage" -> "Enter each person's percentage share (must total 100%)"
                                "shares" -> "Enter each person's share count (e.g. 1, 2, 3)"
                                "itemized" -> "Enter each person's dish subtotal; GST/charges are distributed proportionally"
                                else -> ""
                            }
                            Text(
                                helperText,
                                color = QuietText,
                                fontSize = 10.sp,
                                lineHeight = 14.sp,
                                modifier = Modifier.padding(top = 6.dp)
                            )
                            participants.forEach { uid ->
                                OutlinedTextField(
                                    value = values[uid].orEmpty(),
                                    onValueChange = { input ->
                                        values[uid] = when (splitType) {
                                            "shares" -> input.filter { ch -> ch.isDigit() }.take(5)
                                            else -> input.filter { ch -> ch.isDigit() || ch == '.' }.take(12)
                                        }
                                    },
                                    label = { Text(snapshot.profiles[uid]?.name ?: "Member") },
                                    prefix = if (splitType in listOf("exact", "itemized")) { { Text("₹") } } else null,
                                    suffix = when (splitType) {
                                        "percentage" -> { { Text("%") } }
                                        "shares" -> { { Text("shares") } }
                                        else -> null
                                    },
                                    keyboardOptions = KeyboardOptions(keyboardType = if (splitType == "shares") KeyboardType.Number else KeyboardType.Decimal),
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp)
                                )
                            }

                            val statusText = when (splitType) {
                                "exact" -> {
                                    val entered = participants.sumOf { Money.toPaise(values[it].orEmpty()) }
                                    "${if (entered == totalPaise) "Balanced" else "Remaining"}: ${Money.format(kotlin.math.abs(totalPaise - entered))}"
                                }
                                "percentage" -> {
                                    val entered = participants.sumOf { values[it]?.toDoubleOrNull() ?: 0.0 }
                                    val balanced = kotlin.math.abs(entered - 100.0) <= 0.0001
                                    "Total: %.2f%% · %s".format(entered, if (balanced) "Balanced" else "Remaining: %.2f%%".format(100.0 - entered))
                                }
                                "shares" -> {
                                    val totalShares = participants.sumOf { values[it]?.toIntOrNull() ?: 1 }
                                    "Total shares: $totalShares"
                                }
                                "itemized" -> {
                                    val entered = participants.sumOf { Money.toPaise(values[it].orEmpty()) }
                                    "Dishes ${Money.format(entered)} · GST / extra ${Money.format(totalPaise - entered)}"
                                }
                                else -> ""
                            }
                            Text(
                                statusText,
                                color = if (preview != null) Positive else Negative,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }

                        if (preview != null) {
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "DISTRIBUTION PREVIEW",
                                color = QuietText,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.5.sp
                            )
                            Spacer(Modifier.height(4.dp))
                            preview.forEach { split ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    UserAvatar(snapshot.profiles[split.user], 24)
                                    Spacer(Modifier.width(10.dp))
                                    Text(
                                        if (split.user == state.user?.uid) "You" else snapshot.profiles[split.user]?.name ?: "Member",
                                        Modifier.weight(1f),
                                        color = MutedText,
                                        fontSize = 13.sp
                                    )
                                    Text(
                                        Money.format(split.amountPaise),
                                        color = Color.White,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }

                    val effectivePaidBy = paidBy.ifBlank { state.user?.uid.orEmpty() }
                    val paidByName = if (effectivePaidBy == state.user?.uid) "You" else snapshot.profiles[effectivePaidBy]?.name ?: "Member"

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(enabled = !LocalActionBusy.current,
                            onClick = { currentStep = 1 },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.15f))
                        ) {
                            Text("Back", color = Color.White)
                        }
                        PrimaryAction(
                            if (editing == null) "Create expense" else "Save changes",
                            onClick = {
                                vm.saveExpense(
                                    groupId,
                                    ExpenseDraft(title, amount, category, notes, participants, splitType, splitValues, date, effectivePaidBy, paidByName, initialVersion = initialVersion),
                                    editing
                                ) {
                                    vm.setBillScan(null)
                                    nav.popBackStack()
                                }
                            },
                            Modifier.weight(2f),
                            enabled = allValid,
                            icon = { Icon(Icons.Default.Send, null, Modifier.size(18.dp)) }
                        )
                    }

                    if (!step2Valid && participants.isEmpty()) {
                        Text("Select at least one participant to split with.", color = Negative, fontSize = 11.sp)
                    } else if (!step2Valid && preview == null) {
                        val requirement = when (splitType) {
                            "exact" -> "Ensure exact split amounts match the total of ${Money.format(totalPaise)}."
                            "percentage" -> "Ensure percentage splits total exactly 100%."
                            "shares" -> "Ensure every participant has at least 1 share."
                            else -> "Ensure all split values are valid."
                        }
                        Text(requirement, color = Negative, fontSize = 11.sp)
                    }
                }

                Spacer(Modifier.height(32.dp))
            }
        }
    }

    if (showDate) {
        val initial = runCatching { Instant.parse(date).toEpochMilli() }.getOrDefault(System.currentTimeMillis())
        val picker = rememberDatePickerState(initialSelectedDateMillis = initial)
        DatePickerDialog(
            onDismissRequest = { showDate = false },
            confirmButton = {
                TextButton(enabled = !LocalActionBusy.current, onClick = {
                    picker.selectedDateMillis?.let { date = Instant.ofEpochMilli(it).toString() }
                    showDate = false
                }) { Text("Done") }
            },
            dismissButton = {
                TextButton(enabled = !LocalActionBusy.current, onClick = { showDate = false }) { Text("Cancel") }
            }
        ) {
            DatePicker(picker)
        }
    }
}

@Composable
fun ExpenseFormSkeleton(padding: PaddingValues) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Spacer(Modifier.height(4.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(CardSurface)
                .border(1.dp, Hairline, RoundedCornerShape(24.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            SkeletonBox(Modifier.size(100.dp, 12.dp).align(Alignment.CenterHorizontally), shape = RoundedCornerShape(4.dp))
            SkeletonBox(Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(8.dp))
            SkeletonBox(Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(4) {
                    SkeletonBox(Modifier.size(70.dp, 32.dp), shape = RoundedCornerShape(8.dp))
                }
            }
        }
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(CardSurface)
                .border(1.dp, Hairline, RoundedCornerShape(24.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SkeletonBox(Modifier.size(120.dp, 14.dp), shape = RoundedCornerShape(4.dp))
            repeat(3) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    SkeletonBox(Modifier.size(36.dp), shape = CircleShape)
                    Spacer(Modifier.width(12.dp))
                    SkeletonBox(Modifier.weight(1f).height(16.dp), shape = RoundedCornerShape(4.dp))
                    Spacer(Modifier.width(12.dp))
                    SkeletonBox(Modifier.size(50.dp, 16.dp), shape = RoundedCornerShape(4.dp))
                }
            }
        }
    }
}
