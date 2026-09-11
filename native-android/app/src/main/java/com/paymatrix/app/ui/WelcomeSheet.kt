package com.paymatrix.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.data.DevicePreferences

private data class OnboardingFeature(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val tint: Color,
    val bg: Color,
)

private val onboardingFeatures = listOf(
    OnboardingFeature(
        title = "Paise-Level Precision",
        description = "Deterministic arithmetic down to exact integer paise. Every rupee is conserved with zero rounding drift.",
        icon = Icons.Default.Receipt,
        tint = Color(0xFF10B981),
        bg = Color(0x1F10B981),
    ),
    OnboardingFeature(
        title = "Smart Multi-Payer Ledgers",
        description = "Support for multiple payers and uneven splits. Balances are simplified into the fewest direct transfers.",
        icon = Icons.Default.Groups,
        tint = Color(0xFFF59E0B),
        bg = Color(0x1FF59E0B),
    ),
    OnboardingFeature(
        title = "Instant UPI Settlements",
        description = "One-tap deep linking to GPay, PhonePe, and Paytm with QR fallback and unconfirmed payment isolation.",
        icon = Icons.Default.Bolt,
        tint = Color(0xFF38BDF8),
        bg = Color(0x1F38BDF8),
    ),
)

@Composable
fun WelcomeSheet(nav: NavHostController) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    Scaffold(
        containerColor = CanvasBlack,
        contentWindowInsets = WindowInsets.statusBars,
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CanvasBlack)
                    .navigationBarsPadding()
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // Trust & Privacy Note
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        Icons.Default.Shield,
                        contentDescription = null,
                        tint = MutedText,
                        modifier = Modifier.size(14.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "Encrypted ledgers · strictly private and never tracked",
                        color = MutedText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }

                // Sticky Continue Button
                Button(
                    onClick = {
                        DevicePreferences.setSeenOnboarding(context)
                        nav.navigate("login") {
                            popUpTo("welcome") { inclusive = true }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = CircleShape,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Ink,
                        contentColor = CanvasBlack,
                    ),
                ) {
                    Text(
                        text = "CONTINUE",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp,
                    )
                    Spacer(Modifier.width(8.dp))
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp, vertical = 20.dp),
        ) {
            Spacer(Modifier.height(12.dp))

            // Sub-brand badge
            Text(
                text = "paymatrix",
                color = MutedText,
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
            )

            Spacer(Modifier.height(8.dp))

            // Title & Subtitle
            Text(
                text = "Welcome to paymatrix",
                color = Ink,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Black,
                letterSpacing = (-0.5).sp,
            )

            Spacer(Modifier.height(8.dp))

            Text(
                text = "Effortless group expense splitting, real-time debt simplification, and direct UPI settlements.",
                color = MutedText,
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )

            Spacer(Modifier.height(32.dp))

            // Feature List
            Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                onboardingFeatures.forEach { feature ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(46.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(feature.bg),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = feature.icon,
                                contentDescription = null,
                                tint = feature.tint,
                                modifier = Modifier.size(22.dp),
                            )
                        }

                        Spacer(Modifier.width(16.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = feature.title,
                                color = Ink,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = feature.description,
                                color = MutedText,
                                fontSize = 13.sp,
                                lineHeight = 18.sp,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
