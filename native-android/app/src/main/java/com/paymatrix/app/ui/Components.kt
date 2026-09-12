package com.paymatrix.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import androidx.compose.ui.platform.LocalContext
import com.paymatrix.app.data.UserProfile
import com.paymatrix.app.domain.Money
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateFloat
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.unit.IntSize
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.TextStyle

object AppSpacing {
    val page = 16.dp
    val section = 16.dp
    val item = 12.dp
    val compact = 8.dp
    val pagePadding = PaddingValues(start = page, top = page, end = page, bottom = 28.dp)
}
val ActionContainer: Color @Composable get() = MaterialTheme.colorScheme.primaryContainer
val ActionContent: Color @Composable get() = MaterialTheme.colorScheme.onPrimaryContainer

val LocalActionBusy = compositionLocalOf { false }

val Ink: Color @Composable get() = MaterialTheme.colorScheme.onSurface
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

@Composable
fun categoryColor(category: String): Color {
    val lower = category.lowercase()
    val base = when {
        lower.contains("travel") || lower.contains("trip") -> Color(0xFF5EB6E4) // Slate Cyan
        lower.contains("food") || lower.contains("dining") -> Color(0xFFE58C4E) // Terracotta Amber
        lower.contains("roommate") || lower.contains("flat") || lower.contains("home") || lower.contains("household") -> Color(0xFF5ABF88) // Botanical Emerald
        lower.contains("friend") || lower.contains("gang") -> Color(0xFFD6789E) // Dusty Rose
        lower.contains("work") || lower.contains("office") -> Color(0xFF6699D8) // Steel Blue
        lower.contains("event") || lower.contains("party") -> Color(0xFFDCB848) // Golden Wheat
        lower.contains("couple") || lower.contains("partner") -> Color(0xFFD95D73) // Calm Berry
        lower.contains("sport") || lower.contains("fitness") -> Color(0xFF42AEA3) // Sage Teal
        lower.contains("entertainment") || lower.contains("movie") -> Color(0xFF9B74DE) // Slate Iris
        lower.contains("shopping") -> Color(0xFF4EAE8B) // Soft Jade
        else -> Color(0xFF8E99A8) // Neutral Slate
    }
    return if (CanvasBlack.red > .5f) Color(base.red * .55f, base.green * .55f, base.blue * .55f, 1f) else base
}

@Composable
fun PageTitle(title: String, subtitle: String? = null, action: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineLarge, color = Ink)
            if (!subtitle.isNullOrBlank()) {
                Spacer(Modifier.height(5.dp))
                Text(subtitle, color = MutedText, style = MaterialTheme.typography.bodyMedium)
            }
        }
        action?.invoke()
    }
}

@Composable
fun SectionTitle(title: String, subtitle: String? = null, action: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = Ink)
            if (!subtitle.isNullOrBlank()) Text(subtitle, color = QuietText, fontSize = 12.sp)
        }
        action?.invoke()
    }
}

@Composable
fun ObsidianCard(modifier: Modifier = Modifier, contentPadding: PaddingValues = PaddingValues(AppSpacing.page), content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth().animateContentSize(spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMediumLow)).border(1.dp, Hairline, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
    ) { Column(Modifier.padding(contentPadding), verticalArrangement = Arrangement.spacedBy(10.dp), content = content) }
}

@Composable
fun MoneyText(paise: Long, positiveGood: Boolean = true, large: Boolean = false, absolute: Boolean = true) {
    val color = when {
        paise == 0L -> Ink
        (paise > 0) == positiveGood -> Positive
        else -> Negative
    }
    val value = if (absolute) kotlin.math.abs(paise) else paise
    Text(
        text = Money.format(value),
        color = color,
        fontWeight = FontWeight.Bold,
        fontSize = if (large) 30.sp else 16.sp,
        style = TextStyle(fontFeatureSettings = "tnum")
    )
}

@Composable
fun Modifier.shimmer(shape: Shape = RoundedCornerShape(8.dp)): Modifier {
    var size by remember { mutableStateOf(IntSize.Zero) }
    val transition = rememberInfiniteTransition(label = "shimmer")
    val startOffsetX by transition.animateFloat(
        initialValue = -2 * (if (size.width > 0) size.width else 400).toFloat(),
        targetValue = 2 * (if (size.width > 0) size.width else 400).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )

    val shimmerColors = listOf(
        Ink.copy(alpha = 0.04f),
        Ink.copy(alpha = 0.14f),
        Ink.copy(alpha = 0.04f),
    )

    return this
        .onGloballyPositioned { size = it.size }
        .clip(shape)
        .background(
            brush = Brush.linearGradient(
                colors = shimmerColors,
                start = Offset(startOffsetX, 0f),
                end = Offset(startOffsetX + (if (size.width > 0) size.width else 400).toFloat(), (if (size.height > 0) size.height else 100).toFloat())
            )
        )
}

@Composable
fun SkeletonBox(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(8.dp)
) {
    Box(modifier.shimmer(shape))
}

@Composable
fun BusyOverlay(show: Boolean, label: String = "", onDismiss: (() -> Unit)? = null) {
    if (!show) return
    androidx.compose.ui.window.Dialog(
        onDismissRequest = {},
        properties = androidx.compose.ui.window.DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Surface(shape = RoundedCornerShape(20.dp), color = CardSurface) {
            Row(Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                CircularProgressIndicator(color = Ink, strokeWidth = 2.dp, modifier = Modifier.size(28.dp))
                Text(label.ifBlank { "Working…" }, color = Ink, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

@Composable
fun EmptyState(title: String, body: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(vertical = 42.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = Ink)
            Spacer(Modifier.height(6.dp))
            Text(body, color = QuietText, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun FormField(value: String, onValueChange: (String) -> Unit, label: String, modifier: Modifier = Modifier, singleLine: Boolean = true, leading: (@Composable (() -> Unit))? = null, visualTransformation: VisualTransformation = VisualTransformation.None) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = singleLine,
        leadingIcon = leading,
        visualTransformation = visualTransformation,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = RaisedSurface,
            unfocusedContainerColor = RaisedSurface.copy(alpha = .72f),
            focusedBorderColor = Ink.copy(alpha = .3f),
            unfocusedBorderColor = Hairline,
        ),
    )
}

private val AvatarPalette = listOf(
    Color(0xFF6C63FF), // Indigo
    Color(0xFFE58C4E), // Terracotta Amber
    Color(0xFFD6789E), // Dusty Rose
    Color(0xFF42AEA3), // Teal
    Color(0xFF5EB6E4), // Slate Cyan
    Color(0xFF5ABF88), // Mint Emerald
    Color(0xFF9B74DE), // Lavender Violet
    Color(0xFFDCB848), // Goldenrod
    Color(0xFFF43F5E), // Crimson Rose
    Color(0xFF3B82F6), // Azure Blue
    Color(0xFF10B981), // Emerald
    Color(0xFFF97316), // Vivid Orange
)

@Composable
fun UserAvatar(profile: UserProfile?, size: Int = 42, onClick: (() -> Unit)? = null) {
    val seed = profile?.uid?.takeIf { it.isNotBlank() } ?: profile?.name?.takeIf { it.isNotBlank() } ?: profile?.email.orEmpty()
    val hash = kotlin.math.abs(seed.hashCode())
    val fallback = AvatarPalette[hash % AvatarPalette.size]
    val modifier = Modifier
        .size(size.dp)
        .border(1.dp, Ink.copy(alpha = .18f), CircleShape)
        .clip(CircleShape)
        .background(fallback) // 100% solid opaque, distinct color per member
        .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    val avatar = profile?.avatar?.trim().orEmpty()
    val context = LocalContext.current
    Box(modifier, contentAlignment = Alignment.Center) {
        Text(profile?.name?.trim()?.firstOrNull()?.uppercase() ?: "P", color = Ink, fontWeight = FontWeight.Black)
        if (avatar.isNotBlank()) AsyncImage(
            model = ImageRequest.Builder(context).data(avatar).memoryCacheKey("avatar:${profile?.uid}:$avatar").diskCacheKey("avatar:${profile?.uid}:$avatar").crossfade(true).build(),
            contentDescription = "${profile?.name ?: "User"} profile photo",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
    }
}

@Composable
fun AvatarStack(ids: List<String>, profiles: Map<String, UserProfile>, size: Int = 34, max: Int = 3) {
    val shown = ids.distinct().take(max)
    val overlap = (size * .3f).dp
    Row(horizontalArrangement = Arrangement.spacedBy((-overlap.value).dp), verticalAlignment = Alignment.CenterVertically) {
        shown.forEach { id ->
            Box(
                Modifier
                    .size(size.dp)
                    .border(2.dp, CardSurface, CircleShape)
                    .clip(CircleShape)
            ) {
                UserAvatar(profiles[id] ?: UserProfile(uid = id), size)
            }
        }
        if (ids.distinct().size > max) Box(
            Modifier
                .size(size.dp)
                .border(2.dp, CardSurface, CircleShape)
                .clip(CircleShape)
                .background(RaisedSurface),
            contentAlignment = Alignment.Center
        ) {
            Text("+${ids.distinct().size - max}", color = Ink, fontWeight = FontWeight.Black, fontSize = 12.sp)
        }
    }
}

@Composable
fun PayMatrixHeader(user: UserProfile?, unread: Int, syncPending: Boolean = false, onActivity: () -> Unit, onProfile: () -> Unit, onAnalytics: (() -> Unit)? = null) {
    Surface(color = ObsidianSurface, modifier = Modifier.fillMaxWidth(), border = BorderStroke(1.dp, Hairline.copy(alpha = .65f))) {
        Row(Modifier.fillMaxWidth().height(52.dp).padding(horizontal = AppSpacing.page), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "PAYMATRIX",
                color = Ink,
                fontWeight = FontWeight.SemiBold,
                fontSize = 18.sp,
                letterSpacing = (-.5).sp
            )
            Spacer(Modifier.weight(1f))
            if (onAnalytics != null) {
                IconButton(onClick = onAnalytics, modifier = Modifier.size(42.dp)) {
                    Icon(Icons.Default.BarChart, "Analytics", tint = QuietText, modifier = Modifier.size(20.dp))
                }
            }
            Box {
                IconButton(onClick = onActivity, modifier = Modifier.size(42.dp)) {
                    Icon(Icons.Default.NotificationsNone, "Activity and Notifications", tint = QuietText, modifier = Modifier.size(20.dp))
                }
                if (unread > 0) {
                    Box(
                        Modifier.align(Alignment.TopEnd).offset((-2).dp, 6.dp)
                            .clip(CircleShape).background(Ink)
                            .padding(horizontal = 5.dp, vertical = 1.dp)
                    ) {
                        Text(if (unread > 9) "9+" else unread.toString(), color = CanvasBlack, fontSize = 12.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
            Spacer(Modifier.width(7.dp))
            UserAvatar(user, 32, onProfile)
        }
    }
}

@Composable
fun BalanceCard(title: String, amount: Long, positive: Boolean, modifier: Modifier = Modifier) {
    ObsidianCard(modifier) {
        Text(title, color = QuietText, fontSize = 12.sp)
        MoneyText(amount, positiveGood = positive, large = true)
    }
}

@Composable
fun PrimaryAction(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, icon: (@Composable (() -> Unit))? = null) {
    val haptic = LocalHapticFeedback.current
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed && enabled) .975f else 1f, spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium), label = "primaryPress")
    Button(
        onClick = {
            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            onClick()
        },
        enabled = enabled && !LocalActionBusy.current,
        interactionSource = interaction,
        modifier = modifier.heightIn(min = 56.dp).graphicsLayer { scaleX = scale; scaleY = scale },
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = ActionContainer, contentColor = ActionContent, disabledContainerColor = RaisedSurface, disabledContentColor = MutedText.copy(alpha = .6f)),
    ) { if (icon != null) { icon(); Spacer(Modifier.width(8.dp)) }; Text(label, fontWeight = FontWeight.Bold) }
}

@Composable
fun SecondaryAction(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, icon: (@Composable (() -> Unit))? = null) {
    val haptic = LocalHapticFeedback.current
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed && enabled) .978f else 1f, spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium), label = "secondaryPress")
    OutlinedButton(
        onClick = {
            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            onClick()
        },
        enabled = enabled && !LocalActionBusy.current,
        interactionSource = interaction,
        modifier = modifier.heightIn(min = 54.dp).graphicsLayer { scaleX = scale; scaleY = scale },
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, Hairline)
    ) {
        if (icon != null) { icon(); Spacer(Modifier.width(8.dp)) }; Text(label, fontWeight = FontWeight.SemiBold)
    }
}
