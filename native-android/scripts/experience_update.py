from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
ui = root / 'app/src/main/java/com/paymatrix/app/ui'
# Replace fixed foregrounds only in composable screen bodies; QR pixels are generated separately.
for p in ui.glob('*.kt'):
    if p.name in ('QrCodeHelper.kt', 'UiFormat.kt'): continue
    s = p.read_text(encoding='utf-8-sig')
    if p.name == 'Components.kt':
        start=s.index('// Exact Digital')
        end=s.index('fun categoryColor',start)
        s=s[:start]+'''val Ink: Color @Composable get() = MaterialTheme.colorScheme.onSurface
val CanvasBlack: Color @Composable get() = MaterialTheme.colorScheme.background
val ObsidianSurface: Color @Composable get() = MaterialTheme.colorScheme.surface
val CardSurface: Color @Composable get() = MaterialTheme.colorScheme.surfaceContainer
val RaisedSurface: Color @Composable get() = MaterialTheme.colorScheme.surfaceContainerHigh
val Hairline: Color @Composable get() = MaterialTheme.colorScheme.outlineVariant
val QuietText: Color @Composable get() = MaterialTheme.colorScheme.onSurfaceVariant
val MutedText: Color @Composable get() = MaterialTheme.colorScheme.onSurfaceVariant
val Positive: Color @Composable get() = if (MaterialTheme.colorScheme.background.red < .5f) Color(0xFF8AD8B0) else Color(0xFF246B48)
val Negative: Color @Composable get() = MaterialTheme.colorScheme.error
val PrimaryBlue = Color(0xFF6C63FF)
val ElectricBlue = Color(0xFF3486AA)
val AccentOrange = Color(0xFFAC602A)
val AccentPink = Color(0xFFAE4874)
val AccentPurple = Color(0xFF8054BA)
val AccentEmerald = Color(0xFF267E73)
val MintGreen: Color @Composable get() = Positive
val ModalSurface: Color @Composable get() = MaterialTheme.colorScheme.surfaceContainerHigh

'''+s[end:]
    s=s.replace('Color.White', 'Ink').replace('Color.Black', 'CanvasBlack')
    # These old black button foregrounds must contrast with semantic ink fills.
    s=s.replace('Color(0xFF111111)', 'CanvasBlack')
    # Small essential copy is readable and scalable; layout is checked after compilation.
    s=re.sub(r'fontSize = (?:9\.5|10|10\.5|11)\.sp', 'fontSize = 12.sp', s)
    p.write_text(s,encoding='utf-8')

p=ui/'theme/Theme.kt'
s=p.read_text(); s=s.replace('import androidx.compose.material3.darkColorScheme','import androidx.compose.material3.darkColorScheme\nimport androidx.compose.material3.lightColorScheme\nimport androidx.compose.runtime.*\nimport androidx.compose.ui.platform.LocalContext\nimport com.paymatrix.app.data.DevicePreferences')
s=s.replace('0xFF101010','0xFF191919').replace('0xFF141414','0xFF222222').replace('0xFF181818','0xFF262626').replace('0xFF121212','0xFF202020').replace('0xFF202020','0xFF2C2C2C').replace('0xFF0C0C0C','0xFF171717').replace('0xFFA3A3A3','0xFFB8B6B0')
idx=s.index('@Composable\nfun PayMatrixTheme')
s=s[:idx]+'''private val Ivory = lightColorScheme(
    primary = Color(0xFF191A18), onPrimary = Color(0xFFFFFDF7),
    secondary = Color(0xFF565B50), onSecondary = Color.White,
    background = Color(0xFFF5F2E9), onBackground = Color(0xFF191A18),
    surface = Color(0xFFF5F2E9), onSurface = Color(0xFF191A18),
    surfaceVariant = Color(0xFFE9E6DD), onSurfaceVariant = Color(0xFF62635D),
    surfaceContainerLowest = Color(0xFFFFFFFF), surfaceContainerLow = Color(0xFFF9F7F0),
    surfaceContainer = Color(0xFFFFFDF7), surfaceContainerHigh = Color(0xFFECE9E0),
    surfaceContainerHighest = Color(0xFFE4E1D8),
    error = Color(0xFFAD302B), onError = Color.White,
    outline = Color(0xFF77776E), outlineVariant = Color(0xFFD4D1C7),
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
'''
s=s.replace('import androidx.compose.material3.MaterialTheme','import androidx.activity.enableEdgeToEdge\nimport androidx.compose.material3.MaterialTheme')
p.write_text(s)

p=ui/'PayMatrixApp.kt';s=p.read_text();start=s.index('    val pillShape',s.index('private fun LiquidGlassNavBar'));end=s.index('\n}',start)
s=s[:start]+'''    androidx.compose.material3.NavigationBar(
        modifier = modifier.clip(RoundedCornerShape(24.dp)),
        containerColor = CardSurface,
        tonalElevation = 0.dp,
        windowInsets = WindowInsets(0, 0, 0, 0)
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            androidx.compose.material3.NavigationBarItem(
                selected = selected,
                onClick = { if (!selected) onNavigate(item.route) },
                icon = { Icon(if (selected) item.selected else item.idle, null, Modifier.size(22.dp)) },
                label = { Text(item.label, fontSize = 12.sp, maxLines = 1) },
                colors = androidx.compose.material3.NavigationBarItemDefaults.colors(
                    selectedIconColor = Ink, selectedTextColor = Ink,
                    unselectedIconColor = QuietText, unselectedTextColor = QuietText,
                    indicatorColor = RaisedSurface
                )
            )
        }
    }'''+s[end:]
s=s.replace('NavHost(navController = nav, startDestination = "gate")', '''NavHost(navController = nav, startDestination = "gate",
                enterTransition = { androidx.compose.animation.fadeIn(tween(180)) },
                exitTransition = { androidx.compose.animation.fadeOut(tween(120)) },
                popEnterTransition = { androidx.compose.animation.fadeIn(tween(180)) },
                popExitTransition = { androidx.compose.animation.fadeOut(tween(120)) })''')
s=s.replace('Color(0xF218181D)', 'CardSurface')
p.write_text(s)

p=root/'app/build.gradle.kts';s=p.read_text().replace('versionCode = 22002','versionCode = 23000').replace('versionName = "2.2.2"','versionName = "2.3.0"').replace('implementation("androidx.profileinstaller', 'implementation("androidx.work:work-runtime-ktx:2.11.2")\n    implementation("androidx.profileinstaller');p.write_text(s)
