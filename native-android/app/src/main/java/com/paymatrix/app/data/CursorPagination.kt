package com.paymatrix.app.data

/**
 * Deterministic cursor pagination for PayMatrix native Android.
 *
 * Requirements:
 * - Expenses: newest 50 initially, then 25 per page.
 * - Settlements: newest 30 initially, then 25 per page.
 * - Audit logs: newest 50 initially, then 50 per page.
 * - Notifications: newest 30 initially, then 30 per page.
 * - Use createdAt descending with document ID as deterministic secondary cursor.
 * - Handle legacy records missing createdAt without losing or duplicating records.
 */
object CursorPagination {
    const val EXPENSES_INITIAL = 50
    const val EXPENSES_PAGE = 25

    const val SETTLEMENTS_INITIAL = 30
    const val SETTLEMENTS_PAGE = 25

    const val LOGS_INITIAL = 50
    const val LOGS_PAGE = 50

    const val NOTIFICATIONS_INITIAL = 30
    const val NOTIFICATIONS_PAGE = 30

    data class Cursor(val createdAtMillis: Long, val id: String)

    data class PageResult<T>(
        val items: List<T>,
        val nextCursor: Cursor?,
        val hasMore: Boolean,
        val totalCount: Int
    )

    fun parseEpochMillis(value: Any?): Long {
        if (value == null) return 0L
        if (value is Number) return value.toLong()
        if (value is com.google.firebase.Timestamp) return value.toDate().time
        if (value is java.util.Date) return value.time
        val str = value.toString().trim()
        if (str.isEmpty()) return 0L
        return try {
            java.time.Instant.parse(str).toEpochMilli()
        } catch (_: Exception) {
            try {
                str.toLong()
            } catch (_: Exception) {
                0L
            }
        }
    }

    /**
     * Deterministic comparison:
     * 1. Primary: createdAtMillis descending (newest first; legacy/missing timestamps = 0L come last).
     * 2. Secondary: document ID descending (deterministic secondary cursor tiebreaker).
     */
    fun compareRecords(timeA: Long, idA: String, timeB: Long, idB: String): Int {
        if (timeA != timeB) {
            return timeB.compareTo(timeA)
        }
        return idB.compareTo(idA)
    }

    /**
     * Checks if candidate is strictly after cursor in descending order.
     */
    fun isAfterCursor(candidateTime: Long, candidateId: String, cursor: Cursor): Boolean {
        if (candidateTime < cursor.createdAtMillis) return true
        if (candidateTime > cursor.createdAtMillis) return false
        return candidateId.compareTo(cursor.id) < 0
    }

    /**
     * Paginates items in-memory or from local cache while preserving legacy records.
     * Deduplicates items by idSelector.
     */
    fun <T> paginate(
        allItems: List<T>,
        timeSelector: (T) -> Long,
        idSelector: (T) -> String,
        cursor: Cursor? = null,
        limit: Int = 50
    ): PageResult<T> {
        val seen = mutableSetOf<String>()
        val deduplicated = mutableListOf<T>()
        for (item in allItems) {
            val id = idSelector(item)
            if (id.isEmpty() || seen.add(id)) {
                deduplicated.add(item)
            }
        }

        deduplicated.sortWith { a, b ->
            compareRecords(timeSelector(a), idSelector(a), timeSelector(b), idSelector(b))
        }

        var startIndex = 0
        if (cursor != null) {
            val matchIdx = deduplicated.indexOfFirst {
                timeSelector(it) == cursor.createdAtMillis && idSelector(it) == cursor.id
            }
            if (matchIdx != -1) {
                startIndex = matchIdx + 1
            } else {
                val nextIdx = deduplicated.indexOfFirst {
                    isAfterCursor(timeSelector(it), idSelector(it), cursor)
                }
                startIndex = if (nextIdx != -1) nextIdx else deduplicated.size
            }
        }

        val pageItems = deduplicated.drop(startIndex).take(limit)
        val nextItem = pageItems.lastOrNull()
        val nextCursor = nextItem?.let {
            Cursor(timeSelector(it), idSelector(it))
        }
        val hasMore = startIndex + limit < deduplicated.size

        return PageResult(
            items = pageItems,
            nextCursor = nextCursor,
            hasMore = hasMore,
            totalCount = deduplicated.size
        )
    }
}
