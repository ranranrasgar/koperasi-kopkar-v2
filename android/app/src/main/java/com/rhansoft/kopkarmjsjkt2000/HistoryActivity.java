package com.rhansoft.kopkarmjsjkt2000;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.Request;
import com.android.volley.toolbox.JsonObjectRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.NavigationHelper;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class HistoryActivity extends AppCompatActivity {

    private RecyclerView rvHistory;
    private HistoryAdapter historyAdapter;
    private List<History> listHistory;
    private View layoutEmpty, layoutHeader;
    private ProgressBar progressBar;

    // Cache static agar data tersimpan selama aplikasi hidup (selama session)
    private static List<History> cachedListHistory = null;
    
    // Pagination
    private int currentOffset = 0;
    private final int limit = 5;
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
        
        setContentView(R.layout.activity_history);

        layoutHeader = findViewById(R.id.layoutHeader);
        layoutEmpty = findViewById(R.id.layoutEmpty);
        progressBar = findViewById(R.id.progressBar);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (layoutHeader != null) {
                layoutHeader.setPadding(layoutHeader.getPaddingLeft(), insets.top, layoutHeader.getPaddingRight(), layoutHeader.getPaddingBottom());
            }
            return windowInsets;
        });

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        
        findViewById(R.id.btnHelp).setOnClickListener(v -> Toast.makeText(this, "Bantuan segera hadir", Toast.LENGTH_SHORT).show());
        findViewById(R.id.btnLogout).setOnClickListener(v -> logout());
        
        rvHistory = findViewById(R.id.rvHistory);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        rvHistory.setLayoutManager(layoutManager);

        NavigationHelper.setupFooter(this);

        listHistory = new ArrayList<>();
        historyAdapter = new HistoryAdapter(this, listHistory);
        rvHistory.setAdapter(historyAdapter);

        String kdAnggota = getSharedPreferences("loginPrefs", MODE_PRIVATE).getString("kdAnggota", "");

        // Cek Cache: Jika sudah ada data, gunakan cache saja
        if (cachedListHistory != null && !cachedListHistory.isEmpty()) {
            listHistory.addAll(cachedListHistory);
            historyAdapter.notifyDataSetChanged();
            currentOffset = listHistory.size();
            layoutEmpty.setVisibility(View.GONE);
        } else {
            fetchHistory(kdAnggota);
        }

        // Scroll listener untuk pagination
        rvHistory.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(@NonNull RecyclerView recyclerView, int dx, int dy) {
                super.onScrolled(recyclerView, dx, dy);
                if (dy <= 0) return; // Hanya scroll ke bawah

                int visibleItemCount = layoutManager.getChildCount();
                int totalItemCount = layoutManager.getItemCount();
                int firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition();

                if (!isLoading && !isLastPage) {
                    if ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount) {
                        fetchHistory(kdAnggota);
                    }
                }
            }
        });
    }

    private void fetchHistory(String kdAnggota) {
        if (isLoading || isLastPage) return;

        isLoading = true;
        progressBar.setVisibility(View.VISIBLE);
        
        String url = Api.URL_GET_HISTORY + "&kdAnggota=" + kdAnggota + "&offset=" + currentOffset + "&limit=" + limit;

        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        JSONArray result = response.optJSONArray("history");
                        if (result != null && result.length() > 0) {
                            layoutEmpty.setVisibility(View.GONE);
                            
                            if (result.length() < limit) {
                                isLastPage = true;
                            }

                            for (int i = 0; i < result.length(); i++) {
                                JSONObject obj = result.getJSONObject(i);
                                History h = new History();
                                h.setTgl(obj.optString("tgl", "-"));
                                h.setRef(obj.optString("ref", ""));
                                h.setTitle(obj.optString("title", "Unknown"));
                                h.setSub(obj.optString("sub", ""));
                                h.setAmount(obj.optDouble("amount", 0));
                                h.setCategory(obj.optString("category", ""));
                                listHistory.add(h);
                            }
                            
                            // Update Cache
                            if (cachedListHistory == null) cachedListHistory = new ArrayList<>();
                            cachedListHistory.clear();
                            cachedListHistory.addAll(listHistory);

                            historyAdapter.notifyDataSetChanged();
                            currentOffset += result.length();
                        } else {
                            if (listHistory.isEmpty()) layoutEmpty.setVisibility(View.VISIBLE);
                            isLastPage = true;
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                        if (listHistory.isEmpty()) layoutEmpty.setVisibility(View.VISIBLE);
                    }
                    isLoading = false;
                },
                error -> {
                    isLoading = false;
                    progressBar.setVisibility(View.GONE);
                    Log.e("Volley Error", "onErrorResponse: " + error.getMessage());
                    if (listHistory.isEmpty()) layoutEmpty.setVisibility(View.VISIBLE);
                }
        );

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }
    
    private void logout() {
        SharedPreferences.Editor editor = getSharedPreferences("loginPrefs", MODE_PRIVATE).edit();
        editor.clear();
        editor.apply();
        
        clearCache();
        LogNotifikasiActivity.clearInboxCache();
        SimpananRinciActivity.clearSimpananCache();

        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
    
    // Static method untuk membersihkan cache jika user logout atau refresh (misal pull-to-refresh)
    public static void clearCache() {
        if (cachedListHistory != null) {
            cachedListHistory.clear();
            cachedListHistory = null;
        }
    }
}
