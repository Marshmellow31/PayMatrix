package com.paymatrix.app.data

import androidx.credentials.exceptions.GetCredentialCancellationException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

class ActionRecoveryTest {
    @Test fun duplicateSubmissionIsRejectedUntilCompletion() {
        val gate = ForegroundActionGate()
        assertTrue(gate.tryBegin())
        assertFalse(gate.tryBegin())
        gate.finish()
        assertTrue(gate.tryBegin())
    }

    @Test fun reauthFailureClearsStateAndRetriesOnce() = runTest {
        val events = mutableListOf<String>()
        val result = recoverGoogleCredential(
            request = { events.add("request"); throw GetCredentialCancellationException("[16] Account reauth failed.") },
            clearState = { events.add("clear") },
            retry = { events.add("retry"); "credential" },
        )
        assertEquals("credential", result)
        assertEquals(listOf("request", "clear", "retry"), events)
    }

    @Test fun userDismissalDoesNotReopenChooser() = runTest {
        val cancellation = GetCredentialCancellationException("User cancelled")
        try {
            recoverGoogleCredential({ throw cancellation }, { fail("Must not clear") }, { fail("Must not retry") })
            fail("Expected cancellation")
        } catch (error: GetCredentialCancellationException) { assertSame(cancellation, error) }
    }

    @Test fun failedRetryIsReturnedWithoutLooping() = runTest {
        val failure = GetCredentialCancellationException("[16] Account reauth failed.")
        var retries = 0
        try {
            recoverGoogleCredential({ throw failure }, {}, { retries++; throw failure })
            fail("Expected failure")
        } catch (error: GetCredentialCancellationException) { assertSame(failure, error) }
        assertEquals(1, retries)
    }

    @Test fun coroutineCancellationIsNeverPresentedAsAnErrorOrRetried() = runTest {
        val cancellation = CancellationException("y1 was cancelled")
        try {
            recoverGoogleCredential({ throw cancellation }, { fail("Must not clear") }, { fail("Must not retry") })
            fail("Expected cancellation")
        } catch (error: CancellationException) { assertSame(cancellation, error) }
        try { rethrowCancellation(cancellation); fail("Must propagate") }
        catch (error: CancellationException) { assertSame(cancellation, error) }
    }

    @Test fun unknownReleaseExceptionsAreNotShownAsObfuscatedNames() {
        assertFalse(actionErrorMessage(RuntimeException("y1 failed")).contains("y1"))
        assertFalse(actionErrorMessage(IllegalStateException("y1 failed")).contains("y1"))
        assertEquals("Title is required.", actionErrorMessage(IllegalArgumentException("Title is required.")))
    }

    @Test fun staleEditConflictExceptionReturnsActionableMessage() {
        val ex = StaleEditConflictException()
        assertEquals("This transaction was modified by another member. Please refresh before saving.", actionErrorMessage(ex))
        val customEx = StaleEditConflictException("Custom conflict msg")
        assertEquals("Custom conflict msg", actionErrorMessage(customEx))
    }

    @Test fun rapidMutationThrottleExceptionReturnsActionableMessage() {
        val ex = RapidMutationThrottleException()
        assertEquals("Please wait a moment before modifying this transaction again.", actionErrorMessage(ex))
        val customEx = RapidMutationThrottleException("Wait 1 second.")
        assertEquals("Wait 1 second.", actionErrorMessage(customEx))
    }

    @Test fun timeoutCancellationDoesNotRethrowAndMapsToTimeoutMessage() = runTest {
        val timeoutEx = try {
            kotlinx.coroutines.withTimeout(1L) {
                kotlinx.coroutines.delay(50L)
            }
            null
        } catch (e: TimeoutCancellationException) {
            e
        }
        assertNotNull(timeoutEx)
        val timeoutMsg = actionErrorMessage(timeoutEx!!)
        assertEquals("Action timed out. Check your connection and try again.", timeoutMsg)

        // rethrowCancellation must swallow TimeoutCancellationException so ViewModel can show user-facing error
        rethrowCancellation(timeoutEx) // should not throw
    }
}
