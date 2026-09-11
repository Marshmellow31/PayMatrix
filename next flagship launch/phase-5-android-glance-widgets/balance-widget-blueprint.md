# Phase 5: Balance & Settle Glance Widget Blueprint

> **Artifact:** `PayMatrixBalanceWidget.kt` & `BalanceWidgetReceiver.kt`  
> **Widget Category:** 4x2 Home Screen Interactive Widget

---

## 1. Widget Implementation Code

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/widget/PayMatrixBalanceWidget.kt
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

class PayMatrixBalanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Retrieve cached data from DataStore
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
```

---

## 2. AppWidgetReceiver & XML Provider

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/widget/BalanceWidgetReceiver.kt
package com.paymatrix.app.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class BalanceWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = PayMatrixBalanceWidget()
}
```

```xml
<!-- native-android/app/src/main/res/xml/paymatrix_balance_widget_info.xml -->
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="240dp"
    android:minHeight="110dp"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:description="@string/widget_balance_description"
    android:previewLayout="@layout/glance_default_loading_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
```
