package com.paymatrix.app.data

import com.paymatrix.app.domain.Money
import java.time.Instant
import java.util.Locale

data class LogCatalogItem(
    val id: String,
    val name: String,
    val kind: String,
    val archived: Boolean = false,
    val persisted: Boolean = false,
)

object LogDefaults {
    val accounts = listOf("Cash", "UPI", "Bank", "Credit Card", "Wallet").map {
        LogCatalogItem("account_${it.lowercase(Locale.ROOT).replace(" ", "_")}", it, "account")
    }
    val categories = listOf("Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Education", "Travel", "Fuel", "Subscriptions", "Rent", "Groceries", "Other").map {
        LogCatalogItem("category_${it.lowercase(Locale.ROOT)}", it, "category")
    }
    val catalog = accounts + categories
}

data class LogTransactionDraft(
    val amount: String = "",
    val title: String = "",
    val category: String = "Other",
    val categoryId: String = "category_other",
    val accountId: String = "account_cash",
    val accountName: String = "Cash",
    val transactionType: String = "expense",
    val currency: String = "INR",
    val toAccountId: String = "",
    val toAccountName: String = "",
    val note: String = "",
    val place: String = "",
    val date: String = Instant.now().toString(),
    val friendId: String = "",
    val friendName: String = "",
    val sourceGroupId: String = "",
    val sourceGroupName: String = "",
    val sourceExpenseId: String = "",
) {
    fun fields(): Map<String, Any> {
        val paise = Money.toPaise(amount)
        require(paise in 1..100_000_000L) { "Enter an amount between ₹0.01 and ₹10,00,000." }
        require(currency == "INR") { "Only INR entry is supported at present." }
        require(transactionType in listOf("expense", "income", "transfer")) { "Choose a transaction type." }
        require(accountId.isNotBlank()) { "Choose an account." }
        require(transactionType == "transfer" || categoryId.isNotBlank()) { "Choose a category." }
        require(transactionType != "transfer" || (toAccountId.isNotBlank() && toAccountId != accountId)) { "Choose two different accounts." }
        Instant.parse(date)
        val resolvedTitle = title.trim().ifBlank { if (transactionType == "transfer") "Account transfer" else category }
        require(resolvedTitle.length in 1..100 && note.length <= 500 && place.length <= 100 && friendName.length <= 100) { "Shorten the title, note or reference." }
        return mapOf(
            "title" to resolvedTitle, "amountPaise" to paise, "amount" to paise / 100.0,
            "currency" to currency, "transactionType" to transactionType,
            "accountId" to accountId, "accountName" to accountName,
            "categoryId" to categoryId, "category" to category,
            "toAccountId" to if (transactionType == "transfer") toAccountId else "",
            "toAccountName" to if (transactionType == "transfer") toAccountName else "",
            "note" to note.trim(), "place" to place.trim(), "date" to date,
            "friendId" to friendId, "friendName" to friendName.trim(),
        )
    }

    companion object {
        fun from(entry: LogEntry, duplicate: Boolean = false) = LogTransactionDraft(
            amount = java.math.BigDecimal.valueOf(entry.amountPaise, 2).toPlainString(),
            title = entry.title, category = entry.category,
            categoryId = entry.categoryId.ifBlank { "category_${entry.category.lowercase(Locale.ROOT)}" },
            accountId = entry.accountId, accountName = entry.accountName,
            transactionType = entry.transactionType, currency = entry.currency,
            toAccountId = entry.toAccountId, toAccountName = entry.toAccountName,
            note = entry.note, place = entry.place,
            date = if (duplicate) Instant.now().toString() else runCatching { Instant.parse(entry.date).toString() }.getOrElse { java.time.LocalDate.parse(entry.date.take(10)).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toString() },
            friendId = entry.friendId, friendName = entry.friendName,
            sourceGroupId = entry.sourceGroupId, sourceGroupName = entry.sourceGroupName, sourceExpenseId = entry.sourceExpenseId,
        )
    }
}
