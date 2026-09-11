package com.paymatrix.app.data

import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class InstrumentationAndPaginationTest {

    @Before
    fun setup() {
        FirebaseInstrumentation.reset(null)
        FirebaseInstrumentation.setUser(null, "user_test_1")
    }

    @Test
    fun testCountersAndCacheDistribution() {
        FirebaseInstrumentation.recordRead(count = 5, fromCache = true, latencyMs = 20, signature = "groups:test_group:expenses")
        FirebaseInstrumentation.recordRead(count = 3, fromCache = false, latencyMs = 80, signature = "groups:test_group:expenses")
        FirebaseInstrumentation.recordWrite(count = 2, signature = "groups:test_group:expenses")

        val metrics = FirebaseInstrumentation.getMetrics()
        assertEquals(8L, metrics["documentReads"])
        assertEquals(5L, metrics["cacheReads"])
        assertEquals(3L, metrics["serverReads"])
        assertEquals(2L, metrics["documentWrites"])
        assertEquals(8L, metrics["returnedDocuments"])
        assertEquals(2L, metrics["queryCount"])
        assertEquals(50.0, metrics["averageQueryLatencyMs"] as Double, 0.01)
        assertEquals(80L, metrics["lastQueryLatencyMs"])
    }

    @Test
    fun testQuerySignatureSanitization() {
        val raw = "users:john.doe@example.com:group_abc12345678901234567:amount: 500.50"
        val sanitized = FirebaseInstrumentation.sanitizeSignature(raw)

        assertFalse(sanitized.contains("john.doe@example.com"))
        assertFalse(sanitized.contains("abc12345678901234567"))
        assertFalse(sanitized.contains("500.50"))
        assertTrue(sanitized.contains("<redacted_email>"))
        assertTrue(sanitized.contains("<id>"))
        assertTrue(sanitized.contains("amount:<num>"))
    }

    @Test
    fun testListenerRegistrationCleanupAndDuplicateDetection() {
        val sig = "notifications:user12345678901234567"
        val unreg1 = FirebaseInstrumentation.registerListener(sig)
        val metrics1 = FirebaseInstrumentation.getMetrics()
        assertEquals(1, metrics1["activeListeners"])
        assertEquals(0L, metrics1["duplicateListenerSignatures"])

        // Duplicate registration with same signature
        val unreg2 = FirebaseInstrumentation.registerListener(sig)
        val metrics2 = FirebaseInstrumentation.getMetrics()
        assertEquals(2, metrics2["activeListeners"])
        assertEquals(1L, metrics2["duplicateListenerSignatures"])

        // Cleanup listener 1
        unreg1()
        val metrics3 = FirebaseInstrumentation.getMetrics()
        assertEquals(1, metrics3["activeListeners"])

        // Cleanup listener 2
        unreg2()
        val metrics4 = FirebaseInstrumentation.getMetrics()
        assertEquals(0, metrics4["activeListeners"])
    }

    @Test
    fun testAccountSwitchingResetsActiveListenersAndScopes() {
        FirebaseInstrumentation.registerListener("groups:group1:logs")
        FirebaseInstrumentation.recordRead(count = 10, fromCache = false)
        val beforeSwitch = FirebaseInstrumentation.getMetrics()
        assertEquals(1, beforeSwitch["activeListeners"])

        // Switch to user 2
        FirebaseInstrumentation.setUser(null, "user_test_2")
        val afterSwitch = FirebaseInstrumentation.getMetrics()
        assertEquals(0, afterSwitch["activeListeners"])
        assertEquals(0L, afterSwitch["documentReads"])

        // Export JSON should never contain UID
        val json = FirebaseInstrumentation.exportJson()
        assertFalse(json.contains("user_test_1"))
        assertFalse(json.contains("user_test_2"))
    }

    @Test
    fun testCursorPaginationWithDeterministicTiebreaker() {
        data class TestRecord(val id: String, val createdAt: String)

        val records = listOf(
            TestRecord("doc_1", "2026-01-01T12:00:00Z"),
            TestRecord("doc_2", "2026-01-01T12:00:00Z"), // identical timestamp, doc_2 > doc_1
            TestRecord("doc_3", "2026-01-01T13:00:00Z"), // newer
            TestRecord("doc_4", "2026-01-01T11:00:00Z"), // older
        )

        val page1 = CursorPagination.paginate(
            allItems = records,
            timeSelector = { CursorPagination.parseEpochMillis(it.createdAt) },
            idSelector = { it.id },
            limit = 2
        )

        assertEquals(2, page1.items.size)
        assertEquals("doc_3", page1.items[0].id)
        assertEquals("doc_2", page1.items[1].id) // doc_2 wins tiebreaker over doc_1
        assertTrue(page1.hasMore)
        assertNotNull(page1.nextCursor)

        val page2 = CursorPagination.paginate(
            allItems = records,
            timeSelector = { CursorPagination.parseEpochMillis(it.createdAt) },
            idSelector = { it.id },
            cursor = page1.nextCursor,
            limit = 2
        )

        assertEquals(2, page2.items.size)
        assertEquals("doc_1", page2.items[0].id)
        assertEquals("doc_4", page2.items[1].id)
        assertFalse(page2.hasMore)
    }

    @Test
    fun testCursorPaginationDeduplicationAndLegacyMissingTimestamps() {
        data class Item(val id: String, val timeStr: String?)

        val items = listOf(
            Item("item_dup", "2026-02-01T10:00:00Z"),
            Item("item_dup", "2026-02-01T10:00:00Z"), // duplicate ID
            Item("legacy_1", null),                    // missing timestamp -> 0L
            Item("legacy_2", ""),                      // empty timestamp -> 0L
            Item("item_normal", "2026-02-02T10:00:00Z")
        )

        val result = CursorPagination.paginate(
            allItems = items,
            timeSelector = { CursorPagination.parseEpochMillis(it.timeStr) },
            idSelector = { it.id },
            limit = 10
        )

        assertEquals(4, result.items.size) // deduplicated 5 -> 4
        assertEquals("item_normal", result.items[0].id)
        assertEquals("item_dup", result.items[1].id)
        // Legacy items ordered at the end deterministically by ID descending ("legacy_2" > "legacy_1")
        assertEquals("legacy_2", result.items[2].id)
        assertEquals("legacy_1", result.items[3].id)
    }

    @Test
    fun testIsAfterCursor() {
        val cursor = CursorPagination.Cursor(1000L, "b")

        // Strictly older timestamp
        assertTrue(CursorPagination.isAfterCursor(999L, "z", cursor))

        // Strictly newer timestamp
        assertFalse(CursorPagination.isAfterCursor(1001L, "a", cursor))

        // Same timestamp, lower ID -> comes after in descending order
        assertTrue(CursorPagination.isAfterCursor(1000L, "a", cursor))

        // Same timestamp, higher ID -> comes before in descending order
        assertFalse(CursorPagination.isAfterCursor(1000L, "c", cursor))
    }
}
