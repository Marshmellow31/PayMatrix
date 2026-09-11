# Phase 6: Exact Alarm Streak Saver Engine

> **Artifact:** `StreakAlarmReceiver.kt` & `AlarmScheduler.kt`  
> **Scheduling:** Android `AlarmManager` with `setExactAndAllowWhileIdle()` (Daily at 8:00 PM)

---

## 1. Broadcast Receiver Implementation

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/workers/StreakAlarmReceiver.kt
package com.paymatrix.app.workers

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.paymatrix.app.MainActivity
import com.paymatrix.app.R

class StreakAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        val channelId = "paymatrix_streaks"
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Streak Protection",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent alerts to preserve your Zero-Debt Streak"
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

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("🔥 Don't lose your 14-day streak!")
            .setContentText("You have pending splits to check before midnight. Tap to protect your streak!")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(context).notify(3001, notification)
    }
}
```

---

## 2. Alarm Registration Engine

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/workers/AlarmScheduler.kt
package com.paymatrix.app.workers

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

object AlarmScheduler {
    fun scheduleDailyStreakReminder(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, StreakAlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            100,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 20) // 8:00 PM
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            if (before(Calendar.getInstance())) {
                add(Calendar.DATE, 1)
            }
        }

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            calendar.timeInMillis,
            pendingIntent
        )
    }
}
```
