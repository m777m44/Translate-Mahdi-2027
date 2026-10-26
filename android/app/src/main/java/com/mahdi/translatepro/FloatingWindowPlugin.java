package com.mahdi.translatepro;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native bridge for the floating translation window.
 *
 * The overlay itself is rendered by {@link FloatingWindowService} as a
 * foreground service holding a SYSTEM_ALERT_WINDOW view, so it keeps floating
 * above every other app. This plugin only owns the permission flow and the
 * show/hide lifecycle.
 */
@CapacitorPlugin(name = "FloatingWindow")
public class FloatingWindowPlugin extends Plugin {

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", canDrawOverlays());
        ret.put("available", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (canDrawOverlays()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("openedSettings", false);
            call.resolve(ret);
            return;
        }
        try {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("granted", false);
            ret.put("openedSettings", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("تعذّر فتح شاشة إذن الظهور فوق التطبيقات", e);
        }
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("تعذّر فتح الإعدادات", e);
        }
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (!canDrawOverlays()) {
            call.reject("يجب منح إذن الظهور فوق التطبيقات أولاً");
            return;
        }
        try {
            Intent intent = new Intent(getContext(), FloatingWindowService.class);
            intent.setAction(FloatingWindowService.ACTION_SHOW);
            if (call.hasOption("width")) {
                intent.putExtra("width", call.getInt("width", 320));
            }
            if (call.hasOption("height")) {
                intent.putExtra("height", call.getInt("height", 360));
            }
            if (call.hasOption("x")) {
                intent.putExtra("x", call.getInt("x", 40));
            }
            if (call.hasOption("y")) {
                intent.putExtra("y", call.getInt("y", 120));
            }
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("تعذّر تشغيل النافذة العائمة", e);
        }
    }

    @PluginMethod
    public void hide(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), FloatingWindowService.class);
            intent.setAction(FloatingWindowService.ACTION_HIDE);
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("تعذّر إخفاء النافذة العائمة", e);
        }
    }

    private boolean canDrawOverlays() {
        return Settings.canDrawOverlays(getContext());
    }
}
