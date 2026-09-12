package com.paymatrix.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.appwidget.AppWidgetProviderInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import com.paymatrix.app.MainActivity
import com.paymatrix.app.R
import com.paymatrix.app.data.DevicePreferences
import com.paymatrix.app.domain.Money

open class QuickAccessWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { update(context, manager, it, this is GroupBalanceWidget) } }
    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: android.os.Bundle) { update(context, manager, id, this is GroupBalanceWidget) }
    override fun onDeleted(context: Context, ids: IntArray) { ids.forEach { WidgetStore.delete(context, it) } }
    companion object {
        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            listOf(QuickAccessWidget::class.java, GroupBalanceWidget::class.java).forEach { provider ->
                manager.getAppWidgetIds(ComponentName(context, provider)).forEach { update(context, manager, it, provider == GroupBalanceWidget::class.java) }
            }
        }
        fun update(context: Context, manager: AppWidgetManager, id: Int, group: Boolean) {
            val saved = WidgetStore.read(context)?.takeIf { it.uid == com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid }
            val selected = saved?.groups?.firstOrNull { it.id == WidgetStore.groupId(context, id, saved.uid) }
            val views = render(context, group, saved, selected)
            fun open(action: String, destination: String) = PendingIntent.getActivity(context, id,
                Intent(context, MainActivity::class.java).setAction("com.paymatrix.app.WIDGET_${id}_$action")
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    .putExtra("quick_destination", destination).apply {
                        if (group && saved != null && selected != null) { putExtra("widget_id", id); putExtra("widget_action", action) }
                    }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val configure = PendingIntent.getActivity(context, id, Intent(context, WidgetConfigurationActivity::class.java)
                .setAction("com.paymatrix.app.CONFIGURE_$id").putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_root, open("open", if (group) "groups" else "dashboard"))
            views.setOnClickPendingIntent(R.id.widget_configure, configure)
            views.setOnClickPendingIntent(R.id.widget_open, if (group && selected == null && saved != null) configure else open(if (group) "add" else "open", "dashboard"))
            views.setOnClickPendingIntent(R.id.widget_add, if (group && selected == null && saved != null) configure else open(if (group) "scan" else "groups", if (group) "dashboard" else "groups"))
            manager.updateAppWidget(id, views)
        }
        fun render(context: Context, group: Boolean, saved: WidgetSnapshot?, selected: WidgetGroup?, darkOverride: Boolean? = null): RemoteViews {
            val dark = darkOverride ?: when (DevicePreferences.prefs(context).getString("appearance", "system")) {
                "dark" -> true; "light" -> false; else -> context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
            }
            val views = RemoteViews(context.packageName, R.layout.widget_quick_access)
            val ink = Color.parseColor(if (dark) "#F2F0EB" else "#191A18")
            val muted = Color.parseColor(if (dark) "#B8B6B0" else "#62635D")
            val action = Color.parseColor(if (dark) "#DCEEDB" else "#244C35")
            views.setInt(R.id.widget_root, "setBackgroundResource", if (dark) R.drawable.widget_background_dark else R.drawable.widget_background_light)
            for (id in listOf(R.id.widget_title, R.id.widget_balance, R.id.widget_secondary)) views.setTextColor(id, ink)
            for (id in listOf(R.id.widget_hint, R.id.widget_label, R.id.widget_second_label)) views.setTextColor(id, muted)
            views.setTextColor(R.id.widget_configure, action)
            for (id in listOf(R.id.widget_open, R.id.widget_add)) {
                views.setTextColor(id, action)
                views.setInt(id, "setBackgroundResource", if (dark) R.drawable.widget_button_dark else R.drawable.widget_button_light)
            }
            views.setViewVisibility(R.id.widget_configure, if (group && saved != null) View.VISIBLE else View.GONE)
            views.setViewVisibility(R.id.widget_second_column, if (!group && saved != null) View.VISIBLE else View.GONE)
            views.setTextViewText(R.id.widget_title, if (group) selected?.name ?: "Group balance" else "Overall summary")
            val hint = when {
                saved == null -> "Open paymatrix and sign in"
                group && selected == null -> "Group unavailable. Choose a group."
                saved.pending > 0 -> "Saved · ${saved.pending} changes awaiting sync"
                saved.savedAt.isBlank() -> "Saved on this device · tap to refresh"
                else -> "Saved ${runCatching { java.time.Instant.parse(saved.savedAt).atZone(java.time.ZoneId.systemDefault()).format(java.time.format.DateTimeFormatter.ofPattern("d MMM, HH:mm")) }.getOrDefault("")} · tap to refresh"
            }
            views.setTextViewText(R.id.widget_hint, hint)
            views.setTextViewText(R.id.widget_label, if (saved == null) "Your shared expenses" else if (group) when { selected?.balance == null -> "Balance unavailable"; selected.balance > 0 -> "You are owed"; selected.balance < 0 -> "You owe"; else -> "All settled" } else "You owe")
            views.setTextViewText(R.id.widget_balance, if (saved == null || (group && selected?.balance == null)) "—" else Money.format(if (group) kotlin.math.abs(selected!!.balance!!) else saved.owe))
            views.setTextViewText(R.id.widget_secondary, saved?.let { Money.format(it.owed) } ?: "—")
            views.setTextViewText(R.id.widget_open, if (saved == null) "Sign in" else if (group && selected == null) "Choose group" else if (group) "Add expense" else "Open app")
            views.setTextViewText(R.id.widget_add, if (group && selected != null) { if (saved?.scanEnabled == true) "Scan bill" else "Open group" } else "Groups")
            return views
        }
        fun publishPreviews(context: Context) {
            if (Build.VERSION.SDK_INT < 35) return
            val prefs = context.getSharedPreferences("widget_previews", Context.MODE_PRIVATE)
            val version = com.paymatrix.app.BuildConfig.VERSION_CODE
            if (prefs.getInt("version", 0) == version) return
            val manager = AppWidgetManager.getInstance(context)
            val success = runCatching {
                val first = manager.setWidgetPreview(ComponentName(context, QuickAccessWidget::class.java), AppWidgetProviderInfo.WIDGET_CATEGORY_HOME_SCREEN, RemoteViews(context.packageName, R.layout.widget_summary_preview))
                val second = manager.setWidgetPreview(ComponentName(context, GroupBalanceWidget::class.java), AppWidgetProviderInfo.WIDGET_CATEGORY_HOME_SCREEN, RemoteViews(context.packageName, R.layout.widget_group_preview))
                first && second
            }.getOrDefault(false)
            if (success) prefs.edit().putInt("version", version).apply()
        }
    }
}

class GroupBalanceWidget : QuickAccessWidget()
