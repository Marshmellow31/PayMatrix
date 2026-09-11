package com.paymatrix.app.ui

import android.Manifest
import android.os.Build
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.paymatrix.app.data.DevicePreferences
import com.paymatrix.app.data.LocalReviewWorker
import com.paymatrix.app.widget.QuickAccessWidget

@Composable
fun DeviceSettings(onOpenDeveloper: (() -> Unit)? = null) {
    val context = LocalContext.current
    val mode by DevicePreferences.appearance.collectAsState()
    val prefs = remember { DevicePreferences.prefs(context) }
    var reminders by remember { mutableStateOf(prefs.getBoolean("reminders", false)) }
    var permissionDenied by remember { mutableStateOf(false) }
    var widgetHelp by remember { mutableStateOf(false) }
    fun setReminders(value: Boolean) {
        reminders = value
        prefs.edit().putBoolean("reminders", value).apply()
        LocalReviewWorker.schedule(context)
    }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        setReminders(allowed); permissionDenied = !allowed
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionTitle("Make it yours")
        Text("Appearance", style = MaterialTheme.typography.titleMedium, color = Ink)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("system" to "System", "light" to "Light", "dark" to "Dark").forEach { (value, label) ->
                FilterChip(selected = mode == value, onClick = { DevicePreferences.setAppearance(context, value) }, label = { Text(label) })
            }
        }
        HorizontalDivider(color = Hairline)
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Quiet local reminders", color = Ink, style = MaterialTheme.typography.titleMedium)
                Text("A weekly review after time away, or a check on changes waiting to sync. Only on this device, 9am–8pm.", color = QuietText, style = MaterialTheme.typography.bodyMedium)
            }
            Switch(checked = reminders, onCheckedChange = { enabled ->
                if (enabled && Build.VERSION.SDK_INT >= 33) permission.launch(Manifest.permission.POST_NOTIFICATIONS) else setReminders(enabled)
            })
        }
        if (permissionDenied) Text("Notifications are off. You can allow them in Android Settings → Apps → paymatrix → Notifications.", color = Negative)
        Text("Android may delay reminders to save battery. No cloud connection is needed; opening the app refreshes what needs attention.", color = QuietText, style = MaterialTheme.typography.bodySmall)
        HorizontalDivider(color = Hairline)
        Text("Home screen widget", style = MaterialTheme.typography.titleMedium, color = Ink)
        Text("See your saved overall balance, or choose a group with shortcuts to add an expense and scan a bill. Balances are visible on your home screen.", color = QuietText)
        OutlinedButton(onClick = {
            val manager = AppWidgetManager.getInstance(context)
            if (Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported) manager.requestPinAppWidget(ComponentName(context, QuickAccessWidget::class.java), null, null)
            else widgetHelp = true
        }) { Text("Add summary widget") }
        TextButton(onClick = { widgetHelp = !widgetHelp }) { Text("Add a group widget") }
        if (widgetHelp) Text("Long-press your home screen → Widgets → paymatrix. Drag Group balance onto your home screen, choose a group, then tap Save. You can also choose Overall summary here.", color = Ink)
        if (onOpenDeveloper != null) {
            HorizontalDivider(color = Hairline)
            Text("Developer tools", style = MaterialTheme.typography.titleMedium, color = Ink)
            Text("Local query latency, listener tracking, and cache instrumentation.", color = QuietText, style = MaterialTheme.typography.bodySmall)
            OutlinedButton(onClick = onOpenDeveloper) { Text("Firebase instrumentation") }
        }
    }
}
