package com.paymatrix.app.data

import androidx.credentials.exceptions.GetCredentialException
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException

class StaleEditConflictException(message: String = "This transaction was modified by another member. Please refresh before saving.") : Exception(message)
class RapidMutationThrottleException(message: String = "Please wait a moment before modifying this transaction again.") : Exception(message)

internal fun isGoogleReauthFailure(error: Throwable): Boolean =
    error is GetCredentialException && error.message.orEmpty().contains("reauth", ignoreCase = true)

internal fun actionErrorMessage(error: Throwable): String = when (error) {
    is StaleEditConflictException -> error.message ?: "This transaction was modified by another member. Please refresh before saving."
    is RapidMutationThrottleException -> error.message ?: "Please wait a moment before modifying this transaction again."
    is ConcurrentModificationException -> error.message ?: "This transaction was modified by another member. Please refresh before saving."
    is TimeoutCancellationException -> "Action timed out. Check your connection and try again."
    is FirebaseFirestoreException -> when (error.code) {
        FirebaseFirestoreException.Code.PERMISSION_DENIED -> "You don't have permission to make this change. Refresh and check your group access."
        FirebaseFirestoreException.Code.UNAVAILABLE, FirebaseFirestoreException.Code.DEADLINE_EXCEEDED -> "Unable to reach the server. Check your connection and sync status before trying again."
        FirebaseFirestoreException.Code.ABORTED, FirebaseFirestoreException.Code.FAILED_PRECONDITION -> "This record changed or could not be updated. Refresh before trying again."
        FirebaseFirestoreException.Code.UNAUTHENTICATED -> "Your session needs to be refreshed. Sign in again."
        else -> "The server could not complete this action. Please try again."
    }
    is FirebaseAuthException -> when (error.errorCode) {
        "ERROR_EMAIL_ALREADY_IN_USE", "ERROR_ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL" -> "This email already has an account. Use its existing sign-in method."
        "ERROR_WRONG_PASSWORD", "ERROR_INVALID_CREDENTIAL", "ERROR_USER_NOT_FOUND" -> "Incorrect email or password. Please try again."
        "ERROR_INVALID_EMAIL" -> "Enter a valid email address."
        "ERROR_WEAK_PASSWORD" -> "Choose a stronger password with at least 8 characters."
        "ERROR_TOO_MANY_REQUESTS" -> "Too many attempts. Please wait before trying again."
        else -> "Authentication could not complete. Please try again."
    }
    is FirebaseNetworkException -> "Check your internet connection and try again."
    is GetCredentialException -> if (isGoogleReauthFailure(error))
        "Google could not refresh this account after retrying. Try another Google account or use email sign-in."
        else "Google sign-in could not complete. Check your connection and try again."
    is IllegalArgumentException -> error.message?.takeIf { it.length < 200 } ?: "Please check the entered values."
    is IllegalStateException -> error.message?.takeIf { it.length < 200 && !it.contains("Exception") && !Regex("\\b[a-z][0-9]+\\b").containsMatchIn(it) }
        ?: "Unable to complete this action. Please refresh and try again."
    else -> "Unable to complete this action. Please refresh and try again."
}

internal fun rethrowCancellation(error: Throwable) {
    if (error is TimeoutCancellationException) return
    if (error is CancellationException) throw error
}
