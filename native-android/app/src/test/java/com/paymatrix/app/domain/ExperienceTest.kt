package com.paymatrix.app.domain

import org.junit.Assert.*
import org.junit.Test

class ExperienceTest {
    @Test fun receiptChargesAndDiscountsConservePaise() {
        val users = listOf("a", "b")
        val base = mapOf("a" to 600.0, "b" to 400.0)
        val charged = BalanceEngine.calculateSplits(105000, "itemized", base, users)
        assertEquals(listOf(63000L, 42000L), charged.map { it.amountPaise })
        assertEquals(listOf(60000L, 40000L), charged.map { it.dishPaise })
        assertEquals(listOf(54000L, 36000L), BalanceEngine.calculateSplits(90000, "itemized", base, users).map { it.amountPaise })
        assertEquals(100001L, BalanceEngine.calculateSplits(100001, "itemized", base, users).sumOf { it.amountPaise })
    }
    @Test fun zeroAndNegativeSubtotalsCannotSilentlyBecomeEqualSplits() {
        assertTrue(runCatching { BalanceEngine.calculateSplits(100, "itemized", mapOf("a" to 0.0), listOf("a")) }.isFailure)
        assertTrue(runCatching { BalanceEngine.calculateSplits(100, "itemized", mapOf("a" to -1.0, "b" to 2.0), listOf("a", "b")) }.isFailure)
    }
    @Test fun quietHoursSnoozeLogoutAndRateLimitSuppressReminders() {
        val now = 20 * ReminderPolicy.DAY
        fun reason(enabled: Boolean = true, signedIn: Boolean = true, hour: Int = 12, last: Long = 0, snooze: Long = 0) =
            ReminderPolicy.reason(enabled, signedIn, now, hour, ReminderPolicy.DAY, last, snooze, 0, 0)
        assertEquals("review", reason())
        assertNull(reason(enabled = false)); assertNull(reason(signedIn = false))
        assertNull(reason(hour = 8)); assertNull(reason(hour = 20))
        assertNull(reason(last = now - 1000)); assertNull(reason(snooze = now + 1000))
    }
    @Test fun onlyOldPendingChangesTriggerSyncReview() {
        val now = 5 * ReminderPolicy.DAY
        assertEquals("sync", ReminderPolicy.reason(true, true, now, 14, now, 0, 0, 1, now - 2 * ReminderPolicy.DAY))
        assertNull(ReminderPolicy.reason(true, true, now, 14, now, 0, 0, 1, now - 1000))
        assertNull(ReminderPolicy.reason(true, true, now, 14, now, 0, 0, 0, 0))
    }
}
