package com.paymatrix.app.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

object DevicePreferences {
    private val theme = MutableStateFlow("system")
    val appearance = theme.asStateFlow()
    fun prefs(context: Context) = context.getSharedPreferences("device_experience", Context.MODE_PRIVATE)
    fun initialize(context: Context) { theme.value = prefs(context).getString("appearance", "system") ?: "system" }
    fun setAppearance(context: Context, value: String) {
        require(value in listOf("system", "light", "dark"))
        prefs(context).edit().putString("appearance", value).apply()
        theme.value = value
        com.paymatrix.app.widget.QuickAccessWidget.refresh(context)
    }
    fun recordSession(context: Context, uid: String?, pending: Int) {
        val p = prefs(context)
        if (p.getString("uid", null) != uid) {
            p.edit().remove("lastReminder").remove("snoozeUntil").putInt("pending", 0).putLong("pendingSince", 0).apply()
            context.getSystemService(android.app.NotificationManager::class.java).cancel(LocalReviewWorker.NOTIFICATION_ID)
        }
        val since = if (pending == 0 || uid == null) 0L else p.getLong("pendingSince", 0).takeIf { it > 0 } ?: System.currentTimeMillis()
        p.edit().putString("uid", uid).putInt("pending", pending).putLong("pendingSince", since)
            .putLong("lastVisit", System.currentTimeMillis()).apply()
        if (uid == null || pending == 0) context.getSystemService(android.app.NotificationManager::class.java).cancel(LocalReviewWorker.NOTIFICATION_ID)
        com.paymatrix.app.widget.QuickAccessWidget.refresh(context)
    }
}
