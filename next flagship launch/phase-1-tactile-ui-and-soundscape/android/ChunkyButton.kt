package com.paymatrix.app.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
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

/**
 * ChunkyButton Composable
 * A physical 3D push-down button matching Duolingo-style tactility
 */
@Composable
fun ChunkyButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    backgroundColor: Color = Color(0xFF10B981), // Emerald 500
    shadowColor: Color = Color(0xFF047857),     // Emerald 700
    textColor: Color = Color.White,
    soundKey: String = "pop",
    enabled: Boolean = true
) {
    var isPressed by remember { mutableStateOf(false) }
    val haptic = LocalHapticFeedback.current

    val pressedOffset by animateDpAsState(
        targetValue = if (isPressed && enabled) 4.dp else 0.dp,
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
                .background(if (enabled) shadowColor else Color.Gray.copy(alpha = 0.3f))
        )

        // Top Interactive Face
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 4.dp)
                .offset(y = pressedOffset)
                .clip(RoundedCornerShape(16.dp))
                .background(if (enabled) backgroundColor else Color.LightGray.copy(alpha = 0.5f))
                .pointerInput(enabled) {
                    if (!enabled) return@pointerInput
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
                color = if (enabled) textColor else Color.DarkGray,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
