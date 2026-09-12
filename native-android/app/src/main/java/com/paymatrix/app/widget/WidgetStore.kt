package com.paymatrix.app.widget

import android.content.Context
import com.paymatrix.app.PayMatrixState
import org.json.JSONArray
import org.json.JSONObject

data class WidgetGroup(val id: String, val name: String, val balance: Long?)
data class WidgetSnapshot(val uid: String, val groups: List<WidgetGroup>, val owed: Long, val owe: Long, val savedAt: String, val pending: Int, val scanEnabled: Boolean = true)

/** Private, account-scoped display snapshots. Widgets never write financial data. */
object WidgetStore {
    private fun prefs(context: Context) = context.getSharedPreferences("widget_snapshots", Context.MODE_PRIVATE)
    fun clear(context: Context) { prefs(context).edit().clear().apply() }
    fun capture(context: Context, state: PayMatrixState) {
        if (state.loading) return
        val uid = state.user?.uid
        if (uid == null) { clear(context); QuickAccessWidget.refresh(context); return }
        val p = prefs(context)
        val old = read(context)
        if (old != null && old.uid != uid) p.edit().clear().apply()
        val rows = JSONArray()
        state.groups.filter { it.status != "deleted" && uid in it.members }.forEach { group ->
            rows.put(JSONObject().put("id", group.id).put("name", group.name)
                .put("balance", state.summary.groupBalances[group.id] ?: JSONObject.NULL))
        }
        val json = JSONObject().put("uid", uid).put("groups", rows)
            .put("owed", state.summary.totalOwedPaise).put("owe", state.summary.totalOwePaise)
            .put("savedAt", state.lastSyncedAt).put("pending", state.syncStatus.pendingWrites).put("scan", state.flags.billScanning).toString()
        if (p.getString("snapshot", null) != json) {
            p.edit().putString("snapshot", json).apply()
            QuickAccessWidget.refresh(context)
        }
    }
    fun read(context: Context): WidgetSnapshot? = runCatching {
        val data = prefs(context).getString("snapshot", null) ?: return null
        val obj = JSONObject(data)
        val rows = obj.getJSONArray("groups")
        WidgetSnapshot(obj.getString("uid"), (0 until rows.length()).map { index ->
            val row = rows.getJSONObject(index)
            WidgetGroup(row.getString("id"), row.getString("name"), if (row.isNull("balance")) null else row.getLong("balance"))
        }, obj.getLong("owed"), obj.getLong("owe"), obj.optString("savedAt"), obj.optInt("pending"), obj.optBoolean("scan", true))
    }.getOrNull()
    fun configure(context: Context, id: Int, uid: String, groupId: String) {
        prefs(context).edit().putString("owner_$id", uid).putString("group_$id", groupId).apply()
    }
    fun groupId(context: Context, id: Int, uid: String): String? =
        if (prefs(context).getString("owner_$id", null) == uid) prefs(context).getString("group_$id", null) else null
    fun delete(context: Context, id: Int) { prefs(context).edit().remove("owner_$id").remove("group_$id").apply() }
    fun destination(context: Context, id: Int, action: String): String {
        val saved = read(context) ?: return "dashboard"
        val uid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: return "dashboard"
        if (uid != saved.uid) return "dashboard"
        val group = saved.groups.firstOrNull { it.id == groupId(context, id, uid) } ?: return "groups"
        return when (action) { "add" -> "expense/${group.id}"; "scan" -> if (saved.scanEnabled) "scanner?groupId=${group.id}" else "group/${group.id}"; else -> "group/${group.id}" }
    }
}
