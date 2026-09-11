from pathlib import Path
root=Path(__file__).resolve().parents[1]
src=root/'app/src/main/java/com/paymatrix/app'
p=src/'PayMatrixApplication.kt';s=p.read_text().replace('super.onCreate()', 'super.onCreate()\n        com.paymatrix.app.data.DevicePreferences.initialize(this)\n        com.paymatrix.app.data.LocalReviewWorker.schedule(this)');p.write_text(s)
p=root/'app/src/main/AndroidManifest.xml';s=p.read_text().replace('        <service', '''        <receiver android:name=".widget.QuickAccessWidget" android:exported="false" android:label="paymatrix quick access">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/quick_access_widget" />
        </receiver>
        <receiver android:name=".data.ReminderActionReceiver" android:exported="false" />
        <service''',1);p.write_text(s)
p=src/'ui/LogsProfileScreens.kt';s=p.read_text().replace('        // System Settings', '        item { DeviceSettings() }\n\n        // System Settings');p.write_text(s)
p=src/'ui/PayMatrixApp.kt';s=p.read_text();needle='    CompositionLocalProvider(LocalActionBusy provides state.loading)'
s=s.replace(needle,'''    val deviceContext = LocalContext.current
    LaunchedEffect(state.user?.uid, state.syncStatus.pendingWrites) {
        if (!state.loading) com.paymatrix.app.data.DevicePreferences.recordSession(deviceContext, state.user?.uid, state.syncStatus.pendingWrites)
    }
    val quickDestination by com.paymatrix.app.MainActivity.quickDestination.collectAsState()
    LaunchedEffect(quickDestination, state.user) {
        val destination = quickDestination
        if (state.user != null && destination in listOf("dashboard", "groups")) {
            nav.navigate(destination!!) { launchSingleTop = true }
            com.paymatrix.app.MainActivity.quickDestination.value = null
        }
    }
'''+needle);p.write_text(s)
p=src/'MainActivity.kt';s=p.read_text().replace('class MainActivity : ComponentActivity() {','class MainActivity : ComponentActivity() {\n    companion object { val quickDestination = kotlinx.coroutines.flow.MutableStateFlow<String?>(null) }')
s=s.replace('handleDeepLink(intent?.data)', 'handleDeepLink(intent?.data)\n        quickDestination.value = intent?.getStringExtra("quick_destination")')
s=s.replace('handleDeepLink(intent.data)', 'handleDeepLink(intent.data)\n        quickDestination.value = intent.getStringExtra("quick_destination")');p.write_text(s)
p=src/'domain/BalanceEngine.kt';s=p.read_text().replace('val weights = if (dishValues.values.sum() <= 0) participants.map { it to 1.0 }\n                else participants.map { it to (dishValues[it] ?: 0).toDouble() }','''require(dishValues.values.all { it >= 0 }) { "Item subtotals cannot be negative." }
                require(dishValues.values.sum() > 0) { "Enter item subtotals before splitting charges." }
                require(totalPaise > 0) { "Bill total must be positive." }
                val weights = participants.map { it to (dishValues[it] ?: 0).toDouble() }''');p.write_text(s)
p=src/'ui/ExpenseFormScreen.kt';s=p.read_text().replace('GST (Itemized)','Items & charges').replace("Enter each person's dish subtotal; GST/charges are distributed proportionally", "Enter each person’s item subtotal, before shared charges or discounts. Works for meals, groceries, tickets and more.")
s=s.replace('"Dishes ${Money.format(entered)} · GST / extra ${Money.format(totalPaise - entered)}"', '"Items ${Money.format(entered)} · ${if (totalPaise >= entered) \\"Shared charges\\" else \\"Discount\\"} ${Money.format(kotlin.math.abs(totalPaise - entered))}"'.replace('\\"','"'))
needle='                            if (splitType != "equal") {'
s=s.replace(needle,'''                            if (splitType == "itemized") {
                                ItemSplitExplanation(totalPaise, participants.associateWith { Money.toPaiseOrNull(values[it].orEmpty()) ?: 0L }, snapshot.profiles)
                            }
'''+needle)
p.write_text(s)
