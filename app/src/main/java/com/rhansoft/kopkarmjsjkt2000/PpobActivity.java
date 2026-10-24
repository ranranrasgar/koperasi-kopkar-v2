package com.rhansoft.kopkarmjsjkt2000;

import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.bumptech.glide.Glide;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.NavigationHelper;

public class PpobActivity extends AppCompatActivity {

    private View layoutToolbar, bottomNav;
    private ImageView btnProfile;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);

            new androidx.core.view.WindowInsetsControllerCompat(window, window.getDecorView())
                    .setAppearanceLightStatusBars(true);
        }

        setContentView(R.layout.activity_ppob);

        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        layoutToolbar = findViewById(R.id.layoutToolbar);
        bottomNav = findViewById(R.id.bottomNav);
        btnProfile = findViewById(R.id.btnProfile);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (layoutToolbar != null) {
                layoutToolbar.setPadding(layoutToolbar.getPaddingLeft(), insets.top, layoutToolbar.getPaddingRight(), layoutToolbar.getPaddingBottom());
            }
            return windowInsets;
        });

        // Setup Footer
        NavigationHelper.setupFooter(this);

        SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        String foto = prefs.getString("foto", "no_image.jpg");
        Glide.with(this).load(Api.IMAGE_PATH + foto).placeholder(R.drawable.icon_user).into(btnProfile);

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnHelp).setOnClickListener(v -> Toast.makeText(this, "Bantuan PPOB segera hadir", Toast.LENGTH_SHORT).show());
    }
}
