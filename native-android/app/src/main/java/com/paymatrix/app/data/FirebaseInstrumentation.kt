package com.paymatrix.app.data

import android.content.Context
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/**
 * Local-only Firebase usage instrumentation for PayMatrix native Android.
 *
 * Scoped by authenticated UID. Stored in SharedPreferences.
 * Privacy invariant: Never uploads instrumentation, and exported data
 * never contains document contents, amounts, email addresses, or user identifiers.
 */
object FirebaseInstrumentation {
    private const val PREFS_PREFIX = "paymatrix_instrumentation_"

    @Volatile
    private var currentUid: String = "anonymous"

    private val documentReads = AtomicLong(0)
    private val documentWrites = AtomicLong(0)
    private val cacheReads = AtomicLong(0)
    private val serverReads = AtomicLong(0)
    private val queryCount = AtomicLong(0)
    private val totalQueryLatencyMs = AtomicLong(0)
    private val lastQueryLatencyMs = AtomicLong(0)
    private val returnedDocuments = AtomicLong(0)
    private val activeListeners = AtomicInteger(0)
    private val duplicateListenerSignatures = AtomicLong(0)

    private val querySignatures = ConcurrentHashMap<String, Long>()
    private val activeListenerSignatures = ConcurrentHashMap<String, Int>()

    fun sanitizeSignature(sig: String): String {
        if (sig.isBlank()) return "unknown_query"
        // Strip emails
        var sanitized = sig.replace(Regex("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"), "<redacted_email>")
        // Strip UUIDs / UIDs
        sanitized = sanitized.replace(Regex("\\b[A-Za-z0-9_-]{20,36}\\b"), "<id>")
        // Strip amounts and numeric filters
        sanitized = sanitized.replace(Regex("(?i)(amount|amountPaise|balance|price)\\s*[:=]\\s*\\d+(\\.\\d+)?"), "$1:<num>")
        return sanitized
    }

    @Synchronized
    fun setUser(context: Context?, uid: String?) {
        val nextUid = if (uid.isNullOrBlank()) "anonymous" else uid
        if (currentUid == nextUid) return

        // Persist previous user's counters
        context?.let { saveToPrefs(it) }

        // Clear active listener tracking on account switch
        activeListeners.set(0)
        activeListenerSignatures.clear()
        duplicateListenerSignatures.set(0)

        // Switch user scope
        currentUid = nextUid

        // Load next user's counters
        if (context != null) {
            loadFromPrefs(context)
        } else {
            resetInMemory()
        }
    }

    fun recordRead(count: Int = 1, fromCache: Boolean = false, latencyMs: Long = 0L, signature: String = "") {
        val docs = count.coerceAtLeast(0).toLong()
        documentReads.addAndGet(docs)
        if (fromCache) {
            cacheReads.addAndGet(docs)
        } else {
            serverReads.addAndGet(docs)
        }
        returnedDocuments.addAndGet(docs)

        if (latencyMs > 0L) {
            queryCount.incrementAndGet()
            totalQueryLatencyMs.addAndGet(latencyMs)
            lastQueryLatencyMs.set(latencyMs)
        }

        if (signature.isNotBlank()) {
            val sanitized = sanitizeSignature(signature)
            querySignatures.compute(sanitized) { _, v -> (v ?: 0L) + 1L }
        }
    }

    fun recordWrite(count: Int = 1, type: String = "write", signature: String = "") {
        val writes = count.coerceAtLeast(1).toLong()
        documentWrites.addAndGet(writes)

        if (signature.isNotBlank()) {
            val sanitized = sanitizeSignature(signature)
            querySignatures.compute("write:$sanitized") { _, v -> (v ?: 0L) + writes }
        }
    }

    fun registerListener(rawSignature: String): () -> Unit {
        val sanitized = sanitizeSignature(rawSignature)
        val prev = activeListenerSignatures.compute(sanitized) { _, v -> (v ?: 0) + 1 } ?: 1
        if (prev > 1) {
            duplicateListenerSignatures.incrementAndGet()
        }
        activeListeners.incrementAndGet()

        var unregistered = false
        return {
            if (!unregistered) {
                unregistered = true
                activeListeners.decrementAndGet()
                activeListenerSignatures.compute(sanitized) { _, v ->
                    val current = v ?: 1
                    if (current <= 1) null else current - 1
                }
            }
        }
    }

    fun getMetrics(): Map<String, Any> {
        val qCount = queryCount.get()
        val totalLat = totalQueryLatencyMs.get()
        val avgLat = if (qCount > 0L) totalLat.toDouble() / qCount else 0.0

        return mapOf(
            "documentReads" to documentReads.get(),
            "documentWrites" to documentWrites.get(),
            "cacheReads" to cacheReads.get(),
            "serverReads" to serverReads.get(),
            "queryCount" to qCount,
            "totalQueryLatencyMs" to totalLat,
            "averageQueryLatencyMs" to avgLat,
            "lastQueryLatencyMs" to lastQueryLatencyMs.get(),
            "returnedDocuments" to returnedDocuments.get(),
            "activeListeners" to activeListeners.get(),
            "duplicateListenerSignatures" to duplicateListenerSignatures.get(),
            "querySignatures" to querySignatures.toMap()
        )
    }

    @Synchronized
    fun reset(context: Context? = null) {
        resetInMemory()
        context?.let {
            val prefs = it.getSharedPreferences("$PREFS_PREFIX$currentUid", Context.MODE_PRIVATE)
            prefs.edit().clear().apply()
        }
    }

    private fun resetInMemory() {
        documentReads.set(0)
        documentWrites.set(0)
        cacheReads.set(0)
        serverReads.set(0)
        queryCount.set(0)
        totalQueryLatencyMs.set(0)
        lastQueryLatencyMs.set(0)
        returnedDocuments.set(0)
        activeListeners.set(0)
        duplicateListenerSignatures.set(0)
        querySignatures.clear()
        activeListenerSignatures.clear()
    }

    /**
     * Strict privacy export: NEVER includes UID, user identifiers, email, document contents, or amounts.
     */
    fun exportJson(): String {
        val qCount = queryCount.get()
        val totalLat = totalQueryLatencyMs.get()
        val avgLat = if (qCount > 0L) totalLat.toDouble() / qCount else 0.0

        val sigLines = if (querySignatures.isEmpty()) "" else {
            querySignatures.entries.joinToString(",\n") { (k, v) ->
                val escapedK = k.replace("\\", "\\\\").replace("\"", "\\\"")
                "    \"$escapedK\": $v"
            }
        }

        val sigSection = if (sigLines.isBlank()) "  \"querySignatures\": {}" else {
            "  \"querySignatures\": {\n$sigLines\n  }"
        }

        return """
{
  "documentReads": ${documentReads.get()},
  "documentWrites": ${documentWrites.get()},
  "cacheReads": ${cacheReads.get()},
  "serverReads": ${serverReads.get()},
  "queryCount": $qCount,
  "totalQueryLatencyMs": $totalLat,
  "averageQueryLatencyMs": $avgLat,
  "lastQueryLatencyMs": ${lastQueryLatencyMs.get()},
  "returnedDocuments": ${returnedDocuments.get()},
  "activeListeners": ${activeListeners.get()},
  "duplicateListenerSignatures": ${duplicateListenerSignatures.get()},
$sigSection
}
""".trim()
    }

    private fun saveToPrefs(context: Context) {
        val prefs = context.getSharedPreferences("$PREFS_PREFIX$currentUid", Context.MODE_PRIVATE)
        prefs.edit()
            .putLong("documentReads", documentReads.get())
            .putLong("documentWrites", documentWrites.get())
            .putLong("cacheReads", cacheReads.get())
            .putLong("serverReads", serverReads.get())
            .putLong("queryCount", queryCount.get())
            .putLong("totalQueryLatencyMs", totalQueryLatencyMs.get())
            .putLong("lastQueryLatencyMs", lastQueryLatencyMs.get())
            .putLong("returnedDocuments", returnedDocuments.get())
            .apply()
    }

    private fun loadFromPrefs(context: Context) {
        val prefs = context.getSharedPreferences("$PREFS_PREFIX$currentUid", Context.MODE_PRIVATE)
        documentReads.set(prefs.getLong("documentReads", 0L))
        documentWrites.set(prefs.getLong("documentWrites", 0L))
        cacheReads.set(prefs.getLong("cacheReads", 0L))
        serverReads.set(prefs.getLong("serverReads", 0L))
        queryCount.set(prefs.getLong("queryCount", 0L))
        totalQueryLatencyMs.set(prefs.getLong("totalQueryLatencyMs", 0L))
        lastQueryLatencyMs.set(prefs.getLong("lastQueryLatencyMs", 0L))
        returnedDocuments.set(prefs.getLong("returnedDocuments", 0L))
    }
}
