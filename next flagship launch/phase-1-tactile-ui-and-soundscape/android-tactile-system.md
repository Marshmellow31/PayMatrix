# Phase 1: Native Android Tactile, SoundPool & Haptics Implementation

> **Platform:** Kotlin + Jetpack Compose (Android API 24–36+)  
> **Key Technologies:** `androidx.compose.animation`, `android.media.SoundPool`, `android.os.VibratorManager`, `androidx.compose.ui.hapticfeedback`

---

## 1. Chunky 3D Button in Jetpack Compose

In Jetpack Compose, the 3D push-down button is implemented via custom stateful elevation and spring-animated vertical offset (`offset(y = offsetY)`).

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/ui/components/ChunkyButton.kt
package com.paymatrix.app.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paymatrix.app.ui.sound.SoundManager

@Composable
fun ChunkyButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    backgroundColor: Color = Color(0xFF10B981), // Emerald 500
    shadowColor: Color = Color(0xFF047857),     // Emerald 700
    textColor: Color = Color.White,
    soundKey: String = "pop"
) {
    var isPressed by remember { mutableStateOf(false) }
    val haptic = LocalHapticFeedback.current

    val pressedOffset by animateDpAsState(
        targetValue = if (isPressed) 4.dp else 0.dp,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessHigh
        ),
        label = "ButtonPressOffset"
    )

    Box(
        modifier = modifier
            .height(56.dp)
            .fillMaxWidth()
    ) {
        // Bottom Shadow / Bevel Base
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 4.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(shadowColor)
        )

        // Top Interactive Face
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 4.dp)
                .offset(y = pressedOffset)
                .clip(RoundedCornerShape(16.dp))
                .background(backgroundColor)
                .pointerInput(Unit) {
                    detectTapGestures(
                        onPress = {
                            isPressed = true
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            SoundManager.play(soundKey)
                            tryAwaitRelease()
                            isPressed = false
                        },
                        onTap = { onClick() }
                    )
                },
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                color = textColor,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
```

---

## 2. Low-Latency Android SoundPool Manager

`MediaPlayer` has high latency and is ill-suited for micro-interactions. `SoundPool` keeps audio uncompressed in memory and can play simultaneous audio streams with zero latency.

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/ui/sound/SoundManager.kt
package com.paymatrix.app.ui.sound

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import com.paymatrix.app.R

object SoundManager {
    private var soundPool: SoundPool? = null
    private val soundMap = mutableMapOf<String, Int>()
    var isMuted: Boolean = false

    fun init(context: Context) {
        if (soundPool != null) return

        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        soundPool = SoundPool.Builder()
            .setMaxStreams(5)
            .setAudioAttributes(audioAttributes)
            .build()

        // Load pre-bundled raw audio assets
        // (Create res/raw/fx_pop.ogg, fx_coin.ogg, fx_fanfare.ogg)
        /*
        soundPool?.let { pool ->
            soundMap["pop"] = pool.load(context, R.raw.fx_pop, 1)
            soundMap["coin"] = pool.load(context, R.raw.fx_coin, 1)
            soundMap["fanfare"] = pool.load(context, R.raw.fx_fanfare, 1)
        }
        */
    }

    fun play(key: String) {
        if (isMuted) return
        val soundId = soundMap[key] ?: return
        soundPool?.play(soundId, 0.7f, 0.7f, 1, 0, 1.0f)
    }

    fun release() {
        soundPool?.release()
        soundPool = null
        soundMap.clear()
    }
}
```

---

## 3. Advanced Waveform Haptics (Android 12+)

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/ui/haptics/HapticHelper.kt
package com.paymatrix.app.ui.haptics

import android.content.Context
import android.os.Build
import android.os.CombinedVibration
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

object HapticHelper {
    fun playCelebrationVibration(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            val timings = longArrayOf(0, 30, 80, 50)
            val amplitudes = intArrayOf(0, 180, 0, 255)
            val effect = VibrationEffect.createWaveform(timings, amplitudes, -1)
            vibratorManager?.vibrate(CombinedVibration.createParallel(effect))
        } else {
            @Suppress("DEPRECATION")
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(50)
            }
        }
    }
}
```
