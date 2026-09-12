package com.paymatrix.app.ui

import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.navigation.compose.rememberNavController
import androidx.test.platform.app.InstrumentationRegistry
import com.paymatrix.app.*
import com.paymatrix.app.data.*
import com.paymatrix.app.ui.theme.PayMatrixTheme
import org.junit.Rule
import org.junit.Test

class ExpenseHydrationTest {
    @get:Rule val compose = createComposeRule()

    @Test fun lateExpenseHydratesPayersSplitsAndVersionWithoutResettingLaterEdits() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val vm = PayMatrixViewModel((context.applicationContext as PayMatrixApplication).container)
        val a = UserProfile(uid = "test-a", name = "Asha")
        val b = UserProfile(uid = "test-b", name = "Ben")
        val group = Group(id = "hydration-test", name = "Test trip", members = listOf(a.uid, b.uid))
        val empty = GroupSnapshot(group, mapOf(a.uid to a, b.uid to b), emptyList(), emptyList(), emptyMap(), emptyList())
        val current = mutableStateOf(PayMatrixState(user = a, group = empty))
        compose.setContent {
            PayMatrixTheme(darkOverride = false) {
                ExpenseFormScreen(group.id, "expense-test", current.value, vm, rememberNavController())
            }
        }
        compose.onNodeWithText("Next: Who Paid").assertIsNotEnabled()
        val expense = Expense(id = "expense-test", groupId = group.id, title = "Late dinner", amountPaise = 10000,
            paidBy = a.uid, version = 3, participants = group.members, splitType = "percentage",
            payers = listOf(ExpensePayer(a.uid, 6000, 60.0), ExpensePayer(b.uid, 4000, 40.0)),
            splits = listOf(Split(a.uid, 2500, 25.0), Split(b.uid, 7500, 75.0)))
        compose.runOnIdle { current.value = current.value.copy(group = empty.copy(expenses = listOf(expense))) }
        compose.onNodeWithText("Late dinner").assertExists()
        compose.onNodeWithText("Next: Who Paid").assertIsEnabled().performClick()
        compose.onNodeWithText("60.00").assertExists()
        compose.onNodeWithText("40.00").assertExists()
        compose.onNodeWithText("Next: Split Details").assertIsEnabled().performClick()
        compose.onNodeWithText("25.00").assertExists()
        compose.onNodeWithText("75.00").assertExists()
        compose.onNodeWithText("Save changes").assertIsEnabled()
        val warning = "This transaction was updated by another member in the background. Saving may overwrite recent changes."
        compose.onNodeWithText(warning).assertDoesNotExist()
        compose.runOnIdle { current.value = current.value.copy(group = empty.copy(expenses = listOf(expense.copy(version = 4)))) }
        compose.onNodeWithText(warning).assertExists()
        compose.onNodeWithText("25.00").assertExists()
    }
}
