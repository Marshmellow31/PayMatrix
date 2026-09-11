package com.paymatrix.app.domain

object ReminderPolicy {
    const val DAY = 86_400_000L
    fun reason(enabled: Boolean, signedIn: Boolean, now: Long, hour: Int, lastVisit: Long,
               lastReminder: Long, snoozeUntil: Long, pending: Int, pendingSince: Long): String? {
        if (!enabled || !signedIn || hour !in 9..19 || now < snoozeUntil) return null
        if (lastReminder > 0 && now - lastReminder < DAY) return null
        if (pending > 0 && pendingSince > 0 && now - pendingSince >= DAY) return "sync"
        if (lastVisit > 0 && now - lastVisit >= 7 * DAY && (lastReminder == 0L || now - lastReminder >= 7 * DAY)) return "review"
        return null
    }
}
