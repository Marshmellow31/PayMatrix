package com.paymatrix.app.domain

import android.content.Context
import android.content.Intent
import android.net.Uri

enum class PaymentRailType {
    UPI,
    EPC,
    PIX,
    PAYPAL,
    VENMO,
    CASH
}

data class PaymentRailResult(
    val rail: PaymentRailType,
    val intent: Intent?,
    val qrPayload: String?,
    val copyValue: String?,
    val displayLabel: String
)

object PaymentRailDispatcher {

    fun dispatch(
        context: Context,
        rail: PaymentRailType,
        recipientHandle: String,
        recipientName: String,
        amount: Double,
        currency: String = "USD"
    ): PaymentRailResult {
        return when (rail) {
            PaymentRailType.UPI -> {
                val uri = "upi://pay?pa=${Uri.encode(recipientHandle)}&pn=${Uri.encode(recipientName)}&am=${String.format(java.util.Locale.US, "%.2f", amount)}&cu=INR"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
                PaymentRailResult(
                    rail = rail,
                    intent = intent,
                    qrPayload = uri,
                    copyValue = recipientHandle,
                    displayLabel = "Launch UPI App"
                )
            }
            PaymentRailType.EPC -> {
                // 12-line BCD SCT Payload
                val cleanIban = recipientHandle.replace("\\s+".toRegex(), "").uppercase()
                val payload = listOf(
                    "BCD", "002", "1", "SCT", "",
                    recipientName.take(70),
                    cleanIban,
                    "EUR${String.format(java.util.Locale.US, "%.2f", amount)}",
                    "", "", "paymatrix settlement", ""
                ).joinToString("\n")

                PaymentRailResult(
                    rail = rail,
                    intent = null,
                    qrPayload = payload,
                    copyValue = cleanIban,
                    displayLabel = "Scan in European Banking App"
                )
            }
            PaymentRailType.PAYPAL -> {
                val cleanHandle = recipientHandle.removePrefix("@")
                val url = "https://paypal.me/${Uri.encode(cleanHandle)}/${String.format(java.util.Locale.US, "%.2f", amount)}$currency"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                PaymentRailResult(
                    rail = rail,
                    intent = intent,
                    qrPayload = url,
                    copyValue = cleanHandle,
                    displayLabel = "Open PayPal.me"
                )
            }
            PaymentRailType.VENMO -> {
                val cleanHandle = recipientHandle.removePrefix("@")
                val uri = "venmo://paycharge?txn=pay&recipients=${Uri.encode(cleanHandle)}&amount=${String.format(java.util.Locale.US, "%.2f", amount)}"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
                PaymentRailResult(
                    rail = rail,
                    intent = intent,
                    qrPayload = "https://venmo.com/$cleanHandle",
                    copyValue = cleanHandle,
                    displayLabel = "Launch Venmo"
                )
            }
            PaymentRailType.CASH -> {
                PaymentRailResult(
                    rail = rail,
                    intent = null,
                    qrPayload = null,
                    copyValue = null,
                    displayLabel = "Record Cash Settlement"
                )
            }
            else -> {
                PaymentRailResult(
                    rail = rail,
                    intent = null,
                    qrPayload = null,
                    copyValue = null,
                    displayLabel = "Settle Up"
                )
            }
        }
    }
}
