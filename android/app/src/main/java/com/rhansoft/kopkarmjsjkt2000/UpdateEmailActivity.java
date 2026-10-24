package com.rhansoft.kopkarmjsjkt2000;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.android.volley.Request;
import com.android.volley.toolbox.StringRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class UpdateEmailActivity extends AppCompatActivity {
    private EditText edtEmail;
    private ProgressBar progressBar;
    private String kdAnggota;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);

            new WindowInsetsControllerCompat(window, window.getDecorView())
                    .setAppearanceLightStatusBars(true);
        }

        setContentView(R.layout.activity_update_email);

        edtEmail = findViewById(R.id.editEmail);
        progressBar = findViewById(R.id.progressBar);

        SharedPreferences prefs = getSharedPreferences("loginPrefs", MODE_PRIVATE);
        kdAnggota = prefs.getString("kdAnggota", "");

        findViewById(R.id.btnSaveEmail).setOnClickListener(v -> {
            String email = edtEmail.getText().toString().trim();
            if (email.isEmpty()) {
                edtEmail.setError("Email required");
                return;
            }
            if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                edtEmail.setError("Invalid email format");
                return;
            }
            saveEmail(email);
        });
    }

    private void saveEmail(String email) {
        progressBar.setVisibility(View.VISIBLE);
        
        StringRequest request = new StringRequest(Request.Method.POST, Api.URL_UPDATE_EMAIL,
                response -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        JSONObject res = new JSONObject(response);
                        if (!res.optBoolean("error", true)) {
                            SharedPreferences.Editor editor = getSharedPreferences("loginPrefs", MODE_PRIVATE).edit();
                            editor.putString("email", email);
                            editor.apply();
                            
                            Toast.makeText(this, res.optString("message", "Email updated and verification sent!"), Toast.LENGTH_LONG).show();
                            startActivity(new Intent(this, MainActivity.class));
                            finish();
                        } else {
                            Toast.makeText(this, res.optString("message", "Failed to update email"), Toast.LENGTH_SHORT).show();
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                },
                error -> {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(this, "Connection error", Toast.LENGTH_SHORT).show();
                }
        ) {
            @Override
            protected Map<String, String> getParams() {
                Map<String, String> params = new HashMap<>();
                params.put("kdAnggota", kdAnggota);
                params.put("email", email);
                return params;
            }
        };

        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }
}
