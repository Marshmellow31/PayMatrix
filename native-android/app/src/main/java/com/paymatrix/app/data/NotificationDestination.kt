package com.paymatrix.app.data

/** Allowlisted routes shared by tray notifications and the in-app activity list. */
object NotificationDestination {
    fun resolve(type: String = "", groupId: String = "", url: String = ""): String {
        if (type == "friend_request" || type == "friend_accepted") return "friends"
        if (groupId.matches(Regex("[A-Za-z0-9_-]+"))) return "group/$groupId"
        val path = runCatching {
            val uri = java.net.URI(url)
            if (uri.isAbsolute && (uri.scheme != "https" || (uri.host != "paymatrixapp.online" && uri.host != "pay-matrix.vercel.app"))) return@runCatching ""
            if (uri.rawAuthority != null && !uri.isAbsolute) return@runCatching ""
            uri.path.orEmpty().trim('/')
        }.getOrDefault("")
        if (path in setOf("friends", "groups", "dashboard", "activity", "notifications")) return path
        if (path.matches(Regex("expense/[A-Za-z0-9_-]+"))) return path
        if (path == "scanner") {
            val query = runCatching { java.net.URI(url).rawQuery.orEmpty() }.getOrDefault("")
            return if (query.matches(Regex("groupId=[A-Za-z0-9_-]+"))) "scanner?$query" else "scanner"
        }
        if (path.matches(Regex("groups?/[A-Za-z0-9_-]+"))) return "group/${path.substringAfter('/')}"
        return "dashboard"
    }
}
