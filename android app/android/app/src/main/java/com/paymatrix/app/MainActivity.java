package com.paymatrix.app;

import android.graphics.Color;
import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.rgb(26, 26, 26));

        boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(isDebuggable);
        getBridge().getWebView().setBackgroundColor(Color.rgb(14, 14, 14));
        getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        applyDisplayFrameRate();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyDisplayFrameRate();
    }

    private void applyDisplayFrameRate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Display display = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? getDisplay()
                : getWindowManager().getDefaultDisplay();

            if (display != null) {
                Display.Mode currentMode = display.getMode();
                Display.Mode bestMode = currentMode;
                for (Display.Mode mode : display.getSupportedModes()) {
                    boolean sameResolution =
                        mode.getPhysicalWidth() == currentMode.getPhysicalWidth() &&
                        mode.getPhysicalHeight() == currentMode.getPhysicalHeight();
                    if (sameResolution && mode.getRefreshRate() > bestMode.getRefreshRate()) {
                        bestMode = mode;
                    }
                }

                WindowManager.LayoutParams attributes = getWindow().getAttributes();
                if (attributes.preferredDisplayModeId != bestMode.getModeId()) {
                    attributes.preferredDisplayModeId = bestMode.getModeId();
                    getWindow().setAttributes(attributes);
                }
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            getBridge()
                .getWebView()
                .setRequestedFrameRate(View.REQUESTED_FRAME_RATE_CATEGORY_HIGH);
        }
    }
}
