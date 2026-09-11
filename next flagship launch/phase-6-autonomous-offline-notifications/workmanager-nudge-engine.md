# Phase 6: WorkManager Autonomous Nudge Worker Implementation

> **Artifact:** `LocalNudgeWorker.kt`  
> **Scheduling:** Android `WorkManager` with `PeriodicWorkRequestBuilder` (12-hour cadence)

---

## 1. Kotlin Worker Implementation

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/workers/LocalNudgeWorker.kt
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

class LocalNudgeWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val CHANNEL_ID = "paymatrix_nudges"
        const val NOTIFICATION_ID = 2001
    }

    override suspend fun doWork(): Result {
        // Query local storage or DataStore
        // (Runs completely offline without internet or server access)
        val overdueDebtCount = getOverdueDebtCount()

        if (overdueDebtCount > 0) {
            postNudgeNotification(overdueDebtCount)
        }

        return Result.success()
    }

    private fun postNudgeNotification(count: Int) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Settlement Nudges",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Offline notifications for pending group debts"
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

    private fun getOverdueDebtCount(): Int {
        // Simulates querying local room or datastore
        return 1
    }
}
```

---

## 2. Work Scheduler Registration

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/workers/WorkerScheduler.kt
package com.paymatrix.app.workers

import android.content.Context
import androidx.work.*
import java.util.concurrent.TimeUnit

object WorkerScheduler {
    fun schedulePeriodicNudge(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiresBatteryNotLow(true)
            .build()

        val nudgeRequest = PeriodicWorkRequestBuilder<LocalNudgeWorker>(12, TimeUnit.HOURS)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "PayMatrixOfflineNudgeWork",
            ExistingPeriodicWorkPolicy.KEEP,
            nudgeRequest
        )
    }
}
```
