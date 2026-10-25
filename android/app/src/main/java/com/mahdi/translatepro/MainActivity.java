package com.mahdi.translatepro;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        List<Class<? extends Plugin>> plugins = new ArrayList<>();
        plugins.add(FloatingWindowPlugin.class);
        registerPlugins(plugins);
        super.onCreate(savedInstanceState);
    }
}
