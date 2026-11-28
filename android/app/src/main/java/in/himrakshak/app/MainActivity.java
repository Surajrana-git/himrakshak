package in.himrakshak.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SosNativePlugin.class); // offline SOS: SMS and Bluetooth mesh
        super.onCreate(savedInstanceState);
    }
}
