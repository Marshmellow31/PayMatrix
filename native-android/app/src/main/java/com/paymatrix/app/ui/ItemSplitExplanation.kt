package com.paymatrix.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.paymatrix.app.data.UserProfile
import com.paymatrix.app.domain.Money

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ItemSplitExplanation(total: Long, subtotals: Map<String, Long>, profiles: Map<String, UserProfile>) {
    var showHelp by remember { mutableStateOf(false) }
    TextButton(onClick = { showHelp = true }) { Text("How it works") }
    if (showHelp) {
        ModalBottomSheet(onDismissRequest = { showHelp = false }, containerColor = CardSurface,
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Items & charges", style = MaterialTheme.typography.headlineSmall, color = Ink)
                Text("Enter the final receipt total, then each person’s item subtotal. Shared charges and discounts follow the same proportions.", color = Ink)
                Text("A simple example", style = MaterialTheme.typography.titleMedium, color = Ink)
                Text("Asha’s items cost ₹600 and Dev’s cost ₹400. The receipt adds ₹50 in charges, making the final bill ₹1,050.", color = QuietText)
                Text("Asha: ₹600 + ₹30 = ₹630 · Dev: ₹400 + ₹20 = ₹420", color = Ink, style = MaterialTheme.typography.bodyLarge)
                Text("Asha bought 60% of the items, so she pays 60% of the shared charges. A discount is divided in the same way.", color = QuietText)
                HorizontalDivider(color = Hairline)
                Text("Use the total on the receipt. If GST is already included, don’t add it again. For different item tax rates or a charge for only one person, use Exact shares.", color = QuietText)
                if (subtotals.values.sum() > 0 && total > 0) {
                    Text("Your current bill", style = MaterialTheme.typography.titleMedium, color = Ink)
                    Money.allocate(total, subtotals.map { it.key to it.value.toDouble() }).forEach { (uid, share) ->
                        val items = subtotals[uid] ?: 0L
                        val difference = share - items
                        Text("${profiles[uid]?.name ?: "Member"}: ${Money.format(items)} ${if (difference >= 0) "+" else "−"} ${Money.format(kotlin.math.abs(difference))} = ${Money.format(share)}", color = Ink)
                    }
                }
                Button(onClick = { showHelp = false }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Got it") }
            }
        }
    }
}
