package com.paymatrix.app.domain

import com.paymatrix.app.data.Expense
import com.paymatrix.app.data.Settlement
import com.paymatrix.app.data.Split
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BalanceEngineTest {
    @Test fun equalSplitConservesEveryPaise() {
        val splits = BalanceEngine.calculateSplits(10_000, "equal", emptyMap(), listOf("alice", "bob", "carol"))
        assertEquals(listOf(3334L, 3333L, 3333L), splits.map { it.amountPaise })
        assertEquals(10_000L, splits.sumOf { it.amountPaise })
    }

    @Test fun percentageAndExactSplitsMatchWebContract() {
        val users = listOf("alice", "bob", "carol")
        assertEquals(listOf(10_000L, 6_000L, 4_000L), BalanceEngine.calculateSplits(20_000, "percentage", mapOf("alice" to 50.0, "bob" to 30.0, "carol" to 20.0), users).map { it.amountPaise })
        assertEquals(listOf(5_000L, 2_500L, 2_500L), BalanceEngine.calculateSplits(10_000, "exact", mapOf("alice" to 50.0, "bob" to 25.0, "carol" to 25.0), users).map { it.amountPaise })
    }

    @Test fun expenseAndConfirmedSettlementBalanceCorrectly() {
        val expense = Expense(paidBy = "alice", splits = listOf(Split("alice", 3000), Split("bob", 3000)))
        val before = BalanceEngine.computeBalances(listOf(expense), emptyList(), listOf("alice", "bob"))
        assertEquals(mapOf("alice" to 3000L, "bob" to -3000L), before)
        val pending = Settlement(payer = "bob", payee = "alice", amountPaise = 3000, confirmationStatus = "pending")
        assertEquals(before, BalanceEngine.computeBalances(listOf(expense), listOf(pending), listOf("alice", "bob")))
        val confirmed = pending.copy(confirmationStatus = "confirmed")
        assertTrue(BalanceEngine.computeBalances(listOf(expense), listOf(confirmed), listOf("alice", "bob")).values.all { it == 0L })
    }

    @Test fun debtSimplificationMatchesWebContract() {
        val debts = BalanceEngine.simplify(mapOf("alice" to 10_000L, "bob" to -6_000L, "carol" to -4_000L))
        assertEquals(2, debts.size)
        assertEquals(10_000L, debts.sumOf { it.amountPaise })
    }

    @Test fun moneyParserRejectsMoreThanTwoDecimals() {
        assertEquals(12345L, Money.toPaise("123.45"))
        runCatching { Money.toPaise("1.234") }.onSuccess { error("Expected invalid money input") }
    }
}
