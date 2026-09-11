# Phase 5: Quick Action Strip Glance Widget Blueprint

> **Artifact:** `PayMatrixQuickActionWidget.kt`  
> **Widget Category:** 4x1 Compact Home Screen Strip

---

## 1. Widget Implementation Code

```kotlin
// native-android/app/src/main/java/com/paymatrix/app/widget/PayMatrixQuickActionWidget.kt
package com.paymatrix.app.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.paymatrix.app.MainActivity

class PayMatrixQuickActionWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val addExpenseIntent = Intent(Intent.ACTION_VIEW, Uri.parse("paymatrix://expense/new")).apply {
            setClass(context, MainActivity::class.java)
        }
        val scanBillIntent = Intent(Intent.ACTION_VIEW, Uri.parse("paymatrix://scanner")).apply {
            setClass(context, MainActivity::class.java)
        }
        val settleIntent = Intent(Intent.ACTION_VIEW, Uri.parse("paymatrix://settle")).apply {
            setClass(context, MainActivity::class.java)
        }

        provideContent {
            GlanceTheme {
                Row(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(GlanceTheme.colors.surface)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "💎 paymatrix",
                        style = TextStyle(fontWeight = FontWeight.Bold, color = GlanceTheme.colors.onSurface)
                    )

                    Spacer(modifier = GlanceModifier.defaultWeight())

                    Button(
                        text = "+ Split",
                        onClick = actionStartActivity(addExpenseIntent)
                    )
                    Spacer(modifier = GlanceModifier.width(6.dp))
                    Button(
                        text = "📸 Scan",
                        onClick = actionStartActivity(scanBillIntent)
                    )
                    Spacer(modifier = GlanceModifier.width(6.dp))
                    Button(
                        text = "⚡ Settle",
                        onClick = actionStartActivity(settleIntent)
                    )
                }
            }
        }
    }
}
```
