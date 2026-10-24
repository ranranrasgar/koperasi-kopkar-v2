package com.rhansoft.kopkarmjsjkt2000;

import android.content.SharedPreferences;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.widget.*;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.android.volley.Request;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.google.firebase.messaging.FirebaseMessaging;
import com.rhansoft.kopkarmjsjkt2000.notifikasi.Constants;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.*;

public class LoginActivity extends AppCompatActivity {

    private EditText editNIK, editPassword, editPassword2, editName, editJawaban;
    private Spinner spinPertanyaan;
    private Button btnSignIn;
    private View btnRegister, btnSecurityReset, btnBackToLogin, layoutRegisterPrompt;
    private ProgressBar progressBar;
    private ArrayList<Pertanyaan> daftarPertanyaan;

    private int i = 0; // 0 = login, 1 = register
    private String firebaseToken = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);

            new androidx.core.view.WindowInsetsControllerCompat(window, window.getDecorView())
                    .setAppearanceLightStatusBars(true);
        }

        setContentView(R.layout.activity_login);

        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                firebaseToken = task.getResult();
            }
        });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager mNotificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel mChannel = new NotificationChannel(Constants.CHANNEL_ID, Constants.CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
            mChannel.setDescription(Constants.CHANNEL_DESCRIPTION);
            mChannel.enableLights(true);
            mChannel.setLightColor(Color.RED);
            mChannel.enableVibration(true);
            mNotificationManager.createNotificationChannel(mChannel);
        }

        editNIK = findViewById(R.id.editNIK);
        editName = findViewById(R.id.editName);
        editPassword = findViewById(R.id.editPassword);
        editPassword2 = findViewById(R.id.editPassword2);
        editJawaban = findViewById(R.id.editJawaban);
        btnSignIn = findViewById(R.id.btnSignIn);
        btnRegister = findViewById(R.id.btnRegister);
        btnSecurityReset = findViewById(R.id.btnSecurityReset);
        btnBackToLogin = findViewById(R.id.btnBackToLogin);
        layoutRegisterPrompt = findViewById(R.id.layoutRegisterPrompt);
        progressBar = findViewById(R.id.progressBar);
        spinPertanyaan = findViewById(R.id.spinPertanyaan);
        daftarPertanyaan = new ArrayList<>();

        if (btnBackToLogin != null) {
            btnBackToLogin.setOnClickListener(v -> switchToLoginMode());
        }

        setupPasswordToggle(editPassword);
        setupPasswordToggle(editPassword2);

        btnSignIn.setOnClickListener(view -> {
            if (i == 0) {
                // Login Submit
                String username = editName.getText().toString().trim();
                String password = editPassword.getText().toString().trim();

                if (username.isEmpty() || password.isEmpty()) {
                    Toast.makeText(this, "Username dan Password harus diisi", Toast.LENGTH_SHORT).show();
                    return;
                }

                progressBar.setVisibility(View.VISIBLE);
                sendRequest(username, password, "", "", "", firebaseToken);
            } else {
                // Register Submit
                String username = editName.getText().toString().trim();
                String password = editPassword.getText().toString().trim();
                String pass2 = editPassword2.getText().toString().trim();
                String nik = editNIK.getText().toString().trim();

                if (username.isEmpty() || password.isEmpty()) {
                    Toast.makeText(this, "Username dan Password harus diisi", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (!pass2.equals(password)) {
                    Toast.makeText(this, "Konfirmasi Password tidak cocok", Toast.LENGTH_LONG).show();
                    return;
                }

                progressBar.setVisibility(View.VISIBLE);
                sendRequest(
                        username,
                        password,
                        nik,
                        String.valueOf(((Pertanyaan) spinPertanyaan.getSelectedItem()).getIdPertanyaan()),
                        editJawaban.getText().toString().trim(),
                        firebaseToken
                );
            }
        });

        // Pendaftaran akun mengikuti aplikasi web anggota (email wajib dan diverifikasi, lalu disetujui admin koperasi);
        // server tidak lagi menerima formulir daftar lama (NIK + pertanyaan keamanan).
        if (btnRegister != null) {
            btnRegister.setOnClickListener(view -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(Api.PWA_URL + "/daftar")));
                } catch (android.content.ActivityNotFoundException e) {
                    Toast.makeText(this, "Buka " + Api.PWA_URL + "/daftar di browser untuk mendaftar", Toast.LENGTH_LONG).show();
                }
            });
        }

        if (btnSecurityReset != null) {
            btnSecurityReset.setOnClickListener(v -> onClickLupaPassword(v));
        }

        fillSpinPertanyaan();

        getOnBackPressedDispatcher().addCallback(this, new androidx.activity.OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (i == 1) {
                    switchToLoginMode();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }

    private void switchToRegisterMode() {
        i = 1;
        if (btnSignIn != null) {
            btnSignIn.setText("Daftar Akun");
        }
        if (editPassword2 != null) editPassword2.setVisibility(View.VISIBLE);
        if (editNIK != null) editNIK.setVisibility(View.VISIBLE);
        if (spinPertanyaan != null) spinPertanyaan.setVisibility(View.VISIBLE);
        if (editJawaban != null) editJawaban.setVisibility(View.VISIBLE);

        if (layoutRegisterPrompt != null) layoutRegisterPrompt.setVisibility(View.GONE);
        if (btnSecurityReset != null) btnSecurityReset.setVisibility(View.GONE);
        if (btnBackToLogin != null) btnBackToLogin.setVisibility(View.VISIBLE);
    }

    private void switchToLoginMode() {
        i = 0;
        if (btnSignIn != null) {
            btnSignIn.setText("Masuk");
            btnSignIn.setVisibility(View.VISIBLE);
        }
        if (editPassword2 != null) editPassword2.setVisibility(View.GONE);
        if (editNIK != null) editNIK.setVisibility(View.GONE);
        if (spinPertanyaan != null) spinPertanyaan.setVisibility(View.GONE);
        if (editJawaban != null) editJawaban.setVisibility(View.GONE);

        if (layoutRegisterPrompt != null) layoutRegisterPrompt.setVisibility(View.VISIBLE);
        if (btnSecurityReset != null) btnSecurityReset.setVisibility(View.VISIBLE);
        if (btnBackToLogin != null) btnBackToLogin.setVisibility(View.GONE);
    }

    private void setupPasswordToggle(EditText passwordField) {
        Drawable eyeOpen = ContextCompat.getDrawable(this, R.drawable.ic_passon);
        Drawable eyeClosed = ContextCompat.getDrawable(this, R.drawable.ic_passoff);
        Drawable iconLock = ContextCompat.getDrawable(this, R.drawable.ic_password);

        passwordField.setCompoundDrawablesWithIntrinsicBounds(iconLock, null, eyeClosed, null);
        passwordField.setOnTouchListener((v, event) -> {
            final int DRAWABLE_RIGHT = 2;
            if (event.getAction() == MotionEvent.ACTION_UP) {
                if (event.getRawX() >= (passwordField.getRight() - passwordField.getCompoundDrawables()[DRAWABLE_RIGHT].getBounds().width())) {
                    if (passwordField.getInputType() == (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD)) {
                        passwordField.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
                        passwordField.setCompoundDrawablesWithIntrinsicBounds(iconLock, null, eyeOpen, null);
                    } else {
                        passwordField.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                        passwordField.setCompoundDrawablesWithIntrinsicBounds(iconLock, null, eyeClosed, null);
                    }
                    passwordField.setSelection(passwordField.getText().length());
                    return true;
                }
            }
            return false;
        });
    }

    private void sendRequest(String name, String password, String nik, String idPertanyaan, String jawaban, String token) {
        Map<String, String> params = new HashMap<>();
        params.put("username", name);
        params.put("password", password);
        if (!nik.isEmpty()) params.put("nik", nik);
        params.put("idPertanyaan", idPertanyaan);
        params.put("jawaban", jawaban);
        params.put("token", token);

        StringRequest request = new StringRequest(Request.Method.POST, Api.URL_LOGIN,
                response -> {
                    Log.d("LoginRawResponse", response);
                    progressBar.setVisibility(View.GONE);
                    try {
                        JSONObject res = new JSONObject(response);
                        if (res.optBoolean("success", false)) {
                            if (res.isNull("anggota")) {
                                Toast.makeText(this, "Login berhasil, tapi data profil tidak ditemukan. Hubungi Admin.", Toast.LENGTH_LONG).show();
                                return;
                            }
                            JSONObject data = res.getJSONObject("anggota");
                            Log.d("LoginResponse", data.toString());

                            SharedPreferences.Editor editor = getSharedPreferences("loginPrefs", MODE_PRIVATE).edit();
                            
                            // Simpan username dari database (field yang baru ditambahkan di backend)
                            String kdAgt = data.optString("kode_agt", "");
                            if (kdAgt.isEmpty()) kdAgt = data.optString("KODE_AGT", "");
                            if (kdAgt.isEmpty()) kdAgt = data.optString("nik", "");
                            if (kdAgt.isEmpty()) kdAgt = data.optString("NIK", "");

                            editor.putString("username_login", data.optString("username", ""));
                            editor.putString("kdAnggota", kdAgt);
                            editor.putString("nama", data.optString("nama", ""));
                            editor.putString("statusStaff", data.optString("status_staff", ""));
                            editor.putString("tglpencatatan", data.optString("tglpencatatan", ""));
                            editor.putString("nik", data.optString("nik", ""));
                            editor.putString("jns_kelamin", data.optString("jns_kelamin", ""));
                            editor.putString("alamat", data.optString("alamat", ""));
                            editor.putString("kota", data.optString("kota", ""));
                            editor.putString("kode_pos", data.optString("kodepos", ""));
                            editor.putString("tlp_rumah", data.optString("telp_rmh", ""));
                            editor.putString("hp", data.optString("hp", ""));
                            editor.putString("status", data.optString("status", ""));
                            editor.putString("statusStaff", data.optString("status_staff", ""));
                            editor.putString("nama_istri_suami", data.optString("nama_istri_suami", ""));
                            editor.putString("jml_tanggungan", data.optString("jml_tanggungan", ""));
                            editor.putString("jml_anak", data.optString("jml_anak", ""));
                            editor.putString("agt_non_agt", data.optString("agt_non_agt", ""));
                            editor.putString("grade", data.optString("grade", ""));
                            editor.putString("pekerjaan", data.optString("pekerjaan", ""));
                            editor.putString("alamat_kerja", data.optString("alamat_kerja", ""));
                            editor.putString("nama_perusahaan", data.optString("nama_perusahaan", ""));
                            editor.putString("jabatan", data.optString("jabatan", ""));
                            editor.putString("bank_no_rek", data.optString("bank_no_rek", ""));
                            editor.putString("bank_nama", data.optString("bank_nama", ""));
                            editor.putString("bank_atas_nama", data.optString("bank_atas_nama", ""));
                            
                            // Check if email is missing
                            String email = data.optString("email", "");
                            editor.putString("email", email);

                            // Ambil foto dari field 'foto' yang baru ditambahkan di backend
                            editor.putString("foto", data.optString("foto", "no_image.jpg"));

                            // Token login: dikirim VolleySingleton di setiap permintaan (Authorization: Bearer).
                            editor.putString("api_token", res.optString("api_token", ""));

                            // Parsing Angka agar tidak ClassCastException
                            try {
                                editor.putFloat("rpGrade", Float.parseFloat(data.optString("rp_grade", "0")));
                                editor.putFloat("simpanan_pokok", Float.parseFloat(data.optString("simpanan_pokok", "0")));
                                editor.putFloat("simpanan_wajib", Float.parseFloat(data.optString("simpanan_wajib", "0")));
                                editor.putFloat("simpanan_sukarela", Float.parseFloat(data.optString("simpanan_sukarela", "0")));
                            } catch (Exception e) {
                                Log.e("Login", "Error parsing numeric fields");
                            }

                            editor.apply();

                            if (email == null || email.isEmpty() || email.equals("null") || email.length() < 5) {
                                // User must update email first
                                Intent intent = new Intent(this, UpdateEmailActivity.class);
                                startActivity(intent);
                            } else {
                                Intent intent = new Intent(this, MainActivity.class);
                                startActivity(intent);
                            }
                            finish();
                        } else {
                            Toast.makeText(this, res.getString("message"), Toast.LENGTH_LONG).show();
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                        Toast.makeText(this, "Gagal parsing respon", Toast.LENGTH_SHORT).show();
                    }
                },
                error -> {
                    progressBar.setVisibility(View.GONE);
                    String errorMsg = "Koneksi gagal";
                    if (error.networkResponse != null) {
                        errorMsg += " (Status: " + error.networkResponse.statusCode + ")";
                    } else if (error.getMessage() != null) {
                        errorMsg += ": " + error.getMessage();
                    } else {
                        errorMsg += ": Masalah jaringan atau server tidak merespon";
                    }
                    Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show();
                    Log.e("LoginError", "Error: ", error);
                }
        ) {
            @Override
            protected Map<String, String> getParams() {
                return params;
            }
        };

        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    private void fillSpinPertanyaan() {
        JsonObjectRequest request = new JsonObjectRequest(Request.Method.GET, Api.URL_GET_PERTANYAAN, null,
                response -> {
                    try {
                        JSONArray result = response.getJSONArray("pertanyaan");
                        for (int i = 0; i < result.length(); i++) {
                            JSONObject obj = result.getJSONObject(i);
                            Pertanyaan p = new Pertanyaan();
                            p.setIdPertanyaan(obj.getInt("id_pertanyaan"));
                            p.setPertanyaan(obj.getString("pertanyaan"));
                            daftarPertanyaan.add(p);
                        }
                        ArrayAdapter<Pertanyaan> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, daftarPertanyaan);
                        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
                        spinPertanyaan.setAdapter(adapter);
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                },
                error -> Log.e("Volley", "Gagal load pertanyaan: " + error.getMessage())
        );

        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }

    public void onClickLupaPassword(View v) {
        startActivity(new Intent(this, LupaPasswordActivity.class));
    }
}
