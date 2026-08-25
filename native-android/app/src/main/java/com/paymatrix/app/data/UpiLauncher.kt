package com.paymatrix.app.data

import android.content.Context
import android.content.Intent
import android.net.Uri

object UpiLauncher {
    fun pay(context: Context, upiId: String, name: String, amountPaise: Long, note: String, googlePayOnly: Boolean = false) {
        require(Regex("^[\\w.-]+@[\\w.-]+$", RegexOption.IGNORE_CASE).matches(upiId)) { "Recipient has no valid UPI ID." }
        require(amountPaise > 0) { "Amount must be positive." }
        val uri = Uri.Builder().scheme("upi").authority("pay")
            .appendQueryParameter("pa", upiId).appendQueryParameter("pn", name.take(80))
            .appendQueryParameter("am", "%.2f".format(java.util.Locale.US, amountPaise / 100.0))
            .appendQueryParameter("cu", "INR").appendQueryParameter("tn", note.take(80)).build()
        val intent = Intent(Intent.ACTION_VIEW, uri).apply { if (googlePayOnly) setPackage("com.google.android.apps.nbu.paisa.user") }
        require(intent.resolveActivity(context.packageManager) != null) { if (googlePayOnly) "Google Pay is not installed." else "No UPI app is installed." }
        context.startActivity(intent)
    }
}
