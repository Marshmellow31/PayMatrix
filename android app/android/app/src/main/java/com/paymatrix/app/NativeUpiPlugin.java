package com.paymatrix.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeUpi")
public class NativeUpiPlugin extends Plugin {
    private static final String GOOGLE_PAY_PACKAGE = "com.google.android.apps.nbu.paisa.user";

    @PluginMethod
    public void payWithGooglePay(PluginCall call) {
        String payeeAddress = call.getString("payeeAddress", "").trim();
        String payeeName = call.getString("payeeName", "PayMatrix contact").trim();
        String amount = call.getString("amount", "").trim();
        String note = call.getString("note", "PayMatrix settlement").trim();
        String transactionRef = call.getString("transactionRef", "").trim();

        if (payeeAddress.length() == 0 || !payeeAddress.contains("@")) {
            call.reject("A valid payee UPI ID is required.");
            return;
        }

        if (amount.length() == 0) {
            call.reject("A settlement amount is required.");
            return;
        }

        Uri.Builder uriBuilder = new Uri.Builder()
            .scheme("upi")
            .authority("pay")
            .appendQueryParameter("pa", payeeAddress)
            .appendQueryParameter("pn", payeeName)
            .appendQueryParameter("tn", note)
            .appendQueryParameter("am", amount)
            .appendQueryParameter("cu", "INR");

        if (transactionRef.length() > 0) {
            uriBuilder.appendQueryParameter("tr", transactionRef);
        }

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setData(uriBuilder.build());
        intent.setPackage(GOOGLE_PAY_PACKAGE);

        try {
            startActivityForResult(call, intent, "handleGooglePayResult");
        } catch (ActivityNotFoundException error) {
            call.reject("Google Pay is not installed on this device.", error);
        }
    }

    @ActivityCallback
    private void handleGooglePayResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        Intent data = result.getData();
        JSObject response = new JSObject();
        response.put("resultCode", result.getResultCode());
        response.put("completed", result.getResultCode() == Activity.RESULT_OK);

        if (data != null) {
            response.put("response", data.getStringExtra("response"));
            Uri uri = data.getData();
            if (uri != null) {
                response.put("uri", uri.toString());
            }
        }

        call.resolve(response);
    }
}
