package com.paymatrix.app.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Account-scoped, display-only aggregate cache. Firestore remains authoritative. */
object LocalSummaryStore {
    private const val VERSION = 1
    private fun prefs(context: Context) =
        context.getSharedPreferences("dashboard_summary_cache", Context.MODE_PRIVATE)

    fun save(context: Context, uid: String, summary: DashboardSummary) {
        val categories = JSONArray().apply {
            summary.categories.forEach { put(JSONObject().put("name", it.name).put("amountPaise", it.amountPaise)) }
        }
        val balances = JSONObject().apply {
            summary.groupBalances.forEach { (groupId, balance) -> put(groupId, balance) }
        }
        val value = JSONObject()
            .put("version", VERSION)
            .put("uid", uid)
            .put("savedAt", System.currentTimeMillis())
            .put("owed", summary.totalOwedPaise)
            .put("owe", summary.totalOwePaise)
            .put("net", summary.netBalancePaise)
            .put("shared", summary.totalSharedPaise)
            .put("thisMonth", summary.thisMonthPaise)
            .put("previousMonth", summary.previousMonthPaise)
            .put("categories", categories)
            .put("balances", balances)
        prefs(context).edit().putString("summary_$uid", value.toString()).apply()
    }

    fun read(context: Context, uid: String, activeGroupIds: Set<String>): DashboardSummary? = runCatching {
        val raw = prefs(context).getString("summary_$uid", null) ?: return null
        val value = JSONObject(raw)
        if (value.optInt("version") != VERSION || value.optString("uid") != uid) return null
        val balancesJson = value.getJSONObject("balances")
        val balances = balancesJson.keys().asSequence().associateWith { balancesJson.getLong(it) }
        if (!activeGroupIds.all { it in balances }) return null
        val categoriesJson = value.getJSONArray("categories")
        val categories = (0 until categoriesJson.length()).map { index ->
            categoriesJson.getJSONObject(index).let { CategoryTotal(it.getString("name"), it.getLong("amountPaise")) }
        }
        DashboardSummary(
            totalOwedPaise = value.getLong("owed"),
            totalOwePaise = value.getLong("owe"),
            netBalancePaise = value.getLong("net"),
            totalSharedPaise = value.getLong("shared"),
            categories = categories,
            groupBalances = balances.filterKeys { it in activeGroupIds },
            thisMonthPaise = value.getLong("thisMonth"),
            previousMonthPaise = value.getLong("previousMonth"),
        )
    }.getOrNull()
}
