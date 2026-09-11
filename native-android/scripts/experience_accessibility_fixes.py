from pathlib import Path
ui=Path(__file__).resolve().parents[1]/'app/src/main/java/com/paymatrix/app/ui'
p=ui/'Components.kt';s=p.read_text().replace('fun categoryColor(category: String): Color {','@Composable\nfun categoryColor(category: String): Color {').replace('    return when {\n        lower.contains', '    val base = when {\n        lower.contains')
s=s.replace('        else -> Color(0xFF8E99A8) // Neutral Slate\n    }\n}', '''        else -> Color(0xFF8E99A8) // Neutral Slate
    }
    return if (CanvasBlack.red > .5f) Color(base.red * .55f, base.green * .55f, base.blue * .55f, 1f) else base
}''')
p.write_text(s)
p=ui/'PayMatrixApp.kt';s=p.read_text().replace('.height(52.dp)', '.heightIn(min = 52.dp)').replace('.height(42.dp)', '.heightIn(min = 48.dp).padding(vertical = 8.dp)')
# Privacy badge is secondary; keep a single readable line on larger text settings.
s=s.replace('Text("Private by design",', 'Text("Private by design", maxLines = 1, overflow = TextOverflow.Ellipsis,')
start=s.index('    androidx.compose.material3.NavigationBar(',s.index('private fun LiquidGlassNavBar'))
end=s.index('\n}\n',start)
s=s[:start]+'''    BoxWithConstraints(modifier.clip(RoundedCornerShape(24.dp))) {
        val largeText = androidx.compose.ui.platform.LocalDensity.current.fontScale > 1.3f
        val barWidth = if (largeText) maxOf(maxWidth, 112.dp * items.size) else maxWidth
        val scroll = rememberScrollState()
        val density = androidx.compose.ui.platform.LocalDensity.current
        LaunchedEffect(currentRoute, largeText) {
            if (largeText) scroll.scrollTo(with(density) { (112.dp * items.indexOfFirst { it.route == currentRoute }.coerceAtLeast(0)).roundToPx() })
        }
        Row(Modifier.horizontalScroll(scroll)) {
            NavigationBar(modifier = Modifier.width(barWidth), containerColor = CardSurface,
                tonalElevation = 0.dp, windowInsets = WindowInsets(0, 0, 0, 0)) {
                items.forEach { item ->
                    val selected = currentRoute == item.route
                    NavigationBarItem(selected = selected,
                        onClick = { if (!selected) onNavigate(item.route) },
                        icon = { Icon(if (selected) item.selected else item.idle, null, Modifier.size(22.dp)) },
                        label = { Text(item.label, fontSize = 12.sp, maxLines = 2) },
                        colors = NavigationBarItemDefaults.colors(selectedIconColor = Ink, selectedTextColor = Ink,
                            unselectedIconColor = QuietText, unselectedTextColor = QuietText, indicatorColor = RaisedSurface))
                }
            }
        }
    }'''+s[end:]
s=s.replace('import androidx.compose.foundation.Image','import androidx.compose.foundation.horizontalScroll\nimport androidx.compose.foundation.Image')
p.write_text(s)
p=ui/'ItemSplitExplanation.kt';s=p.read_text().replace('Text("The final bill already includes any GST, delivery, tip or discount. We split the difference in proportion to each person’s items. Don’t add included tax twice.", color = QuietText, style = MaterialTheme.typography.bodyMedium)', 'Text("Split the receipt’s charges or discount in proportion to each person’s items.", color = QuietText, style = MaterialTheme.typography.bodyMedium)')
s=s.replace('            Text("Asha’s items:', '            Text("The final bill already includes GST, delivery or tips. Don’t add included tax twice.", color = QuietText)\n            Text("Asha’s items:')
s=s.replace('if (subtotal > 0 && total > 0)', 'if (expanded && subtotal > 0 && total > 0)')
p.write_text(s)
for p in ui.glob('*.kt'):
    s=p.read_text().replace('bottom = 100.dp','bottom = 140.dp')
    p.write_text(s)
