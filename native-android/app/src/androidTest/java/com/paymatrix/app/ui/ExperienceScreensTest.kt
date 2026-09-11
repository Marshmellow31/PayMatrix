package com.paymatrix.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.navigation.compose.rememberNavController
import androidx.test.platform.app.InstrumentationRegistry
import com.paymatrix.app.*
import com.paymatrix.app.data.*
import com.paymatrix.app.ui.theme.PayMatrixTheme
import org.junit.Rule
import org.junit.Test
import java.io.File

class ExperienceScreensTest {
    @get:Rule val compose = createComposeRule()
    @Test fun captureRealScreensInBothAppearancesWithSyntheticData() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val vm = PayMatrixViewModel((context.applicationContext as PayMatrixApplication).container)
        val a = UserProfile(uid = "sample-a", name = "Asha", email = "asha@example.invalid")
        val b = UserProfile(uid = "sample-b", name = "Dev", email = "dev@example.invalid")
        val group = Group(id = "sample-group", name = "Weekend away", category = "Travel", members = listOf(a.uid, b.uid), admin = a.uid)
        val expense = Expense(id = "sample-expense", groupId = group.id, title = "Groceries & essentials", amountPaise = 105000, paidBy = a.uid, paidByName = a.name,
            splitType = "itemized", participants = group.members, splits = listOf(Split(a.uid, 63000, dishPaise = 60000), Split(b.uid, 42000, dishPaise = 40000)), date = "2026-09-08T12:00:00Z")
        val snapshot = GroupSnapshot(group, mapOf(a.uid to a, b.uid to b), listOf(expense), emptyList(), mapOf(a.uid to 42000L, b.uid to -42000L), listOf(Debt(b.uid, a.uid, 42000)), activity = listOf(
            ActivityItem("sample-log", "expense_added", "Asha added Groceries & essentials", a.uid, a.name, expense.id, group.id, "2026-09-09T08:00:00Z")))
        val state = PayMatrixState(user = a, groups = listOf(group), friends = listOf(b), group = snapshot, groupCache = mapOf(group.id to snapshot),
            summary = DashboardSummary(totalOwedPaise = 42000, netBalancePaise = 42000, totalSharedPaise = 105000, groupBalances = mapOf(group.id to 42000L)))
        val screen = mutableStateOf("home")
        val dark = mutableStateOf(false)
        compose.setContent {
            PayMatrixTheme(darkOverride = dark.value) {
                val nav = rememberNavController()
                Column(Modifier.fillMaxSize().background(CanvasBlack).statusBarsPadding()) {
                    Text("SYNTHETIC QA • ${screen.value}", color = QuietText, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(8.dp))
                    Box(Modifier.weight(1f)) {
                        key(screen.value, dark.value) {
                            when (screen.value) {
                                "home" -> MainShell("dashboard", state, nav) { DashboardScreen(state, nav) }
                                "groups" -> MainShell("groups", state, nav) { GroupsScreen(state, vm, nav) }
                                "friends" -> MainShell("friends", state, nav) { FriendsScreen(state, vm, nav) }
                                "logs" -> MainShell("logs", state, nav) { LogGroupsScreen(state, vm, nav) }
                                "profile" -> MainShell("profile", state, nav) { ProfileScreen(state, vm, nav) }
                                "group" -> GroupScreen(group.id, state, vm, nav)
                                "expense" -> ExpenseFormScreen(group.id, expense.id, state, vm, nav)
                                "settings" -> Column(Modifier.verticalScroll(rememberScrollState()).padding(20.dp)) { DeviceSettings() }
                                "items" -> Column(Modifier.verticalScroll(rememberScrollState()).padding(20.dp)) { ItemSplitExplanation(105000, mapOf(a.uid to 60000, b.uid to 40000), snapshot.profiles) }
                                "login" -> LoginScreen(PayMatrixState(), vm, nav)
                                "activity" -> ActivityScreen(state, vm, nav)
                                "notifications" -> NotificationsScreen(state, vm, nav)
                                "analytics" -> AnalyticsScreen(state, vm, nav)
                                "scanner" -> ScannerScreen(state, vm, nav)
                                "terms" -> TermsScreen(nav)
                                "privacy" -> PrivacyScreen(nav)
                            }
                        }
                    }
                }
            }
        }
        val folder = File(context.getExternalFilesDir(null), "experience-qa").apply { mkdirs() }
        fun capture(name: String) {
            compose.waitForIdle()
            val bitmap = if (name.endsWith("member-details")) instrumentation.uiAutomation.takeScreenshot() else compose.onAllNodes(isRoot()).onLast().captureToImage().asAndroidBitmap()
            File(folder, name + ".png").outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
        }
        for (appearance in listOf(false, true)) {
            for (route in listOf("home", "groups", "friends", "logs", "profile", "group", "expense", "settings", "items", "login", "activity", "notifications", "analytics", "scanner", "terms", "privacy")) {
                compose.runOnIdle { dark.value = appearance; screen.value = route }
                capture("${if (appearance) "dark" else "light"}-$route")
                if (route == "group") {
                    compose.onNodeWithText("Members").performClick()
                    capture("${if (appearance) "dark" else "light"}-members")
                    compose.onAllNodes(hasScrollAction()).onFirst().performScrollToNode(hasText(b.name))
                    compose.onNodeWithText(b.name).performClick()
                    compose.onNodeWithText("Done").performScrollTo().assertIsDisplayed()
                    capture("${if (appearance) "dark" else "light"}-member-details")
                    compose.onNodeWithText("Done").performClick()
                    compose.onAllNodes(hasScrollAction()).onFirst().performScrollToNode(hasText("Logs"))
                    compose.onNodeWithText("Logs").performClick()
                    capture("${if (appearance) "dark" else "light"}-group-logs")
                }
                if (route == "items") {
                    compose.onNodeWithText("A simple example").assertDoesNotExist()
                    compose.onNodeWithText("How it works").performClick()
                    compose.onNodeWithText("A simple example").assertExists()
                    compose.onNodeWithText("Got it").performScrollTo().performClick()
                    compose.onNodeWithText("A simple example").assertDoesNotExist()
                }
                if (route == "expense") {
                    compose.onNodeWithText("Next: Who Paid").performClick()
                    capture("${if (appearance) "dark" else "light"}-expense-payers")
                    compose.onNodeWithText("Next: Split Details").performClick()
                    compose.onNodeWithText("How it works").assertExists()
                    capture("${if (appearance) "dark" else "light"}-expense-split")
                }
            }
        }
    }
}
