package com.paymatrix.app.data

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.paymatrix.app.MainActivity
import com.paymatrix.app.PayMatrixApplication
import com.paymatrix.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class PayMatrixMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        val app = application as? PayMatrixApplication ?: return
        CoroutineScope(Dispatchers.IO).launch { runCatching { app.container.auth.savePushToken(this@PayMatrixMessagingService, token) } }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val manager = getSystemService(NotificationManager::class.java)
        val channelId = "paymatrix_updates"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(NotificationChannel(channelId, "paymatrix updates", NotificationManager.IMPORTANCE_DEFAULT))
        }
        val intent = Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        manager.notify(
            message.messageId?.hashCode() ?: System.currentTimeMillis().toInt(),
            NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.drawable.logo)
                .setContentTitle(message.notification?.title ?: "paymatrix")
                .setContentText(message.notification?.body ?: message.data["message"] ?: "New activity")
                .setContentIntent(pending).setAutoCancel(true).build(),
        )
    }
}
