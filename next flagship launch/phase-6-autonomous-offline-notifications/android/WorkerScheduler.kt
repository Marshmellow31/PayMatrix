package com.paymatrix.app.workers

import android.content.Context
import androidx.work.*
import java.util.concurrent.TimeUnit

/**
 * WorkerScheduler
 * Enqueues battery-efficient WorkManager jobs for background ledger auditing
 */
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
