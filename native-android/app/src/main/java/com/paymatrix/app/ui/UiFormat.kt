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

fun categoryIcon(category: String): ImageVector = when (category.lowercase()) {
    "food", "dining", "groceries" -> Icons.Default.Restaurant
    "travel", "trip" -> Icons.Default.Flight
    "transport" -> Icons.Default.DirectionsCar
    "shopping" -> Icons.Default.ShoppingBag
    "rent", "household", "housing" -> Icons.Default.HomeWork
    "entertainment" -> Icons.Default.Movie
    "utilities" -> Icons.Default.Bolt
    "health" -> Icons.Default.HealthAndSafety
    else -> Icons.Default.Tag
}

fun initials(name: String): String = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercase() }.ifBlank { "P" }
