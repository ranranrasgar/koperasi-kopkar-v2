package com.rhansoft.kopkarmjsjkt2000;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Window;
import android.widget.TextView;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.DecimalFormat;
import java.text.NumberFormat;

public class PotonganBulananActivity extends AppCompatActivity {
    private TextView txvKdAnggota, txvNama, txvNoRek, txvNmBank, txvPokok, txvWajib, txvSukarela,
        txvKoperasi, txvBank, txvKpr, txvAdmBank, txvTotal;

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
        
        setContentView(R.layout.activity_potongan_bulanan);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Potongan Bulanan");
        }
        
        ViewCompat.setOnApplyWindowInsetsListener(toolbar, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), insets.top, v.getPaddingRight(), v.getPaddingBottom());
            return windowInsets;
        });

        txvKdAnggota = (TextView) findViewById(R.id.txvKdAnggota);
        txvKdAnggota.setText(getIntent().getStringExtra("kdAnggota"));
        txvNama = (TextView) findViewById(R.id.txvNama);
        txvNama.setText(getIntent().getStringExtra("namaAnggota"));
        txvNoRek = (TextView) findViewById(R.id.txvNoRek);
        txvNmBank = (TextView) findViewById(R.id.txvNmBank);
        txvPokok = (TextView) findViewById(R.id.txvPokok);
        txvWajib = (TextView) findViewById(R.id.txvWajib);
        txvSukarela = (TextView) findViewById(R.id.txvSukarela);
        txvKoperasi = (TextView) findViewById(R.id.txvKoperasi);
        txvBank = (TextView) findViewById(R.id.txvBank);
        txvKpr = (TextView) findViewById(R.id.txvKpr);
        txvAdmBank = (TextView) findViewById(R.id.txvAdmBank);
        txvTotal = (TextView) findViewById(R.id.txvTotal);

        setPotonganBulanan(getIntent().getStringExtra("kdAnggota"));
    }

    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }

    private void setPotonganBulanan(String kdAnggota) {
        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET,
                Api.URL_GET_POTONGAN_BULANAN + "&kdAnggota=" + kdAnggota,
                null, new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                try {
                    if (!response.getBoolean("error")) {
                        JSONArray result = response.getJSONArray("potongan");
                        if(result.length() > 0) {
                            JSONObject jo = result.getJSONObject(0);
                            txvNoRek.setText(jo.getString("no_rek"));
                            txvNmBank.setText(jo.getString("nama_bank"));
                            NumberFormat formatter = new DecimalFormat("#,###");
                            txvPokok.setText(formatter.format(jo.getDouble("s_pokok")));
                            txvWajib.setText(formatter.format(jo.getDouble("s_wajib")));
                            txvSukarela.setText(formatter.format(jo.getDouble("s_sukarela")));
                            txvKoperasi.setText(formatter.format(jo.getDouble("rp_koprasi")));
                            txvBank.setText(formatter.format(jo.getDouble("rp_bank")));
                            txvKpr.setText(formatter.format(jo.getDouble("rp_kpr")));
                            txvAdmBank.setText(formatter.format(jo.getDouble("rp_admin_bank")));
                            txvTotal.setText(formatter.format(jo.getDouble("total_potongan")));
                        }
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.i("Volley Error: ", error.getMessage());
            }
        });

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }
}
