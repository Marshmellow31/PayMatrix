package com.paymatrix.app.domain

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.NumberFormat
import java.util.Locale

object Money {
    private val pattern = Regex("^(-?)(\\d+)(?:\\.(\\d{0,2}))?$")

    fun normalizeMoneyString(value: String): String {
        var clean = value.trim().replace("₹", "").replace("$", "").trim()
        if (clean.startsWith("-")) {
            return "-" + normalizePositiveMoney(clean.substring(1).trim())
        }
        return normalizePositiveMoney(clean)
    }

    private fun normalizePositiveMoney(clean: String): String {
        return when {
            clean.contains('.') && clean.contains(',') && clean.lastIndexOf(',') > clean.lastIndexOf('.') -> {
                clean.replace(".", "").replace(',', '.')
            }
            clean.contains(',') && clean.contains('.') -> {
                clean.replace(",", "")
            }
            clean.matches(Regex("^(\\d+),(\\d{1,2})$")) -> {
                clean.replace(',', '.')
            }
            else -> {
                clean.replace(",", "")
            }
        }
    }

    fun toPaise(value: String): Long {
        val normalized = normalizeMoneyString(value)
        val match = pattern.matchEntire(normalized) ?: error("Enter a valid amount with at most two decimal places.")
        val negative = match.groupValues[1] == "-"
        val rupees = match.groupValues[2].toLongOrNull() ?: error("Amount is outside the supported range.")
        val fraction = match.groupValues[3].padEnd(2, '0').ifEmpty { "00" }.toLong()
        val total = Math.addExact(Math.multiplyExact(rupees, 100), fraction)
        return if (negative) -total else total
    }

    fun toPaiseOrNull(value: String): Long? = runCatching { toPaise(value) }.getOrNull()

    fun toPaise(value: Double): Long = BigDecimal.valueOf(value)
        .multiply(BigDecimal(100))
        .setScale(0, RoundingMode.HALF_UP)
        .longValueExact()

    fun format(paise: Long): String = NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(paise / 100.0)

    fun formatDecimal(paise: Long): String = String.format(Locale.US, "%.2f", paise / 100.0)

    fun allocate(totalPaise: Long, weightedUsers: List<Pair<String, Double>>): List<Pair<String, Long>> {
        require(totalPaise >= 0) { "Total must be non-negative." }
        if (weightedUsers.isEmpty()) return emptyList()
        require(weightedUsers.all { it.second >= 0 && it.second.isFinite() }) { "Split weights must be non-negative." }
        val weightTotal = weightedUsers.sumOf { it.second }
        require(weightTotal > 0) { "At least one split weight must be greater than zero." }
        data class Allocation(val user: String, var paise: Long, val remainder: Double, val index: Int)
        val allocated = weightedUsers.mapIndexed { index, (user, weight) ->
            val exact = totalPaise * weight / weightTotal
            Allocation(user, kotlin.math.floor(exact).toLong(), exact - kotlin.math.floor(exact), index)
        }
        var remaining = totalPaise - allocated.sumOf { it.paise }
        val order = allocated.sortedWith(compareByDescending<Allocation> { it.remainder }.thenBy { it.index })
        var cursor = 0
        while (remaining > 0) {
            order[cursor % order.size].paise += 1
            cursor += 1
            remaining -= 1
        }
        return allocated.sortedBy { it.index }.map { it.user to it.paise }
    }
}
