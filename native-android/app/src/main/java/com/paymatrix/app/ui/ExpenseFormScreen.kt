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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyHorizontalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.data.ExpenseDraft
import com.paymatrix.app.data.ExpensePayer
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

    // Multi-Payer State for Step 2
    val selectedPayers = remember(expenseId) {
        mutableStateMapOf<String, Boolean>().apply {
            if (editing != null && editing.payers.isNotEmpty()) {
                editing.payers.forEach { put(it.user, true) }
            } else if (editing != null && editing.paidBy.isNotBlank()) {
                put(editing.paidBy, true)
            } else {
                put(state.user?.uid.orEmpty(), true)
            }
        }
    }
    var payerDivisionMode by rememberSaveable(expenseId) {
        mutableStateOf(
            if (editing != null && editing.payers.size > 1) {
                if (editing.payers.any { it.percent != null }) "percentage"
                else {
                    val firstAmt = editing.payers.first().amountPaise
                    if (editing.payers.all { it.amountPaise == firstAmt }) "equal" else "exact"
                }
            } else "equal"
        )
    }
    val payerValues = remember(expenseId) {
        mutableStateMapOf<String, String>().apply {
            if (editing != null && editing.payers.isNotEmpty()) {
                editing.payers.forEach { payer ->
                    if (payer.percent != null) {
                        put(payer.user, "%.2f".format(payer.percent))
                    } else {
                        put(payer.user, Money.formatDecimal(payer.amountPaise))
                    }
                }
            }
        }
    }

    // Split Participants State for Step 3
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

    val allMembers = snapshot?.group?.members.orEmpty()

    LaunchedEffect(allMembers) {
        allMembers.forEach { uid ->
            if (!selected.containsKey(uid)) {
                selected[uid] = editing?.participants?.contains(uid) ?: true
            }
        }
        if (selectedPayers.values.none { it }) {
            val defaultPayer = editing?.paidBy?.ifBlank { state.user?.uid.orEmpty() } ?: state.user?.uid.orEmpty()
            if (defaultPayer.isNotBlank()) selectedPayers[defaultPayer] = true
        }
    }

    var showDate by remember { mutableStateOf(false) }

    val totalPaise = runCatching { Money.toPaise(amount) }.getOrDefault(0L)

    // Compute Active Payers
    val activePayers = remember(selectedPayers.toMap(), allMembers) {
        allMembers.filter { selectedPayers[it] == true }
    }

    val currentPayersList: List<ExpensePayer> = remember(activePayers, payerDivisionMode, payerValues.toMap(), totalPaise) {
        when {
            activePayers.isEmpty() -> emptyList()
            activePayers.size == 1 -> listOf(ExpensePayer(activePayers.first(), totalPaise, 100.0))
            payerDivisionMode == "equal" -> {
                if (totalPaise > 0) {
                    val allocs = Money.allocate(totalPaise, activePayers.map { it to 1.0 })
                    allocs.map { (uid, amt) -> ExpensePayer(uid, amt, 100.0 / activePayers.size) }
                } else {
                    activePayers.map { ExpensePayer(it, 0L, 100.0 / activePayers.size) }
                }
            }
            payerDivisionMode == "exact" -> {
                activePayers.map { uid ->
                    val amt = Money.toPaiseOrNull(payerValues[uid].orEmpty()) ?: 0L
                    ExpensePayer(uid, amt)
                }
            }
            payerDivisionMode == "percentage" -> {
                val pctMap = activePayers.associateWith { uid -> payerValues[uid]?.toDoubleOrNull() ?: 0.0 }
                val totalPct = pctMap.values.sum()
                val balancedPct = kotlin.math.abs(totalPct - 100.0) <= 0.0001
                if (balancedPct && totalPaise > 0) {
                    val allocs = Money.allocate(totalPaise, activePayers.map { it to (pctMap[it] ?: 0.0) })
                    allocs.map { (uid, amt) -> ExpensePayer(uid, amt, pctMap[uid]) }
                } else {
                    activePayers.map { uid -> ExpensePayer(uid, 0L, pctMap[uid]) }
                }
            }
            else -> emptyList()
        }
    }

    val payerPaidSum = remember(currentPayersList) { currentPayersList.sumOf { it.amountPaise } }
    val isPayersBalanced = remember(totalPaise, payerPaidSum, payerDivisionMode, payerValues.toMap(), activePayers) {
        if (totalPaise <= 0 || activePayers.isEmpty()) false
        else if (activePayers.size == 1) true
        else if (payerDivisionMode == "percentage") {
            val totalPct = activePayers.sumOf { payerValues[it]?.toDoubleOrNull() ?: 0.0 }
            kotlin.math.abs(totalPct - 100.0) <= 0.0001 && payerPaidSum == totalPaise
        } else {
            payerPaidSum == totalPaise
        }
    }

    val effectivePaidBy = activePayers.firstOrNull().orEmpty()
    val effectivePaidByName = if (activePayers.size <= 1) {
        if (effectivePaidBy == state.user?.uid) "You" else snapshot?.profiles?.get(effectivePaidBy)?.name ?: "Member"
    } else {
        "${activePayers.size} members"
    }

    // Split Participants (Step 3)
    val participants = remember(selected.toMap(), allMembers) {
        allMembers.filter { selected[it] == true }
    }
    val splitValues = participants.associateWith { uid ->
        when (splitType) {
            "equal" -> 1.0
            "percentage" -> values[uid]?.toDoubleOrNull() ?: 0.0
            "shares" -> (values[uid]?.toDoubleOrNull() ?: 1.0).coerceAtLeast(1.0)
            "itemized", "exact" -> (values[uid]?.toDoubleOrNull() ?: 0.0)
            else -> 1.0
        }
    }
    val preview = runCatching { BalanceEngine.calculateSplits(totalPaise, splitType, splitValues, participants) }.getOrNull()

    val step1Valid = title.isNotBlank() && totalPaise > 0
    val step2Valid = totalPaise > 0 && activePayers.isNotEmpty() && isPayersBalanced
    val step3Valid = participants.isNotEmpty() && preview != null
    val allValid = step1Valid && step2Valid && step3Valid

    BackHandler {
        when (currentStep) {
            3 -> currentStep = 2
            2 -> currentStep = 1
            else -> nav.popBackStack()
        }
    }

    Scaffold(
        containerColor = CanvasBlack,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(ObsidianSurface)
                    .statusBarsPadding()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .padding(horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        enabled = !LocalActionBusy.current,
                        onClick = {
                            when (currentStep) {
                                3 -> currentStep = 2
                                2 -> currentStep = 1
                                else -> nav.popBackStack()
                            }
                        }
                    ) {
                        Icon(
                            if (currentStep == 1) Icons.Default.Close else Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                    Column(modifier = Modifier.weight(1f).padding(start = 4.dp)) {
                        Text(
                            if (editing == null) "Record Transaction" else "Edit Transaction",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = Color.White
                        )
                        Text(
                            when (currentStep) {
                                1 -> "STEP 1 OF 3 · ESSENTIALS"
                                2 -> "STEP 2 OF 3 · WHO PAID?"
                                else -> "STEP 3 OF 3 · SPLIT WITH"
                            },
                            color = MintGreen,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.4.sp
                        )
                    }
                }
                // 3 Step Indicator Pills
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(3.dp)
                            .clip(RoundedCornerShape(1.5.dp))
                            .background(if (currentStep >= 1) MintGreen else Color.White.copy(alpha = 0.15f))
                    )
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(3.dp)
                            .clip(RoundedCornerShape(1.5.dp))
                            .background(if (currentStep >= 2) MintGreen else Color.White.copy(alpha = 0.15f))
                    )
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(3.dp)
                            .clip(RoundedCornerShape(1.5.dp))
                            .background(if (currentStep >= 3) MintGreen else Color.White.copy(alpha = 0.15f))
                    )
                }
                Spacer(Modifier.height(4.dp))
            }
        },
        bottomBar = {
            Surface(
                color = ObsidianSurface,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(BorderStroke(1.dp, Hairline)),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    when (currentStep) {
                        1 -> {
                            PrimaryAction(
                                label = "Next: Who Paid",
                                onClick = { if (step1Valid) currentStep = 2 },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                enabled = step1Valid,
                                icon = { Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp)) }
                            )
                            if (!step1Valid && (amount.isNotBlank() || title.isNotBlank())) {
                                Text(
                                    "Enter a valid amount and title to proceed.",
                                    color = Negative,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 4.dp)
                                )
                            }
                        }
                        2 -> {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                OutlinedButton(
                                    enabled = !LocalActionBusy.current,
                                    onClick = { currentStep = 1 },
                                    modifier = Modifier.weight(1f).height(52.dp),
                                    shape = RoundedCornerShape(19.dp),
                                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
                                ) {
                                    Text("Back", color = Color.White, fontWeight = FontWeight.SemiBold)
                                }
                                PrimaryAction(
                                    label = "Next: Split Details",
                                    onClick = { if (step2Valid) currentStep = 3 },
                                    modifier = Modifier.weight(2f).height(52.dp),
                                    enabled = step2Valid,
                                    icon = { Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp)) }
                                )
                            }
                            if (!step2Valid) {
                                val reason = if (activePayers.isEmpty()) {
                                    "Select at least one payer."
                                } else if (payerDivisionMode == "percentage") {
                                    "Payer percentages must total exactly 100%."
                                } else {
                                    "Who paid amount must match total of ${Money.format(totalPaise)}."
                                }
                                Text(
                                    reason,
                                    color = Negative,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 4.dp)
                                )
                            }
                        }
                        3 -> {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                OutlinedButton(
                                    enabled = !LocalActionBusy.current,
                                    onClick = { currentStep = 2 },
                                    modifier = Modifier.weight(1f).height(52.dp),
                                    shape = RoundedCornerShape(19.dp),
                                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
                                ) {
                                    Text("Back", color = Color.White, fontWeight = FontWeight.SemiBold)
                                }
                                PrimaryAction(
                                    label = if (editing == null) "Create expense" else "Save changes",
                                    onClick = {
                                        vm.saveExpense(
                                            groupId,
                                            ExpenseDraft(
                                                title = title,
                                                amount = amount,
                                                category = category,
                                                notes = notes,
                                                participants = participants,
                                                splitType = splitType,
                                                splitValues = splitValues,
                                                date = date,
                                                paidBy = effectivePaidBy,
                                                paidByName = effectivePaidByName,
                                                payers = currentPayersList,
                                                initialVersion = initialVersion
                                            ),
                                            editing
                                        ) {
                                            vm.setBillScan(null)
                                            nav.popBackStack()
                                        }
                                    },
                                    modifier = Modifier.weight(2f).height(52.dp),
                                    enabled = allValid,
                                    icon = { Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp)) }
                                )
                            }
                            if (!step3Valid && participants.isEmpty()) {
                                Text("Select at least one participant to split with.", color = Negative, fontSize = 11.sp)
                            } else if (!step3Valid && preview == null) {
                                val requirement = when (splitType) {
                                    "exact" -> "Ensure exact split amounts match total of ${Money.format(totalPaise)}."
                                    "percentage" -> "Ensure percentage splits total exactly 100%."
                                    "shares" -> "Ensure every participant has at least 1 share."
                                    else -> "Ensure all split values are valid."
                                }
                                Text(requirement, color = Negative, fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
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

                when (currentStep) {
                    1 -> {
                        // ─── STEP 1: ESSENTIALS & CATEGORY ───────────────────────────
                        ObsidianCard(contentPadding = PaddingValues(20.dp)) {
                            // Boxed Total Amount Card
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Color(0xFF141414))
                                    .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(16.dp))
                                    .padding(horizontal = 18.dp, vertical = 14.dp)
                            ) {
                                Column {
                                    Text(
                                        "TOTAL AMOUNT",
                                        color = QuietText,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 2.sp
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            "₹",
                                            color = MintGreen,
                                            fontSize = 32.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(end = 8.dp)
                                        )
                                        BasicTextField(
                                            value = amount,
                                            onValueChange = { amount = it.filter { ch -> ch.isDigit() || ch == '.' }.take(12) },
                                            textStyle = TextStyle(
                                                color = Color.White,
                                                fontSize = 32.sp,
                                                fontWeight = FontWeight.Bold
                                            ),
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                            singleLine = true,
                                            cursorBrush = SolidColor(MintGreen),
                                            modifier = Modifier.fillMaxWidth(),
                                            decorationBox = { innerTextField ->
                                                if (amount.isEmpty()) {
                                                    Text(
                                                        "0.00",
                                                        color = Color.White.copy(alpha = 0.25f),
                                                        fontSize = 32.sp,
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                }
                                                innerTextField()
                                            }
                                        )
                                    }
                                }
                            }

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
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                expenseCategories.forEach { value ->
                                    val isSelected = category == value
                                    val catColor = categoryColor(value)
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier
                                            .clickable { category = value }
                                            .padding(vertical = 4.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(52.dp)
                                                .clip(CircleShape)
                                                .background(if (isSelected) catColor.copy(alpha = 0.25f) else catColor.copy(alpha = 0.08f))
                                                .border(
                                                    BorderStroke(
                                                        if (isSelected) 2.dp else 1.dp,
                                                        if (isSelected) catColor else Color.White.copy(alpha = 0.08f)
                                                    ),
                                                    CircleShape
                                                ),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                categoryIcon(value),
                                                contentDescription = value,
                                                tint = if (isSelected) catColor else catColor.copy(alpha = 0.7f),
                                                modifier = Modifier.size(24.dp)
                                            )
                                        }
                                        Spacer(Modifier.height(6.dp))
                                        Text(
                                            value,
                                            color = if (isSelected) Color.White else MutedText,
                                            fontSize = 11.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            textAlign = TextAlign.Center
                                        )
                                    }
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
                    }
                    2 -> {
                        // ─── STEP 2: WHO PAID? (MULTI-PAYER ENGINE) ───────────────────
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

                        ObsidianCard(contentPadding = PaddingValues(18.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Who paid?", Modifier.weight(1f), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Text(
                                    "${activePayers.size} selected",
                                    color = MutedText,
                                    fontSize = 12.sp
                                )
                            }
                            Text(
                                "Select the person or people who paid for this expense.",
                                color = QuietText,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )

                            // 3-Row Horizontally Swipeable Avatar Grid for Payers
                            LazyHorizontalGrid(
                                rows = GridCells.Fixed(3),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(255.dp),
                                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                items(snapshot.group.members) { uid ->
                                    val isChecked = selectedPayers[uid] == true
                                    Column(
                                        modifier = Modifier
                                            .width(64.dp)
                                            .clickable {
                                                val currentVal = selectedPayers[uid] == true
                                                selectedPayers[uid] = !currentVal
                                                if (!currentVal && payerDivisionMode == "exact") {
                                                    // Seed default
                                                    payerValues[uid] = "0.00"
                                                }
                                            },
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            UserAvatar(snapshot.profiles[uid], 48)
                                            if (isChecked) {
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
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            if (uid == state.user?.uid) "You" else snapshot.profiles[uid]?.name?.substringBefore(' ') ?: "Member",
                                            color = if (isChecked) Color.White else QuietText,
                                            fontSize = 11.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }

                            // People who are selected shown below who paid how much
                            if (activePayers.isNotEmpty()) {
                                Spacer(Modifier.height(14.dp))
                                HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
                                Spacer(Modifier.height(10.dp))

                                if (activePayers.size >= 2) {
                                    Text(
                                        "PAID SPLIT METHOD",
                                        color = QuietText,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 1.5.sp
                                    )
                                    Spacer(Modifier.height(6.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        val payerModes = listOf(
                                            "equal" to "Equally",
                                            "exact" to "Unequally (₹)",
                                            "percentage" to "Unequally (%)"
                                        )
                                        payerModes.forEach { (mode, label) ->
                                            FilterChip(
                                                selected = payerDivisionMode == mode,
                                                onClick = {
                                                    if (payerDivisionMode != mode) {
                                                        payerDivisionMode = mode
                                                        payerValues.clear()
                                                        if (mode == "exact") {
                                                            val equalAllocs = Money.allocate(totalPaise, activePayers.map { it to 1.0 })
                                                            equalAllocs.forEach { (uid, amt) ->
                                                                payerValues[uid] = Money.formatDecimal(amt)
                                                            }
                                                        } else if (mode == "percentage") {
                                                            val equalPct = 100.0 / activePayers.size
                                                            activePayers.forEach { uid ->
                                                                payerValues[uid] = "%.1f".format(equalPct)
                                                            }
                                                        }
                                                    }
                                                },
                                                label = { Text(label, fontSize = 11.sp) },
                                                colors = FilterChipDefaults.filterChipColors(
                                                    selectedContainerColor = MintGreen.copy(alpha = 0.2f),
                                                    selectedLabelColor = MintGreen
                                                )
                                            )
                                        }
                                    }
                                    Spacer(Modifier.height(10.dp))
                                }

                                Text(
                                    "SELECTED PAYERS",
                                    color = QuietText,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.5.sp
                                )
                                Spacer(Modifier.height(6.dp))

                                activePayers.forEach { uid ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        UserAvatar(snapshot.profiles[uid], 32)
                                        Spacer(Modifier.width(10.dp))
                                        Text(
                                            if (uid == state.user?.uid) "You" else snapshot.profiles[uid]?.name ?: "Member",
                                            modifier = Modifier.weight(1f),
                                            color = Color.White,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                        if (activePayers.size == 1 || payerDivisionMode == "equal") {
                                            val payerAmt = currentPayersList.firstOrNull { it.user == uid }?.amountPaise ?: 0L
                                            Text(
                                                Money.format(payerAmt),
                                                color = MintGreen,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp
                                            )
                                        } else if (payerDivisionMode == "exact") {
                                            OutlinedTextField(
                                                value = payerValues[uid].orEmpty(),
                                                onValueChange = { input ->
                                                    payerValues[uid] = input.filter { ch -> ch.isDigit() || ch == '.' }.take(10)
                                                },
                                                prefix = { Text("₹", fontSize = 12.sp, color = MutedText) },
                                                textStyle = TextStyle(fontSize = 13.sp, color = Color.White, textAlign = TextAlign.End),
                                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                                singleLine = true,
                                                modifier = Modifier.width(115.dp).height(48.dp),
                                                shape = RoundedCornerShape(10.dp)
                                            )
                                        } else if (payerDivisionMode == "percentage") {
                                            OutlinedTextField(
                                                value = payerValues[uid].orEmpty(),
                                                onValueChange = { input ->
                                                    payerValues[uid] = input.filter { ch -> ch.isDigit() || ch == '.' }.take(6)
                                                },
                                                suffix = { Text("%", fontSize = 12.sp, color = MutedText) },
                                                textStyle = TextStyle(fontSize = 13.sp, color = Color.White, textAlign = TextAlign.End),
                                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                                singleLine = true,
                                                modifier = Modifier.width(95.dp).height(48.dp),
                                                shape = RoundedCornerShape(10.dp)
                                            )
                                        }
                                    }
                                }

                                Spacer(Modifier.height(8.dp))

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isPayersBalanced) MintGreen.copy(alpha = 0.12f) else Negative.copy(alpha = 0.12f))
                                        .padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        if (isPayersBalanced) Icons.Default.CheckCircle else Icons.Default.Info,
                                        contentDescription = null,
                                        tint = if (isPayersBalanced) MintGreen else Negative,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    val statusMsg = if (isPayersBalanced) {
                                        "Balanced · Total paid: ${Money.format(payerPaidSum)}"
                                    } else if (payerDivisionMode == "percentage") {
                                        val totalPct = activePayers.sumOf { payerValues[it]?.toDoubleOrNull() ?: 0.0 }
                                        "Total: %.2f%% · %s".format(totalPct, if (totalPct < 100.0) "Remaining: %.2f%%".format(100.0 - totalPct) else "Over by: %.2f%%".format(totalPct - 100.0))
                                    } else if (payerPaidSum < totalPaise) {
                                        "Remaining: ${Money.format(totalPaise - payerPaidSum)}"
                                    } else {
                                        "Over by: ${Money.format(payerPaidSum - totalPaise)}"
                                    }
                                    Text(
                                        statusMsg,
                                        color = if (isPayersBalanced) MintGreen else Negative,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    }
                    3 -> {
                        // ─── STEP 3: SPLIT WITH & DISTRIBUTION PREVIEW ───────────────
                        ObsidianCard(contentPadding = PaddingValues(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp, maxLines = 1)
                                    Text(
                                        "${category} · ${Money.format(totalPaise)} · Paid by ${effectivePaidByName}",
                                        color = MintGreen,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 12.sp
                                    )
                                }
                                TextButton(enabled = !LocalActionBusy.current, onClick = { currentStep = 2 }) {
                                    Icon(Icons.Default.Edit, "Edit", tint = MutedText, modifier = Modifier.size(14.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Edit", color = MutedText, fontSize = 12.sp)
                                }
                            }
                        }

                        ObsidianCard(contentPadding = PaddingValues(18.dp)) {
                            val allSelected = snapshot.group.members.all { selected[it] == true }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Split with", Modifier.weight(1f), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
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

                            // 3-Row Horizontally Swipeable Avatar Grid for Split
                            LazyHorizontalGrid(
                                rows = GridCells.Fixed(3),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(255.dp),
                                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                items(snapshot.group.members) { uid ->
                                    val checked = selected[uid] == true
                                    Column(
                                        Modifier
                                            .width(64.dp)
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
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            if (uid == state.user?.uid) "You" else snapshot.profiles[uid]?.name?.substringBefore(' ') ?: "Member",
                                            color = if (checked) Color.White else QuietText,
                                            fontSize = 11.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            textAlign = TextAlign.Center
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
                                        val entered = participants.sumOf { Money.toPaiseOrNull(values[it].orEmpty()) ?: 0L }
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
                                        val entered = participants.sumOf { Money.toPaiseOrNull(values[it].orEmpty()) ?: 0L }
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
                    }
                }

                Spacer(Modifier.height(24.dp))
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
