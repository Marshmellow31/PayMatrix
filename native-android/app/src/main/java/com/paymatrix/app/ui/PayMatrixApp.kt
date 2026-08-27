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
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
                composable("login") { LoginScreen(state, viewModel) }
                composable("dashboard") { MainShell("dashboard", state, nav) { DashboardScreen(state, viewModel, nav) } }
                composable("friends") { MainShell("friends", state, nav) { FriendsScreen(state, viewModel, nav) } }
                composable("groups") { MainShell("groups", state, nav) { GroupsScreen(state, viewModel, nav) } }
                composable("logs") { MainShell("logs", state, nav) { if (state.flags.logs) LogGroupsScreen(state, viewModel, nav) else FeatureUnavailableScreen("Spending logs") } }
                composable("profile") { MainShell("profile", state, nav) { ProfileScreen(state, viewModel, nav) } }
                composable("activity") { MainShell("", state, nav) { ActivityScreen(state, viewModel, nav) } }
                composable("analytics") { MainShell("", state, nav) { if (state.flags.analytics) AnalyticsScreen(state, viewModel, nav) else FeatureUnavailableScreen("Analytics") } }
                composable("notifications") { MainShell("", state, nav) { NotificationsScreen(state, viewModel, nav) } }
                composable("group/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry -> MainShell("groups", state, nav) { GroupScreen(entry.arguments?.getString("id").orEmpty(), state, viewModel, nav) } }
                composable("expense/{groupId}?expenseId={expenseId}", arguments = listOf(navArgument("groupId") { type = NavType.StringType }, navArgument("expenseId") { type = NavType.StringType; defaultValue = "" })) {
                    ExpenseFormScreen(it.arguments?.getString("groupId").orEmpty(), it.arguments?.getString("expenseId").orEmpty(), state, viewModel, nav)
                }
                composable("join/{code}", arguments = listOf(navArgument("code") { type = NavType.StringType })) { JoinGroupScreen(it.arguments?.getString("code").orEmpty(), state, viewModel, nav) }
                composable("logs/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { LogEntriesScreen(it.arguments?.getString("id").orEmpty(), state, viewModel, nav) }
                composable("scanner") { if (state.flags.billScanning) ScannerScreen(state, viewModel, nav) else Scaffold(topBar = { BackBar("Receipt scanner", nav) }) { FeatureUnavailableScreen("Receipt scanning", Modifier.padding(it)) } }
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
private fun LoginScreen(state: PayMatrixState, vm: PayMatrixViewModel) {
    val context = LocalContext.current
    val clientId = stringResource(R.string.default_web_client_id)
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp).padding(top = 14.dp, bottom = 18.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(R.drawable.logo), "paymatrix logo", Modifier.size(34.dp))
            Spacer(Modifier.width(10.dp))
            Text("PAYMATRIX", color = Color.White, fontWeight = FontWeight.Black, letterSpacing = 2.sp, fontSize = 13.sp)
            Spacer(Modifier.weight(1f))
            Icon(Icons.Default.VerifiedUser, null, tint = Positive, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(5.dp)); Text("Secured by Firebase", color = Positive.copy(alpha = .8f), fontWeight = FontWeight.Bold, fontSize = 10.sp)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
            Text("Your shared money,", color = Color.White, fontWeight = FontWeight.Black, fontSize = 34.sp, lineHeight = 35.sp)
            Text("clear at a glance.", color = Color.White.copy(alpha = .45f), fontWeight = FontWeight.Black, fontSize = 34.sp, lineHeight = 38.sp)
            Spacer(Modifier.height(14.dp))
            Text("Choose a Google account on this phone to securely open your groups, balances, and activity.", color = Color.White.copy(alpha = .5f), lineHeight = 20.sp, fontSize = 13.sp)
            Spacer(Modifier.height(22.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                LoginFeature(Icons.Default.Groups, "One shared view", "Live groups and balances.", Modifier.weight(1f))
                LoginFeature(Icons.Default.Lock, "Private access", "Device-native account sign-in.", Modifier.weight(1f))
            }
        }
        PrimaryAction(if (state.loading) "Opening accounts..." else "Continue with Google", { vm.signIn(context, clientId) }, Modifier.fillMaxWidth(), enabled = !state.loading, icon = { Text("G", color = Color(0xFF4285F4), fontWeight = FontWeight.Black, fontSize = 20.sp) })
        Spacer(Modifier.height(9.dp))
        Text("Android will show the Google accounts already available on this device. paymatrix never sees your Google password.", color = Color.White.copy(alpha = .28f), fontSize = 9.sp, lineHeight = 13.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
    }
}

@Composable
private fun LoginFeature(icon: ImageVector, title: String, body: String, modifier: Modifier) {
    Column(modifier.border(1.dp, Hairline, RoundedCornerShape(13.dp)).background(Color.White.copy(alpha = .025f), RoundedCornerShape(13.dp)).padding(13.dp)) {
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
        topBar = { PayMatrixHeader(state.user, state.notifications.count { !it.isRead }, { nav.navigate("activity") }, { if (route != "profile") nav.navigate("profile") }) },
        bottomBar = {
            Surface(color = ObsidianSurface, tonalElevation = 0.dp) {
                Row(Modifier.fillMaxWidth().height(62.dp)) {
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
                        icon = { Icon(if (selected) item.selected else item.idle, item.label, modifier = Modifier.size(18.dp)) },
                        label = { Text(item.label, fontSize = 9.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium) },
                        colors = NavigationBarItemDefaults.colors(selectedIconColor = Color.White, selectedTextColor = Color.White, unselectedIconColor = Color.White.copy(alpha = .35f), unselectedTextColor = Color.White.copy(alpha = .35f), indicatorColor = Color.Transparent),
                    )
                }
                }
            }
        },
        content = { padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                if (!online) StatusBanner("Offline · cached data remains available and changes sync when connected", Negative)
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
        mutableStateOf(manager.activeNetwork?.let { manager.getNetworkCapabilities(it)?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) } == true)
    }
    DisposableEffect(manager) {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { connected = true }
            override fun onLost(network: Network) { connected = manager.activeNetwork != null }
            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) { connected = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) }
        }
        manager.registerNetworkCallback(NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(), callback)
        onDispose { manager.unregisterNetworkCallback(callback) }
    }
    return connected
}

@Composable
fun BackBar(title: String, nav: NavHostController, actions: @Composable RowScope.() -> Unit = {}) = TopAppBar(
    title = { Text(title, fontWeight = FontWeight.Bold, color = Color.White) },
    navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Default.ArrowBack, "Back") } },
    actions = actions,
    colors = TopAppBarDefaults.topAppBarColors(containerColor = ObsidianSurface),
)
