package com.paymatrix.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class ActionFeedbackTest {
    @get:Rule val compose = createComposeRule()

    @Test fun saveDisablesImmediatelyAndEnablesAfterCompletion() {
        val busy = mutableStateOf(false)
        var clicks = 0
        compose.setContent {
            MaterialTheme {
                CompositionLocalProvider(LocalActionBusy provides busy.value) {
                    PrimaryAction("Save expense", { clicks++; busy.value = true })
                }
            }
        }
        compose.onNodeWithText("Save expense").performClick()
        compose.onNodeWithText("Save expense").assertIsNotEnabled()
        compose.runOnIdle { assertEquals(1, clicks); busy.value = false }
        compose.onNodeWithText("Save expense").assertIsEnabled()
    }

    @Test fun savingIndicatorIsVisibleAboveAnOpenForm() {
        compose.setContent {
            MaterialTheme {
                TextEntryDialog("Edit record", "Title", "Save", {}, {})
                BusyOverlay(true, "Saving entry")
            }
        }
        compose.onNodeWithText("Saving entry").assertIsDisplayed()
    }
}
