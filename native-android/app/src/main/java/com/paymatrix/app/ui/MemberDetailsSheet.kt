@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.paymatrix.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
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
            ObsidianCard {
                Text("GROUP POSITION", color = QuietText, style = MaterialTheme.typography.labelSmall)
                Text(if (balance == 0L) "Settled" else "${if (balance < 0) "Owes" else "Gets back"} ${Money.format(kotlin.math.abs(balance))}", color = if (balance < 0) Negative else if (balance > 0) Positive else Ink, style = MaterialTheme.typography.titleLarge)
            }
            val pays = snapshot.debts.filter { it.from == member.uid }
            val receives = snapshot.debts.filter { it.to == member.uid }
            if (pays.isNotEmpty()) {
                SectionTitle("Pays to")
                pays.forEach { debt ->
                    val other = snapshot.profiles[debt.to] ?: UserProfile(uid = debt.to)
                    CounterpartyRow(other, debt.amountPaise, Negative)
                }
            }
            if (receives.isNotEmpty()) {
                SectionTitle("Gets back from")
                receives.forEach { debt ->
                    val other = snapshot.profiles[debt.from] ?: UserProfile(uid = debt.from)
                    CounterpartyRow(other, debt.amountPaise, Positive)
                }
            }
            if (pays.isEmpty() && receives.isEmpty()) Text("No payments are due for this member.", color = QuietText, style = MaterialTheme.typography.bodyMedium)
            if (pays.isNotEmpty() || receives.isNotEmpty()) Text("Based on the group's simplified, confirmed balances.", color = QuietText, style = MaterialTheme.typography.bodySmall)
            when {
                me -> Unit
                friend -> Text("Already friends", color = Positive)
                request != null && request.to == state.user?.uid -> PrimaryAction("Accept friend request", { vm.respond(request, true); dismiss() }, Modifier.fillMaxWidth())
                request != null -> Text("Friend request pending", color = QuietText)
                else -> PrimaryAction("Add friend", { vm.sendFriendRequestToMember(snapshot.group.id, member.uid); dismiss() }, Modifier.fillMaxWidth())
            }
            val shared = state.groups.filter { it.id != snapshot.group.id && member.uid in it.members }
            if (shared.isNotEmpty()) {
                SectionTitle("Shared groups")
                shared.forEach { group -> TextButton(onClick = { dismiss(); nav.navigate("group/${group.id}") { launchSingleTop = true } }) { Text(group.name) } }
            }
            SecondaryAction("Done", dismiss, Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun CounterpartyRow(other: UserProfile, amountPaise: Long, tone: androidx.compose.ui.graphics.Color) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(RaisedSurface).border(1.dp, Hairline, RoundedCornerShape(16.dp)).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        UserAvatar(other, 38)
        Spacer(Modifier.width(10.dp))
        Text(other.name.ifBlank { "Member" }, modifier = Modifier.weight(1f), color = Ink, style = MaterialTheme.typography.titleSmall)
        Text(Money.format(amountPaise), color = tone, style = MaterialTheme.typography.titleSmall)
    }
}
