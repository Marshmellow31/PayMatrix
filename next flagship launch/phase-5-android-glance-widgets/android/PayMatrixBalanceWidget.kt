package com.paymatrix.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.paymatrix.app.MainActivity

/**
 * PayMatrixBalanceWidget
 * A declarative Jetpack Glance 4x2 interactive home screen widget
 */
class PayMatrixBalanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Reads cached balance from local device DataStore / SharedPreferences
        val isOwed = true
        val formattedBalance = "+$142.50"
        val streakDays = 14

        provideContent {
            GlanceTheme {
                Column(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(GlanceTheme.colors.surface)
                        .padding(16.dp)
                        .clickable(actionStartActivity<MainActivity>())
                ) {
                    // Header Bar
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "paymatrix",
                            style = TextStyle(
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = GlanceTheme.colors.onSurface
                            )
                        )
                        Spacer(modifier = GlanceModifier.defaultWeight())
                        Text(
                            text = "🔥 $streakDays days",
                            style = TextStyle(
                                fontWeight = FontWeight.Medium,
                                fontSize = 12.sp,
                                color = GlanceTheme.colors.primary
                            )
                        )
                    }

                    Spacer(modifier = GlanceModifier.height(10.dp))

                    // Balance Display
                    Text(
                        text = if (isOwed) "You are owed" else "You owe",
                        style = TextStyle(
                            fontSize = 12.sp,
                            color = GlanceTheme.colors.onSurfaceVariant
                        )
                    )
                    Text(
                        text = formattedBalance,
                        style = TextStyle(
                            fontWeight = FontWeight.Bold,
                            fontSize = 26.sp,
                            color = GlanceTheme.colors.primary
                        )
                    )

                    Spacer(modifier = GlanceModifier.defaultWeight())

                    // Action Buttons
                    Row(modifier = GlanceModifier.fillMaxWidth()) {
                        Button(
                            text = "+ Add",
                            onClick = actionStartActivity<MainActivity>()
                        )
                        Spacer(modifier = GlanceModifier.width(8.dp))
                        Button(
                            text = "📸 Scan",
                            onClick = actionStartActivity<MainActivity>()
                        )
                    }
                }
            }
        }
    }
}
