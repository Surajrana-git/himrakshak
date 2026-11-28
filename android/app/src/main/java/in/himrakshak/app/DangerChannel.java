package in.himrakshak.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

/**
 * Notification channel for real danger only (landslide, blocked road, SOS nearby): the Himrakshak
 * siren (res/raw/siren.wav) and a strong vibration. Traffic jams never use it. Push messages from
 * the server name this channel, so they ring with the siren even when the app is closed.
 */
final class DangerChannel {
    static final String ID = "himrakshak-danger";

    static void ensure(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(ID) != null) return;
        NotificationChannel ch = new NotificationChannel(ID, "Danger alerts (siren)", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Landslides, blocked roads and SOS calls nearby");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[] {0, 500, 150, 500, 150, 500});
        Uri siren = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.siren);
        ch.setSound(siren, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        nm.createNotificationChannel(ch);
    }
}
