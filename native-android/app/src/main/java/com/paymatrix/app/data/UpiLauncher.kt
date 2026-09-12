package com.paymatrix.app.data

import android.content.Context
import android.content.Intent
import android.net.Uri

object UpiLauncher {
    fun getUpiUri(upiId: String, name: String, amountPaise: Long, note: String = "Settled up"): Uri {
        val cleanUpi = upiId.trim()
        val cleanName = name.trim().take(80)
        val cleanNote = note.trim().take(80).ifBlank { "Settled up" }
        val amountStr = "%.2f".format(java.util.Locale.US, amountPaise / 100.0)
        return Uri.Builder()
            .scheme("upi")
            .authority("pay")
            .appendQueryParameter("pa", cleanUpi)
            .appendQueryParameter("pn", cleanName)
            .appendQueryParameter("am", amountStr)
            .appendQueryParameter("cu", "INR")
            .appendQueryParameter("tn", cleanNote)
            .build()
    }

    fun getUpiString(upiId: String, name: String, amountPaise: Long, note: String = "Settled up"): String {
        return getUpiUri(upiId, name, amountPaise, note).toString()
    }

    fun pay(context: Context, upiId: String, name: String, amountPaise: Long, note: String, googlePayOnly: Boolean = false): Boolean {
        require(Regex("^[\\w.-]+@[\\w.-]+$", RegexOption.IGNORE_CASE).matches(upiId.trim())) { "Recipient has no valid UPI ID." }
        require(amountPaise > 0) { "Amount must be positive." }
        val uri = getUpiUri(upiId, name, amountPaise, note)
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            if (googlePayOnly) setPackage("com.google.android.apps.nbu.paisa.user")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return try {
            val chooser = Intent.createChooser(intent, "Pay via UPI App").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
            true
        } catch (e: Exception) {
            try {
                context.startActivity(intent)
                true
            } catch (ex: Exception) {
                false
            }
        }
    }
}
