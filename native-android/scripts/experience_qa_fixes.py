from pathlib import Path
ui=Path(__file__).resolve().parents[1]/'app/src/main/java/com/paymatrix/app/ui'
p=ui/'Components.kt';s=p.read_text();a=s.index('    val criticalActions',s.index('fun BusyOverlay'));b=s.index('\n}\n',a)
s=s[:a]+'''    androidx.compose.ui.window.Dialog(
        onDismissRequest = {},
        properties = androidx.compose.ui.window.DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Surface(shape = RoundedCornerShape(20.dp), color = CardSurface) {
            Row(Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                CircularProgressIndicator(color = Ink, strokeWidth = 2.dp, modifier = Modifier.size(28.dp))
                Text(label.ifBlank { "Working…" }, color = Ink, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }'''+s[b:]
start=s.index('fun PrimaryAction')
s=s[:start]+s[start:].replace('enabled = enabled,','enabled = enabled && !LocalActionBusy.current,')
s=s.replace('"PAYMATRIX"','"paymatrix"')
p.write_text(s)
p=ui/'theme/Theme.kt';s=p.read_text().replace('    primary = Color(0xFFFFFFFF),','''    primaryContainer = Color(0xFF333333), onPrimaryContainer = Color(0xFFF2F0EB),
    secondaryContainer = Color(0xFF333333), onSecondaryContainer = Color(0xFFF2F0EB),
    tertiary = Color(0xFFB8B6B0), onTertiary = Color(0xFF191919),
    tertiaryContainer = Color(0xFF333333), onTertiaryContainer = Color(0xFFF2F0EB),
    primary = Color(0xFFF2F0EB),''').replace('    primary = Color(0xFF191A18),','''    primaryContainer = Color(0xFFE4E1D8), onPrimaryContainer = Color(0xFF191A18),
    secondaryContainer = Color(0xFFE4E1D8), onSecondaryContainer = Color(0xFF191A18),
    tertiary = Color(0xFF62635D), onTertiary = Color.White,
    tertiaryContainer = Color(0xFFE4E1D8), onTertiaryContainer = Color(0xFF191A18),
    primary = Color(0xFF191A18),''')
s=s.replace('surfaceContainerLow = Color(0xFF2C2C2C)', 'surfaceContainerLow = Color(0xFF222222)').replace('surfaceContainerHighest = Color(0xFF282828)', 'surfaceContainerHighest = Color(0xFF343434)')
p.write_text(s)
for p in ui.glob('*.kt'):
    s=p.read_text().replace('20.dp, 110.dp','20.dp, 136.dp').replace('bottom = 110.dp','bottom = 136.dp')
    p.write_text(s)
p=ui/'PayMatrixApp.kt';s=p.read_text().replace('LaunchedEffect(state.user?.uid, state.syncStatus.pendingWrites)', 'LaunchedEffect(state.user?.uid, state.syncStatus.pendingWrites, state.loading)');p.write_text(s)
p=ui.parents[5]/'androidTest/java/com/paymatrix/app/ui/ExperienceScreensTest.kt'
# resolved separately below
p=Path(__file__).resolve().parents[1]/'app/src/androidTest/java/com/paymatrix/app/ui/ExperienceScreensTest.kt'
s=p.read_text().replace('import androidx.compose.ui.Modifier','import androidx.compose.ui.graphics.asAndroidBitmap\nimport androidx.compose.ui.Modifier')
s=s.replace('val bitmap = instrumentation.uiAutomation.takeScreenshot()', 'val bitmap = compose.onRoot().captureToImage().asAndroidBitmap()')
p.write_text(s)
