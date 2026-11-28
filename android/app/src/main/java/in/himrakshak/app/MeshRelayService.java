package in.himrakshak.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.ParcelUuid;
import androidx.core.app.NotificationCompat;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bluetooth store-and-forward SOS mesh. No internet, no phone signal, no pairing needed.
 *
 *   sender   your own SOS is advertised over Bluetooth Low Energy, again and again
 *   relay    every Himrakshak phone nearby hears it, keeps one copy (by packet id), lowers its
 *            ttl by one and advertises it too, so it hops phone to phone along the road
 *   gateway  the first phone that has internet posts it to the rescue dashboard (once: synced ids
 *            are remembered), so a car that drives out of the valley carries the SOS out
 *
 * Bluetooth reaches roughly 50–100 m per hop. Runs as a foreground service with a notification.
 */
public class MeshRelayService extends Service {
    // 16-bit Bluetooth service id used only by Himrakshak SOS adverts.
    static final ParcelUuid SOS_UUID = ParcelUuid.fromString("0000f1a5-0000-1000-8000-00805f9b34fb");
    static final String EXTRA_PACKET = "packet";
    static final String RELAY_URL = "https://himrakshak.vercel.app/api/sos-relay";
    private static final String CHANNEL = "himrakshak-mesh";
    private static final String ALERT_CHANNEL = "himrakshak-sos-nearby";
    private static final int ROTATE_MS = 4000; // each packet is on air 4 s, then the next one

    interface Listener {
        void onMeshEvent(String event, SosPacket packet, int heard, int relayed, int synced);
    }

    static volatile Listener listener;
    static volatile boolean running = false;
    static final Map<String, SosPacket> packets = Collections.synchronizedMap(new LinkedHashMap<>());
    static final Set<String> synced = ConcurrentHashMap.newKeySet();
    static volatile String ownId = null;
    static volatile int heard = 0;
    static volatile int broadcasts = 0; // times our own SOS went on air: proof it is sending, even alone
    static final Set<String> relayedIds = ConcurrentHashMap.newKeySet();

    private final Handler handler = new Handler(Looper.getMainLooper());
    private BluetoothLeAdvertiser advertiser;
    private BluetoothLeScanner scanner;
    private AdvertiseCallback advertising;
    private int turn = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "SOS Bluetooth relay", NotificationManager.IMPORTANCE_LOW));
            NotificationChannel alerts = new NotificationChannel(ALERT_CHANNEL, "SOS from phones nearby", NotificationManager.IMPORTANCE_HIGH);
            alerts.enableVibration(true);
            alerts.setVibrationPattern(new long[] {0, 600, 200, 600, 200, 600});
            nm.createNotificationChannel(alerts);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String text = intent == null ? null : intent.getStringExtra(EXTRA_PACKET);
        SosPacket own = SosPacket.parse(text);
        if (own != null) {
            ownId = own.id;
            packets.put(own.id, own);
        }
        startForegroundNow();
        if (!running) {
            running = true;
            startScan();
            handler.post(rotate);
        } else if (own != null) {
            // Was only relaying; now it is our own SOS, so scan harder.
            stopScan();
            startScan();
        }
        emit("started", own);
        return START_STICKY;
    }

    private void startForegroundNow() {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE);
        String body = ownId != null ? "Sending your SOS to phones nearby by Bluetooth." : "Passing on SOS calls from phones nearby.";
        Notification n = new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
                .setContentTitle("Himrakshak SOS relay is on")
                .setContentText(body)
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(41, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        } else {
            startForeground(41, n);
        }
    }

    private BluetoothAdapter adapter() {
        BluetoothManager bm = getSystemService(BluetoothManager.class);
        return bm == null ? null : bm.getAdapter();
    }

    // ---- relay: listen for Himrakshak adverts -------------------------------------------------

    private final ScanCallback scanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            if (result.getScanRecord() == null) return;
            SosPacket p = SosPacket.fromBytes(result.getScanRecord().getServiceData(SOS_UUID));
            if (p == null || packets.containsKey(p.id)) return; // dedupe: one copy per SOS
            heard++;
            // Keep it for rebroadcast with one hop less; ttl 0 is only delivered, not passed on.
            packets.put(p.id, p.withTtl(Math.max(0, p.ttl - 1)));
            emit("heard", p);
            alertNearby(p);
        }
    };

    private void stopScan() {
        try {
            if (scanner != null) scanner.stopScan(scanCallback);
        } catch (SecurityException ignored) {
        }
        scanner = null;
    }

    private void startScan() {
        BluetoothAdapter a = adapter();
        if (a == null || !a.isEnabled()) {
            emit("bluetooth-off", null);
            return;
        }
        BluetoothLeScanner s = a.getBluetoothLeScanner();
        if (s == null) return;
        List<ScanFilter> filters = new ArrayList<>();
        // The filter lets Android keep scanning with the screen off.
        filters.add(new ScanFilter.Builder().setServiceUuid(SOS_UUID).build());
        ScanSettings settings = new ScanSettings.Builder()
                // Your own SOS: scan hard. Only relaying: low power, so the battery lasts.
                .setScanMode(ownId != null ? ScanSettings.SCAN_MODE_BALANCED : ScanSettings.SCAN_MODE_LOW_POWER)
                .build();
        try {
            s.startScan(filters, settings, scanCallback);
            scanner = s;
        } catch (SecurityException e) {
            emit("no-permission", null);
        }
    }

    // ---- sender + relay: advertise each kept packet in turn -----------------------------------

    private final Runnable rotate = new Runnable() {
        @Override
        public void run() {
            if (!running) return;
            List<SosPacket> live = new ArrayList<>();
            synchronized (packets) {
                for (SosPacket p : packets.values()) if (p.ttl > 0 || p.id.equals(ownId)) live.add(p);
            }
            // Bluetooth may come on after the start (airplane mode turns it off): begin listening then.
            if (scanner == null) startScan();
            if (!live.isEmpty()) advertise(live.get(turn++ % live.size()));
            forwardToInternet();
            handler.postDelayed(this, ROTATE_MS);
        }
    };

    private void advertise(SosPacket p) {
        BluetoothAdapter a = adapter();
        if (a == null || !a.isEnabled()) {
            advertiser = null;
            scanner = null; // listen again once Bluetooth is back
            emit("bluetooth-off", p);
            return;
        }
        if (advertiser == null) advertiser = a.getBluetoothLeAdvertiser();
        if (advertiser == null) {
            emit("no-advertising", null); // a few phones cannot advertise; they still relay to the internet
            return;
        }
        try {
            if (advertising != null) advertiser.stopAdvertising(advertising);
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                    .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                    .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                    .setConnectable(false)
                    .build();
            // Service id (4 bytes) + service data (22 bytes): fits the 31-byte legacy advert.
            AdvertiseData data = new AdvertiseData.Builder()
                    .setIncludeDeviceName(false)
                    .addServiceUuid(SOS_UUID)
                    .addServiceData(SOS_UUID, p.toBytes())
                    .build();
            advertising = new AdvertiseCallback() {
                @Override
                public void onStartFailure(int errorCode) {
                    emit("advertise-failed", p);
                }
            };
            advertiser.startAdvertising(settings, data, advertising);
            if (!p.id.equals(ownId)) relayedIds.add(p.id);
            else {
                broadcasts++;
                emit("advertised", p);
            }
        } catch (SecurityException e) {
            emit("no-permission", null);
        }
    }

    // ---- gateway: whoever has internet carries it out ------------------------------------------

    private boolean online() {
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        if (cm == null || cm.getActiveNetwork() == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    private volatile boolean posting = false;

    private void forwardToInternet() {
        if (posting || !online()) return;
        List<SosPacket> todo = new ArrayList<>();
        synchronized (packets) {
            for (SosPacket p : packets.values()) if (!synced.contains(p.id)) todo.add(p);
        }
        if (todo.isEmpty()) return;
        posting = true;
        new Thread(() -> {
            for (SosPacket p : todo) {
                if (post(p)) {
                    synced.add(p.id);
                    emit("synced", p);
                }
            }
            posting = false;
        }).start();
    }

    private boolean post(SosPacket p) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(RELAY_URL).openConnection();
            c.setRequestMethod("POST");
            c.setConnectTimeout(8000);
            c.setReadTimeout(8000);
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json");
            String body = "{\"packet\":\"" + p.toText() + "\",\"via\":\"" + (p.id.equals(ownId) ? "app" : "mesh") + "\"}";
            try (OutputStream out = c.getOutputStream()) {
                out.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int code = c.getResponseCode();
            c.disconnect();
            return code == 200;
        } catch (Exception e) {
            return false;
        }
    }

    // Someone close by (Bluetooth range, ~50–100 m) is asking for help: tell this phone's owner loudly.
    private void alertNearby(SosPacket p) {
        String what = p.hazard.equals("STUCK") ? "Vehicle stuck" : p.hazard.equals("INJURED") ? "Someone injured"
                : p.hazard.equals("TRAPPED") ? "Trapped by a road block" : p.hazard.equals("SLIDE") ? "Landslide seen" : "Needs help";
        Intent map = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(String.format(java.util.Locale.US, "geo:%.5f,%.5f?q=%.5f,%.5f(SOS)", p.lat, p.lon, p.lat, p.lon)));
        PendingIntent pi = PendingIntent.getActivity(this, p.id.hashCode(), map, PendingIntent.FLAG_IMMUTABLE);
        Notification n = new NotificationCompat.Builder(this, ALERT_CHANNEL)
                .setSmallIcon(android.R.drawable.stat_sys_warning)
                .setContentTitle("SOS nearby: someone needs help")
                .setContentText(String.format(java.util.Locale.US, "%s · %.4f, %.4f · tap for the spot", what, p.lat, p.lon))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setDefaults(Notification.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build();
        try {
            getSystemService(NotificationManager.class).notify(1000 + Math.abs(p.id.hashCode() % 1000), n);
        } catch (SecurityException ignored) {
            // Notifications turned off for the app: the in-app counter still shows it.
        }
    }

    private void emit(String event, SosPacket p) {
        Listener l = listener;
        if (l != null) l.onMeshEvent(event, p, heard, relayedIds.size(), synced.size());
    }

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacksAndMessages(null);
        try {
            if (scanner != null) scanner.stopScan(scanCallback);
            if (advertiser != null && advertising != null) advertiser.stopAdvertising(advertising);
        } catch (SecurityException ignored) {
        }
        emit("stopped", null);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
