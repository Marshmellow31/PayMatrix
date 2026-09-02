@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.paymatrix.app.ui

import android.net.Uri
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
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
    val pendingInvite = remember(deepLink) { deepLink?.lastPathSegment?.takeIf { deepLink.pathSegments.firstOrNull() == "join" } }

    LaunchedEffect(state.message, state.error) {
        val feedback = state.error ?: state.message
        if (!feedback.isNullOrBlank()) { snackbar.showSnackbar(feedback); viewModel.clearFeedback() }
    }

    LaunchedEffect(state.user) {
        val route = nav.currentDestination?.route
        if (state.user != null && (route == "login" || route == "gate")) {
            nav.navigate(pendingInvite?.let { "join/$it" } ?: "dashboard") { popUpTo("gate") { inclusive = true }; launchSingleTop = true }
        } else if (state.user == null && route != "login" && route != "gate") {
            nav.navigate("login") { popUpTo(0) }
        }
    }

    Scaffold(containerColor = CanvasBlack, snackbarHost = { SnackbarHost(snackbar) }) { outer ->
        Box(Modifier.fillMaxSize().padding(outer).background(CanvasBlack)) {
            NavHost(navController = nav, startDestination = "gate") {
                composable("gate") { GateScreen(state, nav) }
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
                composable("scanner") { if (state.flags.billScanning) ScannerScreen(state, viewModel, nav) else Scaffold(topBar = { BackBar("Receipt scanner", nav) }) { FeatureUnavailableScreen("Receipt scanning", Modifier.padding(it)) } }
                composable("terms") { TermsScreen(nav) }
                composable("privacy") { PrivacyScreen(nav) }
                composable("delete-account") { DeleteAccountScreen(state, viewModel, nav) }
            }
            BusyOverlay(state.loading, state.loadingLabel)
        }
    }
}

@Composable
private fun GateScreen(state: PayMatrixState, nav: NavHostController) {
    LaunchedEffect(state.loading, state.user) {
        if (!state.loading) nav.navigate(if (state.user == null) "login" else "dashboard") { popUpTo("gate") { inclusive = true } }
    }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Image(painterResource(R.drawable.logo), "paymatrix", Modifier.size(76.dp)) }
}

@Composable
private fun LoginScreen(state: PayMatrixState, vm: PayMatrixViewModel, nav: NavHostController) {
    val context = LocalContext.current
    val clientId = stringResource(R.string.default_web_client_id)
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(top = 18.dp, bottom = 22.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(R.drawable.logo), "paymatrix logo", Modifier.size(36.dp).clip(RoundedCornerShape(11.dp)))
            Spacer(Modifier.width(11.dp))
            Text("paymatrix", color = Color.White, fontWeight = FontWeight.Black, fontSize = 18.sp, letterSpacing = (-.3).sp)
            Spacer(Modifier.weight(1f))
            Row(Modifier.clip(CircleShape).background(Positive.copy(alpha = .08f)).padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.VerifiedUser, null, tint = Positive, modifier = Modifier.size(13.dp))
                Spacer(Modifier.width(5.dp)); Text("Private by design", color = Positive.copy(alpha = .86f), fontWeight = FontWeight.SemiBold, fontSize = 9.sp)
            }
        }
        Spacer(Modifier.height(42.dp))
        Text("Split a bill.", color = Color.White, fontWeight = FontWeight.Black, fontSize = 40.sp, lineHeight = 41.sp, letterSpacing = (-1.5).sp)
        Text("See what’s fair.", color = Color.White.copy(alpha = .42f), fontWeight = FontWeight.Black, fontSize = 40.sp, lineHeight = 43.sp, letterSpacing = (-1.5).sp)
        Spacer(Modifier.height(14.dp))
        Text("Shared expenses, clear balances, and user-confirmed settlements—without the awkward maths.", color = MutedText, lineHeight = 20.sp, fontSize = 13.sp)
        Spacer(Modifier.height(26.dp))
        ObsidianCard(contentPadding = PaddingValues(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(48.dp).clip(RoundedCornerShape(16.dp)).background(PrimaryBlue.copy(alpha = .13f)), contentAlignment = Alignment.Center) { Icon(Icons.Default.FlightTakeoff, null, tint = PrimaryBlue, modifier = Modifier.size(22.dp)) }
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) { Text("Goa weekend", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp); Text("4 friends · 8 expenses", color = QuietText, fontSize = 10.sp) }
                AvatarStack(listOf("a", "b", "c", "d"), emptyMap(), size = 23, max = 3)
            }
            HorizontalDivider(color = Hairline)
            Row(verticalAlignment = Alignment.Bottom) { Column(Modifier.weight(1f)) { Text("YOUR POSITION", color = QuietText, fontWeight = FontWeight.Bold, fontSize = 8.sp, letterSpacing = 1.3.sp); Text("You are owed", color = MutedText, fontSize = 11.sp) }; Text("₹1,240.00", color = Positive, fontWeight = FontWeight.Black, fontSize = 24.sp, letterSpacing = (-.5).sp) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { LoginFeature(Icons.Default.ReceiptLong, "Add expense", "Split in seconds", Modifier.weight(1f)); LoginFeature(Icons.Default.DoneAll, "Settle clearly", "You confirm every payment", Modifier.weight(1f)) }
        }
        Spacer(Modifier.height(28.dp))
        PrimaryAction(if (state.loading) "Opening accounts..." else "Continue with Google", { vm.signIn(context, clientId) }, Modifier.fillMaxWidth(), enabled = !state.loading, icon = { Text("G", color = Color(0xFF4285F4), fontWeight = FontWeight.Black, fontSize = 20.sp) })
        Spacer(Modifier.height(11.dp))
        Text("Android opens the secure Google account chooser. paymatrix never sees your Google password.", color = Color.White.copy(alpha = .32f), fontSize = 9.sp, lineHeight = 13.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Text("By continuing, you agree to our ", color = Color.White.copy(alpha = .38f), fontSize = 10.sp)
            Text("Terms", color = Color.White.copy(alpha = .85f), fontWeight = FontWeight.Bold, fontSize = 10.sp, modifier = Modifier.clickable { nav.navigate("terms") })
            Text(" and ", color = Color.White.copy(alpha = .38f), fontSize = 10.sp)
            Text("Privacy Policy", color = Color.White.copy(alpha = .85f), fontWeight = FontWeight.Bold, fontSize = 10.sp, modifier = Modifier.clickable { nav.navigate("privacy") })
        }
        Spacer(Modifier.height(5.dp))
        Text("Non-custodial calculation ledger · We do not hold or move money", color = Color.White.copy(alpha = .22f), fontSize = 8.5.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
    }
}

@Composable
private fun LoginFeature(icon: ImageVector, title: String, body: String, modifier: Modifier) {
    Column(modifier.heightIn(min = 84.dp).border(1.dp, Hairline, RoundedCornerShape(15.dp)).background(Color.White.copy(alpha = .025f), RoundedCornerShape(15.dp)).padding(12.dp)) {
        Icon(icon, null, tint = Color.White.copy(alpha = .72f), modifier = Modifier.size(17.dp))
        Spacer(Modifier.height(9.dp)); Text(title, color = Color.White.copy(alpha = .82f), fontWeight = FontWeight.Bold, fontSize = 12.sp)
        Spacer(Modifier.height(3.dp)); Text(body, color = QuietText, fontSize = 10.sp, lineHeight = 14.sp)
    }
}

@Composable
private fun MainShell(route: String, state: PayMatrixState, nav: NavHostController, content: @Composable (PaddingValues) -> Unit) {
    val online = rememberNetworkAvailable()
    val visibleNavItems = mainNavItems.filter { it.route != "logs" || state.flags.logs }
    Scaffold(
        containerColor = CanvasBlack,
        topBar = { PayMatrixHeader(state.user, state.notifications.count { !it.isRead }, syncPending = state.syncStatus.pendingWrites > 0, { nav.navigate("activity") }, { if (route != "profile") nav.navigate("profile") }) },
        bottomBar = {
            NavigationBar(
                containerColor = ObsidianSurface,
                tonalElevation = 0.dp,
                windowInsets = NavigationBarDefaults.windowInsets,
                modifier = Modifier.fillMaxWidth().height(66.dp),
            ) {
                visibleNavItems.forEach { item ->
                    val selected = route == item.route
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            if (!selected) {
                                if (item.route == "dashboard") {
                                    nav.navigate("dashboard") { popUpTo("dashboard") { inclusive = true }; launchSingleTop = true }
                                } else {
                                    nav.navigate(item.route) { popUpTo("dashboard") { saveState = true }; launchSingleTop = true; restoreState = true }
                                }
                            }
                        },
                        icon = {
                            Box(
                                modifier = if (selected) Modifier.clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = .12f)).padding(horizontal = 12.dp, vertical = 3.dp) else Modifier.padding(horizontal = 12.dp, vertical = 3.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(if (selected) item.selected else item.idle, item.label, modifier = Modifier.size(19.dp))
                            }
                        },
                        label = { Text(item.label, fontSize = 9.5.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color.White,
                            selectedTextColor = Color.White,
                            unselectedIconColor = Color.White.copy(alpha = .38f),
                            unselectedTextColor = Color.White.copy(alpha = .38f),
                            indicatorColor = Color.Transparent,
                        ),
                    )
                }
            }
        },
        content = { padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                if (state.syncStatus.pendingWrites > 0) StatusBanner(
                    "${state.syncStatus.pendingWrites} change${if (state.syncStatus.pendingWrites == 1) "" else "s"} pending secure sync",
                    Color(0xFFF6C85F),
                ) else if (!online) StatusBanner("Offline · cached data is available; payments and account changes require a connection", Color(0xFFF6C85F))
                if (state.syncStatus.lastError.isNotBlank()) StatusBanner("Sync needs attention · ${state.syncStatus.lastError}", Negative)
                if (state.flags.maintenanceMode) StatusBanner("Maintenance mode · some cloud actions may be temporarily unavailable", Color(0xFFF6C85F))
                Box(Modifier.weight(1f)) { content(PaddingValues(0.dp)) }
            }
        },
    )
}

@Composable
private fun StatusBanner(message: String, color: Color) = Text(
    message,
    color = color,
    fontSize = 10.sp,
    fontWeight = FontWeight.Bold,
    modifier = Modifier.fillMaxWidth().background(color.copy(alpha = .12f)).padding(horizontal = 16.dp, vertical = 7.dp),
)

@Composable
private fun FeatureUnavailableScreen(name: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        ObsidianCard(Modifier.padding(24.dp)) {
            Icon(Icons.Default.ToggleOff, null, tint = MutedText)
            Text("$name is paused", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
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
fun BackBar(title: String, nav: NavHostController, subtitle: String? = null, actions: @Composable RowScope.() -> Unit = {}) = TopAppBar(
    title = {
        Column {
            Text(title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 17.sp, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
            if (!subtitle.isNullOrBlank()) {
                Text(subtitle, color = QuietText, fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
        }
    },
    navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Default.ArrowBack, "Back", tint = Color.White) } },
    actions = actions,
    colors = TopAppBarDefaults.topAppBarColors(containerColor = ObsidianSurface),
)
