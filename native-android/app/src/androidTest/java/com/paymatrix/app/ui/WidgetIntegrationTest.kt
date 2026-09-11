package com.paymatrix.app.ui

import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import androidx.test.platform.app.InstrumentationRegistry
import com.paymatrix.app.widget.QuickAccessWidget
import org.junit.Assert.*
import org.junit.Test

class WidgetIntegrationTest {
    @Test fun previewsRenderBothThemesAndExportRealWidgetImages() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val folder = java.io.File(context.getExternalFilesDir(null), "widget-qa").apply { mkdirs() }
        val group = com.paymatrix.app.widget.WidgetGroup("sample", "Weekend trip", -125000)
        val saved = com.paymatrix.app.widget.WidgetSnapshot("sample", listOf(group), 240000, 125000, "2026-09-09T08:00:00Z", 0)
        for (dark in listOf(false, true)) for (isGroup in listOf(false, true)) {
            instrumentation.runOnMainSync {
                val parent = android.widget.FrameLayout(context)
                val views = QuickAccessWidget.render(context, isGroup, saved, if (isGroup) group else null, dark)
                val view = views.apply(context, parent)
                val width = 960; val height = 660
                view.measure(android.view.View.MeasureSpec.makeMeasureSpec(width, android.view.View.MeasureSpec.EXACTLY), android.view.View.MeasureSpec.makeMeasureSpec(height, android.view.View.MeasureSpec.EXACTLY))
                view.layout(0, 0, width, height)
                val bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888)
                view.draw(android.graphics.Canvas(bitmap))
                java.io.File(folder, "${if (dark) "dark" else "light"}-${if (isGroup) "group" else "summary"}.png").outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
                assertEquals(if (isGroup) "Weekend trip" else "Overall summary", view.findViewById<android.widget.TextView>(com.paymatrix.app.R.id.widget_title).text.toString())
                assertEquals(if (isGroup) "Add expense" else "Open app", view.findViewById<android.widget.TextView>(com.paymatrix.app.R.id.widget_open).text.toString())
            }
        }
        instrumentation.runOnMainSync {
            val parent = android.widget.FrameLayout(context)
            val view = QuickAccessWidget.render(context, true, null, null).apply(context, parent)
            assertEquals("—", view.findViewById<android.widget.TextView>(com.paymatrix.app.R.id.widget_balance).text.toString())
            assertEquals("Sign in", view.findViewById<android.widget.TextView>(com.paymatrix.app.R.id.widget_open).text.toString())
        }
    }

    @Test fun widgetBindsThroughAndroidAndUpdatesWithoutNetwork() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val manager = AppWidgetManager.getInstance(context)
        val host = AppWidgetHost(context, 23000)
        instrumentation.uiAutomation.adoptShellPermissionIdentity("android.permission.BIND_APPWIDGET")
        for (provider in listOf(QuickAccessWidget::class.java, com.paymatrix.app.widget.GroupBalanceWidget::class.java)) {
        val id = host.allocateAppWidgetId()
        try {
            assertTrue(manager.bindAppWidgetIdIfAllowed(id, ComponentName(context, provider)))
            QuickAccessWidget.refresh(context)
            val info = manager.getAppWidgetInfo(id)
            assertNotNull(info)
            assertEquals(0, info.updatePeriodMillis)
            assertTrue(info.previewImage != 0)
            if (provider == com.paymatrix.app.widget.GroupBalanceWidget::class.java) {
                assertNotNull(info.configure)
                com.paymatrix.app.widget.WidgetStore.configure(context, id, "owner-a", "group-a")
                assertEquals("group-a", com.paymatrix.app.widget.WidgetStore.groupId(context, id, "owner-a"))
                assertNull(com.paymatrix.app.widget.WidgetStore.groupId(context, id, "owner-b"))
                com.paymatrix.app.widget.WidgetStore.delete(context, id)
                assertNull(com.paymatrix.app.widget.WidgetStore.groupId(context, id, "owner-a"))
            }
            instrumentation.runOnMainSync {
                val view = host.createView(context, id, info)
                assertEquals(id, view.appWidgetId)
            }
        } finally {
            host.deleteAppWidgetId(id)
        }
        }
        instrumentation.uiAutomation.dropShellPermissionIdentity()
    }
}
