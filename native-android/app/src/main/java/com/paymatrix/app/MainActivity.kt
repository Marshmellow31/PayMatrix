package com.paymatrix.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.paymatrix.app.ui.PayMatrixApp
import com.paymatrix.app.ui.theme.PayMatrixTheme

class MainActivity : ComponentActivity() {
    companion object { val quickDestination = kotlinx.coroutines.flow.MutableStateFlow<String?>(null) }
    private val viewModel by viewModels<PayMatrixViewModel> { PayMatrixViewModel.Factory((application as PayMatrixApplication).container) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        requestFastestDisplayMode()
        handleDeepLink(intent?.data)
        captureDestination(intent)
        setContent { PayMatrixTheme { PayMatrixApp(viewModel, intent?.data) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent.data)
        captureDestination(intent)
    }

    private fun captureDestination(intent: Intent?) {
        if (intent == null) return
        // FCM notification+data messages delivered in the background bypass the
        // messaging service and put their data directly on the launcher intent.
        val widgetId = intent.getIntExtra("widget_id", -1)
        if (widgetId != -1) {
            quickDestination.value = com.paymatrix.app.widget.WidgetStore.destination(this, widgetId, intent.getStringExtra("widget_action").orEmpty())
            listOf("widget_id", "widget_action", "quick_destination").forEach(intent::removeExtra)
            return
        }
        val route = intent.getStringExtra("quick_destination")
        if (route != null || intent.hasExtra("type") || intent.hasExtra("url") || intent.hasExtra("groupId")) {
            quickDestination.value = com.paymatrix.app.data.NotificationDestination.resolve(
                intent.getStringExtra("type").orEmpty(), intent.getStringExtra("groupId").orEmpty(),
                route ?: intent.getStringExtra("url").orEmpty())
            listOf("quick_destination", "type", "url", "groupId").forEach(intent::removeExtra)
        }
    }

    private fun handleDeepLink(data: Uri?) {
        if (data == null) return
        val code = when {
            data.pathSegments.firstOrNull() == "join" -> data.lastPathSegment?.takeIf { it != "join" } ?: data.getQueryParameter("code")
            data.host == "join" -> data.lastPathSegment ?: data.getQueryParameter("code")
            else -> data.getQueryParameter("code")
        }
        if (!code.isNullOrBlank()) {
            viewModel.setPendingInvite(code)
        }
    }

    override fun onResume() { super.onResume(); requestFastestDisplayMode() }

    private fun requestFastestDisplayMode() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) display else @Suppress("DEPRECATION") windowManager.defaultDisplay
        val current = display?.mode ?: return
        val best = display.supportedModes.filter { it.physicalWidth == current.physicalWidth && it.physicalHeight == current.physicalHeight }.maxByOrNull { it.refreshRate } ?: current
        window.attributes = window.attributes.apply {
            preferredDisplayModeId = best.modeId
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
        if (Build.VERSION.SDK_INT >= 35) window.decorView.setRequestedFrameRate(android.view.View.REQUESTED_FRAME_RATE_CATEGORY_HIGH)
    }
}
