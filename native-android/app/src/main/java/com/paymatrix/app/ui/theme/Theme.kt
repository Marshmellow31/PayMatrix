package com.paymatrix.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Obsidian = darkColorScheme(
    primary = Color(0xFFFFB547),
    onPrimary = Color(0xFF17120A),
    secondary = Color(0xFFB8A88F),
    background = Color(0xFF0E0E0E),
    onBackground = Color(0xFFF6F0E7),
    surface = Color(0xFF1A1A1A),
    onSurface = Color(0xFFF6F0E7),
    surfaceVariant = Color(0xFF252525),
    onSurfaceVariant = Color(0xFFC9C1B6),
    error = Color(0xFFFF7B72),
)

@Composable fun PayMatrixTheme(content: @Composable () -> Unit) = MaterialTheme(colorScheme = Obsidian, content = content)
