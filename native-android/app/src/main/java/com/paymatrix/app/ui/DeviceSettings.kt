package com.paymatrix.app.ui

import android.Manifest
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.paymatrix.app.data.DevicePreferences
import com.paymatrix.app.data.LocalReviewWorker
import com.paymatrix.app.widget.QuickAccessWidget

@Composable
fun DeviceSettings() {
    val context = LocalContext.current
    val mode by DevicePreferences.appearance.collectAsState()
    ObsidianCard {
        Text("Appearance", style = MaterialTheme.typography.titleMedium, color = Ink)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("system" to "System", "light" to "Light", "dark" to "Dark").forEach { (value, label) ->
                FilterChip(selected = mode == value, onClick = { DevicePreferences.setAppearance(context, value) }, label = { Text(label) })
            }
        }
    }
}

@Composable
fun DeviceExtrasDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
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
        setReminders(allowed)
        permissionDenied = !allowed
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Device features") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Reminders", color = Ink, style = MaterialTheme.typography.titleMedium)
                        Text("Occasional reviews on this device", color = QuietText, style = MaterialTheme.typography.bodySmall)
                    }
                    Switch(checked = reminders, onCheckedChange = { enabled ->
                        if (enabled && Build.VERSION.SDK_INT >= 33) permission.launch(Manifest.permission.POST_NOTIFICATIONS) else setReminders(enabled)
                    })
                }
                if (permissionDenied) Text("Allow notifications in Android Settings to use reminders.", color = Negative, style = MaterialTheme.typography.bodySmall)
                HorizontalDivider(color = Hairline)
                Text("Home screen widgets", color = Ink, style = MaterialTheme.typography.titleMedium)
                OutlinedButton(onClick = {
                    val manager = AppWidgetManager.getInstance(context)
                    if (Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported) manager.requestPinAppWidget(ComponentName(context, QuickAccessWidget::class.java), null, null)
                    else widgetHelp = true
                }) { Text("Add summary widget") }
                TextButton(onClick = { widgetHelp = !widgetHelp }) { Text("How to add a group widget") }
                if (widgetHelp) Text("Long-press the home screen, open Widgets, then choose paymatrix Group balance.", color = QuietText, style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done") } },
        containerColor = ModalSurface,
    )
}
