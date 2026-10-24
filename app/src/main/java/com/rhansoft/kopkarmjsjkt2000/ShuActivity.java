package com.rhansoft.kopkarmjsjkt2000;

import androidx.appcompat.app.AppCompatActivity;

import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.NavigationHelper;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class ShuActivity extends AppCompatActivity {
    private List<String> listTahun;
    private Spinner spnTahun;
    private ProgressBar progressBar;
    private TextView txvTotalShu, txvNoReff, tvTahunBuku, tvSelectedYear;
    
    // Component Views
    private View itemUang, itemBarang, itemSukarela, itemLama;

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
        
        setContentView(R.layout.activity_shu);

        View layoutHeader = findViewById(R.id.layoutHeader);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (layoutHeader != null) {
                layoutHeader.setPadding(layoutHeader.getPaddingLeft(), insets.top, layoutHeader.getPaddingRight(), layoutHeader.getPaddingBottom());
            }
            return windowInsets;
        });

        // Initialize Views
        spnTahun = findViewById(R.id.spinTahun);
        txvTotalShu = findViewById(R.id.txvTotalShu);
//        txvNoReff = findViewById(R.id.txvNoReff);
        tvTahunBuku = findViewById(R.id.tvTahunBuku);
        tvSelectedYear = findViewById(R.id.tvSelectedYear);
        progressBar = findViewById(R.id.progressBar);
        
        itemUang = findViewById(R.id.itemUang);
        itemBarang = findViewById(R.id.itemBarang);
        itemSukarela = findViewById(R.id.itemSukarela);
        itemLama = findViewById(R.id.itemLama);
        
        setupComponentViews();

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        findViewById(R.id.cardYearTrigger).setOnClickListener(v -> spnTahun.performClick());

        // Spinner Drop down elements
        listTahun = new ArrayList<String>();
        int y = Calendar.getInstance().get(Calendar.YEAR);
//        listTahun.add(String.valueOf(y-3));
        listTahun.add(String.valueOf(y-2));
        listTahun.add(String.valueOf(y-1));
        listTahun.add(String.valueOf(y));

        // Adapter for year spinner
        ArrayAdapter<String> yearAdapter = new ArrayAdapter<String>(
                this, android.R.layout.simple_spinner_item, listTahun);
        yearAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);

        // Setup Footer
        NavigationHelper.setupFooter(this);

        spnTahun.setAdapter(yearAdapter);
        spnTahun.setSelection(listTahun.size() - 1);

        // Fetch dynamic SHU years from API
        fetchTahunSHU(yearAdapter);

        spnTahun.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int position, long id) {
                String year = spnTahun.getSelectedItem().toString();
                if (tvSelectedYear != null) tvSelectedYear.setText(year);
                tvTahunBuku.setText("Tahun Buku " + year);
                
                String kdAnggota = getIntent().getStringExtra("kdAnggota");
                if (kdAnggota == null || kdAnggota.isEmpty()) {
                    SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
                    kdAnggota = prefs.getString("kdAnggota", "");
                }
                showSHU(kdAnggota, year);
            }

            @Override
            public void onNothingSelected(AdapterView<?> adapterView) {}
        });
    }

    private void fetchTahunSHU(ArrayAdapter<String> yearAdapter) {
        JsonObjectRequest request = new JsonObjectRequest(Request.Method.GET, Api.URL_GET_TAHUN_SHU, null,
                response -> {
                    try {
                        if (!response.optBoolean("error", true) && response.has("tahun")) {
                            org.json.JSONArray arr = response.getJSONArray("tahun");
                            if (arr.length() > 0) {
                                listTahun.clear();
                                for (int i = 0; i < arr.length(); i++) {
                                    listTahun.add(arr.getString(i));
                                }
                                yearAdapter.notifyDataSetChanged();
                                if (!listTahun.isEmpty()) {
                                    spnTahun.setSelection(listTahun.size() - 1);
                                }
                            }
                        }
                    } catch (Exception e) {
                        Log.e("SHU", "Error fetching tahun SHU: " + e.getMessage());
                    }
                },
                error -> Log.e("SHU", "Volley error fetching tahun SHU: " + error.getMessage())
        );
        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    private void setupComponentViews() {
        setupComponent(itemUang, "Jasa Pinjaman Uang", "Berdasarkan volume pinjaman tunai", R.drawable.ic_attach_money_black_24dp, Color.parseColor("#E3F2FD"), Color.parseColor("#1976D2"));
        setupComponent(itemBarang, "Jasa Pinjaman Barang", "Berdasarkan belanja toko koperasi", R.drawable.ic_control_point_black_24dp, Color.parseColor("#E8F5E9"), Color.parseColor("#388E3C"));
        setupComponent(itemSukarela, "Jasa Sukarela", "Berdasarkan total simpanan sukarela", R.drawable.ic_save, Color.parseColor("#FFF3E0"), Color.parseColor("#F57C00"));
        setupComponent(itemLama, "Lama Keanggotaan", "Apresiasi loyalitas anggota", R.drawable.ic_calendar_today, Color.parseColor("#F3E5F5"), Color.parseColor("#7B1FA2"));
    }

    private void setupComponent(View view, String label, String desc, int iconRes, int bgColor, int iconTint) {
        if (view == null) return;
        ((TextView) view.findViewById(R.id.tvLabel)).setText(label);
        ((TextView) view.findViewById(R.id.tvDescription)).setText(desc);
        ((ImageView) view.findViewById(R.id.iconView)).setImageResource(iconRes);
        ((ImageView) view.findViewById(R.id.iconView)).setColorFilter(iconTint);
        view.findViewById(R.id.iconBg).setBackgroundColor(bgColor);
        
        // Ensure iconBg is rounded
        view.findViewById(R.id.iconBg).setBackgroundResource(R.drawable.bg_circle_blue_light);
        view.findViewById(R.id.iconBg).getBackground().setTint(bgColor);
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

    private void showSHU(String kdAnggota, String tahun) {
        if (kdAnggota == null || kdAnggota.isEmpty()) {
            SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
            kdAnggota = prefs.getString("kdAnggota", "");
        }
        final String finalKd = kdAnggota;
        progressBar.setVisibility(View.VISIBLE);
        String url = Api.URL_GET_SHU + "&kdAnggota=" + finalKd + "&tahun=" + tahun;
        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        if (!response.optBoolean("error", true)) {
                            JSONObject jo = response.optJSONObject("shu");
                            if (jo == null && response.has("data")) {
                                jo = response.optJSONObject("data");
                            }
                            if (jo == null) {
                                jo = response;
                            }

                            double uang = parseDoubleVal(jo, "temp_uang", "rp_jasa_uang", "jasa_uang", "uang");
                            double barang = parseDoubleVal(jo, "temp_barang", "rp_jasa_barang", "jasa_barang", "barang");
                            double sukarela = parseDoubleVal(jo, "temp_sukarela", "rp_sukarela", "jasa_sukarela", "sukarela");
                            double lama = parseDoubleVal(jo, "temp_lama", "lama_agt", "lama");

                            double total = parseDoubleVal(jo, "total_shu", "rp_total", "total", "shu");
                            if (total == 0) {
                                total = uang + barang + sukarela + lama;
                            }

                            if (total > 0) {
                                txvTotalShu.setText(formatRupiah(total));
                                updateComponentValue(itemUang, uang, total);
                                updateComponentValue(itemBarang, barang, total);
                                updateComponentValue(itemSukarela, sukarela, total);
                                updateComponentValue(itemLama, lama, total);

                                String noReff = jo.optString("no_reff", jo.optString("no_ref", jo.optString("nik", "-")));
                                txvNoReff.setText("No Reff: " + noReff);
                            } else {
                                fetchDashboardShuFallback(finalKd);
                            }
                        } else {
                            fetchDashboardShuFallback(finalKd);
                        }
                    } catch (Exception e) {
                        Log.e("SHU", "Error parsing SHU: " + e.getMessage(), e);
                        fetchDashboardShuFallback(finalKd);
                    }
                },
                error -> {
                    progressBar.setVisibility(View.GONE);
                    fetchDashboardShuFallback(finalKd);
                }
        );

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }

    private void fetchDashboardShuFallback(String kdAnggota) {
        if (kdAnggota == null || kdAnggota.isEmpty()) return;
        String url = Api.URL_DASHBOARD + "?kdAnggota=" + kdAnggota;
        JsonObjectRequest req = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    try {
                        double dashTotal = parseDoubleVal(response, "total_shu", "shu");
                        if (dashTotal > 0) {
                            txvTotalShu.setText(formatRupiah(dashTotal));
                            txvNoReff.setText("No Reff: -");
                        } else {
                            txvTotalShu.setText("Rp 0");
                            updateComponentValue(itemUang, 0, 0);
                            updateComponentValue(itemBarang, 0, 0);
                            updateComponentValue(itemSukarela, 0, 0);
                            updateComponentValue(itemLama, 0, 0);
                            txvNoReff.setText("No Reff: -");
                        }
                    } catch (Exception e) {
                        Log.e("SHU", "Fallback error: " + e.getMessage());
                    }
                },
                error -> Log.e("SHU", "Fallback Volley error")
        );
        VolleySingleton.getInstance(this).addToRequestQueue(req);
    }

    private double parseDoubleVal(JSONObject jo, String... keys) {
        if (jo == null) return 0;
        for (String key : keys) {
            if (jo.has(key) && !jo.isNull(key)) {
                try {
                    Object raw = jo.get(key);
                    if (raw instanceof Number) {
                        double d = ((Number) raw).doubleValue();
                        if (!Double.isNaN(d) && d != 0) return d;
                    }
                    String str = raw.toString();
                    if (str.trim().isEmpty() || str.equalsIgnoreCase("null")) continue;
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
                    if (!cleaned.isEmpty()) {
                        double d = Double.parseDouble(cleaned);
                        if (!Double.isNaN(d) && d != 0) return d;
                    }
                } catch (Exception ignored) {}
            }
        }
        return 0;
    }

    private void updateComponentValue(View view, double value, double total) {
        if (view == null) return;
        ((TextView) view.findViewById(R.id.tvValue)).setText(formatRupiah(value));
        if (total > 0) {
            int percentage = (int) Math.round((value / total) * 100);
            ((TextView) view.findViewById(R.id.tvPercentage)).setText(percentage + "%");
        } else {
            ((TextView) view.findViewById(R.id.tvPercentage)).setText("0%");
        }
    }
}
