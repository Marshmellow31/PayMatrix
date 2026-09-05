package com.paymatrix.app.data

/** One foreground mutation at a time; background reads do not acquire this gate. */
internal class ForegroundActionGate {
    private var busy = false
    fun tryBegin(): Boolean {
        if (busy) return false
        busy = true
        return true
    }
    fun finish() { busy = false }
}

internal suspend fun <T> recoverGoogleCredential(
    request: suspend () -> T,
    clearState: suspend () -> Unit,
    retry: suspend () -> T,
): T = try {
    request()
} catch (error: Exception) {
    rethrowCancellation(error)
    if (!isGoogleReauthFailure(error)) throw error
    try { clearState() } catch (clearError: Exception) { rethrowCancellation(clearError) }
    // Outside the try block: a failed second request is never retried again.
    retry()
}
