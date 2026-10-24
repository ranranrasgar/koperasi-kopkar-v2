package com.rhansoft.kopkarmjsjkt2000;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.NavigationHelper;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class PinjamanActivity extends AppCompatActivity {
    private TextView tvTotalSisaPinjaman;
    private ProgressBar progressBar;
    List<Pinjaman> listPinjaman;
    RecyclerView recyclerViewPinjaman;
    RecyclerView.LayoutManager layoutManager;
    PinjamanAdapter pinjamanAdapter;

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
        
        setContentView(R.layout.activity_pinjaman);

        View layoutHeader = findViewById(R.id.layoutHeader);
        View bottomNav = findViewById(R.id.bottomNav);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (layoutHeader != null) {
                layoutHeader.setPadding(layoutHeader.getPaddingLeft(), insets.top, layoutHeader.getPaddingRight(), layoutHeader.getPaddingBottom());
            }
            return windowInsets;
        });

        tvTotalSisaPinjaman = findViewById(R.id.tvTotalSisaPinjaman);
        progressBar = findViewById(R.id.progressBar);
        recyclerViewPinjaman = findViewById(R.id.rvwPinjaman);

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        layoutManager = new LinearLayoutManager(this);
        recyclerViewPinjaman.setLayoutManager(layoutManager);
        
        NavigationHelper.setupFooter(this);

        listPinjaman = new ArrayList<>();

        sendRequest();
    }

    public void sendRequest(){
        progressBar.setVisibility(View.VISIBLE);
        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET,
                Api.URL_GET_PINJAMAN + "&kdAnggota=" + getIntent().getStringExtra("kdAnggota"),
                null, new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                progressBar.setVisibility(View.GONE);
                try {
                    JSONArray result = response.getJSONArray("pinjaman");
                    double totalSisa = 0;
                    listPinjaman.clear();
                    
                    for(int i = 0; i < result.length(); i++) {
                        JSONObject jsonObject = result.getJSONObject(i);
                        Pinjaman pinjaman = new Pinjaman();
                        pinjaman.setNamaAgt(jsonObject.getString("nama_agt"));
                        pinjaman.setNoPinjaman(jsonObject.getString("no_pinjaman"));
                        pinjaman.setTglPinjaman(jsonObject.getString("tgl_pinjaman"));
                        pinjaman.setJenisKredit(jsonObject.getString("nama_kredit"));
                        pinjaman.setPinjamanPokok(jsonObject.optDouble("pinjaman_pokok", 0));
                        pinjaman.setSaldo(jsonObject.optDouble("saldo", 0));
                        pinjaman.setBunga(jsonObject.optDouble("bunga", 0));
                        pinjaman.setPersenBunga(jsonObject.optDouble("persen_bunga", 0));
                        pinjaman.setLamaAngsuran(jsonObject.optInt("lamaAngsuran", 0));
                        
                        if (jsonObject.has("angsuran_ke")) {
                            pinjaman.setAngsuranKe(jsonObject.getInt("angsuran_ke"));
                        } else {
                            if (pinjaman.getPinjamanPokok() > 0 && pinjaman.getLamaAngsuran() > 0) {
                                double dibayar = pinjaman.getPinjamanPokok() - pinjaman.getSaldo();
                                double perBulan = pinjaman.getPinjamanPokok() / pinjaman.getLamaAngsuran();
                                int est = (int) Math.round(dibayar / perBulan);
                                pinjaman.setAngsuranKe(Math.max(0, est));
                            } else {
                                pinjaman.setAngsuranKe(0);
                            }
                        }
                        
                        listPinjaman.add(pinjaman);
                        totalSisa += pinjaman.getSaldo();
                    }

                    tvTotalSisaPinjaman.setText(formatRupiah(totalSisa));
                    
                    pinjamanAdapter = new PinjamanAdapter(PinjamanActivity.this, listPinjaman);
                    recyclerViewPinjaman.setAdapter(pinjamanAdapter);

                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                progressBar.setVisibility(View.GONE);
                Log.e("Volley Error", error.getMessage() != null ? error.getMessage() : "Unknown error");
            }
        });

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }

    private String formatRupiah(double number) {
        Locale localeID = new Locale("in", "ID");
        java.text.NumberFormat formatRupiah = java.text.NumberFormat.getCurrencyInstance(localeID);
        String formatted = formatRupiah.format(number);
        if (formatted.endsWith(",00")) {
            formatted = formatted.substring(0, formatted.length() - 3);
        }
        return formatted.replace("Rp", "Rp ");
    }

    @Override
    public boolean onSupportNavigateUp(){
        finish();
        return true;
    }
}
