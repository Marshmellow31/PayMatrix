package com.paymatrix.app.domain

import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.*

/**
 * StreakManager
 * Manages zero-debt streaks and gamification state stored safely in local device SharedPreferences
 */
class StreakManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("paymatrix_gamification_v3", Context.MODE_PRIVATE)
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    fun getStreakCount(): Int = prefs.getInt("streak_count", 0)
    fun getKarmaXp(): Int = prefs.getInt("karma_xp", 0)

    fun recordAction(actionType: String = "SETTLE"): Int {
        val today = dateFormat.format(Date())
        val lastDate = prefs.getString("last_active_date", "")
        var currentStreak = getStreakCount()
        var currentXp = getKarmaXp()

        // Increment XP
        val addedXp = when (actionType) {
            "SETTLE" -> 25
            "EXPENSE_ADD" -> 10
            else -> 5
        }
        currentXp += addedXp

        // Evaluate streak
        if (lastDate.isNullOrEmpty()) {
            currentStreak = 1
        } else if (lastDate != today) {
            try {
                val lastCal = Calendar.getInstance().apply { time = dateFormat.parse(lastDate) ?: Date() }
                val todayCal = Calendar.getInstance().apply { time = dateFormat.parse(today) ?: Date() }
                val diffDays = ((todayCal.timeInMillis - lastCal.timeInMillis) / (1000 * 60 * 60 * 24)).toInt()

                currentStreak = when (diffDays) {
                    1 -> currentStreak + 1
                    else -> 1 // Reset if skipped a day
                }
            } catch (e: Exception) {
                currentStreak = 1
            }
        }

        prefs.edit()
            .putInt("streak_count", currentStreak)
            .putInt("karma_xp", currentXp)
            .putString("last_active_date", today)
            .apply()

        return currentStreak
    }
}
