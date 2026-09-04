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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

// Exact Digital Obsidian surface hierarchy from frontend/tailwind.config.js.
val CanvasBlack = Color(0xFF1A1A1A)
val ObsidianSurface = Color(0xFF151515)
val CardSurface = Color(0xFF1B1B1B)
val RaisedSurface = Color(0xFF242424)
val Hairline = Color.White.copy(alpha = .075f)
val QuietText = Color.White.copy(alpha = .38f)
val MutedText = Color.White.copy(alpha = .58f)
val Positive = Color(0xFF91D9B5)
val Negative = Color(0xFFF0A5A5)
val PrimaryBlue = Color(0xFF6C63FF)
val ElectricBlue = Color(0xFF38BDF8)
val AccentOrange = Color(0xFFFF7A1A)
val AccentPink = Color(0xFFF0449A)
val AccentPurple = Color(0xFF9B6CFF)
val AccentEmerald = Color(0xFF35D6A0)
val MintGreen = Color(0xFF35D6A0)
val ModalSurface = Color(0xFF242424)

fun categoryColor(category: String): Color {
    val lower = category.lowercase()
    return when {
        lower.contains("travel") || lower.contains("trip") -> Color(0xFF38BDF8)
        lower.contains("food") || lower.contains("dining") -> Color(0xFFFB923C)
        lower.contains("roommate") || lower.contains("flat") || lower.contains("home") || lower.contains("household") -> Color(0xFF4ADE80)
        lower.contains("friend") || lower.contains("gang") -> Color(0xFFF472B6)
        lower.contains("work") || lower.contains("office") -> Color(0xFF60A5FA)
        lower.contains("event") || lower.contains("party") -> Color(0xFFFACC15)
        lower.contains("couple") || lower.contains("partner") -> Color(0xFFF43F5E)
        lower.contains("sport") || lower.contains("fitness") -> Color(0xFF2DD4BF)
        lower.contains("entertainment") || lower.contains("movie") -> Color(0xFFA855F7)
        lower.contains("shopping") -> Color(0xFF34D399)
        else -> Color(0xFF94A3B8)
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
    Text(Money.format(value), color = color, fontWeight = FontWeight.Bold, fontSize = if (large) 30.sp else 16.sp)
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
fun BusyOverlay(show: Boolean, label: String = "") {
    if (!show) return
    val criticalActions = listOf("Signing in", "Signing out", "Deleting your account")
    if (label.isNotBlank() && label !in criticalActions) return
    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = .58f)), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(30.dp))
            if (label.isNotBlank()) Text(label, color = MutedText, fontSize = 12.sp)
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

@Composable
fun UserAvatar(profile: UserProfile?, size: Int = 42, onClick: (() -> Unit)? = null) {
    val colorIndex = ((((profile?.uid?.hashCode() ?: 0).toLong()) and 0x7fffffffL) % 5).toInt()
    val fallback = listOf(PrimaryBlue, AccentOrange, AccentPink, AccentPurple, ElectricBlue)[colorIndex]
    val modifier = Modifier.size(size.dp).border(1.dp, Color.White.copy(alpha = .18f), CircleShape).padding(1.dp).clip(CircleShape).background(fallback.copy(alpha = .8f)).then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
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
    val overlap = (size * .64f).dp
    Row(horizontalArrangement = Arrangement.spacedBy((-overlap.value).dp), verticalAlignment = Alignment.CenterVertically) {
        shown.forEach { id -> UserAvatar(profiles[id] ?: UserProfile(uid = id), size) }
        if (ids.distinct().size > max) Box(Modifier.size(size.dp).border(1.dp, Color.Black.copy(alpha = .7f), CircleShape).clip(CircleShape).background(RaisedSurface), contentAlignment = Alignment.Center) { Text("+${ids.distinct().size - max}", color = Color.White, fontWeight = FontWeight.Black, fontSize = 9.sp) }
    }
}

@Composable
fun PayMatrixHeader(user: UserProfile?, unread: Int, syncPending: Boolean = false, onActivity: () -> Unit, onProfile: () -> Unit) {
    Surface(color = ObsidianSurface.copy(alpha = .98f), modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().height(60.dp).padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("paymatrix", color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp, letterSpacing = (-.5).sp)
                Spacer(Modifier.width(6.dp))
                Box(
                    Modifier.size(6.dp).clip(CircleShape)
                        .background(if (syncPending) Color(0xFFF6C85F) else Positive)
                )
            }
            Spacer(Modifier.weight(1f))
            Box {
                IconButton(onClick = onActivity) { Icon(Icons.Default.NotificationsNone, "Activity", tint = Color.White.copy(alpha = .78f)) }
                if (unread > 0) {
                    Box(
                        Modifier.align(Alignment.TopEnd).offset((-4).dp, 6.dp)
                            .clip(CircleShape).background(Color.White)
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text(if (unread > 9) "9+" else unread.toString(), color = Color.Black, fontSize = 8.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
            Spacer(Modifier.width(4.dp))
            UserAvatar(user, 34, onProfile)
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
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed && enabled) .975f else 1f, spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium), label = "primaryPress")
    Button(
        onClick = onClick,
        enabled = enabled,
        interactionSource = interaction,
        modifier = modifier.heightIn(min = 56.dp).graphicsLayer { scaleX = scale; scaleY = scale },
        shape = RoundedCornerShape(19.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black, disabledContainerColor = Color.White.copy(alpha = .2f)),
    ) { if (icon != null) { icon(); Spacer(Modifier.width(8.dp)) }; Text(label, fontWeight = FontWeight.Bold) }
}

@Composable
fun SecondaryAction(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, icon: (@Composable (() -> Unit))? = null) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed && enabled) .978f else 1f, spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium), label = "secondaryPress")
    OutlinedButton(onClick = onClick, enabled = enabled, interactionSource = interaction, modifier = modifier.heightIn(min = 54.dp).graphicsLayer { scaleX = scale; scaleY = scale }, shape = RoundedCornerShape(19.dp), border = BorderStroke(1.dp, Hairline)) {
        if (icon != null) { icon(); Spacer(Modifier.width(8.dp)) }; Text(label, fontWeight = FontWeight.SemiBold)
    }
}
