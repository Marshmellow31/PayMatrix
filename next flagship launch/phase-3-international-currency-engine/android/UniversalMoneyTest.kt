package com.paymatrix.app.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class UniversalMoneyTest {

    @Test
    fun testUsdConversion() {
        val subunits = UniversalMoney.toSubunits("15.50", "USD")
        assertEquals(1550L, subunits)
    }

    @Test
    fun testJpyZeroDecimalConversion() {
        val subunits = UniversalMoney.toSubunits("3500", "JPY")
        assertEquals(3500L, subunits)
    }

    @Test
    fun testKwdThreeDecimalConversion() {
        val subunits = UniversalMoney.toSubunits("12.500", "KWD")
        assertEquals(12500L, subunits)
    }

    @Test
    fun testExactAllocationSumInvariant() {
        val total = 100L
        val participants = listOf("userA" to 1.0, "userB" to 1.0, "userC" to 1.0)
        val result = UniversalMoney.allocate(total, participants)

        assertEquals(3, result.size)
        val sum = result.sumOf { it.second }
        assertEquals(100L, sum)
        assertEquals(34L, result[0].second)
        assertEquals(33L, result[1].second)
        assertEquals(33L, result[2].second)
    }
}
