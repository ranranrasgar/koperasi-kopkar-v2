package com.rhansoft.kopkarmjsjkt2000;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SearchView;
import androidx.appcompat.widget.Toolbar;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.app.SearchManager;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.Window;

import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.rhansoft.kopkarmjsjkt2000.util.Api;
import com.rhansoft.kopkarmjsjkt2000.util.VolleySingleton;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class AnggotaActivity extends AppCompatActivity {
    RecyclerView recyclerView;
    //RecyclerView.Adapter mAdapter;
    AnggotaAdapter mAdapter;
    RecyclerView.LayoutManager layoutManager;
    List<Anggota> listAnggota;
    private SearchView searchView;


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
        
        setContentView(R.layout.activity_anggota);

        Toolbar toolbar = findViewById(R.id.toolbar);
        ViewCompat.setOnApplyWindowInsetsListener(toolbar, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), insets.top, v.getPaddingRight(), v.getPaddingBottom());
            return windowInsets;
        });
        setSupportActionBar(toolbar);

        
        // toolbar fancy stuff
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        getSupportActionBar().setTitle(R.string.toolbar_title);

        recyclerView = (RecyclerView) findViewById(R.id.recycler_view);
        recyclerView.setHasFixedSize(true);

        layoutManager = new LinearLayoutManager(this);

        recyclerView.setLayoutManager(layoutManager);

        listAnggota = new ArrayList<Anggota>();

        sendRequest();
    }

    public void sendRequest(){
        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.GET, Api.URL_READ_ANGGOTA,
                null, new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                try {
                    JSONArray result = response.getJSONArray("anggota");

                    for(int i = 0; i < result.length(); i++){

                        Anggota anggota = new Anggota();

                        try {
                            JSONObject jsonObject = result.getJSONObject(i);
                            anggota.setKdAnggota(jsonObject.getString("kode_agt"));
                            anggota.setNama(jsonObject.getString("nama"));
                            anggota.setTglDaftar(jsonObject.getString("tglpencatatan"));
                            anggota.setNik(jsonObject.getString("nik"));
                            anggota.setJnsKelamain(jsonObject.getString("jns_kelamin"));
                            anggota.setAlamat(jsonObject.getString("alamat"));
                            anggota.setKota(jsonObject.getString("kota"));
                            anggota.setKodePos(jsonObject.getString("kode_pos"));
                            anggota.setTlpRumah(jsonObject.getString("tlp_rumah"));
                            anggota.setHp(jsonObject.getString("hp"));
                            anggota.setNoKtp(jsonObject.getString("no_ktp"));
                            anggota.setNoSim(jsonObject.getString("no_sim"));
                            anggota.setStatus(jsonObject.getString("status"));
                            anggota.setNamaIstriSuami(jsonObject.getString("nama_istri_suami"));
                            anggota.setJmlTanggungan(jsonObject.getString("jml_tanggungan"));
                            anggota.setJmlAnak(jsonObject.getString("jml_anak"));
                            anggota.setStatusStaff(jsonObject.getString("status_staff"));
                            anggota.setAgtNonAgt(jsonObject.getString("agt_non_agt"));
                            anggota.setRpGrade(jsonObject.getDouble("rp_grade"));
                            anggota.setGrade(jsonObject.getString("grade"));
                            anggota.setSimpananPokok(jsonObject.getDouble("simpanan_pokok"));
                            anggota.setSimpananWajib(jsonObject.getDouble("simpanan_wajib"));
                            anggota.setSimpananSukarela(jsonObject.getDouble("simpanan_sukarela"));
                            anggota.setPekerjaan(jsonObject.getString("pekerjaan"));
                            anggota.setAlamatKerja(jsonObject.getString("alamat_kerja"));
                            anggota.setNamaPerusahaan(jsonObject.getString("nama_perusahaan"));
                            anggota.setJabatan(jsonObject.getString("jabatan"));
                            anggota.setLamaBekerjaTahun(jsonObject.getString("lama_bekerja_tahun"));
                            anggota.setLamaBekerjaBulan(jsonObject.getString("lama_bekerja_bulan"));
                            anggota.setTlpKantor(jsonObject.getString("tlp_kantor"));
                            anggota.setNpwp(jsonObject.getString("npwp"));
                            anggota.setFasilitasListrik(jsonObject.getString("fasilitas_listrik"));
                            anggota.setFasilitasPdam(jsonObject.getString("fasilitas_pdam"));
                            anggota.setFasilitasLainLain(jsonObject.getString("fasilitas_lain_lain"));
                            anggota.setLamaMenempatiTahun(jsonObject.getString("lama_menempati_tahun"));
                            anggota.setLamaMenempatiBulan(jsonObject.getString("lama_menempati_bulan"));
                            anggota.setBankNoRek(jsonObject.getString("bank_no_rek"));
                            anggota.setBankNama(jsonObject.getString("bank_nama"));
                            anggota.setBankAtasNama(jsonObject.getString("bank_atas_nama"));

                        } catch (JSONException e) {
                            e.printStackTrace();
                        }

                        listAnggota.add(anggota);

                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }

                mAdapter = new AnggotaAdapter(AnggotaActivity.this, listAnggota);
                recyclerView.setAdapter(mAdapter);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.i("Volley Error: ", error.getMessage());
            }
        });

        VolleySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_main, menu);

        // Associate searchable configuration with the SearchView
        SearchManager searchManager = (SearchManager) getSystemService(Context.SEARCH_SERVICE);
        searchView = (SearchView) menu.findItem(R.id.action_search)
                .getActionView();
        searchView.setSearchableInfo(searchManager
                .getSearchableInfo(getComponentName()));
        searchView.setMaxWidth(Integer.MAX_VALUE);

        // listening to search query text change
        searchView.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
            @Override
            public boolean onQueryTextSubmit(String query) {
                // filter recycler view when query submitted
                mAdapter.getFilter().filter(query);
                return false;
            }

            @Override
            public boolean onQueryTextChange(String query) {
                // filter recycler view when text is changed
                mAdapter.getFilter().filter(query);
                return false;
            }
        });
        return true;
    }

    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}
