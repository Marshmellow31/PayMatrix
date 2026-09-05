package com.paymatrix.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.paymatrix.app.ui.PayMatrixApp
import com.paymatrix.app.ui.theme.PayMatrixTheme

class MainActivity : ComponentActivity() {
    private val viewModel by viewModels<PayMatrixViewModel> { PayMatrixViewModel.Factory((application as PayMatrixApplication).container) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestFastestDisplayMode()
        handleDeepLink(intent?.data)
        setContent { PayMatrixTheme { PayMatrixApp(viewModel, intent?.data) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent.data)
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
        val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) display else windowManager.defaultDisplay
        val current = display?.mode ?: return
        val best = display.supportedModes.filter { it.physicalWidth == current.physicalWidth && it.physicalHeight == current.physicalHeight }.maxByOrNull { it.refreshRate } ?: current
        window.attributes = window.attributes.apply { preferredDisplayModeId = best.modeId }
        if (Build.VERSION.SDK_INT >= 35) window.decorView.setRequestedFrameRate(android.view.View.REQUESTED_FRAME_RATE_CATEGORY_HIGH)
    }
}
