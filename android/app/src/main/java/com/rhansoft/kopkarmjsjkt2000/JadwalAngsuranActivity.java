package com.rhansoft.kopkarmjsjkt2000;

import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.widget.TextView;
import android.widget.Toast;

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

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class JadwalAngsuranActivity extends AppCompatActivity {

    private List<JadwalItem> listJadwal = new ArrayList<>();
    private JadwalAdapter adapter;
    private String noPinjaman;

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
        
        setContentView(R.layout.activity_jadwal_angsuran);

        View toolbar = findViewById(R.id.toolbar);
        View bottomNav = findViewById(R.id.bottomNav);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (toolbar != null) {
                toolbar.setPadding(toolbar.getPaddingLeft(), insets.top, toolbar.getPaddingRight(), toolbar.getPaddingBottom());
            }
            return windowInsets;
        });

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        noPinjaman = getIntent().getStringExtra("noPinjaman");
        int lamaAngsuran = getIntent().getIntExtra("lamaAngsuran", 0);
        String sPokok = getIntent().getStringExtra("pinjamanPokok");
        String sBunga = getIntent().getStringExtra("bungaAmount");

        ((TextView)findViewById(R.id.tvNoPinjaman)).setText(noPinjaman);
        ((TextView)findViewById(R.id.tvTenor)).setText(lamaAngsuran + " Bln");

        double totalAngsuran = 0;
        try {
            String pStr = sPokok != null ? sPokok.replace("Rp ", "").replace(".", "").replace(",", "") : "0";
            String bStr = sBunga != null ? sBunga.replace("Rp ", "").replace(".", "").replace(",", "") : "0";
            totalAngsuran = Double.parseDouble(pStr) + Double.parseDouble(bStr);
        } catch (Exception e) {}

        ((TextView)findViewById(R.id.tvTotalAngsuran)).setText(formatRupiah(totalAngsuran));

        RecyclerView rv = findViewById(R.id.rvJadwal);
        rv.setLayoutManager(new LinearLayoutManager(this));
        adapter = new JadwalAdapter(listJadwal);
        rv.setAdapter(adapter);

        fetchRealJadwal();
        
        NavigationHelper.setupFooter(this);
    }

    private void fetchRealJadwal() {
        if (noPinjaman == null || noPinjaman.isEmpty()) {
            Toast.makeText(this, "Nomor pinjaman tidak valid", Toast.LENGTH_SHORT).show();
            return;
        }

        String url = Api.URL_GET_JADWAL_ANGSURAN + "&noPinjaman=" + noPinjaman.trim();
        
        JsonObjectRequest request = new JsonObjectRequest(Request.Method.GET, url, null,
            response -> {
                try {
                    if (!response.getBoolean("error")) {
                        JSONArray array = response.optJSONArray("jadwal");
                        listJadwal.clear();
                        
                        if (array != null && array.length() > 0) {
                            SimpleDateFormat sdfInput = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                            SimpleDateFormat sdfOutput = new SimpleDateFormat("dd MMM yyyy", new Locale("in", "ID"));

                            for (int i = 0; i < array.length(); i++) {
                                JSONObject obj = array.getJSONObject(i);
                                JadwalItem item = new JadwalItem();
                                item.bulanKe = obj.optInt("angsuran_ke");
                                item.tglTagihan = formatDate(obj.optString("tgl_tagihan"), sdfInput, sdfOutput);
                                item.tglBayar = formatDate(obj.optString("tgl_bayar"), sdfInput, sdfOutput);
                                item.pokok = obj.optDouble("pokok", 0);
                                item.jasa = obj.optDouble("jasa", 0);
                                item.total = obj.optDouble("total", 0);
                                item.status = obj.optString("status", "Belum Dibayar");
                                listJadwal.add(item);
                            }
                        } else {
                            Toast.makeText(this, "Tidak ada data jadwal", Toast.LENGTH_SHORT).show();
                        }
                        adapter.notifyDataSetChanged();
                    } else {
                        Toast.makeText(this, response.optString("message"), Toast.LENGTH_SHORT).show();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    Toast.makeText(this, "Error parsing data", Toast.LENGTH_SHORT).show();
                }
            },
            error -> Toast.makeText(this, "Gagal terhubung ke server", Toast.LENGTH_SHORT).show()
        );

        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    private String formatDate(String dateStr, SimpleDateFormat input, SimpleDateFormat output) {
        if (dateStr == null || dateStr.isEmpty() || dateStr.equals("null") || dateStr.equals("0000-00-00")) return "-";
        try {
            Date d = input.parse(dateStr);
            return d != null ? output.format(d) : dateStr;
        } catch (Exception e) {
            return dateStr;
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

    private static class JadwalItem {
        int bulanKe;
        String tglTagihan, tglBayar, status;
        double pokok, jasa, total;
    }

    private class JadwalAdapter extends RecyclerView.Adapter<JadwalAdapter.VH> {
        List<JadwalItem> items;
        JadwalAdapter(List<JadwalItem> items) { this.items = items; }

        @androidx.annotation.NonNull
        @Override
        public VH onCreateViewHolder(@androidx.annotation.NonNull android.view.ViewGroup parent, int viewType) {
            return new VH(getLayoutInflater().inflate(R.layout.item_jadwal_angsuran, parent, false));
        }

        @Override
        public void onBindViewHolder(@androidx.annotation.NonNull VH holder, int position) {
            JadwalItem item = items.get(position);
            holder.tvBulanKe.setText(String.valueOf(item.bulanKe));
            holder.tvTanggal.setText("Tgl Tagihan: " + item.tglTagihan);
            holder.tvTglBayar.setText("Tgl Bayar: " + item.tglBayar);
            holder.tvRincian.setText("Pokok: " + formatRupiah(item.pokok) + " | Jasa: " + formatRupiah(item.jasa));
            holder.tvAmount.setText(formatRupiah(item.total));
            holder.tvStatus.setText(item.status);
            
            if ("Sudah Dibayar".equalsIgnoreCase(item.status)) {
                holder.tvStatus.setTextColor(Color.parseColor("#059669"));
                holder.tvStatus.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#D1FAE5")));
            } else {
                holder.tvStatus.setTextColor(Color.parseColor("#6B7280"));
                holder.tvStatus.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#F3F4F6")));
            }
        }

        @Override
        public int getItemCount() { return items.size(); }

        class VH extends RecyclerView.ViewHolder {
            TextView tvBulanKe, tvTanggal, tvTglBayar, tvRincian, tvAmount, tvStatus;
            VH(View v) {
                super(v);
                tvBulanKe = v.findViewById(R.id.tvBulanKe);
                tvTanggal = v.findViewById(R.id.tvTanggal);
                tvTglBayar = v.findViewById(R.id.tvTglBayar);
                tvRincian = v.findViewById(R.id.tvRincian);
                tvAmount = v.findViewById(R.id.tvAmount);
                tvStatus = v.findViewById(R.id.tvStatus);
            }
        }
    }
}
