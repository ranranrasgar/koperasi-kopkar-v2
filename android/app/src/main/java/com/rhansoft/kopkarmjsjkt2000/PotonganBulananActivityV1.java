package com.rhansoft.kopkarmjsjkt2000;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.ImageView;
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
import com.bumptech.glide.Glide;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.NavigationHelper;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class PotonganBulananActivityV1 extends AppCompatActivity {
    private TextView tvTotalPotongan, tvBulanTahun, tvStatusTitle, tvStatusSubtitle;
    private ProgressBar progressBar, pbRasio;
    private RecyclerView revPotBul;
    private PotonganBulananAdapter potBulAdapter;
    private RecyclerView.LayoutManager layoutManager;
    private List<PotonganBulanan> listPotBul;

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
        
        setContentView(R.layout.activity_potongan_bulanan_v1);

        View layoutHeader = findViewById(R.id.layoutHeader);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (layoutHeader != null) {
                layoutHeader.setPadding(layoutHeader.getPaddingLeft(), insets.top, layoutHeader.getPaddingRight(), layoutHeader.getPaddingBottom());
            }
            return windowInsets;
        });

        tvTotalPotongan = findViewById(R.id.tvTotalPotongan);
        tvBulanTahun = findViewById(R.id.tvBulanTahun);
        tvStatusTitle = findViewById(R.id.tvStatusTitle);
        tvStatusSubtitle = findViewById(R.id.tvStatusSubtitle);
        progressBar = findViewById(R.id.progressBar);
        pbRasio = findViewById(R.id.pbRasio);

        SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        String foto = prefs.getString("foto", "no_image.jpg");
        String kdAnggota = getIntent().getStringExtra("kdAnggota");
        if (kdAnggota == null || kdAnggota.isEmpty()) {
            kdAnggota = prefs.getString("kdAnggota", "");
        }

        // Instantly display cached total from Dashboard if available
        float cachedTotal = prefs.getFloat("potongan_bulan_ini", 0f);
        if (cachedTotal == 0f) {
            cachedTotal = prefs.getFloat("total_potongan", 0f);
        }
        if (cachedTotal > 0) {
            tvTotalPotongan.setText(formatRupiah(cachedTotal));
            float rpGrade = prefs.getFloat("rpGrade", 0f);
            if (rpGrade > 0 && pbRasio != null) {
                int ratio = (int) ((cachedTotal / (rpGrade * 2)) * 100);
                if (ratio > 100) ratio = 100;
                pbRasio.setProgress(ratio);
                TextView tvRasioDesc = findViewById(R.id.tvRasioDesc);
                if (tvRasioDesc != null) {
                    tvRasioDesc.setText("Potongan bulan ini setara dengan " + ratio + "% dari estimasi penghasilan bulanan Anda.");
                }
            }
        }

        ((TextView)findViewById(R.id.tvAppName)).setText("KopkarMJS2000");
        
        Glide.with(this)
                .load(Api.IMAGE_PATH + foto)
                .placeholder(R.drawable.icon_user)
                .diskCacheStrategy(DiskCacheStrategy.ALL)
                .into((com.google.android.material.imageview.ShapeableImageView)findViewById(R.id.imgProfile));

        SimpleDateFormat sdf = new SimpleDateFormat("MMMM yyyy", new Locale("in", "ID"));
        tvBulanTahun.setText(sdf.format(Calendar.getInstance().getTime()));

        revPotBul = findViewById(R.id.rev_potongan);
        revPotBul.setHasFixedSize(true);
        layoutManager = new LinearLayoutManager(this);
        revPotBul.setLayoutManager(layoutManager);
        
        NavigationHelper.setupFooter(this);

        String finalKdAnggota = kdAnggota;
        findViewById(R.id.btnDownloadSlip).setOnClickListener(v -> {
            if (finalKdAnggota != null && !finalKdAnggota.isEmpty()) {
                String url = Api.URL_DOWNLOAD_SLIP + "?kdAnggota=" + finalKdAnggota;
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                startActivity(intent);
                android.widget.Toast.makeText(this, "Membuka slip gaji...", android.widget.Toast.LENGTH_SHORT).show();
            } else {
                android.widget.Toast.makeText(this, "Gagal mengunduh: Kode Anggota tidak ditemukan", android.widget.Toast.LENGTH_SHORT).show();
            }
        });

        findViewById(R.id.btnBantuan).setOnClickListener(v -> showHelpDialog());

        listPotBul = new ArrayList<>();

        sendRequest(finalKdAnggota);
        isTerdebet(finalKdAnggota);
    }

    private void sendRequest(String kdAnggota) {
        if (kdAnggota == null || kdAnggota.isEmpty()) {
            SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
            kdAnggota = prefs.getString("kdAnggota", "");
        }
        final String finalKd = kdAnggota;
        progressBar.setVisibility(View.VISIBLE);
        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET,
                Api.URL_GET_POTONGAN_BULANAN + "&kdAnggota=" + finalKd,
                null, response -> {
            progressBar.setVisibility(View.GONE);
            try {
                double totalValue = 0;
                double computedSum = 0;
                NumberFormat formatter = new DecimalFormat("#,###");

                // Priority 1: Top-level total_potongan or total from response JSON
                totalValue = parseDoubleVal(response, "total_potongan");
                if (totalValue == 0) totalValue = parseDoubleVal(response, "total");

                if (response.has("potongan") && !response.isNull("potongan")) {
                    JSONArray jsonArray = response.optJSONArray("potongan");
                    JSONObject jsonObj = response.optJSONObject("potongan");

                    if (jsonArray != null && jsonArray.length() > 0) {
                        JSONObject firstObj = jsonArray.optJSONObject(0);
                        if (firstObj != null) {
                            if (firstObj.has("deskripsi")) {
                                // Format A: Array of items with 'deskripsi' and 'jumlah'
                                for (int i = 0; i < jsonArray.length(); i++) {
                                    JSONObject item = jsonArray.optJSONObject(i);
                                    if (item == null) continue;
                                    String desc = item.optString("deskripsi", "").trim();
                                    double amount = parseDoubleVal(item, "jumlah");

                                    PotonganBulanan potBul = new PotonganBulanan();
                                    potBul.setDeskripsi(desc);
                                    potBul.setJumlah(formatter.format(amount));
                                    listPotBul.add(potBul);

                                    String descUpper = desc.toUpperCase();
                                    if (descUpper.contains("JUMLAH POTONGAN") || descUpper.contains("TOTAL POTONGAN") || descUpper.contains("POTONGAN KOPKAR")) {
                                        if (totalValue == 0) totalValue = amount;
                                    } else if (!descUpper.equals("SIMPANAN KOPERASI") && !descUpper.equals("PINJAMAN KOPERASI")) {
                                        computedSum += amount;
                                    }
                                }
                            } else {
                                // Format B: Object inside array
                                double subSum = parsePotonganObject(firstObj, formatter);
                                computedSum += subSum;
                                if (totalValue == 0) totalValue = parseDoubleVal(firstObj, "total_potongan");
                            }
                        }
                    } else if (jsonObj != null) {
                        // Format C: 'potongan' is directly a JSONObject
                        double subSum = parsePotonganObject(jsonObj, formatter);
                        computedSum += subSum;
                        if (totalValue == 0) totalValue = parseDoubleVal(jsonObj, "total_potongan");
                    } else {
                        // Format D: 'potongan' is a primitive number or string
                        if (totalValue == 0) {
                            totalValue = parseDoubleVal(response, "potongan");
                        }
                    }
                }

                if (totalValue == 0 && computedSum > 0) {
                    totalValue = computedSum;
                }

                if (totalValue > 0) {
                    tvTotalPotongan.setText(formatRupiah(totalValue));

                    SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
                    prefs.edit().putFloat("potongan_bulan_ini", (float) totalValue).apply();

                    float rpGrade = prefs.getFloat("rpGrade", 0f);
                    if (rpGrade > 0) {
                        int ratio = (int) ((totalValue / (rpGrade * 2)) * 100);
                        if (ratio > 100) ratio = 100;
                        if (pbRasio != null) pbRasio.setProgress(ratio);
                        TextView tvRasioDesc = findViewById(R.id.tvRasioDesc);
                        if (tvRasioDesc != null) {
                            tvRasioDesc.setText("Potongan bulan ini setara dengan " + ratio + "% dari estimasi penghasilan bulanan Anda.");
                        }
                    }
                } else {
                    // Fallback to Dashboard API if total is still 0
                    fetchDashboardFallback(finalKd);
                }
            } catch (Exception e) {
                Log.e("PotonganBulanan", "Error parsing response: " + e.getMessage(), e);
                fetchDashboardFallback(finalKd);
            }

            potBulAdapter = new PotonganBulananAdapter(PotonganBulananActivityV1.this, listPotBul);
            revPotBul.setAdapter(potBulAdapter);
        }, error -> {
            progressBar.setVisibility(View.GONE);
            Log.e("Volley Error", error.getMessage() != null ? error.getMessage() : "Unknown error");
        });

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }

    private void fetchDashboardFallback(String kdAnggota) {
        if (kdAnggota == null || kdAnggota.isEmpty()) return;
        String url = Api.URL_DASHBOARD + "?kdAnggota=" + kdAnggota;
        JsonObjectRequest req = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    try {
                        double dashTotal = parseDoubleVal(response, "total_potongan");
                        if (dashTotal > 0) {
                            tvTotalPotongan.setText(formatRupiah(dashTotal));
                            SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
                            prefs.edit().putFloat("potongan_bulan_ini", (float) dashTotal).apply();

                            float rpGrade = prefs.getFloat("rpGrade", 0f);
                            if (rpGrade > 0 && pbRasio != null) {
                                int ratio = (int) ((dashTotal / (rpGrade * 2)) * 100);
                                if (ratio > 100) ratio = 100;
                                pbRasio.setProgress(ratio);
                                TextView tvRasioDesc = findViewById(R.id.tvRasioDesc);
                                if (tvRasioDesc != null) {
                                    tvRasioDesc.setText("Potongan bulan ini setara dengan " + ratio + "% dari estimasi penghasilan bulanan Anda.");
                                }
                            }
                        }
                    } catch (Exception e) {
                        Log.e("PotonganBulanan", "Fallback error: " + e.getMessage());
                    }
                },
                error -> Log.e("PotonganBulanan", "Fallback Volley error")
        );
        VolleySingleton.getInstance(this).addToRequestQueue(req);
    }

    private double parsePotonganObject(JSONObject jo, NumberFormat formatter) {
        double subSum = 0;
        double sPokok = parseDoubleVal(jo, "s_pokok");
        if (sPokok == 0) sPokok = parseDoubleVal(jo, "simpanan_pokok");

        double sWajib = parseDoubleVal(jo, "s_wajib");
        if (sWajib == 0) sWajib = parseDoubleVal(jo, "simpanan_wajib");

        double sSukarela = parseDoubleVal(jo, "s_sukarela");
        if (sSukarela == 0) sSukarela = parseDoubleVal(jo, "simpanan_sukarela");

        double rpKoperasi = parseDoubleVal(jo, "rp_koprasi");
        if (rpKoperasi == 0) rpKoperasi = parseDoubleVal(jo, "rp_koperasi");

        double rpBank = parseDoubleVal(jo, "rp_bank");
        double rpKpr = parseDoubleVal(jo, "rp_kpr");
        double rpAdminBank = parseDoubleVal(jo, "rp_admin_bank");
        if (rpAdminBank == 0) rpAdminBank = parseDoubleVal(jo, "admin_bank");

        if (sPokok > 0 || sWajib > 0 || sSukarela > 0) {
            PotonganBulanan header = new PotonganBulanan();
            header.setDeskripsi("SIMPANAN KOPERASI");
            header.setJumlah("0");
            listPotBul.add(header);

            if (sPokok > 0) {
                PotonganBulanan p = new PotonganBulanan();
                p.setDeskripsi("Simpanan Pokok\nSimpanan");
                p.setJumlah(formatter.format(sPokok));
                listPotBul.add(p);
                subSum += sPokok;
            }
            if (sWajib > 0) {
                PotonganBulanan p = new PotonganBulanan();
                p.setDeskripsi("Simpanan Wajib\nSimpanan");
                p.setJumlah(formatter.format(sWajib));
                listPotBul.add(p);
                subSum += sWajib;
            }
            if (sSukarela > 0) {
                PotonganBulanan p = new PotonganBulanan();
                p.setDeskripsi("Simpanan Sukarela\nSimpanan");
                p.setJumlah(formatter.format(sSukarela));
                listPotBul.add(p);
                subSum += sSukarela;
            }
        }

        if (rpKoperasi > 0 || rpBank > 0 || rpKpr > 0 || rpAdminBank > 0) {
            PotonganBulanan header = new PotonganBulanan();
            header.setDeskripsi("PINJAMAN KOPERASI");
            header.setJumlah("0");
            listPotBul.add(header);

            if (rpKoperasi > 0) {
                PotonganBulanan p = new PotonganBulanan();
                p.setDeskripsi("Angsuran Koperasi\nPinjaman");
                p.setJumlah(formatter.format(rpKoperasi));
                listPotBul.add(p);
                subSum += rpKoperasi;
            }
            if (rpBank > 0) {
                PotonganBulanan p = new PotonganBulanan();
                p.setDeskripsi("Angsuran Bank\nPinjaman");
                p.setJumlah(formatter.format(rpBank));
                listPotBul.add(p);
                subSum += rpBank;
            }
            if (rpKpr > 0) {
                PotonganBulanan p = new PotonganBulanan();
                p.setDeskripsi("Angsuran KPR\nPinjaman");
                p.setJumlah(formatter.format(rpKpr));
                listPotBul.add(p);
                subSum += rpKpr;
            }
            if (rpAdminBank > 0) {
                PotonganBulanan p = new PotonganBulanan();
                p.setDeskripsi("Admin Bank\nBiaya Admin");
                p.setJumlah(formatter.format(rpAdminBank));
                listPotBul.add(p);
                subSum += rpAdminBank;
            }
        }
        return subSum;
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

    private void isTerdebet(String kdAnggota) {
        if (kdAnggota == null || kdAnggota.isEmpty()) {
            SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
            kdAnggota = prefs.getString("kdAnggota", "");
        }
        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET,
                Api.URL_GET_IS_TERDEBET + "&kdAnggota=" + kdAnggota,
                null, new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                try {
                    boolean terdebet = response.optBoolean("terdebet", false);
                    View cardStatus = findViewById(R.id.cardStatusPayroll);

                    if(terdebet) {
                        if (cardStatus != null) cardStatus.setBackgroundResource(R.drawable.bg_card_blue_light);
                        tvStatusTitle.setText("Selesai Payroll");
                        tvStatusTitle.setTextColor(Color.parseColor("#003B95"));
                        tvStatusSubtitle.setText("Potongan bulan ini sudah terdebet dari payroll.");
                        tvStatusSubtitle.setTextColor(Color.parseColor("#003B95"));
                        ImageView ivStatusIcon = findViewById(R.id.ivStatusIcon);
                        if (ivStatusIcon != null) {
                            ivStatusIcon.setImageResource(R.drawable.ic_verified_check);
                            ivStatusIcon.setColorFilter(Color.parseColor("#003B95"));
                        }
                    } else {
                        if (cardStatus != null) cardStatus.setBackgroundResource(R.drawable.bg_card_green_light);
                        tvStatusTitle.setText("Menunggu Payroll");
                        tvStatusTitle.setTextColor(Color.parseColor("#166534"));
                        tvStatusSubtitle.setText("Estimasi debet pada 25-28 bulan ini");
                        tvStatusSubtitle.setTextColor(Color.parseColor("#166534"));
                        ImageView ivStatusIcon = findViewById(R.id.ivStatusIcon);
                        if (ivStatusIcon != null) {
                            ivStatusIcon.setImageResource(R.drawable.ic_calendar_today);
                            ivStatusIcon.setColorFilter(Color.parseColor("#166534"));
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.e("Volley Error", error.getMessage() != null ? error.getMessage() : "Unknown error");
            }
        });

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }

    private void showHelpDialog() {
        BottomSheetDialog bottomSheetDialog = new BottomSheetDialog(this, R.style.BottomSheetDialogTheme);
        View view = getLayoutInflater().inflate(R.layout.layout_help_potongan, null);
        bottomSheetDialog.setContentView(view);

        view.findViewById(R.id.btnUnderstood).setOnClickListener(v -> bottomSheetDialog.dismiss());

        bottomSheetDialog.show();
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
