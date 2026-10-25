package com.mahdi.translatepro;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

/**
 * Foreground service that hosts a draggable floating bubble and an expandable
 * translation panel rendered inside a WebView. The overlay type is
 * TYPE_APPLICATION_OVERLAY (API 26+) so it floats above every other app.
 */
public class FloatingWindowService extends Service {

    public static final String ACTION_SHOW = "com.mahdi.translatepro.FLOATING_SHOW";
    public static final String ACTION_HIDE = "com.mahdi.translatepro.FLOATING_HIDE";
    private static final String CHANNEL_ID = "mahdi_floating";
    private static final int NOTIFICATION_ID = 7301;

    private WindowManager windowManager;
    private View bubbleView;
    private View panelView;
    private WebView webView;
    private WindowManager.LayoutParams bubbleParams;
    private WindowManager.LayoutParams panelParams;
    private int touchSlop;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        touchSlop = android.view.ViewConfiguration.get(this).getScaledTouchSlop();
        startAsForeground();
        buildBubble();
        buildPanel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_HIDE.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        int widthDp = intent != null ? intent.getIntExtra("width", 320) : 320;
        int heightDp = intent != null ? intent.getIntExtra("height", 360) : 360;
        int xDp = intent != null ? intent.getIntExtra("x", 24) : 24;
        int yDp = intent != null ? intent.getIntExtra("y", 120) : 120;

        if (panelView != null) {
            panelParams.width = dp(widthDp);
            panelParams.height = dp(heightDp);
            panelParams.x = dp(xDp);
            panelParams.y = dp(yDp);
            safeUpdate(panelView, panelParams);
        }
        if (bubbleView != null) {
            bubbleParams.x = dp(16);
            bubbleParams.y = dp(140);
            safeUpdate(bubbleView, bubbleParams);
        }
        return START_STICKY;
    }

    private void startAsForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "النافذة العائمة — Translate Mahdi",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("تبقي نافذة الترجمة العائمة ظاهرة فوق التطبيقات");
            nm.createNotificationChannel(channel);
        }

        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(this, 0, openApp, flags);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Translate Mahdi 2027")
            .setContentText("النافذة العائمة تعمل فوق التطبيقات")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private int overlayType() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics()));
    }

    private GradientDrawable rounded(int color, int radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radiusDp));
        return d;
    }

    private GradientDrawable bubbleBackground() {
        GradientDrawable d = new GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            new int[]{Color.parseColor("#14B8A6"), Color.parseColor("#2563EB")}
        );
        d.setShape(GradientDrawable.OVAL);
        return d;
    }

    private void buildBubble() {
        TextView bubble = new TextView(this);
        bubble.setText("ع/A");
        bubble.setTextColor(Color.WHITE);
        bubble.setTypeface(Typeface.DEFAULT_BOLD);
        bubble.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        bubble.setGravity(Gravity.CENTER);
        int size = dp(56);
        bubble.setBackground(bubbleBackground());
        bubble.setElevation(dp(8));

        bubbleParams = new WindowManager.LayoutParams(
            size, size, overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        bubbleParams.gravity = Gravity.TOP | Gravity.START;
        bubbleParams.x = dp(16);
        bubbleParams.y = dp(140);

        attachDrag(bubble, bubbleParams, () -> togglePanel(), true);
        windowManager.addView(bubble, bubbleParams);
        bubbleView = bubble;
    }

    private void buildPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackground(rounded(Color.parseColor("#0B1220"), 20));
        panel.setElevation(dp(10));

        // Header bar (drag surface + actions)
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(10), dp(8), dp(10), dp(8));
        header.setBackground(rounded(Color.parseColor("#111C30"), 20));

        TextView title = new TextView(this);
        title.setText("🪟 نافذة الترجمة العائمة");
        title.setTextColor(Color.WHITE);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(0,
            LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        header.addView(title, titleLp);

        TextView minimize = headerAction("—");
        minimize.setContentDescription("تصغير");
        minimize.setOnClickListener(v -> showBubbleOnly());
        header.addView(minimize);

        TextView close = headerAction("✕");
        close.setContentDescription("إغلاق");
        close.setOnClickListener(v -> stopSelf());
        header.addView(close);

        panel.addView(header, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.loadUrl("file:///android_asset/public/floating.html");
        LinearLayout.LayoutParams webLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        panel.addView(webView, webLp);

        panelParams = new WindowManager.LayoutParams(
            dp(320), dp(360), overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        );
        panelParams.gravity = Gravity.TOP | Gravity.START;
        panelParams.x = dp(24);
        panelParams.y = dp(120);

        // Dragging works from the header; the WebView keeps all its own touches.
        attachDrag(header, panelParams, null, false);
        windowManager.addView(panel, panelParams);
        panelView = panel;
    }

    private TextView headerAction(String glyph) {
        TextView tv = new TextView(this);
        tv.setText(glyph);
        tv.setTextColor(Color.parseColor("#CBD5E1"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        tv.setGravity(Gravity.CENTER);
        tv.setPadding(dp(10), dp(4), dp(10), dp(4));
        tv.setMinWidth(dp(40));
        tv.setMinHeight(dp(40));
        return tv;
    }

    private void togglePanel() {
        if (panelView == null) return;
        panelView.setVisibility(panelView.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
        if (panelView.getVisibility() == View.VISIBLE && webView != null) {
            webView.onResume();
        }
    }

    private void showBubbleOnly() {
        if (panelView != null) panelView.setVisibility(View.GONE);
        if (bubbleView != null) bubbleView.setVisibility(View.VISIBLE);
    }

    private void safeUpdate(View view, WindowManager.LayoutParams params) {
        try {
            windowManager.updateViewLayout(view, params);
        } catch (IllegalArgumentException ignored) {
            // View not attached — nothing to update.
        }
    }

    /**
     * Drag handler. When {@code tapFallback} is set, a touch that never crosses
     * the touch slop is treated as a tap instead of a drag.
     */
    private void attachDrag(View view, WindowManager.LayoutParams params,
                            Runnable tapFallback, boolean tapFallbackEnabled) {
        final int[] initialX = new int[1];
        final int[] initialY = new int[1];
        final float[] touchX = new float[1];
        final float[] touchY = new float[1];
        final boolean[] dragging = new boolean[1];

        view.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    initialX[0] = params.x;
                    initialY[0] = params.y;
                    touchX[0] = event.getRawX();
                    touchY[0] = event.getRawY();
                    dragging[0] = false;
                    return true;
                case MotionEvent.ACTION_MOVE: {
                    float dx = event.getRawX() - touchX[0];
                    float dy = event.getRawY() - touchY[0];
                    if (!dragging[0] && Math.hypot(dx, dy) > touchSlop) {
                        dragging[0] = true;
                    }
                    if (dragging[0]) {
                        params.x = initialX[0] + (int) dx;
                        params.y = initialY[0] + (int) dy;
                        safeUpdate(view, params);
                    }
                    return true;
                }
                case MotionEvent.ACTION_UP:
                    if (!dragging[0] && tapFallbackEnabled && tapFallback != null) {
                        tapFallback.run();
                    }
                    return true;
                default:
                    return false;
            }
        });
    }

    @Override
    public void onDestroy() {
        if (bubbleView != null) {
            windowManager.removeView(bubbleView);
            bubbleView = null;
        }
        if (panelView != null) {
            windowManager.removeView(panelView);
            panelView = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
