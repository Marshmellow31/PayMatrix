package com.paymatrix.app.widget

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.paymatrix.app.*
import com.paymatrix.app.ui.*
import com.paymatrix.app.ui.theme.PayMatrixTheme

class WidgetConfigurationActivity : ComponentActivity() {
    private val vm by viewModels<PayMatrixViewModel> { PayMatrixViewModel.Factory((application as PayMatrixApplication).container) }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID || AppWidgetManager.getInstance(this).getAppWidgetInfo(id)?.provider?.className != GroupBalanceWidget::class.java.name) { finish(); return }
        setContent { PayMatrixTheme {
            val state by vm.state.collectAsStateWithLifecycle()
            var selected by rememberSaveable { mutableStateOf(WidgetStore.read(this)?.let { WidgetStore.groupId(this, id, it.uid) }.orEmpty()) }
            LaunchedEffect(state.groups, state.summary, state.user, state.loading) { WidgetStore.capture(this@WidgetConfigurationActivity, state) }
            val groups = state.groups.filter { it.status != "deleted" && state.user?.uid in it.members }
            Surface(color = MaterialTheme.colorScheme.background) {
                LazyColumn(Modifier.fillMaxSize().safeDrawingPadding(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    item { PageTitle("Group widget", "Choose the group you want on your home screen.") }
                    item { AndroidView(modifier = Modifier.fillMaxWidth().height(220.dp), factory = { android.widget.FrameLayout(it) }, update = { host ->
                        host.removeAllViews()
                        val row = groups.firstOrNull { it.id == selected }?.let { WidgetGroup(it.id, it.name, state.summary.groupBalances[it.id]) }
                        host.addView(QuickAccessWidget.render(host.context, true, WidgetStore.read(host.context), row).apply(host.context, host))
                    }) }
                    if (state.loading && groups.isEmpty()) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
                    if (!state.loading && state.user == null) item {
                        Text("Sign in to paymatrix, then add this widget again.", color = MutedText)
                        PrimaryAction("Open paymatrix", { startActivity(Intent(this@WidgetConfigurationActivity, MainActivity::class.java)); finish() })
                    }
                    if (!state.loading && state.user != null && groups.isEmpty()) item { Text("Create or join a group in paymatrix first.", color = MutedText) }
                    items(groups, key = { it.id }) { group ->
                        Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).clickable { selected = group.id }, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            RadioButton(selected == group.id, onClick = { selected = group.id })
                            Text(group.name, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                        }
                    }
                    item { PrimaryAction("Save widget", {
                        val uid = state.user?.uid ?: return@PrimaryAction
                        WidgetStore.configure(this@WidgetConfigurationActivity, id, uid, selected)
                        QuickAccessWidget.update(this@WidgetConfigurationActivity, AppWidgetManager.getInstance(this@WidgetConfigurationActivity), id, true)
                        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)); finish()
                    }, Modifier.fillMaxWidth(), enabled = state.user != null && groups.any { it.id == selected }) }
                    item { SecondaryAction("Cancel", { finish() }, Modifier.fillMaxWidth()) }
                }
            }
        } }
    }
}
