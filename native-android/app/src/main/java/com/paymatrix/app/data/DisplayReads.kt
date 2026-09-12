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
    val request = get()
    withTimeoutOrNull(1_500) { request.await() }?.let {
        if (it.metadata.isFromCache) onCached()
        return it
    }
    val cached = get(Source.CACHE).await()
    val result = if (!cached.isEmpty) cached else request.await()
    if (result.metadata.isFromCache) onCached()
    return result
}

internal suspend fun DocumentReference.displaySnapshot(onCached: () -> Unit = {}): DocumentSnapshot {
    val request = get()
    withTimeoutOrNull(1_500) { request.await() }?.let {
        if (it.metadata.isFromCache) onCached()
        return it
    }
    val cached = runCatching { get(Source.CACHE).await() }.getOrNull()
    val result = cached?.takeIf { it.exists() } ?: request.await()
    if (result.metadata.isFromCache) onCached()
    return result
}
