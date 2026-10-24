package com.rhansoft.kopkarmjsjkt2000.util;

import com.rhansoft.kopkarmjsjkt2000.BuildConfig;

public class Api {
    // Server API sistem baru (mobile-api di repo Koperasi-Kopkar-v2, docs/DEPLOY-VPS.md). URL, parameter, dan JSON sama
    // dengan server PHP lama; bedanya semua data wajib token login (lihat VolleySingleton) dan produksi lewat HTTPS.
    // Debug: mobile-api lokal (npm start -w mobile-api, port 8099). 10.0.2.2 = komputer dari emulator; HP fisik memakai
    // IP komputer di jaringan yang sama.
    private static final String HOST = BuildConfig.DEBUG
            ? (isEmulator() ? "10.0.2.2" : "192.168.101.3")
            : "api.kopkarmjsmattel.com";
    public static final String BASE_URL = BuildConfig.DEBUG ? "http://" + HOST + ":8099" : "https://" + HOST;
    /** Aplikasi web anggota (PWA): pendaftaran akun dan verifikasi email dilakukan di sana. */
    public static final String PWA_URL = "https://anggota.kopkarmjsmattel.com";

    private static boolean isEmulator() {
        return (android.os.Build.FINGERPRINT.startsWith("generic")
                || android.os.Build.FINGERPRINT.startsWith("unknown")
                || android.os.Build.MODEL.contains("google_sdk")
                || android.os.Build.MODEL.contains("Emulator")
                || android.os.Build.MODEL.contains("Android SDK built for x86")
                || android.os.Build.MANUFACTURER.contains("Genymotion")
                || (android.os.Build.BRAND.startsWith("generic") && android.os.Build.DEVICE.startsWith("generic"))
                || "google_sdk".equals(android.os.Build.PRODUCT));
    }
    
    private static final String ROOT_URL = BASE_URL + "/v1/";
    public static final String IMAGE_PATH = BASE_URL + "/images/";
    public static final String URL_READ_ANGGOTA = ROOT_URL + "Api.php?apicall=getanggota";
    public static final String URL_LOGIN = ROOT_URL + "login.php";
    public static final String URL_GET_PERTANYAAN = ROOT_URL + "Api.php?apicall=getpertanyaan";
    public static final String URL_IS_USER_EXIST = ROOT_URL + "Api.php?apicall=isuserexist";
    public static final String URL_UPDATE_USER_PASSWORD = ROOT_URL + "Api.php?apicall=updateuserpassword";
    public static final String URL_GET_SIMPANAN = ROOT_URL + "Api.php?apicall=getsimpanan";
//    public static final String URL_GET_JENIS_SIMPANAN = ROOT_URL + "Api.php?apicall=getjenissimpanan";
    public static final String URL_GET_SIMPANAN_RINCI = ROOT_URL + "Api.php?apicall=getsimpananrinci";
    public static final String URL_GET_SIMPANAN_RINCI_PAGINATED = ROOT_URL + "Api.php?apicall=getsimpananrincipaginated";
//    public static final String URL_GET_SALDO_SIMPANAN = ROOT_URL + "Api.php?apicall=getSaldoSimpanan";
    public static final String URL_GET_SALDO_JENIS_PINJAMAN = ROOT_URL + "Api.php?apicall=getSaldoJenisPinjaman";

    public static final String URL_GET_PINJAMAN = ROOT_URL + "Api.php?apicall=getpinjaman";
//    public static final String URL_GET_PINJAMAN_RINCI = ROOT_URL + "Api.php?apicall=getpinjamanrinci";
    public static final String URL_GET_PINJAMAN_RINCI_PAGINATED = ROOT_URL + "Api.php?apicall=getpinjamanrincipaginated";
    public static final String URL_GET_JADWAL_ANGSURAN = ROOT_URL + "Api.php?apicall=getjadwalangsuran";
//    public static final String URL_GET_NEXT_NO_PINJAMAN = ROOT_URL + "Api.php?apicall=getnextnopinjaman";
    public static final String URL_GET_JENIS_KREDIT = ROOT_URL + "Api.php?apicall=getjeniskreditv1";
    public static final String URL_CREATE_PINJAMAN = ROOT_URL + "Api.php?apicall=createpinjaman";

    public static final String URL_GET_POTONGAN_BULANAN = ROOT_URL + "Api.php?apicall=getpotonganbulanan";
//    public static final String URL_GET_POTONGAN_BULANAN_V1 = ROOT_URL + "Api.php?apicall=getpotonganbulananv1";
//    public static final String URL_GET_POTONGAN_BULANAN_V2 = ROOT_URL + "Api.php?apicall=getpotonganbulananv2";
//    public static final String URL_GET_POTONGAN_BULANAN_V3 = ROOT_URL + "Api.php?apicall=getpotonganbulanan";
    public static final String URL_GET_IS_TERDEBET = ROOT_URL + "Api.php?apicall=isterdebet";
    public static final String URL_GET_SHU = ROOT_URL + "Api.php?apicall=getshu";
    public static final String URL_GET_TAHUN_SHU = ROOT_URL + "Api.php?apicall=gettahunshu";
    public static final String URL_GET_LOG = ROOT_URL + "Api.php?apicall=getlognotifikasi";
    public static final String URL_GET_HISTORY = ROOT_URL + "Api.php?apicall=gethistory";
    public static final String URL_DOWNLOAD_SLIP = ROOT_URL + "download_slip.php";
    public static final String URL_UPDATE_PROFILE = ROOT_URL + "Api.php?apicall=updateprofile";
    public static final String URL_UPDATE_EMAIL = ROOT_URL + "Api.php?apicall=updateemail";
    public static final String URL_UPDATE_FCM_TOKEN = ROOT_URL + "Api.php?apicall=updatefcmtoken";
    public static final String URL_DASHBOARD = ROOT_URL + "dashboard.php";
}
