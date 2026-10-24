package com.rhansoft.kopkarmjsjkt2000;

import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.widget.NestedScrollView;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.Request;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.JsonObjectRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.NavigationHelper;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class SimpananRinciActivity extends AppCompatActivity {
    private TextView tvTotalSaldo, tvInfoBunga;
    private ProgressBar progressBar;
    private List<SimpananRinci> listSimpananRinci;
    private RecyclerView rvTransactions;
    private SimpananRinciAdapter simpananRinciAdapter;
    private String kdAnggota, jenisSimpanan, namaSimpanan;

    // Paginasi
    private static List<SimpananRinci> cachedListSimpanan = null;
    private static String cachedJenis = "";
    private int currentOffset = 0;
    private final int limit = 12; // Default 12 data (12 bulan terakhir)
    private boolean isLoading = false;
    private boolean isLastPage = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        new androidx.core.view.WindowInsetsControllerCompat(window, window.getDecorView())
                .setAppearanceLightStatusBars(true);
        
        setContentView(R.layout.activity_simpanan_rinci);

        View toolbar = findViewById(R.id.toolbar);
        View bottomNav = findViewById(R.id.bottomNav);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (toolbar != null) {
                toolbar.setPadding(toolbar.getPaddingLeft(), insets.top, toolbar.getPaddingRight(), toolbar.getPaddingBottom());
            }
            return windowInsets;
        });

        kdAnggota = getIntent().getStringExtra("kdAnggota");
        jenisSimpanan = getIntent().getStringExtra("jnsSimpanan"); 
        namaSimpanan = getIntent().getStringExtra("namaSimpanan");

        if (kdAnggota == null || jenisSimpanan == null) {
            Toast.makeText(this, "Data tidak lengkap", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        
        TextView toolbarTitle = findViewById(R.id.toolbarTitle);
        if (toolbarTitle != null) {
            toolbarTitle.setText("Detail " + (namaSimpanan != null ? namaSimpanan : ""));
        }

        tvTotalSaldo = findViewById(R.id.tvTotalSaldo);
        tvInfoBunga = findViewById(R.id.tvInfoBunga);
        rvTransactions = findViewById(R.id.rvTransactions);
        progressBar = findViewById(R.id.progressBar);
        
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        rvTransactions.setLayoutManager(layoutManager);
        listSimpananRinci = new ArrayList<>();
        simpananRinciAdapter = new SimpananRinciAdapter(this, listSimpananRinci);
        rvTransactions.setAdapter(simpananRinciAdapter);

        if (tvInfoBunga != null) {
            tvInfoBunga.setVisibility(View.GONE);
        }

        String passedTotal = getIntent().getStringExtra("total");
        if (passedTotal != null) {
            tvTotalSaldo.setText(passedTotal);
        }

        // Cek Cache: Jika sudah ada data dan jenisnya sama, gunakan cache
        if (cachedListSimpanan != null && !cachedListSimpanan.isEmpty() && jenisSimpanan.equals(cachedJenis)) {
            listSimpananRinci.addAll(cachedListSimpanan);
            simpananRinciAdapter.notifyDataSetChanged();
            currentOffset = listSimpananRinci.size();
        } else {
            fetchDataPaginated();
        }
        
        fetchSummary();
        
        NavigationHelper.setupFooter(this);

        // Scroll Listener standard RecyclerView
        rvTransactions.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(@NonNull RecyclerView recyclerView, int dx, int dy) {
                super.onScrolled(recyclerView, dx, dy);
                if (dy <= 0) return; // Hanya deteksi scroll ke bawah

                int visibleItemCount = layoutManager.getChildCount();
                int totalItemCount = layoutManager.getItemCount();
                int firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition();

                if (!isLoading && !isLastPage) {
                    if ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount) {
                        Log.d("SimpananRinci", "Bottom reached, loading more...");
                        fetchDataPaginated();
                    }
                }
            }
        });
    }

    private void fetchSummary() {
        String url = Api.URL_GET_SIMPANAN + "&kdAnggota=" + kdAnggota;
        JsonObjectRequest req = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    try {
                        JSONArray result = response.getJSONArray("simpanan");
                        for (int i = 0; i < result.length(); i++) {
                            JSONObject obj = result.getJSONObject(i);
                            if (obj.getString("jenis_simpanan").equals(jenisSimpanan)) {
                                double total = obj.getDouble("total");
                                tvTotalSaldo.setText(formatRupiah(total));
                                break;
                            }
                        }
                    } catch (Exception e) { e.printStackTrace(); }
                }, error -> {});
        VolleySingleton.getInstance(this).addToRequestQueue(req);
    }

    private void fetchDataPaginated() {
        if (isLoading || isLastPage) return;

        isLoading = true;
        progressBar.setVisibility(View.VISIBLE);
        
        String url = Api.URL_GET_SIMPANAN_RINCI_PAGINATED 
                + "&kdAnggota=" + kdAnggota 
                + "&jenisSimpanan=" + Uri.encode(jenisSimpanan) 
                + "&offset=" + currentOffset 
                + "&limit=" + limit;

        StringRequest strRequest = new StringRequest(Request.Method.GET, url,
                response -> {
                    Log.d("SimpananRinci", "Response: " + response);
                    try {
                        JSONObject jsonObject = new JSONObject(response);
                        if(!jsonObject.getBoolean("error")) {
                            JSONArray jsonArray = jsonObject.getJSONArray("simpanan_rinci");
                            
                            if (jsonArray.length() < limit) {
                                isLastPage = true;
                            }

                            for(int i = 0; i < jsonArray.length(); i++) {
                                JSONObject jo = jsonArray.getJSONObject(i);
                                SimpananRinci simpananRinci = new SimpananRinci();
                                simpananRinci.setTglSimpanan(jo.optString("tgl_transaksi", ""));
                                simpananRinci.setNoReff(jo.optString("no_bukti", ""));
                                simpananRinci.setDebit(String.valueOf(jo.optDouble("debit", 0)));
                                simpananRinci.setKredit(String.valueOf(jo.optDouble("kredit", 0)));
                                listSimpananRinci.add(simpananRinci);
                            }
                            
                            // Update Cache
                            if (cachedListSimpanan == null) {
                                cachedListSimpanan = new ArrayList<>();
                            }
                            if (currentOffset == 0) {
                                cachedListSimpanan.clear();
                                cachedJenis = jenisSimpanan;
                            }
                            cachedListSimpanan.addAll(listSimpananRinci.subList(currentOffset, listSimpananRinci.size()));

                            simpananRinciAdapter.notifyDataSetChanged();
                            currentOffset += jsonArray.length();
                        } else {
                            Toast.makeText(this, jsonObject.optString("message", "Error dari server"), Toast.LENGTH_SHORT).show();
                        }
                    } catch (JSONException e) { 
                        e.printStackTrace();
                        Toast.makeText(this, "Gagal parsing data: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                    isLoading = false;
                    progressBar.setVisibility(View.GONE);
                }, error -> {
                    isLoading = false;
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(this, "Error koneksi: " + error.getMessage(), Toast.LENGTH_SHORT).show();
                    Log.e("SimpananRinci", "Error: " + error.getMessage());
                });
        VolleySingleton.getInstance(this).addToRequestQueue(strRequest);
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

    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }

    public static void clearSimpananCache() {
        if (cachedListSimpanan != null) {
            cachedListSimpanan.clear();
            cachedListSimpanan = null;
        }
        cachedJenis = "";
    }
}
