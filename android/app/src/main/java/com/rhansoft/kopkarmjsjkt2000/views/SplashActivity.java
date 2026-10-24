package com.rhansoft.kopkarmjsjkt2000.views;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.FrameLayout;
import android.view.Window;
import android.widget.TextView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.rhansoft.kopkarmjsjkt2000.LoginActivity;
import com.rhansoft.kopkarmjsjkt2000.MainActivity;
import com.rhansoft.kopkarmjsjkt2000.UpdateEmailActivity;
import com.rhansoft.kopkarmjsjkt2000.R;

public class SplashActivity extends AppCompatActivity {
    private int waktu_loading = 1500;

    private FrameLayout logoContainer;
    private TextView tvAppName, tvSlogan;
    private View dot1, dot2, dot3;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge and system bars management
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(true); // Dark icons for light status bar
        controller.setAppearanceLightNavigationBars(true);

        setContentView(R.layout.activity_splash);

        logoContainer = findViewById(R.id.logoContainer);
        tvAppName = findViewById(R.id.tvAppName);
        tvSlogan = findViewById(R.id.tvSlogan);
        dot1 = findViewById(R.id.dot1);
        dot2 = findViewById(R.id.dot2);
        dot3 = findViewById(R.id.dot3);

        // Logo Animation: Scale and Fade in
        Animation splashAnim = AnimationUtils.loadAnimation(this, R.anim.splash_anim);
        logoContainer.startAnimation(splashAnim);

        // Text Animation: Slide up and Fade in
        Animation slideUp = AnimationUtils.loadAnimation(this, R.anim.slide_up);
        slideUp.setStartOffset(200);
        tvAppName.startAnimation(slideUp);

        Animation slideUpSlogan = AnimationUtils.loadAnimation(this, R.anim.slide_up);
        slideUpSlogan.setStartOffset(350);
        tvSlogan.startAnimation(slideUpSlogan);

        // Dots pulsing animation sequentially
        startDotsAnimation();

        // Check if logged in
        SharedPreferences sp = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        // Sesi dari versi aplikasi sebelum server baru tidak punya token login: wajib masuk ulang sekali.
        if (sp.getString("api_token", "").isEmpty()) sp.edit().clear().apply();
        String kdAnggota = sp.getString("kdAnggota", "");
        String email = sp.getString("email", "");

        // Redirect logic: Bypass email update if already set
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                Intent intent;
                Log.d("SplashActivity", "kdAnggota: '" + kdAnggota + "', email: '" + email + "'");
                
                if (kdAnggota.isEmpty()) {
                    Log.d("SplashActivity", "Navigating to LoginActivity");
                    intent = new Intent(SplashActivity.this, LoginActivity.class);
                } else if (email == null || email.isEmpty() || email.equals("null") || email.length() < 5) {
                    Log.d("SplashActivity", "Navigating to UpdateEmailActivity");
                    intent = new Intent(SplashActivity.this, UpdateEmailActivity.class);
                } else {
                    Log.d("SplashActivity", "Navigating to MainActivity");
                    intent = new Intent(SplashActivity.this, MainActivity.class);
                }
                startActivity(intent);
                finish();
            } catch (Exception e) {
                Log.e("SplashActivity", "Error during navigation", e);
                // Fallback to Login if anything goes wrong
                startActivity(new Intent(SplashActivity.this, LoginActivity.class));
                finish();
            }
        }, waktu_loading);
    }

    private void startDotsAnimation() {
        Animation p1 = AnimationUtils.loadAnimation(this, R.anim.pulse);
        dot1.startAnimation(p1);

        Animation p2 = AnimationUtils.loadAnimation(this, R.anim.pulse);
        p2.setStartOffset(150);
        dot2.startAnimation(p2);

        Animation p3 = AnimationUtils.loadAnimation(this, R.anim.pulse);
        p3.setStartOffset(300);
        dot3.startAnimation(p3);
    }
}
