package com.rhansoft.kopkarmjsjkt2000;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.imageview.ShapeableImageView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import androidx.viewpager2.widget.ViewPager2;

import com.android.volley.Request;
import com.android.volley.toolbox.JsonObjectRequest;
import com.bumptech.glide.Glide;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.google.firebase.messaging.FirebaseMessaging;
import com.rhansoft.kopkarmjsjkt2000.adapter.PromoSliderAdapter;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.NavigationHelper;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity implements View.OnClickListener {
    private View detailAnggotaCard, pengajuanKreditCard, simpananCard, pinjamanCard,
            menuShu, menuToko, menuPpob, menuProduk, menuPesanan, cardRAT;
    private TextView txvNamaAnggota, tvTotalSimpanan, tvSisaPinjaman, tvRpGrade, tvShuBerjalan, tvPotonganBlnIni, tvGrade, tvTitleRAT, tvDescRAT;
    private ProgressBar progressBar;
    private View layoutHeader, bottomNav, layoutFixedHeader;
    private ShapeableImageView imgProfile;
    private ImageView imgRAT, btnToggleBalance;
    private ViewPager2 promoSlider;
    private JSONObject himbauanData;

    private boolean isBalanceVisible = false;
    private double valTotalSimpanan = 0, valSisaPinjaman = 0, valRpGrade = 0, valShuBerjalan = 0, valPotonganBlnIni = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Edge-to-edge support
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
            
            // Set status bar icons to light/white (for dark blue background)
            androidx.core.view.WindowInsetsControllerCompat controller = 
                new androidx.core.view.WindowInsetsControllerCompat(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(false);
        }
        
        setContentView(R.layout.activity_main);

        // Hide ActionBar for modern look
        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        // Initialize Views
        layoutFixedHeader = findViewById(R.id.layoutHeaderFixed);
        layoutHeader = findViewById(R.id.detail_anggota_card);
        bottomNav = findViewById(R.id.bottomNav);
        
        // Setup Footer
        NavigationHelper.setupFooter(this);
        
        txvNamaAnggota = findViewById(R.id.txvNamaAnggota);
        tvTotalSimpanan = findViewById(R.id.tvTotalSimpanan);
        tvSisaPinjaman = findViewById(R.id.tvSisaPinjaman);
        tvRpGrade = findViewById(R.id.tvRpGrade);
        tvShuBerjalan = findViewById(R.id.tvShuBerjalan);
        tvPotonganBlnIni = findViewById(R.id.tvPotonganBlnIni);
        tvGrade = findViewById(R.id.tvGrade);
        tvTitleRAT = findViewById(R.id.titleRAT);
        tvDescRAT = findViewById(R.id.descRAT);
        progressBar = findViewById(R.id.progressBar);
        imgProfile = findViewById(R.id.imgProfile);
        imgRAT = findViewById(R.id.imgRAT);
        promoSlider = findViewById(R.id.promoSlider);
        btnToggleBalance = findViewById(R.id.btnToggleBalance);

        btnToggleBalance.setOnClickListener(v -> {
            isBalanceVisible = !isBalanceVisible;
            updateBalanceDisplay();
        });

        // Setup Promo Slider
        setupPromoSlider();

        // Apply Insets to avoid overlapping with Status Bar and Navigation Bar (Footer)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            
            // We do NOT add padding to layoutFixedHeader so it "pierces" the status bar
            // But we add padding to the profile content inside it so it doesn't overlap with icons
            View profileContent = findViewById(R.id.detail_anggota_card);
            if (profileContent != null) {
                profileContent.setPadding(profileContent.getPaddingLeft(), insets.top, profileContent.getPaddingRight(), profileContent.getPaddingBottom());
            }

            return windowInsets;
        });

        SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        
        // Load initial data from Prefs
        updateUI(prefs);

        // Fetch real data from API
        fetchDashboardData(prefs.getString("kdAnggota", ""));

        // Request Notification Permission for Android 13+
        requestNotificationPermission();

        // Inisialisasi CardView / Layout Clickables
        detailAnggotaCard = layoutHeader;
        pengajuanKreditCard = findViewById(R.id.pengajuan_kredit_card);
        simpananCard = findViewById(R.id.simpanan_card);
        pinjamanCard = findViewById(R.id.pinjaman_card);
        menuShu = findViewById(R.id.menu_shu);
        menuToko = findViewById(R.id.menu_toko);
        menuPpob = findViewById(R.id.menu_ppob);
        menuProduk = findViewById(R.id.menu_produk);
        menuPesanan = findViewById(R.id.menu_pesanan);
        cardRAT = findViewById(R.id.cardRAT);
        if (cardRAT != null) cardRAT.setVisibility(View.GONE);

        detailAnggotaCard.setOnClickListener(this);
        pengajuanKreditCard.setOnClickListener(this);
        simpananCard.setOnClickListener(this);
        pinjamanCard.setOnClickListener(this);
        menuShu.setOnClickListener(this);
        if (menuToko != null) menuToko.setOnClickListener(this);
        if (menuPpob != null) menuPpob.setOnClickListener(this);
        if (menuProduk != null) menuProduk.setOnClickListener(this);
        if (menuPesanan != null) menuPesanan.setOnClickListener(this);
        if (cardRAT != null) cardRAT.setOnClickListener(this);

        findViewById(R.id.btnHelp).setOnClickListener(this);
        findViewById(R.id.btnNotification).setOnClickListener(this);
        findViewById(R.id.btnLogout).setOnClickListener(this);

        // Also make summary cards clickable if needed
        findViewById(R.id.shu_card).setOnClickListener(this);
        findViewById(R.id.potongan_bulanan_card).setOnClickListener(this);

        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        String token = task.getResult();
                        Log.d("FirebaseToken", "Token: " + token);
                        updateFcmToken(token);
                    } else {
                        Log.e("FirebaseToken", "Gagal mendapatkan token", task.getException());
                    }
                });
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    private void updateFcmToken(String token) {
        SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        String kdAnggota = prefs.getString("kdAnggota", "");
        if (kdAnggota.isEmpty()) return;

        com.android.volley.toolbox.StringRequest request = new com.android.volley.toolbox.StringRequest(Request.Method.POST, Api.URL_UPDATE_FCM_TOKEN,
                response -> Log.d("FCM", "Token updated"),
                error -> Log.e("FCM", "Token update failed")) {
            @Override
            protected java.util.Map<String, String> getParams() {
                java.util.Map<String, String> params = new java.util.HashMap<>();
                params.put("kdAnggota", kdAnggota);
                params.put("token", token);
                return params;
            }
        };
        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    private void setupPromoSlider() {
        // Initial setup with empty list if needed, or handle in dashboard fetch
    }

    private void updatePromoSlider(List<Promo> promos) {
        if (promos == null || promos.isEmpty()) {
            if (findViewById(R.id.layoutPromoLabel) != null) findViewById(R.id.layoutPromoLabel).setVisibility(View.GONE);
            if (findViewById(R.id.cardPromoBanner) != null) findViewById(R.id.cardPromoBanner).setVisibility(View.GONE);
            return;
        }
        if (findViewById(R.id.layoutPromoLabel) != null) findViewById(R.id.layoutPromoLabel).setVisibility(View.VISIBLE);
        if (findViewById(R.id.cardPromoBanner) != null) findViewById(R.id.cardPromoBanner).setVisibility(View.VISIBLE);

        PromoSliderAdapter adapter = new PromoSliderAdapter(promos, this::showPromoDetail);
        promoSlider.setAdapter(adapter);
    }

    private void updateUI(SharedPreferences prefs) {
        String nama = prefs.getString("nama", "");
        String grade = prefs.getString("grade", "A");
        String foto = prefs.getString("foto", "no_image.jpg");

        valRpGrade = getSafeFloat(prefs, "rpGrade");
        valTotalSimpanan = getSafeFloat(prefs, "total_simpanan");
        valSisaPinjaman = getSafeFloat(prefs, "sisa_pinjaman");
        valPotonganBlnIni = getSafeFloat(prefs, "potongan_bulan_ini");
        valShuBerjalan = getSafeFloat(prefs, "shu_berjalan");

        txvNamaAnggota.setText(nama);
        tvGrade.setText("Grade " + grade);
        
        updateBalanceDisplay();
        
        // Load Profile Image
        String imageUrl = Api.IMAGE_PATH + foto;
        Glide.with(this)
                .load(imageUrl)
                .placeholder(R.drawable.icon_user)
                .error(R.drawable.icon_user)
                .diskCacheStrategy(DiskCacheStrategy.ALL)
                .into(imgProfile);
    }

    private void fetchDashboardData(String kdAnggota) {
        SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        if (kdAnggota == null || kdAnggota.trim().isEmpty()) {
            kdAnggota = prefs.getString("kdAnggota", "");
        }
        if (kdAnggota == null || kdAnggota.trim().isEmpty()) {
            kdAnggota = prefs.getString("nik", "");
        }
        if (kdAnggota == null || kdAnggota.trim().isEmpty()) {
            kdAnggota = "21212-7157"; // Default fallback
        }

        progressBar.setVisibility(View.VISIBLE);
        String url = Api.URL_DASHBOARD + "?kdAnggota=" + kdAnggota;
        Log.d("DashboardAPI", "Fetching from URL: " + url);
        
        JsonObjectRequest request = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    progressBar.setVisibility(View.GONE);
                    Log.d("DashboardAPI", "Response: " + response.toString());
                    try {
                        if (!response.optBoolean("error", true)) {
                            valTotalSimpanan = parseDoubleVal(response, "total_simpanan");
                            valSisaPinjaman = parseDoubleVal(response, "sisa_pinjaman");
                            valPotonganBlnIni = parseDoubleVal(response, "total_potongan");
                            valShuBerjalan = parseDoubleVal(response, "total_shu");
                            String foto = response.optString("foto", "");

                            // Save dashboard totals to SharedPreferences for instant load across activities
                            SharedPreferences.Editor editor = prefs.edit();
                            editor.putFloat("total_simpanan", (float) valTotalSimpanan);
                            editor.putFloat("sisa_pinjaman", (float) valSisaPinjaman);
                            editor.putFloat("potongan_bulan_ini", (float) valPotonganBlnIni);
                            editor.putFloat("total_potongan", (float) valPotonganBlnIni);
                            editor.putFloat("shu_berjalan", (float) valShuBerjalan);
                            if (!foto.isEmpty()) {
                                editor.putString("foto", foto);
                            }
                            editor.apply();

                            // Update Himbauan (RAT Card)
                            if (response.has("himbauan") && !response.isNull("himbauan")) {
                                if (cardRAT != null) cardRAT.setVisibility(View.VISIBLE);
                                himbauanData = response.getJSONObject("himbauan");String judul = himbauanData.optString("judul_himbauan", "RAT Tahun Buku");
                                String isi = himbauanData.optString("isi_himbauan", "");
                                String img = himbauanData.optString("image", "");

                                if (tvTitleRAT != null) tvTitleRAT.setText(judul);
                                if (tvDescRAT != null) tvDescRAT.setText(isi);

                                if (!img.isEmpty() && imgRAT != null) {
                                    String imgUrl = Api.IMAGE_PATH + "himbauan/" + img;
                                    Glide.with(MainActivity.this)
                                            .load(imgUrl)
                                            .diskCacheStrategy(DiskCacheStrategy.ALL)
                                            .into(imgRAT);
                                }
                            } else {
                                if (cardRAT != null) cardRAT.setVisibility(View.GONE);
                            }

                            // Update Promos
                            if (response.has("promos")) {
                                org.json.JSONArray promosArr = response.getJSONArray("promos");
                                List<Promo> promoList = new ArrayList<>();
                                for (int k = 0; k < promosArr.length(); k++) {
                                    JSONObject promoObj = promosArr.getJSONObject(k);
                                    Promo p = new Promo();
                                    p.setId(promoObj.optInt("id"));
                                    p.setJudul(promoObj.optString("judul"));
                                    p.setIsi(promoObj.optString("isi"));
                                    p.setImage(promoObj.optString("image"));
                                    promoList.add(p);
                                }
                                updatePromoSlider(promoList);
                            }

                            updateBalanceDisplay();

                            if (!foto.isEmpty()) {
                                String imageUrl = Api.IMAGE_PATH + foto;
                                Glide.with(MainActivity.this)
                                        .load(imageUrl)
                                        .placeholder(R.drawable.icon_user)
                                        .error(R.drawable.icon_user)
                                        .diskCacheStrategy(DiskCacheStrategy.ALL)
                                        .into(imgProfile);
                            }
                        }
                    } catch (Exception e) {
                        Log.e("Dashboard", "Error: " + e.getMessage());
                    }
                },
                error -> {
                    progressBar.setVisibility(View.GONE);
                    Log.e("Dashboard", "Volley Error: " + error.getMessage());
                }
        );

        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    private void updateBalanceDisplay() {
        if (isBalanceVisible) {
            tvTotalSimpanan.setText(formatRupiah(valTotalSimpanan));
            tvSisaPinjaman.setText(formatRupiah(valSisaPinjaman));
            tvRpGrade.setText(formatRupiah(valRpGrade));
            tvShuBerjalan.setText(formatRupiah(valShuBerjalan));
            tvPotonganBlnIni.setText(formatRupiah(valPotonganBlnIni));
            btnToggleBalance.setImageResource(R.drawable.ic_passon);
        } else {
            String mask = "Rp ••••••••";
            tvTotalSimpanan.setText(mask);
            tvSisaPinjaman.setText(mask);
            tvRpGrade.setText(mask);
            tvShuBerjalan.setText(mask);
            tvPotonganBlnIni.setText(mask);
            btnToggleBalance.setImageResource(R.drawable.ic_passoff);
        }
    }

    private String formatRupiah(double number) {
        Locale localeID = new Locale("in", "ID");
        NumberFormat formatRupiah = NumberFormat.getCurrencyInstance(localeID);
        String formatted = formatRupiah.format(number);
        if (formatted.endsWith(",00")) {
            formatted = formatted.substring(0, formatted.length() - 3);
        }
        return formatted.replace("Rp", "Rp ");
    }

    private double parseDoubleVal(JSONObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.isNull(key)) return 0;
        try {
            Object raw = obj.get(key);
            if (raw instanceof Number) {
                double d = ((Number) raw).doubleValue();
                return Double.isNaN(d) ? 0 : d;
            }
            String str = raw.toString();
            if (str == null || str.trim().isEmpty() || str.equalsIgnoreCase("null")) return 0;
            String cleaned = str.replace("Rp", "").replace("rp", "").trim();
            if (cleaned.contains(",") && cleaned.contains(".")) {
                cleaned = cleaned.replace(".", "").replace(",", ".");
            } else if (cleaned.contains(".")) {
                int lastDotIndex = cleaned.lastIndexOf('.');
                if (cleaned.indexOf('.') != lastDotIndex || cleaned.length() - lastDotIndex - 1 == 3) {
                    cleaned = cleaned.replace(".", "");
                }
            } else if (cleaned.contains(",")) {
                cleaned = cleaned.replace(",", ".");
            }
            cleaned = cleaned.replaceAll("[^0-9.-]", "");
            if (cleaned.isEmpty()) return 0;
            double res = Double.parseDouble(cleaned);
            return Double.isNaN(res) ? 0 : res;
        } catch (Exception e) {
            return 0;
        }
    }

    private float getSafeFloat(SharedPreferences prefs, String key) {
        try {
            return prefs.getFloat(key, 0f);
        } catch (ClassCastException e) {
            String val = prefs.getString(key, "0");
            try {
                return Float.parseFloat(val);
            } catch (Exception e2) {
                return 0f;
            }
        }
    }

    @Override
    public void onClick(View v) {
        Intent i;
        SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        String kdAnggota = prefs.getString("kdAnggota", "");
        String nama = prefs.getString("nama", "");
//        String statusStaff = prefs.getString("statusStaff", "");
        float rpGrade = getSafeFloat(prefs, "rpGrade");

        switch (v.getId()) {
            case R.id.detail_anggota_card:
                i = new Intent(this, DetailAnggota.class);
                i.putExtra("kdAnggota", prefs.getString("kdAnggota", ""));
                i.putExtra("nama", prefs.getString("nama", ""));
                i.putExtra("tglDaftar", prefs.getString("tglpencatatan", ""));
                i.putExtra("nik", prefs.getString("nik", ""));
                i.putExtra("jnsKelamin", prefs.getString("jns_kelamin", ""));
                i.putExtra("alamat", prefs.getString("alamat", ""));
                i.putExtra("kota", prefs.getString("kota", ""));
                i.putExtra("kodePos", prefs.getString("kode_pos", ""));
                i.putExtra("tlpRumah", prefs.getString("tlp_rumah", ""));
                i.putExtra("hp", prefs.getString("hp", ""));
                i.putExtra("status", prefs.getString("status", ""));
                i.putExtra("namaIstriSuami", prefs.getString("nama_istri_suami", ""));
                i.putExtra("jmlTanggungan", prefs.getString("jml_tanggungan", ""));
                i.putExtra("jmlAnak", prefs.getString("jml_anak", ""));
                i.putExtra("statusStaff", prefs.getString("status_staff", ""));
                i.putExtra("agtNonAgt", prefs.getString("agt_non_agt", ""));
                i.putExtra("rpGrade", (double) getSafeFloat(prefs, "rpGrade"));
                i.putExtra("grade", prefs.getString("grade", ""));
                i.putExtra("simpananPokok", (double) getSafeFloat(prefs, "simpanan_pokok"));
                i.putExtra("simpananWajib", (double) getSafeFloat(prefs, "simpanan_wajib"));
                i.putExtra("simpananSukarela", (double) getSafeFloat(prefs, "simpanan_sukarela"));
                i.putExtra("pekerjaan", prefs.getString("pekerjaan", ""));
                i.putExtra("alamatKerja", prefs.getString("alamat_kerja", ""));
                i.putExtra("namaPerusahaan", prefs.getString("nama_perusahaan", ""));
                i.putExtra("jabatan", prefs.getString("jabatan", ""));
                i.putExtra("bankNoRek", prefs.getString("bank_no_rek", ""));
                i.putExtra("bankNama", prefs.getString("bank_nama", ""));
                i.putExtra("bankAtasNama", prefs.getString("bank_atas_nama", ""));
                i.putExtra("foto", prefs.getString("foto", "no_image.jpg"));
                startActivity(i);
                break;



            case R.id.pengajuan_kredit_card:
                i = new Intent(this, PengajuanKreditActivity.class);
                i.putExtra("kdAnggota", kdAnggota);
                i.putExtra("statusStaff", prefs.getString("statusStaff", "No Staff"));
                i.putExtra("rpGrade", (double) rpGrade);
                startActivity(i);
                break;

            case R.id.simpanan_card:
                i = new Intent(this, SimpananActivity.class);
                i.putExtra("kdAnggota", kdAnggota);
                i.putExtra("namaAnggota", nama);
                startActivity(i);
                break;

            case R.id.pinjaman_card:
                i = new Intent(this, PinjamanActivity.class);
                i.putExtra("kdAnggota", kdAnggota);
                i.putExtra("namaAnggota", nama);
                startActivity(i);
                break;

            case R.id.potongan_bulanan_card:
                i = new Intent(this, PotonganBulananActivityV1.class);
                i.putExtra("kdAnggota", kdAnggota);
                i.putExtra("namaAnggota", nama);
                startActivity(i);
                break;

            case R.id.cardRAT:
                showHimbauanDetail();
                break;

            case R.id.shu_card:
            case R.id.menu_shu:
                i = new Intent(this, ShuActivity.class);
                i.putExtra("kdAnggota", kdAnggota);
                i.putExtra("namaAnggota", nama);
                startActivity(i);
                break;

            case R.id.menu_ppob:
                i = new Intent(this, PpobActivity.class);
                i.putExtra("kdAnggota", kdAnggota);
                startActivity(i);
                break;

            case R.id.menu_toko:
            case R.id.menu_produk:
                i = new Intent(this, TokoActivity.class);
                i.putExtra("kdAnggota", kdAnggota);
                startActivity(i);
                break;

            case R.id.menu_pesanan:
                Toast.makeText(this, "Fitur Pesanan sedang dalam pengembangan", Toast.LENGTH_SHORT).show();
                break;

            case R.id.btnHelp:
                Toast.makeText(this, "Pusat Bantuan segera hadir", Toast.LENGTH_SHORT).show();
                break;

            case R.id.btnNotification:
                i = new Intent(this, LogNotifikasiActivity.class);
                i.putExtra("kdAnggota", kdAnggota);
                startActivity(i);
                break;

            case R.id.btnLogout:
                logout();
                break;
        }
    }

    private void logout() {
        SharedPreferences.Editor editor = getSharedPreferences("loginPrefs", MODE_PRIVATE).edit();
        editor.clear();
        editor.apply();
        
        // Reset caches
        HistoryActivity.clearCache();
        LogNotifikasiActivity.clearInboxCache();
        SimpananRinciActivity.clearSimpananCache();

        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void showHimbauanDetail() {
        if (himbauanData == null) return;

        com.google.android.material.bottomsheet.BottomSheetDialog dialog = new com.google.android.material.bottomsheet.BottomSheetDialog(this);
        View view = getLayoutInflater().inflate(R.layout.dialog_himbauan_detail, null);

        ImageView imgDetail = view.findViewById(R.id.imgDetailHimbauan);
        TextView tvTitle = view.findViewById(R.id.tvTitleDetail);
        TextView tvContent = view.findViewById(R.id.tvContentDetail);
        View btnClose = view.findViewById(R.id.btnCloseDialog);

        String judul = himbauanData.optString("judul_himbauan", "");
        String isi = himbauanData.optString("isi_himbauan", "");
        String img = himbauanData.optString("image", "");

        tvTitle.setText(judul);
        tvContent.setText(isi);

        if (!img.isEmpty()) {
            String imgUrl = Api.IMAGE_PATH + "himbauan/" + img;
            Glide.with(this)
                    .load(imgUrl)
                    .placeholder(R.drawable.ic_notifications_none)
                    .diskCacheStrategy(DiskCacheStrategy.ALL)
                    .into(imgDetail);
        }

        btnClose.setOnClickListener(v -> dialog.dismiss());

        dialog.setContentView(view);
        dialog.show();
    }

    private void showPromoDetail(Promo promo) {
        if (promo == null) return;

        com.google.android.material.bottomsheet.BottomSheetDialog dialog = new com.google.android.material.bottomsheet.BottomSheetDialog(this);
        View view = getLayoutInflater().inflate(R.layout.dialog_himbauan_detail, null);

        ImageView imgDetail = view.findViewById(R.id.imgDetailHimbauan);
        TextView tvTitle = view.findViewById(R.id.tvTitleDetail);
        TextView tvContent = view.findViewById(R.id.tvContentDetail);
        View btnClose = view.findViewById(R.id.btnCloseDialog);

        tvTitle.setText(promo.getJudul());
        tvContent.setText(promo.getIsi());

        String imgUrl = Api.IMAGE_PATH + "slide_promo/" + promo.getImage();
        Glide.with(this)
                .load(imgUrl)
                .placeholder(R.drawable.ic_notifications_none)
                .diskCacheStrategy(DiskCacheStrategy.ALL)
                .into(imgDetail);

        btnClose.setOnClickListener(v -> dialog.dismiss());

        dialog.setContentView(view);
        dialog.show();
    }
}
