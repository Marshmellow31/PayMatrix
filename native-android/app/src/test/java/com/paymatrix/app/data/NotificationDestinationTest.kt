package com.paymatrix.app.data

import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationDestinationTest {
    @Test fun friendEventsOverrideLegacyDashboardLink() {
        listOf("friend_request", "friend_accepted").forEach {
            assertEquals("friends", NotificationDestination.resolve(type = it, url = "/dashboard"))
        }
    }
    @Test fun groupEventsAndWebLinksOpenNativeGroupRoute() {
        assertEquals("group/trip_1", NotificationDestination.resolve(groupId = "trip_1"))
        assertEquals("group/trip_1", NotificationDestination.resolve(url = "/groups/trip_1"))
        assertEquals("group/trip_1", NotificationDestination.resolve(url = "group/trip_1"))
        assertEquals("friends", NotificationDestination.resolve(url = "https://paymatrixapp.online/friends"))
        assertEquals("friends", NotificationDestination.resolve(url = "https://pay-matrix.vercel.app/friends"))
    }
    @Test fun widgetActionsRetainGroupContext() {
        assertEquals("expense/trip_1", NotificationDestination.resolve(url = "expense/trip_1"))
        assertEquals("scanner?groupId=trip_1", NotificationDestination.resolve(url = "scanner?groupId=trip_1"))
        assertEquals("scanner", NotificationDestination.resolve(url = "scanner?groupId=../private"))
    }
    @Test fun unsafeAndUnknownLinksFallBack() {
        listOf("https://evil.test/friends", "//evil.test/friends", "javascript:alert(1)", "/admin", "/groups/a/b").forEach {
            assertEquals("dashboard", NotificationDestination.resolve(url = it))
        }
    }
}
