package com.paymatrix.app.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

fun shortDate(value: String): String = runCatching {
    DateTimeFormatter.ofPattern("MMM d, h:mm a").format(Instant.parse(value).atZone(ZoneId.systemDefault()))
}.getOrDefault(value.take(16).ifBlank { "Recently" })

fun memberSince(value: String): String = runCatching {
    DateTimeFormatter.ofPattern("MMM yyyy").format(Instant.parse(value).atZone(ZoneId.systemDefault()))
}.getOrDefault("Member")

fun categoryIcon(category: String): ImageVector {
    val lower = category.lowercase()
    return when {
        lower.contains("travel") || lower.contains("trip") -> Icons.Default.Flight
        lower.contains("food") || lower.contains("dining") || lower.contains("groceries") -> Icons.Default.Restaurant
        lower.contains("roommate") || lower.contains("flat") || lower.contains("home") || lower.contains("household") || lower.contains("rent") -> Icons.Default.Home
        lower.contains("friend") || lower.contains("gang") -> Icons.Default.Whatshot
        lower.contains("work") || lower.contains("office") -> Icons.Default.Work
        lower.contains("event") || lower.contains("party") -> Icons.Default.Celebration
        lower.contains("couple") || lower.contains("partner") -> Icons.Default.Favorite
        lower.contains("sport") || lower.contains("fitness") -> Icons.Default.EmojiEvents
        lower.contains("entertainment") || lower.contains("movie") -> Icons.Default.Movie
        lower.contains("shopping") -> Icons.Default.ShoppingBag
        lower.contains("utilities") -> Icons.Default.Bolt
        lower.contains("health") -> Icons.Default.HealthAndSafety
        else -> Icons.Default.Tag
    }
}

fun initials(name: String): String = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercase() }.ifBlank { "P" }
