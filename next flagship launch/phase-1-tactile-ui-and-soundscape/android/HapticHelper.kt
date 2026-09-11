package com.paymatrix.app.ui.haptics

import android.content.Context
import android.os.Build
import android.os.CombinedVibration
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * HapticHelper
 * Provides rich multi-pulse vibration patterns across Android versions
 */
object HapticHelper {

    fun playClickHaptic(context: Context) {
        vibrateSingle(context, 15, 120)
    }

    fun playCelebrationHaptic(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            val timings = longArrayOf(0, 30, 80, 50)
            val amplitudes = intArrayOf(0, 180, 0, 255)
            val effect = VibrationEffect.createWaveform(timings, amplitudes, -1)
            vibratorManager?.vibrate(CombinedVibration.createParallel(effect))
        } else {
            vibrateSingle(context, 60, 255)
        }
    }

    private fun vibrateSingle(context: Context, durationMs: Long, amplitude: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            vibrator?.vibrate(VibrationEffect.createOneShot(durationMs, amplitude))
        } else {
            @Suppress("DEPRECATION")
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            @Suppress("DEPRECATION")
            vibrator?.vibrate(durationMs)
        }
    }
}
