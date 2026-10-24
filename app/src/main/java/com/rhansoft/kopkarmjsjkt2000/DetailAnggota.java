package com.rhansoft.kopkarmjsjkt2000;

import android.Manifest;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.android.volley.Request;
import com.android.volley.NetworkResponse;
import com.android.volley.toolbox.HttpHeaderParser;
import com.android.volley.toolbox.StringRequest;
import com.bumptech.glide.Glide;
import com.google.android.material.imageview.ShapeableImageView;
import com.google.android.material.tabs.TabLayout;
import com.google.android.material.textfield.TextInputEditText;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.NavigationHelper;
import com.rhansoft.kopkarmjsjkt2000.util.VolleyMultipartRequest;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.DecimalFormat;
import java.util.HashMap;
import java.util.Map;

public class DetailAnggota extends AppCompatActivity {

    private ShapeableImageView imgProfileDetail;
    private TextView txvNama, txvStatusId, txvGrade, txvLamaAnggota;
    private ProgressBar progressBar;
    private View layoutHeader, bottomNav;
    private TextInputEditText edtPasswordLama, edtPasswordBaru, edtPasswordKonfirmasi;
    
    private static final int PICK_IMAGE_REQUEST = 1;
    private static final int CAMERA_REQUEST = 2;
    private static final int PERMISSION_REQUEST_CODE = 100;
    private Bitmap bitmap;
    private String kdAnggota;
    private Uri cameraImageUri;

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
        
        setContentView(R.layout.activity_detail_anggota);

        // Hide ActionBar for modern look
        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }
        
        // Initialize Views
        layoutHeader = findViewById(R.id.layoutHeader);
        bottomNav = findViewById(R.id.bottomNav);

        // Apply Insets
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            if (layoutHeader != null) {
                layoutHeader.setPadding(layoutHeader.getPaddingLeft(), insets.top, layoutHeader.getPaddingRight(), layoutHeader.getPaddingBottom());
            }
            return windowInsets;
        });

        imgProfileDetail = findViewById(R.id.imgProfileDetail);
        txvNama = findViewById(R.id.txvNama);
        txvStatusId = findViewById(R.id.txvStatusId);
        txvGrade = findViewById(R.id.txvGrade);
        txvLamaAnggota = findViewById(R.id.txvLamaAnggota);
        
        progressBar = findViewById(R.id.progressBar);

        edtPasswordLama = findViewById(R.id.edtPasswordLama);
        edtPasswordBaru = findViewById(R.id.edtPasswordBaru);
        edtPasswordKonfirmasi = findViewById(R.id.edtPasswordKonfirmasi);

        // Setup Footer
        NavigationHelper.setupFooter(this);

        SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        StringExtraHelper s = new StringExtraHelper();
        kdAnggota = s.get("kdAnggota");

        // Set Data
        txvNama.setText(s.get("nama"));
        txvStatusId.setText("ANGGOTA AKTIF • ID: " + kdAnggota);
        txvGrade.setText(s.get("grade") + " Tier");
        txvLamaAnggota.setText("5 Tahun");

        // Load Profile Image
        String foto = prefs.getString("foto", s.get("foto"));
        if (foto != null && !foto.isEmpty() && !foto.equals("no_image.jpg")) {
            String imageUrl = Api.IMAGE_PATH + foto;
            Glide.with(this)
                    .load(imageUrl)
                    .placeholder(R.drawable.icon_user)
                    .error(R.drawable.icon_user)
                    .into(imgProfileDetail);
        }

        // Header Buttons
        findViewById(R.id.btnHelp).setOnClickListener(v -> Toast.makeText(this, "Bantuan segera hadir", Toast.LENGTH_SHORT).show());
        findViewById(R.id.btnNotification).setOnClickListener(v -> {
            Intent intent = new Intent(this, LogNotifikasiActivity.class);
            intent.putExtra("kdAnggota", kdAnggota);
            startActivity(intent);
        });
        findViewById(R.id.btnLogoutHeader).setOnClickListener(v -> logout());

        // Simpan Password
        findViewById(R.id.btnSimpanPassword).setOnClickListener(v -> updatePassword());

        // Logout
        findViewById(R.id.btnLogout).setOnClickListener(v -> logout());

        // Bottom Navigation Click Listeners are handled by NavigationHelper.setupFooter(this)

        // Update Profile (Click on Image)
        imgProfileDetail.setOnClickListener(v -> showImageSourceDialog());
    }

    private void logout() {
        SharedPreferences.Editor editor = getSharedPreferences("loginPrefs", MODE_PRIVATE).edit();
        editor.clear();
        editor.apply();
        
        // Reset caches
        HistoryActivity.clearCache();
        LogNotifikasiActivity.clearInboxCache();
        SimpananRinciActivity.clearSimpananCache();

        Intent intent = new Intent(DetailAnggota.this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void updatePassword() {
        String passLama = edtPasswordLama.getText().toString().trim();
        String passBaru = edtPasswordBaru.getText().toString().trim();
        String passKonf = edtPasswordKonfirmasi.getText().toString().trim();

        SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        String username = prefs.getString("username_login", "");

        if (username.isEmpty()) {
            Toast.makeText(this, "Identitas user tidak ditemukan. Silakan login ulang.", Toast.LENGTH_LONG).show();
            return;
        }

        if (passLama.isEmpty()) {
            edtPasswordLama.setError("Password lama tidak boleh kosong");
            edtPasswordLama.requestFocus();
            return;
        }
        if (passBaru.isEmpty()) {
            edtPasswordBaru.setError("Password baru tidak boleh kosong");
            edtPasswordBaru.requestFocus();
            return;
        }
        // Aturan sama dengan server (cekPasswordBaruAnggota): minimal 8 karakter, berisi huruf dan angka.
        if (passBaru.length() < 8) {
            edtPasswordBaru.setError("Password minimal 8 karakter");
            edtPasswordBaru.requestFocus();
            return;
        }
        if (!passBaru.matches(".*[A-Za-z].*") || !passBaru.matches(".*\\d.*")) {
            edtPasswordBaru.setError("Password harus berisi huruf dan angka");
            edtPasswordBaru.requestFocus();
            return;
        }
        if (!passBaru.equals(passKonf)) {
            edtPasswordKonfirmasi.setError("Konfirmasi password tidak cocok");
            edtPasswordKonfirmasi.requestFocus();
            return;
        }

        if (progressBar != null) progressBar.setVisibility(View.VISIBLE);

        StringRequest stringRequest = new StringRequest(Request.Method.POST, Api.URL_UPDATE_USER_PASSWORD,
                response -> {
                    if (progressBar != null) progressBar.setVisibility(View.GONE);
                    try {
                        JSONObject jsonObject = new JSONObject(response);
                        if (!jsonObject.optBoolean("error", true)) {
                            // Token lama tidak berlaku setelah password diganti; server mengirim token baru untuk HP ini.
                            String tokenBaru = jsonObject.optString("api_token", "");
                            if (!tokenBaru.isEmpty()) {
                                getSharedPreferences("loginPrefs", MODE_PRIVATE).edit().putString("api_token", tokenBaru).apply();
                            }
                            Toast.makeText(this, "Kata sandi berhasil diperbarui", Toast.LENGTH_SHORT).show();
                            edtPasswordLama.setText("");
                            edtPasswordBaru.setText("");
                            edtPasswordKonfirmasi.setText("");
                        } else {
                            Toast.makeText(this, jsonObject.optString("message", "Gagal memperbarui kata sandi"), Toast.LENGTH_SHORT).show();
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                        Toast.makeText(this, "Respon server tidak valid", Toast.LENGTH_SHORT).show();
                    }
                },
                error -> {
                    if (progressBar != null) progressBar.setVisibility(View.GONE);
                    Toast.makeText(this, "Error: " + error.getMessage(), Toast.LENGTH_SHORT).show();
                }) {
            @Override
            protected Map<String, String> getParams() {
                Map<String, String> params = new HashMap<>();
                params.put("username", username);
                params.put("password", passBaru);
                params.put("password_lama", passLama);
                return params;
            }
        };

        VolleySingleton.getInstance(this).addToRequestQueue(stringRequest);
    }

    private void showImageSourceDialog() {
        String[] options = {"Ambil dari Kamera", "Pilih dari Galeri"};
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Pilih Sumber Foto");
        builder.setItems(options, (dialog, which) -> {
            if (which == 0) {
                checkPermissionAndOpenCamera();
            } else {
                checkPermissionAndOpenGallery();
            }
        });
        builder.show();
    }

    private void checkPermissionAndOpenCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, PERMISSION_REQUEST_CODE);
        } else {
            openCamera();
        }
    }

    private void checkPermissionAndOpenGallery() {
        openGallery();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted, you might need to check which one if multiple were requested
                Toast.makeText(this, "Izin diberikan", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Izin ditolak", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void openCamera() {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        // On Android 11+ resolveActivity might return null if not declared in <queries>
        // But since we are using ACTION_IMAGE_CAPTURE, we can often just try-catch or rely on the query declaration
        try {
            java.io.File photoFile = createImageFile();
            if (photoFile != null) {
                cameraImageUri = FileProvider.getUriForFile(this,
                        getApplicationContext().getPackageName() + ".provider",
                        photoFile);
                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
                // Grant URI permissions for older devices
                takePictureIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                startActivityForResult(takePictureIntent, CAMERA_REQUEST);
            }
        } catch (java.io.IOException ex) {
            ex.printStackTrace();
            Toast.makeText(this, "Gagal membuat file gambar", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "Tidak dapat membuka kamera", Toast.LENGTH_SHORT).show();
        }
    }

    private java.io.File createImageFile() throws java.io.IOException {
        String timeStamp = new java.text.SimpleDateFormat("yyyyMMdd_HHmmss").format(new java.util.Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        java.io.File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return java.io.File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    private void openGallery() {
        Intent intent = new Intent();
        intent.setType("image/*");
        intent.setAction(Intent.ACTION_GET_CONTENT);
        startActivityForResult(Intent.createChooser(intent, "Pilih Foto Profil"), PICK_IMAGE_REQUEST);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode == RESULT_OK) {
            if (requestCode == PICK_IMAGE_REQUEST && data != null && data.getData() != null) {
                Uri filePath = data.getData();
                try {
                    bitmap = MediaStore.Images.Media.getBitmap(getContentResolver(), filePath);
                    // Use a helper to scale down if needed to prevent OutOfMemory
                    bitmap = getResizedBitmap(bitmap, 800);
                    imgProfileDetail.setImageBitmap(bitmap);
                    uploadImage();
                } catch (IOException e) {
                    e.printStackTrace();
                    Toast.makeText(this, "Gagal memproses gambar", Toast.LENGTH_SHORT).show();
                }
            } else if (requestCode == CAMERA_REQUEST) {
                try {
                    if (cameraImageUri != null) {
                        bitmap = BitmapFactory.decodeStream(getContentResolver().openInputStream(cameraImageUri));
                        if (bitmap != null) {
                            bitmap = getResizedBitmap(bitmap, 800);
                            imgProfileDetail.setImageBitmap(bitmap);
                            uploadImage();
                        } else {
                            Toast.makeText(this, "Gagal mengambil gambar dari kamera", Toast.LENGTH_SHORT).show();
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        }
    }

    public Bitmap getResizedBitmap(Bitmap image, int maxSize) {
        int width = image.getWidth();
        int height = image.getHeight();

        // Potong gambar menjadi kotak (1:1) dari tengah
        int dimension = Math.min(width, height);
        int x = (width - dimension) / 2;
        int y = (height - dimension) / 2;
        Bitmap croppedBitmap = Bitmap.createBitmap(image, x, y, dimension, dimension);

        // Resize ke ukuran maksimal (maxSize x maxSize)
        return Bitmap.createScaledBitmap(croppedBitmap, maxSize, maxSize, true);
    }

    public byte[] getFileDataFromDrawable(Bitmap bitmap) {
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        // Gunakan kualitas 100 agar gambar tetap asli/tajam
        bitmap.compress(Bitmap.CompressFormat.JPEG, 100, byteArrayOutputStream);
        return byteArrayOutputStream.toByteArray();
    }

    private void uploadImage() {
        if (progressBar != null) progressBar.setVisibility(View.VISIBLE);

        VolleyMultipartRequest volleyMultipartRequest = new VolleyMultipartRequest(Request.Method.POST, Api.URL_UPDATE_PROFILE,
                response -> {
                    if (progressBar != null) progressBar.setVisibility(View.GONE);
                    try {
                        String resultResponse = new String(response.data);
                        JSONObject jsonObject = new JSONObject(resultResponse);
                        Toast.makeText(DetailAnggota.this, jsonObject.optString("message", "Response received"), Toast.LENGTH_SHORT).show();
                        if (jsonObject.optBoolean("success", false)) {
                            // Update local SharedPreferences if needed
                            String newFoto = jsonObject.optString("foto", "");
                            if (!newFoto.isEmpty()) {
                                SharedPreferences.Editor editor = getSharedPreferences("loginPrefs", MODE_PRIVATE).edit();
                                editor.putString("foto", newFoto);
                                editor.apply();

                                // Update current view images
                                String imageUrl = Api.IMAGE_PATH + newFoto;
                                Glide.with(DetailAnggota.this)
                                        .load(imageUrl)
                                        .placeholder(R.drawable.icon_user)
                                        .error(R.drawable.icon_user)
                                        .into(imgProfileDetail);
                            }
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                        Toast.makeText(DetailAnggota.this, "Error parsing response", Toast.LENGTH_SHORT).show();
                    }
                },
                error -> {
                    if (progressBar != null) progressBar.setVisibility(View.GONE);
                    Toast.makeText(DetailAnggota.this, "Gagal upload: " + error.getMessage(), Toast.LENGTH_SHORT).show();
                }) {
            @Override
            protected Map<String, String> getParams() {
                Map<String, String> params = new HashMap<>();
                params.put("apicall", "updateprofile");
                params.put("kdAnggota", kdAnggota);
                return params;
            }

            @Override
            protected Map<String, DataPart> getByteData() {
                Map<String, DataPart> params = new HashMap<>();
                long imagename = System.currentTimeMillis();
                params.put("foto", new DataPart(imagename + ".jpg", getFileDataFromDrawable(bitmap)));
                return params;
            }
        };

        VolleySingleton.getInstance(this).addToRequestQueue(volleyMultipartRequest);
    }

    private class StringExtraHelper {
        public String get(String key) {
            String val = getIntent().getStringExtra(key);
            return (val != null) ? val : "";
        }
    }

    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}
