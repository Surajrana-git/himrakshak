package in.himrakshak.app;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.telephony.SmsManager;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;

/**
 * Sends an SOS by plain SMS (works with only a phone signal, no data). Retries up to 3 times,
 * 5 seconds apart, and reports "sent" (left the phone) and "delivered" (reached the other phone).
 */
final class SmsFallback {
    interface Callback {
        void onStatus(String status, String detail); // "sent", "delivered", "failed"
    }

    private static final int MAX_TRIES = 3;
    private static int nextRequest = 1;

    static void send(Context context, String number, String text, Callback callback) {
        attempt(context.getApplicationContext(), number, text, 1, callback);
    }

    private static void attempt(Context ctx, String number, String text, int tryNo, Callback callback) {
        int request = nextRequest++;
        String sentAction = "in.himrakshak.app.SMS_SENT_" + request;
        String deliveredAction = "in.himrakshak.app.SMS_DELIVERED_" + request;

        BroadcastReceiver sent = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent i) {
                ctx.unregisterReceiver(this);
                if (getResultCode() == Activity.RESULT_OK) {
                    callback.onStatus("sent", number);
                } else if (tryNo < MAX_TRIES) {
                    callback.onStatus("retrying", "try " + (tryNo + 1) + " of " + MAX_TRIES + " (no signal?)");
                    new Handler(Looper.getMainLooper()).postDelayed(() -> attempt(ctx, number, text, tryNo + 1, callback), 5000);
                } else {
                    callback.onStatus("failed", "SMS could not leave the phone (code " + getResultCode() + ")");
                }
            }
        };
        BroadcastReceiver delivered = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent i) {
                ctx.unregisterReceiver(this);
                if (getResultCode() == Activity.RESULT_OK) callback.onStatus("delivered", number);
            }
        };
        ContextCompat.registerReceiver(ctx, sent, new IntentFilter(sentAction), ContextCompat.RECEIVER_NOT_EXPORTED);
        ContextCompat.registerReceiver(ctx, delivered, new IntentFilter(deliveredAction), ContextCompat.RECEIVER_NOT_EXPORTED);

        int flags = PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent sentPi = PendingIntent.getBroadcast(ctx, request, new Intent(sentAction).setPackage(ctx.getPackageName()), flags);
        PendingIntent deliveredPi = PendingIntent.getBroadcast(ctx, request, new Intent(deliveredAction).setPackage(ctx.getPackageName()), flags);

        try {
            SmsManager sms = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? ctx.getSystemService(SmsManager.class) : SmsManager.getDefault();
            ArrayList<String> parts = sms.divideMessage(text);
            if (parts.size() == 1) {
                sms.sendTextMessage(number, null, text, sentPi, deliveredPi);
            } else {
                // Long messages (with a map link) go as one multi-part SMS; status follows the last part.
                ArrayList<PendingIntent> sents = new ArrayList<>();
                ArrayList<PendingIntent> delivers = new ArrayList<>();
                for (int i = 0; i < parts.size(); i++) {
                    sents.add(i == parts.size() - 1 ? sentPi : null);
                    delivers.add(i == parts.size() - 1 ? deliveredPi : null);
                }
                sms.sendMultipartTextMessage(number, null, parts, sents, delivers);
            }
        } catch (RuntimeException e) {
            try {
                ctx.unregisterReceiver(sent);
                ctx.unregisterReceiver(delivered);
            } catch (RuntimeException ignored) {
            }
            callback.onStatus("failed", e.getMessage() == null ? "SMS is not available on this phone" : e.getMessage());
        }
    }
}
