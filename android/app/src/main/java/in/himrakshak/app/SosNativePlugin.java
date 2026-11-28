package in.himrakshak.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * The web app's door to the offline SOS: SMS without data, and the Bluetooth mesh.
 * JS: registerPlugin("SosNative") → sendSms({ number, text }), startMesh({ packet? }), stopMesh(), meshStatus().
 */
@CapacitorPlugin(
        name = "SosNative",
        permissions = {
                // Some phones (Nothing, Samsung dual-SIM) also need phone state to pick the SIM for an SMS.
                @Permission(alias = "sms", strings = {Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE}),
                @Permission(alias = "bluetooth", strings = {Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.BLUETOOTH_CONNECT}),
                @Permission(alias = "location", strings = {Manifest.permission.ACCESS_FINE_LOCATION}),
                @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS}),
        })
public class SosNativePlugin extends Plugin {

    @Override
    public void load() {
        MeshRelayService.listener = (event, packet, heard, relayed, synced) -> {
            JSObject data = new JSObject();
            data.put("event", event);
            data.put("heard", heard);
            data.put("relayed", relayed);
            data.put("synced", synced);
            data.put("running", MeshRelayService.running);
            data.put("sending", MeshRelayService.ownId != null);
            data.put("broadcasts", MeshRelayService.broadcasts);
            data.put("bluetoothOn", bluetoothOn());
            if (packet != null) data.put("packet", packet.toText());
            notifyListeners("mesh", data);
        };
    }

    // ---- SMS ---------------------------------------------------------------------------------

    @PluginMethod
    public void sendSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermission");
            return;
        }
        doSend(call);
    }

    @PermissionCallback
    private void smsPermission(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) doSend(call);
        else call.reject("SMS permission was not given");
    }

    private void doSend(PluginCall call) {
        String number = call.getString("number");
        String text = call.getString("text");
        if (number == null || number.isEmpty() || text == null) {
            call.reject("number and text are needed");
            return;
        }
        call.setKeepAlive(true); // resolves "sent", then reports "delivered" as an event
        SmsFallback.send(getContext(), number, text, (status, detail) -> {
            JSObject data = new JSObject();
            data.put("number", number);
            data.put("status", status);
            data.put("detail", detail);
            notifyListeners("sms", data);
            if (status.equals("sent")) call.resolve(data);
            else if (status.equals("failed")) call.reject(detail);
            if (!status.equals("retrying") && !status.equals("sent")) call.setKeepAlive(false);
        });
    }

    // ---- Bluetooth mesh ------------------------------------------------------------------------

    @PluginMethod
    public void startMesh(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && getPermissionState("bluetooth") != PermissionState.GRANTED) {
            requestPermissionForAliases(new String[] {"bluetooth", "location", "notifications"}, call, "meshPermission");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S && getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "meshPermission");
            return;
        }
        doStart(call);
    }

    @PermissionCallback
    private void meshPermission(PluginCall call) {
        boolean ok = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                ? getPermissionState("bluetooth") == PermissionState.GRANTED
                : getPermissionState("location") == PermissionState.GRANTED;
        if (ok) doStart(call);
        else call.reject("Bluetooth permission was not given");
    }

    private boolean bluetoothOn() {
        android.bluetooth.BluetoothManager bm = getContext().getSystemService(android.bluetooth.BluetoothManager.class);
        return bm != null && bm.getAdapter() != null && bm.getAdapter().isEnabled();
    }

    // For phones WITHOUT Himrakshak: the phone's Bluetooth name becomes "SOS HELP call 98…" and the
    // phone turns visible for 1 hour (Android's maximum), so anyone who opens Bluetooth → Pair new device sees it.
    // The real name is kept and put back when the SOS stops.
    private void showHelpName(String helpName) {
        android.bluetooth.BluetoothManager bm = getContext().getSystemService(android.bluetooth.BluetoothManager.class);
        if (bm == null || bm.getAdapter() == null) return;
        android.bluetooth.BluetoothAdapter a = bm.getAdapter();
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("himrakshak-sos", 0);
        try {
            if (!prefs.contains("realName")) prefs.edit().putString("realName", a.getName()).apply();
            a.setName(helpName.length() > 40 ? helpName.substring(0, 40) : helpName);
            if (getActivity() != null) {
                getActivity().startActivity(new Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE)
                        .putExtra(android.bluetooth.BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 3600)); // Android allows 1 hour at most
            }
        } catch (SecurityException | android.content.ActivityNotFoundException ignored) {
        }
    }

    private void restoreName() {
        android.bluetooth.BluetoothManager bm = getContext().getSystemService(android.bluetooth.BluetoothManager.class);
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("himrakshak-sos", 0);
        String real = prefs.getString("realName", null);
        if (bm == null || bm.getAdapter() == null || real == null) return;
        try {
            bm.getAdapter().setName(real);
            prefs.edit().remove("realName").apply();
        } catch (SecurityException ignored) {
        }
    }

    private void doStart(PluginCall call) {
        String helpName = call.getString("helpName");
        if (helpName != null && !helpName.isEmpty() && bluetoothOn()) showHelpName(helpName);
        // Airplane mode switches Bluetooth off: ask the phone to switch it back on (one tap).
        if (!bluetoothOn() && getActivity() != null) {
            try {
                getActivity().startActivity(new Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE));
            } catch (SecurityException | android.content.ActivityNotFoundException ignored) {
            }
        }
        Intent intent = new Intent(getContext(), MeshRelayService.class);
        String packet = call.getString("packet");
        if (packet != null) intent.putExtra(MeshRelayService.EXTRA_PACKET, packet);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve(status());
    }

    @PluginMethod
    public void stopMesh(PluginCall call) {
        getContext().stopService(new Intent(getContext(), MeshRelayService.class));
        restoreName();
        MeshRelayService.ownId = null;
        MeshRelayService.broadcasts = 0;
        call.resolve(status());
    }

    @PluginMethod
    public void meshStatus(PluginCall call) {
        call.resolve(status());
    }

    private JSObject status() {
        JSObject s = new JSObject();
        s.put("running", MeshRelayService.running);
        s.put("heard", MeshRelayService.heard);
        s.put("relayed", MeshRelayService.relayedIds.size());
        s.put("synced", MeshRelayService.synced.size());
        s.put("sending", MeshRelayService.ownId != null);
        s.put("broadcasts", MeshRelayService.broadcasts);
        s.put("bluetoothOn", bluetoothOn());
        return s;
    }
}
