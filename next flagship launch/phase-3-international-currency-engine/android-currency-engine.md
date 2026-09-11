# Phase 3: Android Universal Subunit Engine (`Money.kt`)

> **Platform:** Kotlin (Android API 24–36+)  
> **Key Technologies:** `java.math.BigDecimal`, `java.text.NumberFormat`, Precision Math without Double rounding drift

---

## 1. Kotlin Currency Meta Model

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/domain/UniversalMoney.kt
package com.paymatrix.app.domain

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.NumberFormat
import java.util.Locale

data class CurrencyMeta(
    val code: String,
    val symbol: String,
    val decimals: Int,
    val multiplier: Long,
    val locale: Locale
)

object CurrencyRegistry {
    val USD = CurrencyMeta("USD", "$", 2, 100L, Locale.US)
    val EUR = CurrencyMeta("EUR", "€", 2, 100L, Locale.GERMANY)
    val GBP = CurrencyMeta("GBP", "£", 2, 100L, Locale.UK)
    val INR = CurrencyMeta("INR", "₹", 2, 100L, Locale("en", "IN"))
    val JPY = CurrencyMeta("JPY", "¥", 0, 1L, Locale.JAPAN)
    val KWD = CurrencyMeta("KWD", "KD", 3, 1000L, Locale("ar", "KW"))

    fun get(code: String): CurrencyMeta {
        return when (code.uppercase()) {
            "EUR" -> EUR
            "GBP" -> GBP
            "INR" -> INR
            "JPY" -> JPY
            "KWD" -> KWD
            else -> USD
        }
    }
}
```

---

## 2. Universal Subunit Math & Allocation Engine

```kotlin
object UniversalMoney {

    fun toSubunits(value: String, currencyCode: String = "USD"): Long {
        val meta = CurrencyRegistry.get(currencyCode)
        val clean = value.replace("[^0-9.-]".toRegex(), "").trim()
        if (clean.isEmpty()) return 0L

        return BigDecimal(clean)
            .multiply(BigDecimal(meta.multiplier))
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact()
    }

    fun format(subunits: Long, currencyCode: String = "USD"): String {
        val meta = CurrencyRegistry.get(currencyCode)
        val majorAmount = subunits.toDouble() / meta.multiplier
        val formatter = NumberFormat.getCurrencyInstance(meta.locale).apply {
            minimumFractionDigits = meta.decimals
            maximumFractionDigits = meta.decimals
        }
        return formatter.format(majorAmount)
    }

    /**
     * Hare-Niemeyer Proportional Allocation
     */
    fun allocate(
        totalSubunits: Long,
        weightedParticipants: List<Pair<String, Double>>
    ): List<Pair<String, Long>> {
        require(totalSubunits >= 0) { "Total subunits must be non-negative" }
        if (weightedParticipants.isEmpty()) return emptyList()

        val totalWeight = weightedParticipants.sumOf { it.second }
        require(totalWeight > 0) { "Sum of weights must be greater than zero" }

        data class AllocationDraft(
            val id: String,
            var subunits: Long,
            val remainder: Double,
            val index: Int
        )

        val drafts = weightedParticipants.mapIndexed { index, (id, weight) ->
            val exact = totalSubunits * weight / totalWeight
            val floor = kotlin.math.floor(exact).toLong()
            AllocationDraft(id, floor, exact - floor, index)
        }

        var leftover = totalSubunits - drafts.sumOf { it.subunits }
        val sortedByRemainder = drafts.sortedWith(
            compareByDescending<AllocationDraft> { it.remainder }.thenBy { it.index }
        )

        var cursor = 0
        while (leftover > 0) {
            sortedByRemainder[cursor % sortedByRemainder.size].subunits += 1
            cursor++
            leftover--
        }

        return drafts.sortedBy { it.index }.map { it.id to it.subunits }
    }
}
```
