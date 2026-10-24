package com.rhansoft.kopkarmjsjkt2000;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.Window;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.bumptech.glide.Glide;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.NavigationHelper;

import java.util.ArrayList;
import java.util.List;

public class TokoActivity extends AppCompatActivity {

    private View layoutToolbar, bottomNav;
    private LinearLayout layoutProductList;
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

        setContentView(R.layout.activity_toko);

        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        layoutToolbar = findViewById(R.id.layoutToolbar);
        bottomNav = findViewById(R.id.bottomNav);
        layoutProductList = findViewById(R.id.layoutProductList);
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

        addDummyProducts();

        findViewById(R.id.btnMenu).setOnClickListener(v -> Toast.makeText(this, "Drawer menu segera hadir", Toast.LENGTH_SHORT).show());
        findViewById(R.id.btnCart).setOnClickListener(v -> Toast.makeText(this, "Halaman Keranjang segera hadir", Toast.LENGTH_SHORT).show());
        findViewById(R.id.btnSell).setOnClickListener(v -> Toast.makeText(this, "Fitur Jual Barang segera hadir", Toast.LENGTH_SHORT).show());
        btnProfile.setOnClickListener(v -> {
            Intent intent = new Intent(this, DetailAnggota.class);
            // Re-use logic from NavigationHelper to populate intent if needed, or just start it
            // DetailAnggota handles its own data from SharedPreferences if logic is there
            startActivity(intent);
        });
    }

    private void addDummyProducts() {
        String productBaseUrl = Api.IMAGE_PATH + "product/";
        String[] titles = {
                "Artisan Pastry Box",
                "Keychron K2 V2",
                "Sony 35mm f/1.8",
                "Healthy Lunch Bowl",
                "Premium Coffee Beans"
        };
        String[] prices = {"Rp 45k", "Rp 1.2M", "Rp 5.5M", "Rp 35k", "Rp 150k"};
        String[] sellers = {"Ahmad S.", "Budi N.", "Diana P.", "Maya A.", "Rizky F."};
        String[] depts = {"Kitchen Div", "IT Dept", "Marketing", "Finance", "Logistics"};

        LayoutInflater inflater = LayoutInflater.from(this);

        for (int i = 0; i < 5; i++) {
            View itemView = inflater.inflate(R.layout.item_product_card, layoutProductList, false);

            ImageView imgProduct = itemView.findViewById(R.id.imgProduct);
            TextView tvTitle = itemView.findViewById(R.id.tvProductTitle);
            TextView tvPrice = itemView.findViewById(R.id.tvProductPrice);
            TextView tvSellerInfo = itemView.findViewById(R.id.tvSellerInfo);

            tvTitle.setText(titles[i]);
            tvPrice.setText(prices[i]);
            tvSellerInfo.setText(sellers[i] + " • " + depts[i]);

            // Menggunakan nama file product1.jpeg - product3.jpeg sesuai instruksi
            // i % 3 digunakan agar 5 item bisa menampilkan gambar meskipun hanya ada 3 file
            String fileName = "product" + ((i % 3) + 1) + ".jpeg";
            String imageUrl = productBaseUrl + fileName;
            
            android.util.Log.d("TokoActivity", "Loading image: " + imageUrl);

            Glide.with(this)
                    .load(imageUrl)
                    .placeholder(R.drawable.bg_year_badge)
                    .error(R.drawable.bg_dashboard_header)
                    .into(imgProduct);

            layoutProductList.addView(itemView);
        }
    }
}
