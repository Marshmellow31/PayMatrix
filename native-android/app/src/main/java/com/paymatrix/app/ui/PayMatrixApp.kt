@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import androidx.compose.ui.text.style.TextOverflow

import android.net.Uri
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.R

data class MainNavItem(val route: String, val label: String, val selected: ImageVector, val idle: ImageVector)

val mainNavItems = listOf(
    MainNavItem("dashboard", "Home", Icons.Filled.Home, Icons.Outlined.Home),
    MainNavItem("friends", "Friends", Icons.Filled.People, Icons.Outlined.People),
    MainNavItem("groups", "Groups", Icons.Filled.GridView, Icons.Outlined.GridView),
    MainNavItem("logs", "Logs", Icons.Filled.ReceiptLong, Icons.Outlined.ReceiptLong),
    MainNavItem("profile", "Profile", Icons.Filled.Person, Icons.Outlined.Person),
)

@Composable
fun PayMatrixApp(viewModel: PayMatrixViewModel, deepLink: Uri?) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    val feedbackScope = rememberCoroutineScope()

    val showFeedback: (String) -> Unit = remember(snackbar, feedbackScope) {
        { message ->
            if (message.isNotBlank()) {
                feedbackScope.launch {
                    snackbar.currentSnackbarData?.dismiss()
                    snackbar.showSnackbar(
                        message = message,
                        actionLabel = "Dismiss",
                        withDismissAction = true,
                        duration = SnackbarDuration.Long
                    )
                }
            }
        }
    }

    LaunchedEffect(state.message) {
        val feedback = state.message
        if (!feedback.isNullOrBlank()) {
            showFeedback(feedback)
            viewModel.clearMessage(feedback)
        }
    }

    LaunchedEffect(state.pendingInviteCode, state.user, state.loading) {
        val inviteCode = state.pendingInviteCode
        if (!inviteCode.isNullOrBlank() && !state.loading) {
            if (state.user != null) {
                nav.navigate("join/$inviteCode") {
                    launchSingleTop = true
                }
            } else {
                val currentRoute = nav.currentDestination?.route
                if (currentRoute != "login" && currentRoute != "gate") {
                    nav.navigate("login") { popUpTo(0) }
                }
            }
        }
    }

    LaunchedEffect(state.user) {
        val route = nav.currentDestination?.route
        if (state.user != null && (route == "login" || route == "gate" || route == "welcome")) {
            val destination = state.pendingInviteCode?.let { "join/$it" }
                ?: com.paymatrix.app.MainActivity.quickDestination.value
                ?: "dashboard"
            nav.navigate(destination) { popUpTo("gate") { inclusive = true }; launchSingleTop = true }
        } else if (state.user == null && route != "login" && route != "gate" && route != "welcome") {
            nav.navigate("login") { popUpTo(0) }
        }
    }

    val deviceContext = LocalContext.current
    LaunchedEffect(state.user?.uid, state.syncStatus.pendingWrites, state.loading) {
        if (!state.loading) com.paymatrix.app.data.DevicePreferences.recordSession(deviceContext, state.user?.uid, state.syncStatus.pendingWrites)
    }
    LaunchedEffect(state.user, state.groups, state.summary, state.lastSyncedAt, state.syncStatus, state.flags, state.loading) {
        com.paymatrix.app.widget.WidgetStore.capture(deviceContext, state)
    }
    val quickDestination by com.paymatrix.app.MainActivity.quickDestination.collectAsState()
    LaunchedEffect(quickDestination, state.user, state.loading) {
        val destination = quickDestination
        if (state.user != null && !state.loading && destination != null) {
            nav.navigate(com.paymatrix.app.data.NotificationDestination.resolve(url = destination)) { launchSingleTop = true }
            com.paymatrix.app.MainActivity.quickDestination.value = null
        }
    }
    CompositionLocalProvider(
        LocalActionBusy provides state.loading,
        LocalAppFeedback provides showFeedback
    ) {
    Scaffold(
        containerColor = CanvasBlack,
        contentWindowInsets = WindowInsets.statusBars,
        snackbarHost = { SnackbarHost(snackbar) { PayMatrixSnackbar(it) } }
    ) { outer ->
        Box(Modifier.fillMaxSize().padding(outer).background(CanvasBlack)) {
            NavHost(navController = nav, startDestination = "gate",
                enterTransition = { androidx.compose.animation.fadeIn(tween(180)) },
                exitTransition = { androidx.compose.animation.fadeOut(tween(120)) },
                popEnterTransition = { androidx.compose.animation.fadeIn(tween(180)) },
                popExitTransition = { androidx.compose.animation.fadeOut(tween(120)) }) {
                composable("gate") { GateScreen(state, nav) }
                composable("welcome") { WelcomeSheet(nav) }
                composable("login") { LoginScreen(state, viewModel, nav) }
                composable("dashboard") { MainShell("dashboard", state, nav) { DashboardScreen(state, nav) } }
                composable("friends") { MainShell("friends", state, nav) { FriendsScreen(state, viewModel, nav) } }
                composable("groups") { MainShell("groups", state, nav) { GroupsScreen(state, viewModel, nav) } }
                composable("logs") { MainShell("logs", state, nav) { if (state.flags.logs) LogGroupsScreen(state, viewModel, nav) else FeatureUnavailableScreen("Spending logs") } }
                composable("profile") { MainShell("profile", state, nav) { ProfileScreen(state, viewModel, nav) } }
                composable("activity") { MainShell("", state, nav) { ActivityScreen(state, viewModel, nav) } }
                composable("analytics") { MainShell("", state, nav) { if (state.flags.analytics) AnalyticsScreen(state, viewModel, nav) else FeatureUnavailableScreen("Analytics") } }
                composable("notifications") { MainShell("", state, nav) { NotificationsScreen(state, viewModel, nav) } }
                composable("group/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry ->
                    GroupScreen(entry.arguments?.getString("id").orEmpty(), state, viewModel, nav)
                }
                composable("expense/{groupId}?expenseId={expenseId}", arguments = listOf(navArgument("groupId") { type = NavType.StringType }, navArgument("expenseId") { type = NavType.StringType; defaultValue = "" })) {
                    ExpenseFormScreen(it.arguments?.getString("groupId").orEmpty(), it.arguments?.getString("expenseId").orEmpty(), state, viewModel, nav)
                }
                composable("join/{code}", arguments = listOf(navArgument("code") { type = NavType.StringType })) { JoinGroupScreen(it.arguments?.getString("code").orEmpty(), state, viewModel, nav) }
                composable("logs/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { LogEntriesScreen(it.arguments?.getString("id").orEmpty(), state, viewModel, nav) }
                composable("scanner?groupId={groupId}", arguments = listOf(navArgument("groupId") { type = NavType.StringType; defaultValue = "" })) { entry -> if (state.flags.billScanning) ScannerScreen(state, viewModel, nav, entry.arguments?.getString("groupId").orEmpty()) else Scaffold(topBar = { BackBar("Receipt scanner", nav) }) { FeatureUnavailableScreen("Receipt scanning", Modifier.padding(it)) } }
                composable("terms") { TermsScreen(nav) }
                composable("privacy") { PrivacyScreen(nav) }
                composable("delete-account") { DeleteAccountScreen(state, viewModel, nav) }
                composable("developer") { MainShell("", state, nav) { DeveloperInstrumentationScreen(state, viewModel, nav) } }
            }
            BusyOverlay(state.loading, state.loadingLabel, onDismiss = { viewModel.clearFeedback() })
            if (!state.loading && state.error != null) AlertDialog(
                onDismissRequest = { viewModel.clearFeedback() },
                title = { Text("Unable to complete action") },
                text = { Text(state.error!!) },
                confirmButton = { TextButton(onClick = { viewModel.clearFeedback() }) { Text("OK") } },
            )
        }
    }
    }
}

@Composable
private fun GateScreen(state: PayMatrixState, nav: NavHostController) {
    val context = LocalContext.current
    LaunchedEffect(state.loading, state.user, state.pendingInviteCode) {
          if (!state.loading && nav.currentDestination?.route == "gate") {
            val destination = when {
                state.user == null -> {
                    if (!com.paymatrix.app.data.DevicePreferences.hasSeenOnboarding(context)) "welcome" else "login"
                }
                !state.pendingInviteCode.isNullOrBlank() -> "join/${state.pendingInviteCode}"
                else -> "dashboard"
            }
            nav.navigate(destination) { popUpTo("gate") { inclusive = true } }
        }
    }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Image(painterResource(R.drawable.logo), "paymatrix", Modifier.size(76.dp)) }
}

@Composable
internal fun LoginScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current
    val clientId = stringResource(R.string.default_web_client_id)
    var createMode by rememberSaveable { mutableStateOf(false) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var showPassword by rememberSaveable { mutableStateOf(false) }
    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Ink,
        unfocusedTextColor = Ink,
        focusedBorderColor = Ink.copy(alpha = .28f),
        unfocusedBorderColor = Hairline,
        focusedContainerColor = Ink.copy(alpha = .055f),
        unfocusedContainerColor = Ink.copy(alpha = .035f),
        cursorColor = Positive,
        focusedLabelColor = Ink.copy(alpha = .62f),
        unfocusedLabelColor = QuietText,
    )
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(top = 18.dp, bottom = 28.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(R.drawable.logo), "paymatrix logo", Modifier.size(36.dp).clip(RoundedCornerShape(11.dp)))
            Spacer(Modifier.width(11.dp))
            Text("paymatrix", color = Ink, fontWeight = FontWeight.Black, fontSize = 18.sp, letterSpacing = (-.3).sp)
            Spacer(Modifier.weight(1f))
            Row(Modifier.clip(CircleShape).background(Positive.copy(alpha = .08f)).padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.VerifiedUser, null, tint = Positive, modifier = Modifier.size(13.dp))
                Spacer(Modifier.width(5.dp)); Text("Private by design", maxLines = 1, overflow = TextOverflow.Ellipsis, color = Positive.copy(alpha = .86f), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            }
        }
        if (state.verificationEmail.isNotBlank()) {
            Spacer(Modifier.height(48.dp))
            Box(Modifier.size(56.dp).clip(RoundedCornerShape(18.dp)).background(Positive.copy(alpha = .1f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.MarkEmailRead, null, tint = Positive, modifier = Modifier.size(27.dp))
            }
            Spacer(Modifier.height(22.dp))
            Text("ONE LAST STEP", color = Positive.copy(alpha = .78f), fontWeight = FontWeight.Black, fontSize = 12.sp, letterSpacing = 1.4.sp)
            Spacer(Modifier.height(8.dp))
            Text("Check your email.", color = Ink, fontWeight = FontWeight.Black, fontSize = 31.sp, letterSpacing = (-1).sp)
            Spacer(Modifier.height(11.dp))
            Text("We sent a verification link to", color = MutedText, fontSize = 13.sp)
            Text(state.verificationEmail, color = Ink.copy(alpha = .82f), fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text("Open it, verify your address, then return to paymatrix.", color = MutedText, lineHeight = 20.sp, fontSize = 13.sp)
            Spacer(Modifier.height(24.dp))
            ObsidianCard(contentPadding = PaddingValues(16.dp)) {
                listOf("Open the email from paymatrix", "Tap Verify email", "Return and continue").forEachIndexed { index, instruction ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(22.dp).clip(CircleShape).background(Ink.copy(alpha = .06f)), contentAlignment = Alignment.Center) { Text("${index + 1}", color = Ink.copy(alpha = .65f), fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                        Spacer(Modifier.width(11.dp)); Text(instruction, color = Ink.copy(alpha = .62f), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            Spacer(Modifier.height(22.dp))
            PrimaryAction(if (state.loading) "Checking..." else "I've verified my email", { vm.checkEmailVerification() }, Modifier.fillMaxWidth(), enabled = !state.loading)
            TextButton(onClick = { vm.resendEmailVerification() }, enabled = !state.loading, modifier = Modifier.fillMaxWidth()) { Text("Resend verification email", color = MutedText, fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            TextButton(onClick = { vm.useAnotherAccount(context) }, enabled = !state.loading, modifier = Modifier.fillMaxWidth()) { Text("Use another account", color = QuietText, fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            return@Column
        }

        Spacer(Modifier.height(34.dp))
        Text("Welcome to paymatrix.", color = Ink, fontWeight = FontWeight.Black, fontSize = 33.sp, lineHeight = 36.sp, letterSpacing = (-1.2).sp)
        Spacer(Modifier.height(8.dp))
        Text("Google for speed, or verified email for universal access.", color = MutedText, lineHeight = 19.sp, fontSize = 12.5.sp)
        Spacer(Modifier.height(22.dp))
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(Ink.copy(alpha = .045f)).padding(4.dp)) {
            listOf(false to "Sign in", true to "Create account").forEach { (isCreate, label) ->
                val selected = createMode == isCreate
                Box(Modifier.weight(1f).heightIn(min = 48.dp).padding(vertical = 8.dp).clip(RoundedCornerShape(10.dp)).background(if (selected) Ink else Color.Transparent).clickable { createMode = isCreate }, contentAlignment = Alignment.Center) {
                    Text(label, color = if (selected) CanvasBlack else MutedText, fontWeight = FontWeight.Black, fontSize = 12.sp)
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        OutlinedButton(onClick = { vm.signIn(context, clientId) }, enabled = !state.loading, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp), shape = RoundedCornerShape(14.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Ink.copy(alpha = .12f)), colors = ButtonDefaults.outlinedButtonColors(containerColor = Ink.copy(alpha = .025f))) {
            Icon(painter = painterResource(R.drawable.ic_google_logo), contentDescription = "Google", tint = Color.Unspecified, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(11.dp))
            Text("Continue with Google", color = Ink, fontWeight = FontWeight.Black, fontSize = 14.sp)
        }
        Spacer(Modifier.height(17.dp))
        Row(verticalAlignment = Alignment.CenterVertically) { HorizontalDivider(Modifier.weight(1f), color = Hairline); Text("  OR USE EMAIL  ", color = QuietText, fontWeight = FontWeight.Black, fontSize = 12.sp, letterSpacing = 1.2.sp); HorizontalDivider(Modifier.weight(1f), color = Hairline) }
        Spacer(Modifier.height(15.dp))
        if (createMode) {
            OutlinedTextField(value = name, onValueChange = { name = it.take(50) }, label = { Text("Your name") }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), colors = fieldColors, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next))
            Spacer(Modifier.height(11.dp))
        }
        OutlinedTextField(value = email, onValueChange = { email = it.trim() }, label = { Text("Email address") }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), colors = fieldColors, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next))
        Spacer(Modifier.height(11.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text(if (createMode) "Password · 8+ characters" else "Password") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors,
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = {
                if (!state.loading && email.isNotBlank() && password.isNotBlank() && (!createMode || name.isNotBlank())) {
                    if (createMode) vm.createEmailAccount(name, email, password) else vm.signInWithEmail(email, password)
                }
            }),
            trailingIcon = {
                IconButton(onClick = { showPassword = !showPassword }) {
                    Icon(if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, if (showPassword) "Hide password" else "Show password", tint = QuietText)
                }
            }
        )
        if (!createMode) {
            TextButton(onClick = { vm.sendPasswordReset(email) }, enabled = email.isNotBlank() && !state.loading, modifier = Modifier.align(Alignment.End)) { Text("Forgot password?", color = MutedText, fontWeight = FontWeight.Bold, fontSize = 12.sp) }
        } else Spacer(Modifier.height(14.dp))
        PrimaryAction(if (state.loading) "Please wait..." else if (createMode) "Create account" else "Sign in with email", { if (createMode) vm.createEmailAccount(name, email, password) else vm.signInWithEmail(email, password) }, Modifier.fillMaxWidth(), enabled = !state.loading && email.isNotBlank() && password.isNotBlank() && (!createMode || name.isNotBlank()))
        if (createMode) {
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.Top) { Icon(Icons.Outlined.VerifiedUser, null, tint = Positive, modifier = Modifier.size(14.dp)); Spacer(Modifier.width(7.dp)); Text("We'll verify your email before shared data can be opened.", color = QuietText, lineHeight = 14.sp, fontSize = 12.sp) }
        }
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Text("By continuing, you agree to our ", color = QuietText, fontSize = 12.sp)
            Text("Terms", color = Ink.copy(alpha = .85f), fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.clickable { nav.navigate("terms") })
            Text(" and ", color = QuietText, fontSize = 12.sp)
            Text("Privacy Policy", color = Ink.copy(alpha = .85f), fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.clickable { nav.navigate("privacy") })
        }
        Spacer(Modifier.height(5.dp))
        Text("Non-custodial calculation ledger · We do not hold or move money", color = QuietText, fontSize = 8.5.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
    }
}

@Composable
private fun LoginFeature(icon: ImageVector, title: String, body: String, modifier: Modifier) {
    Column(modifier.heightIn(min = 84.dp).border(1.dp, Hairline, RoundedCornerShape(15.dp)).background(Ink.copy(alpha = .025f), RoundedCornerShape(15.dp)).padding(12.dp)) {
        Icon(icon, null, tint = Ink.copy(alpha = .72f), modifier = Modifier.size(17.dp))
        Spacer(Modifier.height(9.dp)); Text(title, color = Ink.copy(alpha = .82f), fontWeight = FontWeight.Bold, fontSize = 12.sp)
        Spacer(Modifier.height(3.dp)); Text(body, color = QuietText, fontSize = 12.sp, lineHeight = 14.sp)
    }
}

@Composable
internal fun MainShell(route: String, state: PayMatrixState, nav: NavHostController, content: @Composable (PaddingValues) -> Unit) {
    val online = rememberNetworkAvailable()
    val haptic = LocalHapticFeedback.current
    val visibleNavItems = mainNavItems.filter { it.route != "logs" || state.flags.logs }
    Scaffold(
        containerColor = CanvasBlack,
        topBar = { PayMatrixHeader(state.user, state.notifications.count { !it.isRead }, syncPending = state.syncStatus.pendingWrites > 0, { nav.navigate("activity") }, { if (route != "profile") nav.navigate("profile") }) },
        content = { padding ->
            Box(Modifier.fillMaxSize().padding(top = padding.calculateTopPadding())) {
                Column(Modifier.fillMaxSize()) {
                    if (state.syncStatus.lastError.isNotBlank()) StatusBanner("Sync needs attention · ${state.syncStatus.lastError}", Negative)
                    if (state.flags.maintenanceMode) StatusBanner("Maintenance mode · some cloud actions may be temporarily unavailable", Color(0xFFF6C85F))
                    Box(Modifier.weight(1f)) { content(PaddingValues(0.dp)) }
                }

                // Subtle floating offline / sync pill above navbar
                if (!online || state.syncStatus.pendingWrites > 0) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .navigationBarsPadding()
                            .padding(bottom = 80.dp)
                            .clip(CircleShape)
                            .background(CardSurface)
                            .border(1.dp, Color(0xFFF6C85F).copy(alpha = 0.35f), CircleShape)
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (!online) Icons.Default.WifiOff else Icons.Default.CloudUpload,
                                contentDescription = null,
                                tint = if (CanvasBlack.red > .5f) Color(0xFF805800) else Color(0xFFF6C85F),
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                if (!online) "Offline" else "${state.syncStatus.pendingWrites} sync pending",
                                color = if (CanvasBlack.red > .5f) Color(0xFF805800) else Color(0xFFF6C85F),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                // Apple Liquid Glass Floating Pill Navigation Bar
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(start = 16.dp, end = 16.dp, bottom = 0.dp)
                ) {
                    LiquidGlassNavBar(
                        items = visibleNavItems,
                        currentRoute = route,
                        onNavigate = { targetRoute ->
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            if (targetRoute == "dashboard") {
                                nav.navigate("dashboard") { popUpTo("dashboard") { inclusive = true }; launchSingleTop = true }
                            } else {
                                nav.navigate(targetRoute) { popUpTo("dashboard") { saveState = true }; launchSingleTop = true; restoreState = true }
                            }
                        }
                    )
                }
            }
        },
    )
}

@Composable
private fun LiquidGlassNavBar(
    items: List<MainNavItem>,
    currentRoute: String,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier.clip(RoundedCornerShape(22.dp)).background(CardSurface)) {
        val largeText = androidx.compose.ui.platform.LocalDensity.current.fontScale > 1.3f
        val barWidth = if (largeText) maxOf(maxWidth, 112.dp * items.size) else maxWidth
        val scroll = rememberScrollState()
        val density = androidx.compose.ui.platform.LocalDensity.current
        LaunchedEffect(currentRoute, largeText) {
            if (largeText) scroll.scrollTo(with(density) { (112.dp * items.indexOfFirst { it.route == currentRoute }.coerceAtLeast(0)).roundToPx() })
        }
        Row(Modifier.horizontalScroll(scroll)) {
            Row(Modifier.width(barWidth).padding(horizontal = 6.dp, vertical = 6.dp)
                .selectableGroup(), verticalAlignment = Alignment.CenterVertically) {
                items.forEach { item ->
                    val selected = currentRoute == item.route
                    val tint = if (selected) Ink else QuietText
                    Column(
                        Modifier.weight(1f).clip(RoundedCornerShape(16.dp))
                            .background(if (selected) RaisedSurface else Color.Transparent)
                            .selectable(selected = selected, role = androidx.compose.ui.semantics.Role.Tab,
                                onClick = { if (!selected) onNavigate(item.route) })
                            .heightIn(min = 52.dp).padding(horizontal = 2.dp, vertical = 6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(3.dp, Alignment.CenterVertically)
                    ) {
                        Icon(if (selected) item.selected else item.idle, null, Modifier.size(21.dp), tint = tint)
                        Text(item.label, color = tint, fontSize = 11.sp, lineHeight = 14.sp,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                            maxLines = 1, style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)))
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusBanner(message: String, color: Color) = Text(
    message,
    color = color,
    fontSize = 12.sp,
    fontWeight = FontWeight.Bold,
    modifier = Modifier.fillMaxWidth().background(color.copy(alpha = .12f)).padding(horizontal = 16.dp, vertical = 7.dp),
)

@Composable
private fun FeatureUnavailableScreen(name: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        ObsidianCard(Modifier.padding(24.dp)) {
            Icon(Icons.Default.ToggleOff, null, tint = MutedText)
            Text("$name is paused", color = Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("This feature is temporarily unavailable. Your existing data has not been removed.", color = MutedText, lineHeight = 18.sp)
        }
    }
}

@Composable
private fun rememberNetworkAvailable(): Boolean {
    val context = LocalContext.current
    val manager = remember(context) { context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager }
    var connected by remember {
        mutableStateOf(manager.activeNetwork?.let { network ->
            manager.getNetworkCapabilities(network)?.let { capabilities ->
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            }
        } == true)
    }
    DisposableEffect(manager) {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { connected = true }
            override fun onLost(network: Network) { connected = manager.activeNetwork != null }
            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                connected = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            }
        }
        manager.registerNetworkCallback(NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(), callback)
        onDispose { manager.unregisterNetworkCallback(callback) }
    }
    return connected
}

@Composable
fun BackBar(title: String, nav: NavHostController, subtitle: String? = null, actions: @Composable RowScope.() -> Unit = {}) {
    val haptic = LocalHapticFeedback.current
    Surface(
        color = ObsidianSurface.copy(alpha = .98f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp)
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    nav.popBackStack()
                },
                modifier = Modifier.size(48.dp)
            ) {
                Icon(Icons.Default.ArrowBack, "Back", tint = Ink.copy(alpha = .95f), modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(6.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    color = Ink,
                    fontSize = 18.sp,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        color = QuietText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, content = actions)
        }
    }
}
