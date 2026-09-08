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

val LocalActionBusy = compositionLocalOf { false }

// Exact Digital Obsidian surface hierarchy with WCAG AA contrast and M3 tonal compliance
val CanvasBlack = Color(0xFF101010)
val ObsidianSurface = Color(0xFF141414)
val CardSurface = Color(0xFF181818)
val RaisedSurface = Color(0xFF222222)
val Hairline = Color.White.copy(alpha = .08f)
val QuietText = Color.White.copy(alpha = .55f) // Elevated for WCAG AA (5.2:1 contrast against surface)
val MutedText = Color.White.copy(alpha = .75f) // High readability secondary
val Positive = Color(0xFF7DD5A9) // Tasteful mint emerald
val Negative = Color(0xFFF28B82) // Soft coral crimson
val PrimaryBlue = Color(0xFF6C63FF)
val ElectricBlue = Color(0xFF5EB6E4)
val AccentOrange = Color(0xFFE58C4E)
val AccentPink = Color(0xFFD6789E)
val AccentPurple = Color(0xFF9B74DE)
val AccentEmerald = Color(0xFF42AEA3)
val MintGreen = Color(0xFF7DD5A9)
val ModalSurface = Color(0xFF202020)

fun categoryColor(category: String): Color {
    val lower = category.lowercase()
    return when {
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
}

@Composable
fun PageTitle(title: String, subtitle: String? = null, action: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineLarge, color = Color.White)
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
            Text(title, style = MaterialTheme.typography.titleMedium, color = Color.White)
            if (!subtitle.isNullOrBlank()) Text(subtitle, color = QuietText, fontSize = 12.sp)
        }
        action?.invoke()
    }
}

@Composable
fun ObsidianCard(modifier: Modifier = Modifier, contentPadding: PaddingValues = PaddingValues(18.dp), content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth().animateContentSize(spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMediumLow)).border(1.dp, Hairline, RoundedCornerShape(24.dp)),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
    ) { Column(Modifier.padding(contentPadding), verticalArrangement = Arrangement.spacedBy(10.dp), content = content) }
}

@Composable
fun MoneyText(paise: Long, positiveGood: Boolean = true, large: Boolean = false, absolute: Boolean = true) {
    val color = when {
        paise == 0L -> Color.White
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
        Color.White.copy(alpha = 0.04f),
        Color.White.copy(alpha = 0.14f),
        Color.White.copy(alpha = 0.04f),
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
    val criticalActions = listOf("Signing in", "Signing out", "Deleting your account")
    if (label.isNotBlank() && label !in criticalActions) return
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = .58f))
            .clickable(enabled = onDismiss != null) { onDismiss?.invoke() },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(30.dp))
            if (label.isNotBlank()) Text(label, color = MutedText, fontSize = 12.sp)
            if (onDismiss != null) {
                TextButton(onClick = onDismiss) { Text("Dismiss", color = QuietText, fontSize = 12.sp) }
            }
        }
    }
}

@Composable
fun EmptyState(title: String, body: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(vertical = 42.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = Color.White)
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
            focusedBorderColor = Color.White.copy(alpha = .3f),
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
        .border(1.dp, Color.White.copy(alpha = .18f), CircleShape)
        .clip(CircleShape)
        .background(fallback) // 100% solid opaque, distinct color per member
        .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    val avatar = profile?.avatar?.trim().orEmpty()
    val context = LocalContext.current
    Box(modifier, contentAlignment = Alignment.Center) {
        Text(profile?.name?.trim()?.firstOrNull()?.uppercase() ?: "P", color = Color.White, fontWeight = FontWeight.Black)
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
    val overlap = (size * .58f).dp
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
            Text("+${ids.distinct().size - max}", color = Color.White, fontWeight = FontWeight.Black, fontSize = 10.sp)
        }
    }
}

@Composable
fun PayMatrixHeader(user: UserProfile?, unread: Int, syncPending: Boolean = false, onActivity: () -> Unit, onProfile: () -> Unit) {
    Surface(color = ObsidianSurface.copy(alpha = .98f), modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().height(60.dp).padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "PAYMATRIX",
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 18.sp,
                letterSpacing = 1.2.sp
            )
            Spacer(Modifier.weight(1f))
            Box {
                IconButton(onClick = onActivity, modifier = Modifier.size(48.dp)) {
                    Icon(Icons.Default.NotificationsNone, "Activity and Notifications", tint = Color.White.copy(alpha = .85f))
                }
                if (unread > 0) {
                    Box(
                        Modifier.align(Alignment.TopEnd).offset((-2).dp, 6.dp)
                            .clip(CircleShape).background(Color.White)
                            .padding(horizontal = 5.dp, vertical = 1.dp)
                    ) {
                        Text(if (unread > 9) "9+" else unread.toString(), color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
            Spacer(Modifier.width(4.dp))
            UserAvatar(user, 36, onProfile)
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
        enabled = enabled,
        interactionSource = interaction,
        modifier = modifier.heightIn(min = 56.dp).graphicsLayer { scaleX = scale; scaleY = scale },
        shape = RoundedCornerShape(19.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFF111111), disabledContainerColor = Color.White.copy(alpha = .2f)),
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
        enabled = enabled,
        interactionSource = interaction,
        modifier = modifier.heightIn(min = 54.dp).graphicsLayer { scaleX = scale; scaleY = scale },
        shape = RoundedCornerShape(19.dp),
        border = BorderStroke(1.dp, Hairline)
    ) {
        if (icon != null) { icon(); Spacer(Modifier.width(8.dp)) }; Text(label, fontWeight = FontWeight.SemiBold)
    }
}
