package com.rhansoft.kopkarmjsjkt2000.util;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import com.rhansoft.kopkarmjsjkt2000.ScannerBottomSheet;
import com.rhansoft.kopkarmjsjkt2000.TokoActivity;
import com.rhansoft.kopkarmjsjkt2000.HistoryActivity;
import com.rhansoft.kopkarmjsjkt2000.PinjamanActivity;
import com.rhansoft.kopkarmjsjkt2000.SimpananActivity;
import com.rhansoft.kopkarmjsjkt2000.LogNotifikasiActivity;
import com.rhansoft.kopkarmjsjkt2000.MainActivity;
import com.rhansoft.kopkarmjsjkt2000.DetailAnggota;
import com.rhansoft.kopkarmjsjkt2000.R;

import androidx.fragment.app.FragmentActivity;

public class NavigationHelper {

    public static void setupFooter(Activity activity) {
        View navHome = activity.findViewById(R.id.nav_home);
        View navPinjaman = activity.findViewById(R.id.nav_pinjaman);
        View navQr = activity.findViewById(R.id.nav_qr);
        View navSimpanan = activity.findViewById(R.id.nav_simpanan);
        View navProfile = activity.findViewById(R.id.nav_profile);

        if (navHome == null) return;

        SharedPreferences prefs = activity.getSharedPreferences("loginPrefs", Context.MODE_PRIVATE);
        String kdAnggota = prefs.getString("kdAnggota", "");
        String nama = prefs.getString("nama", "");

        // Default Reset (Putih pudar untuk non-aktif)
        resetTab(activity, R.id.iv_nav_home, R.id.tv_nav_home);
        resetTab(activity, R.id.iv_nav_pinjaman, R.id.tv_nav_pinjaman);
        resetTab(activity, R.id.iv_nav_simpanan, R.id.tv_nav_simpanan);
        resetTab(activity, R.id.iv_nav_profile, R.id.tv_nav_profile);

        // Highlight active tab (Warna putih terang)
        if (activity instanceof MainActivity) {
            highlight(activity, R.id.iv_nav_home, R.id.tv_nav_home);
        } else if (activity instanceof PinjamanActivity) {
            highlight(activity, R.id.iv_nav_pinjaman, R.id.tv_nav_pinjaman);
        } else if (activity instanceof SimpananActivity) {
            highlight(activity, R.id.iv_nav_simpanan, R.id.tv_nav_simpanan);
        } else if (activity instanceof DetailAnggota) {
            highlight(activity, R.id.iv_nav_profile, R.id.tv_nav_profile);
        }

        navHome.setOnClickListener(v -> {
            if (!(activity instanceof MainActivity)) {
                Intent intent = new Intent(activity, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                activity.startActivity(intent);
            }
        });

        navPinjaman.setOnClickListener(v -> {
            if (!(activity instanceof PinjamanActivity)) {
                Intent intent = new Intent(activity, PinjamanActivity.class);
                intent.putExtra("kdAnggota", kdAnggota);
                intent.putExtra("namaAnggota", nama);
                activity.startActivity(intent);
            }
        });

        navQr.setOnClickListener(v -> {
            if (activity instanceof FragmentActivity) {
                ScannerBottomSheet scanner = new ScannerBottomSheet();
                scanner.setScannerListener(data -> {
                    Toast.makeText(activity, "Fitur QR Scan dalam pengembangan", Toast.LENGTH_LONG).show();
                });
                scanner.show(((FragmentActivity) activity).getSupportFragmentManager(), "ScannerBottomSheet");
            } else {
                Toast.makeText(activity, "Fitur QR Scan dalam pengembangan", Toast.LENGTH_SHORT).show();
            }
        });

        navSimpanan.setOnClickListener(v -> {
            if (!(activity instanceof SimpananActivity)) {
                Intent intent = new Intent(activity, SimpananActivity.class);
                intent.putExtra("kdAnggota", kdAnggota);
                intent.putExtra("namaAnggota", nama);
                activity.startActivity(intent);
            }
        });

        navProfile.setOnClickListener(v -> {
            if (!(activity instanceof DetailAnggota)) {
                Intent intent = new Intent(activity, DetailAnggota.class);
                intent.putExtra("kdAnggota", kdAnggota);
                
                // Member data extras
                intent.putExtra("nama", prefs.getString("nama", ""));
                intent.putExtra("nik", prefs.getString("nik", ""));
                intent.putExtra("tglDaftar", prefs.getString("tglpencatatan", ""));
                intent.putExtra("jnsKelamin", prefs.getString("jns_kelamin", ""));
                intent.putExtra("hp", prefs.getString("hp", ""));
                intent.putExtra("email", prefs.getString("email", ""));
                intent.putExtra("alamat", prefs.getString("alamat", ""));
                intent.putExtra("kota", prefs.getString("kota", ""));
                intent.putExtra("kodePos", prefs.getString("kode_pos", ""));
                intent.putExtra("tlpRumah", prefs.getString("tlp_rumah", ""));
                intent.putExtra("status", prefs.getString("status", ""));
                intent.putExtra("namaIstriSuami", prefs.getString("nama_istri_suami", ""));
                intent.putExtra("jmlTanggungan", prefs.getString("jml_tanggungan", ""));
                intent.putExtra("jmlAnak", prefs.getString("jml_anak", ""));
                intent.putExtra("statusStaff", prefs.getString("status_staff", ""));
                intent.putExtra("agtNonAgt", prefs.getString("agt_non_agt", ""));
                intent.putExtra("rpGrade", (double) prefs.getFloat("rpGrade", 0f));
                intent.putExtra("grade", prefs.getString("grade", ""));
                intent.putExtra("simpananPokok", (double) prefs.getFloat("simpanan_pokok", 0f));
                intent.putExtra("simpananWajib", (double) prefs.getFloat("simpanan_wajib", 0f));
                intent.putExtra("simpananSukarela", (double) prefs.getFloat("simpanan_sukarela", 0f));
                intent.putExtra("pekerjaan", prefs.getString("pekerjaan", ""));
                intent.putExtra("alamatKerja", prefs.getString("alamat_kerja", ""));
                intent.putExtra("namaPerusahaan", prefs.getString("nama_perusahaan", ""));
                intent.putExtra("jabatan", prefs.getString("jabatan", ""));
                intent.putExtra("bankNoRek", prefs.getString("bank_no_rek", ""));
                intent.putExtra("bankNama", prefs.getString("bank_nama", ""));
                intent.putExtra("bankAtasNama", prefs.getString("bank_atas_nama", ""));
                intent.putExtra("foto", prefs.getString("foto", "no_image.jpg"));
                
                activity.startActivity(intent);
            }
        });
    }

    private static void resetTab(Activity activity, int iconId, int textId) {
        ImageView iv = activity.findViewById(iconId);
        TextView tv = activity.findViewById(textId);
        if (iv != null) iv.setColorFilter(Color.parseColor("#9CA3AF")); // Abu-abu pudar
        if (tv != null) {
            tv.setTextColor(Color.parseColor("#9CA3AF"));
            tv.setTypeface(null, Typeface.NORMAL);
        }
    }

    private static void highlight(Activity activity, int iconId, int textId) {
        ImageView iv = activity.findViewById(iconId);
        TextView tv = activity.findViewById(textId);
        if (iv != null) iv.setColorFilter(Color.parseColor("#003B95")); // Biru Tua aktif
        if (tv != null) {
            tv.setTextColor(Color.parseColor("#003B95"));
            tv.setTypeface(null, Typeface.BOLD);
        }
    }
}
