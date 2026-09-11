package com.paymatrix.app.data

import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.QuerySnapshot
import com.google.firebase.firestore.Source
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

/** Display-only reads: bound the network wait, retaining Firestore's background request.
 * Mutation validation must continue to use authoritative reads/transactions.
 */
internal suspend fun Query.displaySnapshot(onCached: () -> Unit = {}): QuerySnapshot {
    val startTime = System.currentTimeMillis()
    val request = get()
    val result = withTimeoutOrNull(1_500) { request.await() } ?: run {
        val cached = get(Source.CACHE).await()
        if (!cached.isEmpty) cached else request.await()
    }
    val elapsed = System.currentTimeMillis() - startTime
    val fromCache = result.metadata.isFromCache
    if (fromCache) onCached()
    FirebaseInstrumentation.recordRead(
        count = result.documents.size,
        fromCache = fromCache,
        latencyMs = elapsed,
        signature = "query:displaySnapshot"
    )
    return result
}

internal suspend fun DocumentReference.displaySnapshot(onCached: () -> Unit = {}): DocumentSnapshot {
    val startTime = System.currentTimeMillis()
    val request = get()
    val result = withTimeoutOrNull(1_500) { request.await() } ?: run {
        val cached = runCatching { get(Source.CACHE).await() }.getOrNull()
        cached?.takeIf { it.exists() } ?: request.await()
    }
    val elapsed = System.currentTimeMillis() - startTime
    val fromCache = result.metadata.isFromCache
    if (fromCache) onCached()
    FirebaseInstrumentation.recordRead(
        count = 1,
        fromCache = fromCache,
        latencyMs = elapsed,
        signature = "doc:${this.path}"
    )
    return result
}

