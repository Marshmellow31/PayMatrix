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

    @Test fun shareAndItemizedSplitsAllocateRemaindersWithoutLosingMoney() {
        val users = listOf("alice", "bob", "carol")
        val shares = BalanceEngine.calculateSplits(10_001, "shares", mapOf("alice" to 2.0, "bob" to 1.0, "carol" to 1.0), users)
        assertEquals(10_001L, shares.sumOf { it.amountPaise })
        assertEquals(listOf(5001L, 2500L, 2500L), shares.map { it.amountPaise })

        val itemized = BalanceEngine.calculateSplits(11_200, "itemized", mapOf("alice" to 60.0, "bob" to 40.0, "carol" to 0.0), users)
        assertEquals(11_200L, itemized.sumOf { it.amountPaise })
        assertEquals(listOf(6720L, 4480L, 0L), itemized.map { it.amountPaise })
    }

    @Test fun deletedFinancialRecordsNeverChangeBalances() {
        val deletedExpense = Expense(paidBy = "alice", status = "deleted", splits = listOf(Split("alice", 2000), Split("bob", 2000)))
        val deletedSettlement = Settlement(payer = "bob", payee = "alice", amountPaise = 2000, confirmationStatus = "confirmed", status = "deleted")
        assertEquals(mapOf("alice" to 0L, "bob" to 0L), BalanceEngine.computeBalances(listOf(deletedExpense), listOf(deletedSettlement), listOf("alice", "bob")))
    }

    @Test fun invalidPercentageAndExactSplitsAreRejected() {
        val users = listOf("alice", "bob")
        assertTrue(runCatching { BalanceEngine.calculateSplits(1000, "percentage", mapOf("alice" to 80.0, "bob" to 10.0), users) }.isFailure)
        assertTrue(runCatching { BalanceEngine.calculateSplits(1000, "exact", mapOf("alice" to 4.0, "bob" to 5.0), users) }.isFailure)
    }

    @Test fun decimalCommaAndThousandsSeparatorsAreParsedCorrectly() {
        assertEquals(1250L, Money.toPaise("12,50"))
        assertEquals(123456L, Money.toPaise("1,234.56"))
        assertEquals(123456L, Money.toPaise("1.234,56"))
        assertEquals(100000L, Money.toPaise("1,000"))
        assertEquals(1250L, Money.toPaise("₹ 12,50"))
    }

    @Test fun allFiveSplitModesConserveTotalPaiseDeterministically() {
        val users = listOf("userA", "userB", "userC")
        val totalPaise = 10001L

        // Equal split
        val equal = BalanceEngine.calculateSplits(totalPaise, "equal", emptyMap(), users)
        assertEquals(totalPaise, equal.sumOf { it.amountPaise })
        assertEquals(listOf(3334L, 3334L, 3333L), equal.map { it.amountPaise })

        // Percentage split (e.g. 50%, 25%, 25%)
        val pct = BalanceEngine.calculateSplits(totalPaise, "percentage", mapOf("userA" to 50.0, "userB" to 25.0, "userC" to 25.0), users)
        assertEquals(totalPaise, pct.sumOf { it.amountPaise })

        // Exact split (50.00 + 25.00 + 25.01 = 100.01)
        val exact = BalanceEngine.calculateSplits(totalPaise, "exact", mapOf("userA" to 50.00, "userB" to 25.00, "userC" to 25.01), users)
        assertEquals(totalPaise, exact.sumOf { it.amountPaise })
        assertEquals(5000L, exact[0].amountPaise)
        assertEquals(2500L, exact[1].amountPaise)
        assertEquals(2501L, exact[2].amountPaise)

        // Shares split (3 shares, 2 shares, 1 share)
        val shares = BalanceEngine.calculateSplits(totalPaise, "shares", mapOf("userA" to 3.0, "userB" to 2.0, "userC" to 1.0), users)
        assertEquals(totalPaise, shares.sumOf { it.amountPaise })
        assertTrue(shares[0].amountPaise > shares[1].amountPaise)
        assertTrue(shares[1].amountPaise > shares[2].amountPaise)

        // Itemized split
        val itemized = BalanceEngine.calculateSplits(totalPaise, "itemized", mapOf("userA" to 50.0, "userB" to 30.0, "userC" to 20.0), users)
        assertEquals(totalPaise, itemized.sumOf { it.amountPaise })
    }
}
