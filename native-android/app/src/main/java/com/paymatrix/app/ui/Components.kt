package com.paymatrix.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.paymatrix.app.domain.Money

@Composable fun PageTitle(title: String, subtitle: String? = null, action: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            if (subtitle != null) Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        action?.invoke()
    }
}

@Composable fun ObsidianCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp), content = content)
    }
}

@Composable fun MoneyText(paise: Long, positiveGood: Boolean = true) {
    val color = when {
        paise == 0L -> MaterialTheme.colorScheme.onSurfaceVariant
        (paise > 0) == positiveGood -> MaterialTheme.colorScheme.primary
        else -> MaterialTheme.colorScheme.error
    }
    Text(Money.format(kotlin.math.abs(paise)), color = color, fontWeight = FontWeight.Bold)
}

@Composable fun BusyOverlay(show: Boolean) {
    if (show) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
}

@Composable fun EmptyState(title: String, body: String) {
    Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp)); Text(body, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable fun FormField(value: String, onValueChange: (String) -> Unit, label: String, modifier: Modifier = Modifier, singleLine: Boolean = true) {
    OutlinedTextField(value, onValueChange, label = { Text(label) }, singleLine = singleLine, modifier = modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
}
