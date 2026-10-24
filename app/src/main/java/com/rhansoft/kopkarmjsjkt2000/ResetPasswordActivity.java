package com.rhansoft.kopkarmjsjkt2000;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class ResetPasswordActivity extends AppCompatActivity {
    private TextView tvwUserName, tvwPertanyaan;
    private EditText editJawaban, editPassword1, editPassword2;
    private Button btnSave;
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
        
        setContentView(R.layout.activity_reset_password);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Reset Password");
        }
        
        ViewCompat.setOnApplyWindowInsetsListener(toolbar, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), insets.top, v.getPaddingRight(), v.getPaddingBottom());
            return windowInsets;
        });

        tvwUserName = (TextView) findViewById(R.id.tvwUserName);
        tvwUserName.setText(getIntent().getStringExtra("username"));
        tvwPertanyaan = (TextView) findViewById(R.id.tvwPertanyaan);
        tvwPertanyaan.setText(getIntent().getStringExtra("pertanyaan"));
        editJawaban = (EditText) findViewById(R.id.editJawaban);
        editPassword1 = (EditText) findViewById(R.id.editPassword1);
        editPassword2 = (EditText) findViewById(R.id.editPassword2);

        btnSave = (Button) findViewById(R.id.btnSimpan);
        progressBar = findViewById(R.id.progressBar);
    }

    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }

    public void onClickSimpanPerubahan(View view) {
        String jawaban = getIntent().getStringExtra("jawaban");
        // Log.i("onClickSimpanPerubahan", jawaban);
        if(jawaban.equals(editJawaban.getText().toString())) {
            if(editPassword1.getText().toString().equals(editPassword2.getText().toString())) {
                //Toast.makeText(getApplicationContext(), "Save to server...", Toast.LENGTH_LONG).show();
                updateUserPassword(tvwUserName.getText().toString(), editPassword1.getText().toString());
            } else {
                Toast.makeText(getApplicationContext(), "Password 1 tidak sama dengan password 2", Toast.LENGTH_LONG).show();
            }
        } else {
            Toast.makeText(getApplicationContext(), "Jawaban salah.", Toast.LENGTH_LONG).show();
        }
    }

    private void updateUserPassword(String userName, String password) {
        progressBar.setVisibility(View.VISIBLE);
        final Map<String, String> params = new HashMap<>();
        params.put("username", userName);
        params.put("password", password);

        StringRequest strRequest = new StringRequest(Request.Method.POST, Api.URL_UPDATE_USER_PASSWORD,
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        progressBar.setVisibility(View.GONE);
                        try {
                            JSONObject jsonObject = new JSONObject(response);
                            if(!jsonObject.getBoolean("error")) {
                                Intent i = new Intent(getApplicationContext(), LoginActivity.class);
                                startActivity(i);
                            } else {
                                //Log.i("onResponse", jsonObject.getString("message").toString());
                                Toast.makeText(getApplicationContext(), jsonObject.getString("message"), Toast.LENGTH_LONG).show();
                            }
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                    }
                }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                progressBar.setVisibility(View.GONE);
                error.printStackTrace();
                //Log.i("Volley Error: ", error.getMessage());
                Toast.makeText(getApplicationContext(), error.getMessage(), Toast.LENGTH_LONG).show();
            }
        }) {
            @Override
            protected Map<String, String> getParams() {
                return params;
            }
        };

        VolleySingleton.getInstance(this).addToRequestQueue(strRequest);
    }
}
