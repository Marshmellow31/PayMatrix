package com.paymatrix.app.data

import android.graphics.Bitmap
import com.google.firebase.auth.FirebaseAuth
import com.paymatrix.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.ByteArrayOutputStream

class BillScanner(private val client: OkHttpClient = OkHttpClient()) {
    suspend fun scan(bitmap: Bitmap): BillScanResult = withContext(Dispatchers.IO) {
        val user = FirebaseAuth.getInstance().currentUser ?: error("Sign in before scanning a bill.")
        val token = user.getIdToken(true).await().token ?: error("Could not create an authenticated scan request.")
        val bytes = ByteArrayOutputStream().use { stream -> bitmap.compress(Bitmap.CompressFormat.JPEG, 82, stream); stream.toByteArray() }
        require(bytes.size <= 8 * 1024 * 1024) { "Image is too large." }
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("image", "bill.jpg", bytes.toRequestBody("image/jpeg".toMediaType())).build()
        val response = client.newCall(Request.Builder().url(BuildConfig.SCAN_API_URL).header("Authorization", "Bearer $token").post(body).build()).execute()
        val text = response.body.string()
        if (!response.isSuccessful) error(runCatching { JSONObject(text).optString("error") }.getOrNull().orEmpty().ifBlank { "Bill scan failed (${response.code})." })
        val root = JSONObject(text)
        val data = root.optJSONObject("data") ?: root
        val itemsArray = data.optJSONArray("items")
        val items = buildList { if (itemsArray != null) for (index in 0 until itemsArray.length()) add(itemsArray.get(index).toString()) }
        BillScanResult(data.optString("merchant", data.optString("vendor")), data.opt("total")?.toString().orEmpty(), data.optString("date"), items)
    }
}
