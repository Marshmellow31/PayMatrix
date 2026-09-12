package com.paymatrix.app.data

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.*
import com.paymatrix.app.MainActivity
import com.paymatrix.app.domain.ReminderPolicy
import java.util.concurrent.TimeUnit

class LocalReviewWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val p = DevicePreferences.prefs(applicationContext)
        val now = System.currentTimeMillis()
        val currentUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
        val reason = ReminderPolicy.reason(p.getBoolean("reminders", false), currentUid != null && currentUid == p.getString("uid", null), now,
            java.time.LocalTime.now().hour, p.getLong("lastVisit", 0), p.getLong("lastReminder", 0),
            p.getLong("snoozeUntil", 0), p.getInt("pending", 0), p.getLong("pendingSince", 0)) ?: return Result.success()
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return Result.success()
        val manager = applicationContext.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 24 && !manager.areNotificationsEnabled()) return Result.success()
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel(CHANNEL, "On-device reminders", NotificationManager.IMPORTANCE_DEFAULT).apply { description = "Quiet reminders based only on activity on this device" })
        val open = PendingIntent.getActivity(applicationContext, 230, Intent(applicationContext, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val snooze = PendingIntent.getBroadcast(applicationContext, 231, Intent(applicationContext, ReminderActionReceiver::class.java).setAction("snooze"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val disable = PendingIntent.getBroadcast(applicationContext, 232, Intent(applicationContext, ReminderActionReceiver::class.java).setAction("disable"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val message = if (reason == "sync") "Some changes were waiting to sync last time. Open paymatrix to check." else "A quiet moment to review your shared expenses, whenever you're ready."
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL)
            .setSmallIcon(com.paymatrix.app.R.drawable.ic_local_reminder)
            .setContentTitle("Your paymatrix review").setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setContentIntent(open).setAutoCancel(true).setLocalOnly(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .addAction(0, "Snooze 7 days", snooze).addAction(0, "Turn off", disable).build()
        try { manager.notify(NOTIFICATION_ID, notification); p.edit().putLong("lastReminder", now).apply() }
        catch (_: SecurityException) { /* Permission can be revoked while work runs. */ }
        return Result.success()
    }
    companion object {
        const val NOTIFICATION_ID = 23001
        const val CHANNEL = "local_review"
        fun schedule(context: Context) {
            if (DevicePreferences.prefs(context).getBoolean("reminders", false)) {
                WorkManager.getInstance(context).enqueueUniquePeriodicWork("local-review", ExistingPeriodicWorkPolicy.KEEP,
                    PeriodicWorkRequestBuilder<LocalReviewWorker>(12, TimeUnit.HOURS).build())
            } else {
                WorkManager.getInstance(context).cancelUniqueWork("local-review")
                context.getSystemService(NotificationManager::class.java).cancel(NOTIFICATION_ID)
            }
        }
    }
}

class ReminderActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val p = DevicePreferences.prefs(context)
        when (intent.action) {
            "snooze" -> p.edit().putLong("snoozeUntil", System.currentTimeMillis() + 7 * ReminderPolicy.DAY).apply()
            "disable" -> { p.edit().putBoolean("reminders", false).apply(); LocalReviewWorker.schedule(context) }
        }
        context.getSystemService(NotificationManager::class.java).cancel(LocalReviewWorker.NOTIFICATION_ID)
    }
}
