package com.paymatrix.app.domain

import com.paymatrix.app.data.Debt
import com.paymatrix.app.data.Expense
import com.paymatrix.app.data.Settlement
import com.paymatrix.app.data.Split

object BalanceEngine {
    fun calculateSplits(
        totalPaise: Long,
        splitType: String,
        splitValues: Map<String, Double>,
        participants: List<String>,
    ): List<Split> {
        if (participants.isEmpty()) return emptyList()
        return when (splitType) {
            "equal" -> Money.allocate(totalPaise, participants.map { it to 1.0 }).map { Split(it.first, it.second) }
            "percentage" -> {
                val total = participants.sumOf { splitValues[it] ?: 0.0 }
                require(kotlin.math.abs(total - 100.0) <= 0.0001) { "Percentages must total 100%." }
                Money.allocate(totalPaise, participants.map { it to (splitValues[it] ?: 0.0) })
                    .map { Split(it.first, it.second, percent = splitValues[it.first]) }
            }
            "exact" -> {
                val values = participants.map { it to Money.toPaise(splitValues[it] ?: 0.0) }
                require(values.sumOf { it.second } == totalPaise) { "Exact splits must equal the expense total." }
                values.map { Split(it.first, it.second) }
            }
            "shares" -> Money.allocate(totalPaise, participants.map { it to (splitValues[it] ?: 1.0) })
                .map { Split(it.first, it.second, shares = (splitValues[it.first] ?: 1.0).toInt()) }
            "itemized" -> {
                val dishValues = participants.associateWith { Money.toPaise(splitValues[it] ?: 0.0) }
                val weights = if (dishValues.values.sum() <= 0) participants.map { it to 1.0 }
                else participants.map { it to (dishValues[it] ?: 0).toDouble() }
                Money.allocate(totalPaise, weights).map { Split(it.first, it.second, dishPaise = dishValues[it.first]) }
            }
            else -> emptyList()
        }
    }

    fun computeBalances(
        expenses: List<Expense>,
        settlements: List<Settlement>,
        members: List<String>,
    ): Map<String, Long> {
        val balances = members.associateWith { 0L }.toMutableMap()
        expenses.filter { it.status != "deleted" }.forEach { expense ->
            expense.splits.forEach { split ->
                if (expense.paidBy.isNotBlank() && split.user != expense.paidBy) {
                    balances[expense.paidBy] = (balances[expense.paidBy] ?: 0) + split.amountPaise
                    balances[split.user] = (balances[split.user] ?: 0) - split.amountPaise
                }
            }
        }
        settlements.filter {
            it.status != "deleted" && it.payer != it.payee &&
                (it.confirmationStatus.isBlank() || it.confirmationStatus == "confirmed")
        }.forEach { settlement ->
            balances[settlement.payer] = (balances[settlement.payer] ?: 0) + settlement.amountPaise
            balances[settlement.payee] = (balances[settlement.payee] ?: 0) - settlement.amountPaise
        }
        return balances
    }

    fun simplify(balances: Map<String, Long>): List<Debt> {
        data class Balance(val uid: String, var amount: Long)
        val creditors = balances.filterValues { it > 0 }.map { Balance(it.key, it.value) }.sortedByDescending { it.amount }
        val debtors = balances.filterValues { it < 0 }.map { Balance(it.key, -it.value) }.sortedByDescending { it.amount }
        val result = mutableListOf<Debt>()
        var creditor = 0
        var debtor = 0
        while (creditor < creditors.size && debtor < debtors.size) {
            val amount = minOf(creditors[creditor].amount, debtors[debtor].amount)
            if (amount > 0) result += Debt(debtors[debtor].uid, creditors[creditor].uid, amount)
            creditors[creditor].amount -= amount
            debtors[debtor].amount -= amount
            if (creditors[creditor].amount == 0L) creditor += 1
            if (debtors[debtor].amount == 0L) debtor += 1
        }
        return result
    }
}
