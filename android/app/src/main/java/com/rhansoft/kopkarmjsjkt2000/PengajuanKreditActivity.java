package com.rhansoft.kopkarmjsjkt2000;

import android.app.DatePickerDialog;
import android.app.Dialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.text.format.DateFormat;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.DatePicker;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.fragment.app.DialogFragment;

import com.android.volley.Request;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class PengajuanKreditActivity extends AppCompatActivity implements AdapterView.OnItemSelectedListener {

    private static EditText edtTglRealisasi;
    private EditText edtLamaPinjam, edtBesarPinjaman, edtKeterangan;
    private TextView txvJasa, tvUserInitial, tvStatusUser, tvRpGrade, tvEstimasiAngsuran;
    private Spinner spinJnsPinjaman;
    private ArrayList<JenisKredit> jenisKreditList;
    private ArrayList<SisaSaldoJenisKredit> sisaSaldoJenisKredits;
    private Button btnSimpan;
    private ImageView btnBack, btnNotification;
    private Boolean valid;

    private String kdAnggota, statusStaff, namaUser;
    private float rpGrade;

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
        
        setContentView(R.layout.activity_pengajuan_kredit);

        View customToolbar = findViewById(R.id.customToolbar);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (customToolbar != null) {
                customToolbar.setPadding(customToolbar.getPaddingLeft(), insets.top, customToolbar.getPaddingRight(), customToolbar.getPaddingBottom());
            }
            return windowInsets;
        });

        SharedPreferences sp = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        kdAnggota = sp.getString("kdAnggota", null);
        statusStaff = sp.getString("statusStaff", "No Staff");
        namaUser = sp.getString("nama", "User");
        
        try {
            rpGrade = sp.getFloat("rpGrade", 0f);
        } catch (ClassCastException e) {
            String val = sp.getString("rpGrade", "0");
            try {
                rpGrade = Float.parseFloat(val);
            } catch (Exception e2) {
                rpGrade = 0f;
            }
        }

        if (kdAnggota == null || kdAnggota.isEmpty()) {
            Toast.makeText(this, "Sesi habis, silakan login kembali", Toast.LENGTH_SHORT).show();
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

        btnBack = findViewById(R.id.btnBack);
        btnBack.setOnClickListener(v -> finish());
        
        btnNotification = findViewById(R.id.btnNotification);
        btnNotification.setOnClickListener(v -> {
             Intent i = new Intent(this, LogNotifikasiActivity.class);
             i.putExtra("kdAnggota", kdAnggota);
             startActivity(i);
        });

        tvUserInitial = findViewById(R.id.tvUserInitial);
        tvUserInitial.setText(getInitials(namaUser));

        tvStatusUser = findViewById(R.id.tvStatusUser);
        tvStatusUser.setText("Aktif • " + (statusStaff.equalsIgnoreCase("Staff") ? "Staff" : "Anggota"));

        tvRpGrade = findViewById(R.id.tvRpGrade);
        tvRpGrade.setText(formatRupiah(rpGrade));

        tvEstimasiAngsuran = findViewById(R.id.tvEstimasiAngsuran);

        edtTglRealisasi = findViewById(R.id.edtTglRealisasi);
        edtTglRealisasi.setText(DateFormat.format("dd/MM/yyyy", new Date().getTime()));
        edtTglRealisasi.setOnClickListener(view -> {
            DialogFragment newFragment = new DatePickerFragment();
            newFragment.show(getSupportFragmentManager(), "datePicker");
        });

        txvJasa = findViewById(R.id.txvJasa);
        jenisKreditList = new ArrayList<>();
        sisaSaldoJenisKredits = new ArrayList<>();

        spinJnsPinjaman = findViewById(R.id.spinJnsPinjaman);
        spinJnsPinjaman.setOnItemSelectedListener(this);

        edtLamaPinjam = findViewById(R.id.edtLamaPinjaman);
        edtBesarPinjaman = findViewById(R.id.edtBesarPinjaman);
        edtKeterangan = findViewById(R.id.edtKeterangan);
        btnSimpan = findViewById(R.id.btnSimpan);

        edtLamaPinjam.setText("12");
        edtBesarPinjaman.setText("0");

        TextWatcher calcWatcher = new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override
            public void afterTextChanged(Editable s) {
                calculateEstimasi();
            }
        };
        edtBesarPinjaman.addTextChangedListener(calcWatcher);
        edtLamaPinjam.addTextChangedListener(calcWatcher);

        fillSpinJnsPinjaman(statusStaff);
        getSisaSaldo(kdAnggota);

        btnSimpan.setOnClickListener(view -> {
            valid = true;
            if (spinJnsPinjaman.getSelectedItem() == null) return;
            
            JenisKredit selectedKredit = (JenisKredit) spinJnsPinjaman.getSelectedItem();

            if (selectedKredit.getKunciStaff().equals("1") && !statusStaff.equalsIgnoreCase("Staff")) {
                valid = false;
                spinJnsPinjaman.requestFocus();
                Toast.makeText(getApplicationContext(), "Pinjaman ini hanya untuk staff!", Toast.LENGTH_LONG).show();
            }

            if (selectedKredit.getKunciGrade().equals("1")) {
                double besarPinjaman = 0;
                try { besarPinjaman = Double.parseDouble(edtBesarPinjaman.getText().toString()); } catch (Exception e) {}
                if (besarPinjaman > rpGrade) {
                    valid = false;
                    edtBesarPinjaman.setError("Pinjaman ini tidak boleh melebihi grade!");
                    edtBesarPinjaman.requestFocus();
                }
            }

            if (selectedKredit.getKunciSaldo().equals("1") &&
                    isSisaSaldoExist(selectedKredit.getKodeKredit())) {
                valid = false;
                spinJnsPinjaman.requestFocus();
                Toast.makeText(getApplicationContext(),
                        "Silahkan selesaikan terlebih dahulu tagihan sebelumnya!", Toast.LENGTH_LONG).show();
            }

            if (valid && (edtLamaPinjam.getText().length() == 0 || Integer.parseInt(edtLamaPinjam.getText().toString()) == 0)) {
                edtLamaPinjam.setError("Lama pinjaman harus di isi!");
                edtLamaPinjam.requestFocus();
                valid = false;
            } else if (valid && selectedKredit.getMaxCicilan() < Integer.parseInt(edtLamaPinjam.getText().toString())) {
                edtLamaPinjam.setError("Tenor pinjaman tidak boleh melebihi " + selectedKredit.getMaxCicilan());
                edtLamaPinjam.requestFocus();
                valid = false;
            } else if (valid && (edtBesarPinjaman.getText().length() == 0 || Integer.parseInt(edtBesarPinjaman.getText().toString()) == 0)) {
                edtBesarPinjaman.setError("Besar pinjaman harus di isi!");
                edtBesarPinjaman.requestFocus();
                valid = false;
            }

            if (valid) {
                new AlertDialog.Builder(PengajuanKreditActivity.this)
                        .setTitle("Pengajuan Kredit")
                        .setMessage("Anda yakin data sudah benar? Lanjutkan?")
                        .setPositiveButton(android.R.string.yes, (dialogInterface, i) -> {
                            try {
                                SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy");
                                Date date = sdf.parse(edtTglRealisasi.getText().toString());
                                String tglRealisasi = new SimpleDateFormat("yyyy/MM/dd").format(date);

                                savePinjaman(
                                        tglRealisasi,
                                        selectedKredit.getKodeKredit(),
                                        txvJasa.getText().toString(),
                                        edtLamaPinjam.getText().toString(),
                                        edtBesarPinjaman.getText().toString(),
                                        edtKeterangan.getText().toString(),
                                        String.valueOf(selectedKredit.getPersenAdm()),
                                        String.valueOf(selectedKredit.getPersenProvisi()),
                                        String.valueOf(selectedKredit.getPersenDenda())
                                );
                            } catch (ParseException e) {
                                e.printStackTrace();
                            }
                        })
                        .setNegativeButton(android.R.string.no, null)
                        .show();
            }
        });
    }

    private void calculateEstimasi() {
        try {
            String sBesar = edtBesarPinjaman.getText().toString();
            String sTenor = edtLamaPinjam.getText().toString();
            String sJasa = txvJasa.getText().toString();
            
            if (sBesar.isEmpty() || sTenor.isEmpty() || sJasa.isEmpty()) {
                tvEstimasiAngsuran.setText("Rp 0");
                return;
            }

            double besarPinjaman = Double.parseDouble(sBesar);
            int tenor = Integer.parseInt(sTenor);
            double bungaPersen = Double.parseDouble(sJasa);

            if (tenor > 0) {
                double pokokPerBulan = besarPinjaman / tenor;
                double bungaPerBulan = (besarPinjaman * bungaPersen / 100);
                double totalAngsuran = pokokPerBulan + bungaPerBulan;
                tvEstimasiAngsuran.setText(formatRupiah(totalAngsuran));
            } else {
                tvEstimasiAngsuran.setText("Rp 0");
            }
        } catch (Exception e) {
            tvEstimasiAngsuran.setText("Rp 0");
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

    private String getInitials(String name) {
        if (name == null || name.isEmpty()) return "??";
        String[] parts = name.trim().split("\\s+");
        StringBuilder initials = new StringBuilder();
        for (int i = 0; i < Math.min(parts.length, 2); i++) {
            if (!parts[i].isEmpty()) {
                initials.append(parts[i].charAt(0));
            }
        }
        return initials.toString().toUpperCase();
    }

    private boolean isSisaSaldoExist(String kdKredit) {
        for (SisaSaldoJenisKredit item : sisaSaldoJenisKredits) {
            if (item.getKdKredit().equals(kdKredit)) return true;
        }
        return false;
    }

    private void getSisaSaldo(String kdAnggota) {
        JsonObjectRequest request = new JsonObjectRequest(Request.Method.GET,
                Api.URL_GET_SALDO_JENIS_PINJAMAN + "&kdAnggota=" + kdAnggota,
                null,
                response -> {
                    try {
                        JSONArray result = response.getJSONArray("saldo_pinjaman");
                        sisaSaldoJenisKredits.clear();
                        for (int i = 0; i < result.length(); i++) {
                            JSONObject obj = result.getJSONObject(i);
                            SisaSaldoJenisKredit ssjk = new SisaSaldoJenisKredit();
                            ssjk.setKdKredit(obj.getString("kode_kredit"));
                            ssjk.setSaldo(obj.getDouble("saldo"));
                            sisaSaldoJenisKredits.add(ssjk);
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                },
                error -> Log.e("Volley", error.toString())
        );
        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    private void fillSpinJnsPinjaman(String statusStaff) {
        String url = Api.URL_GET_JENIS_KREDIT + "&statusStaff=" + statusStaff;
        
        StringRequest request = new StringRequest(Request.Method.GET, url,
                response -> {
                    try {
                        JSONArray result = null;
                        if (response.trim().startsWith("[")) {
                            result = new JSONArray(response);
                        } else if (response.trim().startsWith("{")) {
                            JSONObject jsonObject = new JSONObject(response);
                            if (jsonObject.has("jenis_kredit")) {
                                result = jsonObject.getJSONArray("jenis_kredit");
                            }
                        }

                        if (result != null && result.length() > 0) {
                            jenisKreditList.clear();
                            for (int i = 0; i < result.length(); i++) {
                                JSONObject obj = result.getJSONObject(i);
                                JenisKredit jk = new JenisKredit();
                                jk.setKodeKredit(obj.optString("kd_kredit", ""));
                                jk.setNamaKredit(obj.optString("nm_kredit", ""));
                                jk.setBunga(obj.optDouble("bunga_kredit", 0));
                                jk.setKunciStaff(obj.optString("kunci_staff", "0"));
                                jk.setKunciGrade(obj.optString("kunci_grade", "0"));
                                jk.setKunciSaldo(obj.optString("kunci_saldo", "0"));
                                jk.setMaxCicilan(obj.optInt("max_cicilan", 12));
                                jk.setPersenAdm(obj.optDouble("persen_adm", 0));
                                jk.setPersenProvisi(obj.optDouble("persen_provisi", 0));
                                jk.setPersenDenda(obj.optDouble("persen_denda", 0));

                                if (jk.getKunciStaff().equals("1") && !statusStaff.equalsIgnoreCase("Staff")) {
                                    continue;
                                }
                                jenisKreditList.add(jk);
                            }

                            ArrayAdapter<JenisKredit> adapter = new ArrayAdapter<>(this,
                                    android.R.layout.simple_spinner_item, jenisKreditList);
                            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
                            spinJnsPinjaman.setAdapter(adapter);
                        }
                    } catch (JSONException e) {
                        Log.e("PARSING_ERROR", "Error: " + e.getMessage());
                    }
                },
                error -> {
                    Log.e("VOLLEY_ERROR", "Error: " + error.toString());
                }
        );

        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    private void savePinjaman(String tglRealisasi, String kdKredit, String persenBunga,
                              String lamaAngsuran, String rpPinjamanPokok, String keterangan,
                              String persenAdm, String persenProvisi, String persenDenda) {

        final Map<String, String> params = new HashMap<>();
        params.put("tglRealisasi", tglRealisasi);
        params.put("kdAnggota", kdAnggota);
        params.put("kdKredit", kdKredit);
        params.put("persenBunga", persenBunga);
        params.put("lamaAngsuran", lamaAngsuran);
        params.put("rpPinjamanPokok", rpPinjamanPokok);
        params.put("keterangan", keterangan);
        params.put("persenAdm", persenAdm);
        params.put("persenProvisi", persenProvisi);
        params.put("persenDenda", persenDenda);

        StringRequest request = new StringRequest(Request.Method.POST,
                Api.URL_CREATE_PINJAMAN,
                response -> {
                    try {
                        JSONObject json = new JSONObject(response);
                        Toast.makeText(this, json.getString("message"), Toast.LENGTH_LONG).show();

                        edtTglRealisasi.setText(DateFormat.format("dd/MM/yyyy", new Date().getTime()));
                        spinJnsPinjaman.setSelection(0);
                        txvJasa.setText("");
                        edtLamaPinjam.setText("12");
                        edtBesarPinjaman.setText("0");
                        edtKeterangan.setText("");
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                },
                error -> {
                    Log.e("Volley", error.toString());
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                }) {
            @Override
            protected Map<String, String> getParams() {
                return params;
            }
        };

        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    @Override
    public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
        txvJasa.setText(String.valueOf(jenisKreditList.get(position).getBunga()));
        calculateEstimasi();
    }

    @Override
    public void onNothingSelected(AdapterView<?> parent) {}

    public static class DatePickerFragment extends DialogFragment implements DatePickerDialog.OnDateSetListener {
        @NonNull
        @Override
        public Dialog onCreateDialog(Bundle savedInstanceState) {
            final Calendar c = Calendar.getInstance();
            int year = c.get(Calendar.YEAR);
            int month = c.get(Calendar.MONTH);
            int day = c.get(Calendar.DAY_OF_MONTH);
            return new DatePickerDialog(getActivity(), this, year, month, day);
        }

        @Override
        public void onDateSet(DatePicker view, int year, int month, int day) {
            month = month + 1;
            edtTglRealisasi.setText(day + "/" + month + "/" + year);
        }
    }

    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}
