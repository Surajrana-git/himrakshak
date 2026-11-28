package in.himrakshak.app;

import java.nio.ByteBuffer;
import java.util.Locale;

/**
 * One SOS, small enough for a single SMS (text form, ~55 chars) and a single Bluetooth advert
 * (binary form, 18 bytes):
 *
 *   HIM|<id>|<lat>,<lon>|<hazard>|<unix seconds>|<ttl>
 *   HIM|k3j9a2|30.35800,77.84940|STUCK|1795849329|5
 *
 * id: 6 base-36 characters, made once per SOS, so every copy that travels by SMS, by Bluetooth
 * and over the internet is saved only once. ttl: how many more phones may pass it on.
 */
public final class SosPacket {
    static final String[] HAZARDS = {"OTHER", "STUCK", "INJURED", "TRAPPED", "SLIDE"};
    static final int BYTES = 18;

    public final String id;
    public final double lat;
    public final double lon;
    public final String hazard;
    public final long ts;
    public final int ttl;

    SosPacket(String id, double lat, double lon, String hazard, long ts, int ttl) {
        this.id = id;
        this.lat = lat;
        this.lon = lon;
        this.hazard = hazard;
        this.ts = ts;
        this.ttl = ttl;
    }

    SosPacket withTtl(int newTtl) {
        return new SosPacket(id, lat, lon, hazard, ts, newTtl);
    }

    String toText() {
        return String.format(Locale.US, "HIM|%s|%.5f,%.5f|%s|%d|%d", id, lat, lon, hazard, ts, ttl);
    }

    /** Null when the text is not a valid packet (a normal SMS, a broken copy). */
    static SosPacket parse(String text) {
        if (text == null) return null;
        int start = text.indexOf("HIM|");
        if (start < 0) return null;
        String[] p = text.substring(start).trim().split("\\|");
        if (p.length < 6) return null;
        try {
            String[] ll = p[2].split(",");
            double lat = Double.parseDouble(ll[0]);
            double lon = Double.parseDouble(ll[1]);
            String hazard = hazardIndex(p[3]) >= 0 ? p[3] : "OTHER";
            long ts = Long.parseLong(p[4].trim());
            int ttl = Integer.parseInt(p[5].trim().split("\\s")[0]);
            if (!p[1].matches("[0-9a-z]{6}") || Math.abs(lat) > 90 || Math.abs(lon) > 180 || ttl < 0 || ttl > 15) return null;
            return new SosPacket(p[1], lat, lon, hazard, ts, ttl);
        } catch (RuntimeException e) {
            return null;
        }
    }

    static int hazardIndex(String hazard) {
        for (int i = 0; i < HAZARDS.length; i++) if (HAZARDS[i].equals(hazard)) return i;
        return -1;
    }

    /** id (4) · lat×1e5 (4) · lon×1e5 (4) · hazard (1) · seconds (4) · ttl (1) = 18 bytes. */
    byte[] toBytes() {
        ByteBuffer b = ByteBuffer.allocate(BYTES);
        b.putInt((int) Long.parseLong(id, 36));
        b.putInt((int) Math.round(lat * 1e5));
        b.putInt((int) Math.round(lon * 1e5));
        b.put((byte) Math.max(0, hazardIndex(hazard)));
        b.putInt((int) ts);
        b.put((byte) ttl);
        return b.array();
    }

    static SosPacket fromBytes(byte[] data) {
        if (data == null || data.length < BYTES) return null;
        ByteBuffer b = ByteBuffer.wrap(data);
        String id = String.format(Locale.US, "%6s", Long.toString(b.getInt() & 0xffffffffL, 36)).replace(' ', '0');
        double lat = b.getInt() / 1e5;
        double lon = b.getInt() / 1e5;
        int h = b.get();
        long ts = b.getInt() & 0xffffffffL;
        int ttl = b.get();
        if (id.length() != 6 || Math.abs(lat) > 90 || Math.abs(lon) > 180 || ttl < 0 || ttl > 15) return null;
        return new SosPacket(id, lat, lon, h >= 0 && h < HAZARDS.length ? HAZARDS[h] : "OTHER", ts, ttl);
    }
}
