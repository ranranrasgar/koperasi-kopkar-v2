package com.rhansoft.kopkarmjsjkt2000;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.content.Intent;
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
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
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

public class PinjamanRinciActivity extends AppCompatActivity {

    private TextView txvNoPinjaman, txvPinjamanPokok, txvSaldoPinjaman, txvTglPinjaman, tvCicilanStatus, txvBunga, labelBunga;
    private ProgressBar pbAngsuran, progressBar;

    private List<PinjamanRinci> listPinjamanRinci;
    private RecyclerView recyclerViewPinjamanRinci;
    private PinjamanRinciAdapter pinjamanRinciAdapter;

    private static Map<String, List<PinjamanRinci>> cachedPinjamanRinci = new HashMap<>();

    // Paginasi
    private int currentOffset = 0;
    private final int limit = 12; // Default 12 data

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
        
        setContentView(R.layout.activity_pinjaman_rinci);

        View toolbar = findViewById(R.id.toolbar);
        View bottomNav = findViewById(R.id.bottomNav);
        progressBar = findViewById(R.id.progressBar);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (toolbar != null) {
                toolbar.setPadding(toolbar.getPaddingLeft(), insets.top, toolbar.getPaddingRight(), toolbar.getPaddingBottom());
            }
            return windowInsets;
        });

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        String noPinjaman = getIntent().getStringExtra("noPinjaman");
        txvNoPinjaman = findViewById(R.id.txvNoPinjaman);
        txvNoPinjaman.setText(noPinjaman);
        
        txvTglPinjaman = findViewById(R.id.txvTglPinjaman);
        txvTglPinjaman.setText(getIntent().getStringExtra("tglPinjaman"));

        txvPinjamanPokok = findViewById(R.id.txvPinjamanPokok);
        txvPinjamanPokok.setText("Rp " + getIntent().getStringExtra("pinjamanPokok"));
        
        txvBunga = findViewById(R.id.txvBunga);
        txvBunga.setText("Rp " + getIntent().getStringExtra("bungaAmount"));
        
        labelBunga = findViewById(R.id.labelBunga);
        double persenBunga = getIntent().getDoubleExtra("persenBunga", 0);
        if (labelBunga != null) labelBunga.setText("Bunga (" + persenBunga + "%)");
        
        txvSaldoPinjaman = findViewById(R.id.txvSaldoPinjaman);
        double totalSaldo = getIntent().getDoubleExtra("totalSaldo", 0);
        txvSaldoPinjaman.setText(formatRupiah(totalSaldo));

        tvCicilanStatus = findViewById(R.id.tvCicilanStatus);
        pbAngsuran = findViewById(R.id.pbAngsuran);

        int initialAngsuranKe = getIntent().getIntExtra("angsuranKe", 0);
        updateProgress(initialAngsuranKe);

        findViewById(R.id.btnJadwal).setOnClickListener(v -> {
            Intent intent = new Intent(this, JadwalAngsuranActivity.class);
            intent.putExtra("noPinjaman", noPinjaman);
            intent.putExtra("tglPinjaman", getIntent().getStringExtra("tglPinjaman"));
            intent.putExtra("lamaAngsuran", getIntent().getIntExtra("lamaAngsuran", 0));
            intent.putExtra("pinjamanPokok", getIntent().getStringExtra("pinjamanPokok"));
            intent.putExtra("bungaAmount", getIntent().getStringExtra("bungaAmount"));
            
            intent.putExtra("paidCount", getLatestAngsuranKe());
            startActivity(intent);
        });

        recyclerViewPinjamanRinci = findViewById(R.id.rvwPinjamanRinci);
        recyclerViewPinjamanRinci.setLayoutManager(new LinearLayoutManager(this));
        
        NavigationHelper.setupFooter(this);

        listPinjamanRinci = new ArrayList<>();
        pinjamanRinciAdapter = new PinjamanRinciAdapter(this, listPinjamanRinci);
        recyclerViewPinjamanRinci.setAdapter(pinjamanRinciAdapter);

        // Cek Cache
        if (cachedPinjamanRinci.containsKey(noPinjaman)) {
            listPinjamanRinci.addAll(cachedPinjamanRinci.get(noPinjaman));
            pinjamanRinciAdapter.notifyDataSetChanged();
            currentOffset = listPinjamanRinci.size();
            
            updateProgress(getLatestAngsuranKe());
        } else {
            sendRequest(noPinjaman);
        }

        // Scroll Listener via NestedScrollView
        NestedScrollView nestedScroll = findViewById(R.id.nestedScrollView);
        if (nestedScroll != null) {
            nestedScroll.setOnScrollChangeListener((NestedScrollView.OnScrollChangeListener) (v, scrollX, scrollY, oldScrollX, oldScrollY) -> {
                // Buffer 10px untuk deteksi bawah yang lebih responsif
                if (scrollY >= (v.getChildAt(0).getMeasuredHeight() - v.getMeasuredHeight() - 10)) {
                    if (!isLoading && !isLastPage) {
                        Log.d("PinjamanRinci", "Bottom reached, loading more...");
                        sendRequest(noPinjaman);
                    }
                }
            });
        }
    }

    private int getLatestAngsuranKe() {
        int count = getIntent().getIntExtra("angsuranKe", 0);
        for (PinjamanRinci pr : listPinjamanRinci) {
            try {
                int num = Integer.parseInt(pr.getAngsuranKe());
                if (num > count) {
                    count = num;
                }
            } catch (NumberFormatException ignored) {}
        }
        return count;
    }

    private void updateProgress(int count) {
        int totalTenor = getIntent().getIntExtra("lamaAngsuran", 0);
        tvCicilanStatus.setText("Cicilan ke-" + count + " dari " + totalTenor);
        if (totalTenor > 0) {
            int progress = (int) (((double) count / totalTenor) * 100);
            pbAngsuran.setProgress(progress);
        }
    }

    private void sendRequest(String noPinjaman) {
        if (isLoading || isLastPage) return;

        isLoading = true;
        if (progressBar != null) progressBar.setVisibility(View.VISIBLE);

        String url = Api.URL_GET_PINJAMAN_RINCI_PAGINATED + "&noPinjaman=" + noPinjaman + "&offset=" + currentOffset + "&limit=" + limit;

        StringRequest strRequest = new StringRequest(Request.Method.GET, url,
            response -> {
                if (progressBar != null) progressBar.setVisibility(View.GONE);
                try {
                    JSONObject jsonObject = new JSONObject(response);
                    if(!jsonObject.getBoolean("error")) {
                        JSONArray jsonArray = jsonObject.getJSONArray("pinjaman_rinci");
                        
                        if (jsonArray.length() < limit) {
                            isLastPage = true;
                        }

                        for(int i = 0; i < jsonArray.length(); i++) {
                            JSONObject jo = jsonArray.getJSONObject(i);
                            PinjamanRinci pinjamanRinci = new PinjamanRinci();
                            pinjamanRinci.setAngsuranKe(jo.optString("angsuran_ke", ""));
                            pinjamanRinci.setTglPinjaman(jo.optString("tgl_angsuran", ""));
                            pinjamanRinci.setNoReff(jo.optString("no_bukti", ""));
                            pinjamanRinci.setDebit(jo.optDouble("debit", 0));
                            pinjamanRinci.setKredit(jo.optDouble("kredit", 0));
                            listPinjamanRinci.add(pinjamanRinci);
                        }
                        
                        cachedPinjamanRinci.put(noPinjaman, new ArrayList<>(listPinjamanRinci));
                        pinjamanRinciAdapter.notifyDataSetChanged();
                        currentOffset += jsonArray.length();
                        
                        int rootAngsuranKe = jsonObject.optInt("angsuran_ke", -1);
                        int latest = getLatestAngsuranKe();
                        if (rootAngsuranKe > 0) {
                            latest = Math.max(latest, rootAngsuranKe);
                        }
                        updateProgress(latest);

                    } else {
                        Toast.makeText(getApplicationContext(), jsonObject.optString("message"), Toast.LENGTH_LONG).show();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                isLoading = false;
            }, error -> {
                if (progressBar != null) progressBar.setVisibility(View.GONE);
                isLoading = false;
                Toast.makeText(getApplicationContext(), "Error loading details", Toast.LENGTH_LONG).show();
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

    public static void clearPinjamanCache() {
        cachedPinjamanRinci.clear();
    }

    @Override
    public boolean onSupportNavigateUp(){
        finish();
        return true;
    }
}
