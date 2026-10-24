package com.rhansoft.kopkarmjsjkt2000;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;

import com.android.volley.Request;
import com.android.volley.toolbox.JsonObjectRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONObject;

public class LupaPasswordActivity extends AppCompatActivity {
    private EditText edtUserName, edtEmail;
    private View layoutStep1, layoutStep2;
    private TextView tvVerificationSentDesc;
    private ProgressBar progressBar;

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

        setContentView(R.layout.activity_lupa_password);

        edtUserName = findViewById(R.id.editUserName);
        edtEmail = findViewById(R.id.editEmail);
        layoutStep1 = findViewById(R.id.layoutStep1);
        layoutStep2 = findViewById(R.id.layoutStep2);
        tvVerificationSentDesc = findViewById(R.id.tvVerificationSentDesc);
        progressBar = findViewById(R.id.progressBar);

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnBackToLogin).setOnClickListener(v -> finish());
        findViewById(R.id.btnBackToLogin2).setOnClickListener(v -> finish());

        findViewById(R.id.btnResetPassword).setOnClickListener(v -> {
            String username = edtUserName.getText().toString().trim();
            String email = edtEmail.getText().toString().trim();

            if (username.isEmpty()) {
                edtUserName.setError("Username required");
                return;
            }
            if (email.isEmpty()) {
                edtEmail.setError("Email required");
                return;
            }

            sendVerificationLink(username, email);
        });

        findViewById(R.id.btnOpenEmail).setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_APP_EMAIL);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                startActivity(intent);
            } catch (Exception e) {
                Toast.makeText(this, "Email app not found", Toast.LENGTH_SHORT).show();
            }
        });

        findViewById(R.id.btnResend).setOnClickListener(v -> {
            sendVerificationLink(edtUserName.getText().toString(), edtEmail.getText().toString());
        });
    }

    private void sendVerificationLink(String username, String email) {
        progressBar.setVisibility(View.VISIBLE);
        // Assuming Api.php?apicall=isuserexist handles both username and email now for password reset
        String url = Api.URL_IS_USER_EXIST + "&username=" + username + "&email=" + email;

        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET, url, null,
                response -> {
                    progressBar.setVisibility(View.GONE);
                    if (!response.optBoolean("error", true)) {
                        showSuccessStep(email);
                    } else {
                        String message = response.optString("message", "Username or Email not registered.");
                        Toast.makeText(getApplicationContext(), message, Toast.LENGTH_LONG).show();
                    }
                },
                error -> {
                    progressBar.setVisibility(View.GONE);
                    Log.e("Volley Error", error.toString());
                    Toast.makeText(getApplicationContext(), "Connection error.", Toast.LENGTH_SHORT).show();
                });

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }

    private void showSuccessStep(String email) {
        layoutStep1.setVisibility(View.GONE);
        layoutStep2.setVisibility(View.VISIBLE);
        tvVerificationSentDesc.setText("We have sent a password reset link to your email: " + email + ". Please check your inbox and follow the instructions.");
    }
}
