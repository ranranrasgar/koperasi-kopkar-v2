package com.rhansoft.kopkarmjsjkt2000;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Window;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.content.Intent;

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

import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class SimpananActivity extends AppCompatActivity {
    private TextView tvTotalSaldo;
    private ProgressBar progressBar;
    private List<SimpananRinci> listMutasi;
    private List<Simpanan> listSimpanan;
    private RecyclerView rvMutasi, rvSimpanan;
    private MutasiAdapter mutasiAdapter;
    private SimpananAdapter simpananAdapter;
    private String kdAnggota, namaAnggota;
    private View layoutHeader, bottomNav;

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
        
        setContentView(R.layout.activity_simpanan);

        layoutHeader = findViewById(R.id.layoutHeader);
        bottomNav = findViewById(R.id.bottomNav);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (layoutHeader != null) {
                layoutHeader.setPadding(layoutHeader.getPaddingLeft(), insets.top, layoutHeader.getPaddingRight(), layoutHeader.getPaddingBottom());
            }
            return windowInsets;
        });
        
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        
        progressBar = findViewById(R.id.progressBar);
        tvTotalSaldo = findViewById(R.id.tvTotalSaldo);
        rvMutasi = findViewById(R.id.rvMutasi);
        rvMutasi.setLayoutManager(new LinearLayoutManager(this));
        
        rvSimpanan = findViewById(R.id.rvSimpanan);
        rvSimpanan.setLayoutManager(new LinearLayoutManager(this));
        


        // Setup Footer
        NavigationHelper.setupFooter(this);

        kdAnggota = getIntent().getStringExtra("kdAnggota");
        namaAnggota = getIntent().getStringExtra("namaAnggota");

        listMutasi = new ArrayList<>();
        listSimpanan = new ArrayList<>();

        findViewById(R.id.btnLihatSemua).setOnClickListener(v -> {
            if (!listSimpanan.isEmpty()) {
                Simpanan first = listSimpanan.get(0);
                openDetail(first.getJnsSimpanan(), first.getNamaSimpanan(), formatRupiah(Double.parseDouble(first.getTotalSimpanan().replace(",", ""))));
            }
        });

        sendRequest();
        fetchMutasi();
    }

    private void openDetail(String jenis, String nama, String total) {
        Intent intent = new Intent(this, SimpananRinciActivity.class);
        intent.putExtra("kdAnggota", kdAnggota);
        intent.putExtra("nmAnggota", namaAnggota);
        intent.putExtra("jnsSimpanan", jenis);
        intent.putExtra("namaSimpanan", nama);
        intent.putExtra("total", total);
        startActivity(intent);
    }

    public void sendRequest() {
        progressBar.setVisibility(View.VISIBLE);
        String url = Api.URL_GET_SIMPANAN + "&kdAnggota=" + kdAnggota;
        
        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        if (response.has("error") && response.getBoolean("error")) {
                            Toast.makeText(this, response.optString("message", "Gagal memuat data"), Toast.LENGTH_SHORT).show();
                            return;
                        }

                        JSONArray result = response.getJSONArray("simpanan");
                        double totalSemua = 0;
                        listSimpanan.clear();
                        for (int i = 0; i < result.length(); i++) {
                            JSONObject jsonObject = result.getJSONObject(i);
                            double total = jsonObject.optDouble("total", 0);
                            String jenisSimpanan = jsonObject.optString("jenis_simpanan","");
                            if (total <= 0) continue; 
                            
                            Simpanan simpanan = new Simpanan();
                            simpanan.setNamaAnggota(jsonObject.optString("nama_agt", ""));
                            simpanan.setKdAnggota(jsonObject.optString("kode_agt", ""));
                            simpanan.setJnsSimpanan(jsonObject.optString("jenis_simpanan", ""));
                            simpanan.setNamaSimpanan(jsonObject.optString("nama_simpanan", ""));
//                            Total simpanan tidak termasuk simpanan pokok
                            if (!jenisSimpanan.equalsIgnoreCase("01")) {
                                totalSemua += total;
                            }
                            
                            DecimalFormat df = new DecimalFormat("#,##0");
                            simpanan.setTotalSimpanan(df.format(total));
                            listSimpanan.add(simpanan);
                        }
                        
                        simpananAdapter = new SimpananAdapter(this, listSimpanan);
                        rvSimpanan.setAdapter(simpananAdapter);
                        
                        tvTotalSaldo.setText(formatRupiah(totalSemua));
                        
                        // Update Target Menabung Card
                        updateTargetCard(totalSemua);
                    } catch (JSONException e) {
                        Log.e("Simpanan", "Parsing Error: " + e.getMessage());
                    }
                }, error -> {
            progressBar.setVisibility(View.GONE);
            Log.e("Volley", "Error: " + error.getMessage());
        });

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }

    private void fetchMutasi() {
        String url = Api.URL_GET_HISTORY + "&kdAnggota=" + kdAnggota + "&offset=0&limit=5";

        JsonObjectRequest request = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    try {
                        JSONArray result = response.optJSONArray("history");
                        if (result != null) {
                            listMutasi.clear();
                            for (int i = 0; i < result.length(); i++) {
                                JSONObject obj = result.getJSONObject(i);
                                // Filter only SIMPANAN for this page
                                if (obj.optString("category").equals("SIMPANAN")) {
                                    SimpananRinci mutasi = new SimpananRinci();
                                    mutasi.setTglSimpanan(obj.optString("tgl", "-"));
                                    mutasi.setNoReff(obj.optString("ref", ""));
                                    
                                    double amount = obj.optDouble("amount", 0);
                                    if (amount > 0) {
                                        mutasi.setDebit(String.valueOf(amount));
                                        mutasi.setKredit("0");
                                    } else {
                                        mutasi.setDebit("0");
                                        mutasi.setKredit(String.valueOf(Math.abs(amount)));
                                    }
                                    listMutasi.add(mutasi);
                                }
                            }
                            mutasiAdapter = new MutasiAdapter(listMutasi);
                            rvMutasi.setAdapter(mutasiAdapter);
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                },
                error -> Log.e("Simpanan", "Mutasi Error: " + error.getMessage())
        );
        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    private void updateTargetCard(double totalSimpanan) {
        double target = 50000000; // Contoh target 50 Juta
        int progress = (int) Math.min(100, (totalSimpanan / target) * 100);
        
        TextView tvDesc = findViewById(R.id.tvTargetDesc);
        com.google.android.material.progressindicator.LinearProgressIndicator pb = findViewById(R.id.pbTarget);

        if (pb != null) {
            pb.setProgress(progress);
        }
        if (tvDesc != null) {
            tvDesc.setText("Anda telah mencapai " + progress + "% dari target tabungan tahunan Anda. Terus tingkatkan!");
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

    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}
