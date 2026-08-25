package com.paymatrix.app.data

data class UserProfile(
    val uid: String = "",
    val name: String = "Member",
    val email: String = "",
    val avatar: String = "",
    val upiId: String = "",
    val phone: String = "",
    val friends: List<String> = emptyList(),
)

data class Group(
    val id: String = "",
    val name: String = "Untitled group",
    val description: String = "",
    val category: String = "Other",
    val members: List<String> = emptyList(),
    val admin: String = "",
    val inviteCode: String = "",
    val status: String = "active",
    val createdAt: String = "",
)

data class Split(
    val user: String,
    val amountPaise: Long,
    val percent: Double? = null,
    val shares: Int? = null,
    val dishPaise: Long? = null,
) {
    val amount: Double get() = amountPaise / 100.0
}

data class Expense(
    val id: String = "",
    val groupId: String = "",
    val title: String = "Expense",
    val description: String = "",
    val amountPaise: Long = 0,
    val currency: String = "INR",
    val paidBy: String = "",
    val paidByName: String = "Member",
    val createdBy: String = "",
    val splitType: String = "equal",
    val participants: List<String> = emptyList(),
    val splits: List<Split> = emptyList(),
    val category: String = "Other",
    val notes: String = "",
    val date: String = "",
    val createdAt: String = "",
    val status: String = "active",
)

data class Settlement(
    val id: String = "",
    val groupId: String = "",
    val payer: String = "",
    val payee: String = "",
    val amountPaise: Long = 0,
    val confirmationStatus: String = "confirmed",
    val status: String = "active",
    val note: String = "",
    val createdAt: String = "",
)

data class Debt(val from: String, val to: String, val amountPaise: Long)

data class FriendRequest(
    val id: String,
    val from: String,
    val to: String,
    val status: String,
    val createdAt: String,
    val profile: UserProfile? = null,
)

data class AppNotification(
    val id: String,
    val title: String,
    val message: String,
    val type: String,
    val isRead: Boolean,
    val createdAt: String,
)

data class LogGroup(
    val id: String,
    val name: String,
    val ownerId: String,
    val members: List<String>,
    val updatedAt: String,
)

data class LogEntry(
    val id: String,
    val title: String,
    val amountPaise: Long,
    val category: String,
    val place: String,
    val note: String,
    val date: String,
    val type: String,
)

data class GroupSnapshot(
    val group: Group,
    val profiles: Map<String, UserProfile>,
    val expenses: List<Expense>,
    val settlements: List<Settlement>,
    val balances: Map<String, Long>,
    val debts: List<Debt>,
)

data class BillScanResult(
    val merchant: String = "",
    val total: String = "",
    val date: String = "",
    val items: List<String> = emptyList(),
)
