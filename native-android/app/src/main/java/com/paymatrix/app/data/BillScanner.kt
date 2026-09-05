package com.paymatrix.app.data

import android.graphics.Bitmap
import android.util.Base64
import com.google.firebase.auth.FirebaseAuth
import com.paymatrix.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.TimeUnit

class BillScanner(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(35, TimeUnit.SECONDS)
        .readTimeout(35, TimeUnit.SECONDS)
        .writeTimeout(35, TimeUnit.SECONDS)
        .build()
) {
    suspend fun scan(bitmap: Bitmap): BillScanResult = withContext(Dispatchers.IO) {
        val user = FirebaseAuth.getInstance().currentUser ?: error("Sign in before scanning a bill.")
        val token = user.getIdToken(false).await().token
            ?: error("Could not create an authenticated scan request.")

        // Downscale to max 1600px on the longest dimension (same as web)
        val maxDim = 1600
        val longest = maxOf(bitmap.width, bitmap.height)
        val targetBitmap = if (longest > maxDim) {
            val factor = maxDim.toFloat() / longest
            Bitmap.createScaledBitmap(bitmap, (bitmap.width * factor).toInt(), (bitmap.height * factor).toInt(), true)
        } else {
            bitmap
        }

        val base64 = ByteArrayOutputStream().use { stream ->
            targetBitmap.compress(Bitmap.CompressFormat.JPEG, 85, stream)
            Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
        }

        val imageObj = JSONObject().apply {
            put("base64", base64)
            put("mimeType", "image/jpeg")
        }
        val requestJson = JSONObject().apply {
            put("images", JSONArray().apply { put(imageObj) })
        }

        val body = requestJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder()
            .url(BuildConfig.SCAN_API_URL)
            .header("Authorization", "Bearer $token")
            .header("Content-Type", "application/json")
            .header("Origin", "https://pay-matrix.vercel.app")
            .post(body)
            .build()

        val call = client.newCall(request)
        val response = kotlinx.coroutines.suspendCancellableCoroutine { continuation ->
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : okhttp3.Callback {
                override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                    continuation.resumeWith(Result.success(response))
                }
                override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {
                    if (continuation.isCancelled) return
                    continuation.resumeWith(Result.failure(e))
                }
            })
        }
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
            val serverMsg = runCatching { JSONObject(text).optString("error") }.getOrNull().orEmpty()
            error(serverMsg.ifBlank { "Bill scan failed (${response.code})." })
        }

        parseScanResult(text)
    }

    private fun parseScanResult(text: String): BillScanResult {
        val root = JSONObject(text)
        val data = root.optJSONObject("data") ?: root
        val itemsArray = data.optJSONArray("items")
        val items = buildList {
            if (itemsArray != null) {
                for (index in 0 until itemsArray.length()) {
                    val item = itemsArray.opt(index)
                    if (item is JSONObject) {
                        val name = item.optString("name")
                        val price = item.opt("price")?.toString()?.toDoubleOrNull()
                        if (name.isNotBlank()) {
                            if (price != null && price > 0) add("$name: ₹%.2f".format(java.util.Locale.US, price))
                            else add(name)
                        }
                    } else if (item != null) {
                        add(item.toString())
                    }
                }
            }
        }

        val merchant = data.optString("title").ifBlank {
            data.optString("merchant", data.optString("vendor"))
        }

        val rawTotal = if (data.has("amount")) data.opt("amount") else data.opt("total")
        val total = when (rawTotal) {
            is Number -> if (rawTotal.toDouble() > 0) "%.2f".format(java.util.Locale.US, rawTotal.toDouble()) else ""
            is String -> com.paymatrix.app.domain.Money.normalizeMoneyString(rawTotal)
            else -> ""
        }

        val date = data.optString("date")

        return BillScanResult(
            merchant = merchant,
            total = total,
            date = date,
            items = items
        )
    }
}
