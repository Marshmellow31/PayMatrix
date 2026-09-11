from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=root/'app/src/main/java/com/paymatrix/app/ui'
p=ui/'PayMatrixApp.kt';s=p.read_text().replace('.padding(start = 20.dp, end = 20.dp, bottom = 12.dp)', '.padding(start = 16.dp, end = 16.dp, bottom = 0.dp)');p.write_text(s)
p=ui/'ExpenseFormScreen.kt';s=p.read_text();start=s.index('            Surface(',s.index('        bottomBar = {'));end=s.index('                Column(', start)
s=s[:start]+'            Box(Modifier.fillMaxWidth()) {\n'+s[end:]
s=s.replace('Enter each person’s item subtotal, before shared charges or discounts. Works for meals, groceries, tickets and more.', 'Item subtotal per person')
s=s.replace('.height(52.dp)', '.heightIn(min = 52.dp)')
p.write_text(s)
p=ui/'LogsProfileScreens.kt';s=p.read_text();start=s.index('        if (state.logGroups.isEmpty()) {');end=s.index('        } else {\n            items(state.logGroups',start)
s=s[:start]+'''        if (state.logGroups.isEmpty()) {
            item {
                Column(Modifier.fillMaxWidth().padding(vertical = 28.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Your spending, in one place", color = Ink, style = MaterialTheme.typography.headlineSmall)
                    Text("Record expenses for yourself or share a log with family. Logs track spending; they don’t split bills.", color = QuietText, style = MaterialTheme.typography.bodyLarge)
                    PrimaryAction("Create your first log", { create = true }, Modifier.fillMaxWidth())
                }
            }
'''+s[end:]
p.write_text(s)
p=root/'app/src/androidTest/java/com/paymatrix/app/ui/ExperienceScreensTest.kt';s=p.read_text().replace('compose.onNodeWithText("Your bill, explained").assertExists()', 'compose.onNodeWithText("How it works").assertExists()')
s=s.replace('                if (route == "expense") {', '''                if (route == "items") {
                    compose.onNodeWithText("A simple example").assertDoesNotExist()
                    compose.onNodeWithText("How it works").performClick()
                    compose.onNodeWithText("A simple example").assertExists()
                    compose.onNodeWithText("Got it").performScrollTo().performClick()
                    compose.onNodeWithText("A simple example").assertDoesNotExist()
                }
                if (route == "expense") {''')
p.write_text(s)
p=ui/'ItemSplitExplanation.kt'
s=p.read_text(); s=s.replace('import androidx.compose.foundation.layout.*','import androidx.compose.foundation.layout.*\nimport androidx.compose.foundation.rememberScrollState\nimport androidx.compose.foundation.verticalScroll')
start=s.index('@Composable')
s=s[:start]+'''@OptIn(ExperimentalMaterial3Api::class)
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
'''
p.write_text(s)
