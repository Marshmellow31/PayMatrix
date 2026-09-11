package com.paymatrix.app.workers

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.paymatrix.app.MainActivity
import com.paymatrix.app.R

/**
 * LocalNudgeWorker
 * Evaluates local SQLite/DataStore data completely offline and fires system notifications
 * without requiring internet, FCM, or cloud servers.
 */
class LocalNudgeWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val CHANNEL_ID = "paymatrix_nudges"
        const val NOTIFICATION_ID = 2001
    }

    override suspend fun doWork(): Result {
        // Query local storage safely (never triggers network)
        val overdueDebtCount = getLocalOverdueCount()

        if (overdueDebtCount > 0) {
            postNotification(overdueDebtCount)
        }

        return Result.success()
    }

    private fun postNotification(count: Int) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Settlement Nudges",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Offline scheduled reminders for group balances and debts"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            tapIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Friendly Nudge from Milo 🐧")
            .setContentText("You have $count split pending from a few days ago. Tap to settle up!")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }

    private fun getLocalOverdueCount(): Int {
        val prefs = context.getSharedPreferences("paymatrix_gamification_v3", Context.MODE_PRIVATE)
        return prefs.getInt("local_overdue_count", 1)
    }
}
