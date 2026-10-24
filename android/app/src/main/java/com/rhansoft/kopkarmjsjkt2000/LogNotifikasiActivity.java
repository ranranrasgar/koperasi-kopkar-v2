package com.rhansoft.kopkarmjsjkt2000;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.TextView;
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

public class LogNotifikasiActivity extends AppCompatActivity {

    private RecyclerView revLog;
    private LogNotifikasiAdapter lnAdapter;
    private List<LogNotifikasi> listLog;
    private View layoutEmpty, layoutHeader;

    // Cache static agar data tersimpan selama aplikasi hidup
    private static List<LogNotifikasi> cachedListInbox = null;

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
        
        setContentView(R.layout.activity_log_notifikasi);

        layoutHeader = findViewById(R.id.layoutHeader);
        layoutEmpty = findViewById(R.id.layoutEmpty);

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
        
        findViewById(R.id.btnReadAll).setOnClickListener(v -> {
            if (listLog != null && !listLog.isEmpty()) {
                for (LogNotifikasi ln : listLog) {
                    ln.setRead(true);
                }
                lnAdapter.notifyDataSetChanged();
                Toast.makeText(this, "Semua notifikasi ditandai sudah dibaca", Toast.LENGTH_SHORT).show();
            }
        });

        revLog = findViewById(R.id.rev_log_notifikasi);
        revLog.setHasFixedSize(true);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        revLog.setLayoutManager(layoutManager);

        NavigationHelper.setupFooter(this);

        listLog = new ArrayList<>();
        lnAdapter = new LogNotifikasiAdapter(LogNotifikasiActivity.this, listLog);
        revLog.setAdapter(lnAdapter);

        String kdAnggota = getIntent().getStringExtra("kdAnggota");
        if (kdAnggota == null) {
            kdAnggota = getSharedPreferences("loginPrefs", MODE_PRIVATE).getString("kdAnggota", "");
        }

        // Cek Cache
        if (cachedListInbox != null && !cachedListInbox.isEmpty()) {
            listLog.addAll(cachedListInbox);
            lnAdapter.notifyDataSetChanged();
            currentOffset = listLog.size();
            layoutEmpty.setVisibility(View.GONE);
        } else {
            sendRequest(kdAnggota);
        }

        // Scroll listener untuk pagination
        revLog.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(@NonNull RecyclerView recyclerView, int dx, int dy) {
                super.onScrolled(recyclerView, dx, dy);
                if (dy <= 0) return;

                int visibleItemCount = layoutManager.getChildCount();
                int totalItemCount = layoutManager.getItemCount();
                int firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition();

                if (!isLoading && !isLastPage) {
                    if ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount) {
                        String finalKd = getSharedPreferences("loginPrefs", MODE_PRIVATE).getString("kdAnggota", "");
                        sendRequest(finalKd);
                    }
                }
            }
        });
    }

    private void sendRequest(String kdAnggota) {
        if (isLoading || isLastPage) return;

        isLoading = true;
        String url = Api.URL_GET_LOG + "&kdAnggota=" + kdAnggota + "&offset=" + currentOffset + "&limit=" + limit;

        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    try {
                        JSONArray result = response.optJSONArray("log");
                        if (result != null && result.length() > 0) {
                            layoutEmpty.setVisibility(View.GONE);
                            
                            if (result.length() < limit) {
                                isLastPage = true;
                            }

                            for (int i = 0; i < result.length(); i++) {
                                JSONObject obj = result.getJSONObject(i);
                                LogNotifikasi ln = new LogNotifikasi();
                                ln.setTitle(obj.optString("title", "No Title"));
                                ln.setPesan(obj.optString("pesan", "No Content"));
                                ln.setTanggal(obj.optString("datetimes", "-"));
                                ln.setRead(true); // Default read untuk log
                                listLog.add(ln);
                            }
                            
                            // Update Cache
                            if (cachedListInbox == null) cachedListInbox = new ArrayList<>();
                            cachedListInbox.clear();
                            cachedListInbox.addAll(listLog);

                            lnAdapter.notifyDataSetChanged();
                            currentOffset += result.length();
                        } else {
                            if (listLog.isEmpty()) layoutEmpty.setVisibility(View.VISIBLE);
                            isLastPage = true;
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                        if (listLog.isEmpty()) layoutEmpty.setVisibility(View.VISIBLE);
                    }
                    isLoading = false;
                },
                error -> {
                    isLoading = false;
                    Log.e("Volley Error", "onErrorResponse: " + error.getMessage());
                    if (listLog.isEmpty()) layoutEmpty.setVisibility(View.VISIBLE);
                }
        );

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }

    private void logout() {
        SharedPreferences.Editor editor = getSharedPreferences("loginPrefs", MODE_PRIVATE).edit();
        editor.clear();
        editor.apply();
        
        HistoryActivity.clearCache();
        clearInboxCache();
        SimpananRinciActivity.clearSimpananCache();

        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    public static void clearInboxCache() {
        if (cachedListInbox != null) {
            cachedListInbox.clear();
            cachedListInbox = null;
        }
    }
}
