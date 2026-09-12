package com.paymatrix.app.ui.theme

import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import com.paymatrix.app.data.DevicePreferences
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val Obsidian = darkColorScheme(
    primaryContainer = Color(0xFF333333), onPrimaryContainer = Color(0xFFF2F0EB),
    secondaryContainer = Color(0xFF333333), onSecondaryContainer = Color(0xFFF2F0EB),
    tertiary = Color(0xFFB8B6B0), onTertiary = Color(0xFF191919),
    tertiaryContainer = Color(0xFF333333), onTertiaryContainer = Color(0xFFF2F0EB),
    primary = Color(0xFFF2F0EB),
    onPrimary = Color(0xFF111111),
    secondary = Color(0xFFD4D4D4),
    onSecondary = Color(0xFF262626),
    background = Color(0xFF1D1D1D),
    onBackground = Color(0xFFEDEDED),
    surface = Color(0xFF1A1A1A),
    onSurface = Color(0xFFEDEDED),
    surfaceVariant = Color(0xFF262626),
    onSurfaceVariant = Color(0xFF929292),
    surfaceContainerLowest = Color(0xFF171717),
    surfaceContainerLow = Color(0xFF1A1A1A),
    surfaceContainer = Color(0xFF1C1C1C),
    surfaceContainerHigh = Color(0xFF262626),
    surfaceContainerHighest = Color(0xFF303030),
    error = Color(0xFFFF7B72),
    onError = Color(0xFF490000),
    outline = Color(0xFF737373),
    outlineVariant = Color(0xFF323232),
)

private val PayMatrixTypography = Typography(
    displayLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black, fontSize = 52.sp, letterSpacing = (-2).sp),
    displayMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black, fontSize = 44.sp, letterSpacing = (-1.5).sp),
    displaySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 36.sp, letterSpacing = (-1).sp),
    headlineLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 34.sp, letterSpacing = (-0.6).sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 26.sp, letterSpacing = (-0.6).sp),
    headlineSmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 22.sp, letterSpacing = (-0.4).sp),
    titleLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 20.sp, letterSpacing = (-0.3).sp),
    titleMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    titleSmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    bodyLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    labelMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 0.5.sp),
    labelSmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.2.sp),
)

private val Ivory = lightColorScheme(
    primaryContainer = Color(0xFFDCE6D9), onPrimaryContainer = Color(0xFF244C35),
    secondaryContainer = Color(0xFFE4E1D8), onSecondaryContainer = Color(0xFF191A18),
    tertiary = Color(0xFF62635D), onTertiary = Color.White,
    tertiaryContainer = Color(0xFFE4E1D8), onTertiaryContainer = Color(0xFF191A18),
    primary = Color(0xFF315B43), onPrimary = Color(0xFFFFFFFF),
    secondary = Color(0xFF565B50), onSecondary = Color.White,
    background = Color(0xFFF7F5EF), onBackground = Color(0xFF191A18),
    surface = Color(0xFFFCFAF5), onSurface = Color(0xFF191A18),
    surfaceVariant = Color(0xFFE9E6DD), onSurfaceVariant = Color(0xFF62635D),
    surfaceContainerLowest = Color(0xFFFFFFFF), surfaceContainerLow = Color(0xFFF9F7F0),
    surfaceContainer = Color(0xFFFFFFFF), surfaceContainerHigh = Color(0xFFF1EEE7),
    surfaceContainerHighest = Color(0xFFE4E1D8),
    error = Color(0xFFAD302B), onError = Color.White,
    outline = Color(0xFF77776E), outlineVariant = Color(0xFFD3CFC4),
)

@Composable
fun PayMatrixTheme(darkOverride: Boolean? = null, content: @Composable () -> Unit) {
    val context = LocalContext.current
    val mode by DevicePreferences.appearance.collectAsState()
    val dark = darkOverride ?: when (mode) { "light" -> false; "dark" -> true; else -> isSystemInDarkTheme() }
    SideEffect {
        (context as? androidx.activity.ComponentActivity)?.enableEdgeToEdge(
            statusBarStyle = if (dark) androidx.activity.SystemBarStyle.dark(android.graphics.Color.TRANSPARENT) else androidx.activity.SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
            navigationBarStyle = if (dark) androidx.activity.SystemBarStyle.dark(android.graphics.Color.TRANSPARENT) else androidx.activity.SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
        )
    }
    MaterialTheme(colorScheme = if (dark) Obsidian else Ivory, typography = PayMatrixTypography, content = content)
}
