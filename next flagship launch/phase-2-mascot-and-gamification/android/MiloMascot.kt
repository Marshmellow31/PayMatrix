package com.paymatrix.app.ui.mascot

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

enum class MiloState {
    SNOOZE,
    PARTY,
    NUDGE,
    DETECTIVE
}

/**
 * MiloMascot
 * Pure Jetpack Compose Canvas vector animated mascot
 */
@Composable
fun MiloMascot(
    state: MiloState = MiloState.SNOOZE,
    modifier: Modifier = Modifier.size(96.dp)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "MiloBobbing")
    val bobbingOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = if (state == MiloState.PARTY) -12f else -4f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = if (state == MiloState.PARTY) 400 else 1400,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "MiloYOffset"
    )

    Box(modifier = modifier) {
        Canvas(modifier = Modifier.matchParentSize()) {
            val cx = size.width / 2f
            val cy = (size.height / 2f) + bobbingOffset
            val radius = size.minDimension * 0.42f

            // 1. Shadow Rim
            drawCircle(
                color = Color(0xFF047857), // Emerald 700
                radius = radius,
                center = Offset(cx, cy + 4f)
            )

            // 2. Main Coin Body
            drawCircle(
                color = Color(0xFF10B981), // Emerald 500
                radius = radius,
                center = Offset(cx, cy)
            )

            // 3. Embossed Ring
            drawCircle(
                color = Color(0xFF34D399), // Emerald 400
                radius = radius * 0.86f,
                center = Offset(cx, cy),
                style = Stroke(width = 3f)
            )

            // 4. Eyes & Facial Features according to state
            when (state) {
                MiloState.SNOOZE -> {
                    // Closed sleepy eyes
                    drawLine(
                        color = Color(0xFF064E3B),
                        start = Offset(cx - 20f, cy - 6f),
                        end = Offset(cx - 6f, cy - 2f),
                        strokeWidth = 4f
                    )
                    drawLine(
                        color = Color(0xFF064E3B),
                        start = Offset(cx + 6f, cy - 2f),
                        end = Offset(cx + 20f, cy - 6f),
                        strokeWidth = 4f
                    )
                }
                MiloState.PARTY -> {
                    // Cool sunglasses
                    drawRoundRect(
                        color = Color(0xFF0F172A),
                        topLeft = Offset(cx - 28f, cy - 14f),
                        size = androidx.compose.ui.geometry.Size(22f, 14f),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f)
                    )
                    drawRoundRect(
                        color = Color(0xFF0F172A),
                        topLeft = Offset(cx + 6f, cy - 14f),
                        size = androidx.compose.ui.geometry.Size(22f, 14f),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f)
                    )
                    drawLine(
                        color = Color(0xFF0F172A),
                        start = Offset(cx - 6f, cy - 8f),
                        end = Offset(cx + 6f, cy - 8f),
                        strokeWidth = 3f
                    )
                }
                MiloState.NUDGE -> {
                    // Attentive alert eyes
                    drawCircle(color = Color(0xFF064E3B), radius = 5f, center = Offset(cx - 14f, cy - 6f))
                    drawCircle(color = Color(0xFF064E3B), radius = 5f, center = Offset(cx + 14f, cy - 6f))
                    drawCircle(color = Color.White, radius = 2f, center = Offset(cx - 16f, cy - 8f))
                    drawCircle(color = Color.White, radius = 2f, center = Offset(cx + 12f, cy - 8f))
                }
                MiloState.DETECTIVE -> {
                    // Left eye standard, Right eye Monocle
                    drawCircle(color = Color(0xFF064E3B), radius = 5f, center = Offset(cx - 14f, cy - 6f))
                    drawCircle(
                        color = Color(0xFFF59E0B),
                        radius = 9f,
                        center = Offset(cx + 14f, cy - 6f),
                        style = Stroke(width = 3f)
                    )
                    drawCircle(color = Color(0xFF064E3B), radius = 5f, center = Offset(cx + 14f, cy - 6f))
                }
            }

            // Smiling Mouth
            drawArc(
                color = Color(0xFF064E3B),
                startAngle = 20f,
                sweepAngle = 140f,
                useCenter = false,
                topLeft = Offset(cx - 10f, cy + 2f),
                size = androidx.compose.ui.geometry.Size(20f, 14f),
                style = Stroke(width = 3f)
            )
        }
    }
}
