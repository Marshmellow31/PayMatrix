@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.paymatrix.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.data.*
import com.paymatrix.app.domain.Money

@Composable
fun MemberDetailsSheet(member: UserProfile, snapshot: GroupSnapshot, state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController, dismiss: () -> Unit) {
    val me = member.uid == state.user?.uid
    val friend = member.uid in state.user?.friends.orEmpty() || state.friends.any { it.uid == member.uid }
    val request = state.friendRequests.firstOrNull { it.from == member.uid || it.to == member.uid }
    ModalBottomSheet(onDismissRequest = dismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = CardSurface) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                UserAvatar(member, 48); Spacer(Modifier.width(12.dp))
                Column { Text(member.name, style = MaterialTheme.typography.titleLarge); Text(if (me) "You" else if (member.uid == snapshot.group.admin) "Group admin" else "Group member", color = QuietText) }
            }
            val balance = snapshot.balances[member.uid] ?: 0L
            Text(if (balance == 0L) "Settled in ${snapshot.group.name}" else "${if (balance < 0) "Owes" else "Gets back"} ${Money.format(kotlin.math.abs(balance))} in this group", style = MaterialTheme.typography.bodyMedium)
            Text("This is the member’s group balance, across all members.", color = QuietText, style = MaterialTheme.typography.bodySmall)
            when {
                me -> SecondaryAction("Your profile", { dismiss(); nav.navigate("profile") }, Modifier.fillMaxWidth())
                friend -> Text("Already friends", color = Positive)
                request != null && request.to == state.user?.uid -> PrimaryAction("Accept friend request", { vm.respond(request, true); dismiss() }, Modifier.fillMaxWidth())
                request != null -> Text("Friend request pending", color = QuietText)
                else -> PrimaryAction("Add friend", { vm.sendFriendRequestToMember(snapshot.group.id, member.uid); dismiss() }, Modifier.fillMaxWidth())
            }
            val shared = state.groups.filter { member.uid in it.members }
            if (shared.isNotEmpty()) {
                SectionTitle("Shared groups")
                shared.forEach { group -> TextButton(onClick = { dismiss(); nav.navigate("group/${group.id}") { launchSingleTop = true } }) { Text(group.name) } }
            }
            SecondaryAction("Done", dismiss, Modifier.fillMaxWidth())
        }
    }
}
