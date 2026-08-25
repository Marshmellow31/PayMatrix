package com.paymatrix.app

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
        setContent { PayMatrixTheme { PayMatrixApp(viewModel, intent?.data) } }
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
