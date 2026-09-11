package com.paymatrix.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.paymatrix.app.PayMatrixState
import com.paymatrix.app.PayMatrixViewModel
import com.paymatrix.app.data.FirebaseInstrumentation
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

@Composable
fun DeveloperInstrumentationScreen(
    state: PayMatrixState,
    vm: PayMatrixViewModel,
    nav: NavHostController
) {
    val context = LocalContext.current
    val showFeedback = LocalAppFeedback.current
    val clipboard = LocalClipboardManager.current
    var metrics by remember { mutableStateOf(FirebaseInstrumentation.getMetrics()) }

    // Live update ticker every second
    LaunchedEffect(Unit) {
        while (isActive) {
            metrics = FirebaseInstrumentation.getMetrics()
            delay(1000)
        }
    }

    val docReads = (metrics["documentReads"] as? Number)?.toLong() ?: 0L
    val docWrites = (metrics["documentWrites"] as? Number)?.toLong() ?: 0L
    val cacheReads = (metrics["cacheReads"] as? Number)?.toLong() ?: 0L
    val serverReads = (metrics["serverReads"] as? Number)?.toLong() ?: 0L
    val queryCount = (metrics["queryCount"] as? Number)?.toLong() ?: 0L
    val avgLatency = (metrics["averageQueryLatencyMs"] as? Number)?.toDouble() ?: 0.0
    val lastLatency = (metrics["lastQueryLatencyMs"] as? Number)?.toLong() ?: 0L
    val returnedDocs = (metrics["returnedDocuments"] as? Number)?.toLong() ?: 0L
    val activeListeners = (metrics["activeListeners"] as? Number)?.toInt() ?: 0
    val duplicateSignatures = (metrics["duplicateListenerSignatures"] as? Number)?.toLong() ?: 0L
    @Suppress("UNCHECKED_CAST")
    val signatures = (metrics["querySignatures"] as? Map<String, Long>).orEmpty()

    val cacheHitRatio = if (docReads > 0) {
        "${((cacheReads.toDouble() / docReads.toDouble()) * 100).toInt()}%"
    } else {
        "N/A"
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = AppSpacing.pagePadding,
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { nav.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Ink)
                }
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        "Firebase Instrumentation",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Ink
                    )
                    Text(
                        "Local query telemetry & cache distribution",
                        color = QuietText,
                        fontSize = 12.sp
                    )
                }
            }
        }

        // Action Buttons: Reset & Export JSON
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        FirebaseInstrumentation.reset(context)
                        metrics = FirebaseInstrumentation.getMetrics()
                        showFeedback("Counters reset")
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Hairline)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Reset", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }

                Button(
                    onClick = {
                        val json = FirebaseInstrumentation.exportJson()
                        clipboard.setText(AnnotatedString(json))
                        showFeedback("JSON copied to clipboard")
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ActionContainer, contentColor = ActionContent)
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Export JSON", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        // Privacy Invariant Card
        item {
            ObsidianCard(contentPadding = PaddingValues(14.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Default.Shield, contentDescription = null, tint = Positive, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "Privacy Invariant: Instrumentation data is strictly stored locally on device and scoped to the active session. Document contents, financial amounts, email addresses, and user identifiers are never stored or exported.",
                        color = QuietText,
                        fontSize = 12.sp,
                        lineHeight = 16.sp
                    )
                }
            }
        }

        // Metric Tiles
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MetricTile(
                    label = "DOCUMENT READS",
                    value = docReads.toString(),
                    sub = "Cache: $cacheReads · Server: $serverReads",
                    modifier = Modifier.weight(1f)
                )
                MetricTile(
                    label = "DOCUMENT WRITES",
                    value = docWrites.toString(),
                    sub = "Mutations & batches",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MetricTile(
                    label = "ACTIVE LISTENERS",
                    value = activeListeners.toString(),
                    sub = "Duplicates: $duplicateSignatures",
                    modifier = Modifier.weight(1f)
                )
                MetricTile(
                    label = "AVG QUERY LATENCY",
                    value = "${avgLatency.toInt()}ms",
                    sub = "Last: ${lastLatency}ms ($queryCount queries)",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MetricTile(
                    label = "RETURNED DOCS",
                    value = returnedDocs.toString(),
                    sub = "Across queries & snaps",
                    modifier = Modifier.weight(1f)
                )
                MetricTile(
                    label = "CACHE HIT RATIO",
                    value = cacheHitRatio,
                    sub = "$cacheReads / $docReads reads",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        if (duplicateSignatures > 0) {
            item {
                ObsidianCard(
                    modifier = Modifier.border(1.dp, Negative.copy(alpha = 0.5f), RoundedCornerShape(16.dp)),
                    contentPadding = PaddingValues(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Negative, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("Duplicate Listeners Detected", color = Negative, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text("$duplicateSignatures duplicate listener subscriptions observed concurrently.", color = QuietText, fontSize = 12.sp)
                        }
                    }
                }
            }
        }

        // Query Signatures List
        item {
            SectionTitle("Query signatures", "${signatures.size} registered")
        }

        if (signatures.isEmpty()) {
            item {
                EmptyState("No signatures recorded", "Execute queries or navigate screens to observe Firestore signatures.")
            }
        } else {
            items(signatures.entries.sortedByDescending { it.value }, key = { it.key }) { (sig, count) ->
                ObsidianCard(contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            sig,
                            color = Ink,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(ActionContainer.copy(alpha = 0.3f))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                "${count}×",
                                color = ActionContent,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricTile(
    label: String,
    value: String,
    sub: String,
    modifier: Modifier = Modifier
) {
    ObsidianCard(modifier = modifier, contentPadding = PaddingValues(14.dp)) {
        Text(
            label,
            color = QuietText,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
        Text(
            value,
            color = Ink,
            fontWeight = FontWeight.Black,
            fontSize = 24.sp,
            style = TextStyle(fontFeatureSettings = "tnum")
        )
        Text(
            sub,
            color = QuietText,
            fontSize = 11.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
