package com.rhansoft.kopkarmjsjkt2000.util;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import com.android.volley.AuthFailureError;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.toolbox.BasicNetwork;
import com.android.volley.toolbox.DiskBasedCache;
import com.android.volley.toolbox.HttpResponse;
import com.android.volley.toolbox.HurlStack;
import com.rhansoft.kopkarmjsjkt2000.HistoryActivity;
import com.rhansoft.kopkarmjsjkt2000.LogNotifikasiActivity;
import com.rhansoft.kopkarmjsjkt2000.LoginActivity;
import com.rhansoft.kopkarmjsjkt2000.SimpananRinciActivity;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class VolleySingleton {
    private static VolleySingleton instance;
    private RequestQueue requestQueue;
    private static Context ctx;

    private VolleySingleton(Context context) {
        ctx = context;
        requestQueue = getRequestQueue();
    }

    public static synchronized VolleySingleton getInstance(Context context) {
        if (instance == null) {
            instance = new VolleySingleton(context);
        }
        return instance;
    }

    public RequestQueue getRequestQueue() {
        if (requestQueue == null) {
            // getApplicationContext() is key, it keeps you from leaking the
            // Activity or BroadcastReceiver if someone passes one in.
            Context app = ctx.getApplicationContext();
            requestQueue = new RequestQueue(new DiskBasedCache(new File(app.getCacheDir(), "volley")),
                    new BasicNetwork(new StackToken(app)));
            requestQueue.start();
        }
        return requestQueue;
    }

    public <T> void addToRequestQueue(Request<T> req) {
        getRequestQueue().add(req);
    }

    /**
     * Semua permintaan ke server API membawa token login (api_token dari login.php) di header Authorization, jadi setiap
     * Activity tidak perlu mengurusnya. Server membalas 401 bila token habis masa berlakunya (30 hari) atau password
     * diganti di perangkat lain: sesi di HP ini diakhiri dan aplikasi kembali ke layar login.
     */
    private static class StackToken extends HurlStack {
        private final Context app;

        StackToken(Context app) {
            this.app = app;
        }

        @Override
        public HttpResponse executeRequest(Request<?> request, Map<String, String> additionalHeaders)
                throws IOException, AuthFailureError {
            boolean keServer = request.getUrl().startsWith(Api.BASE_URL);
            String token = prefs().getString("api_token", "");
            Map<String, String> header = new HashMap<>(additionalHeaders);
            if (keServer && !token.isEmpty()) header.put("Authorization", "Bearer " + token);
            HttpResponse res = super.executeRequest(request, header);
            if (keServer && res.getStatusCode() == 401 && !token.isEmpty()) sesiBerakhir();
            return res;
        }

        private SharedPreferences prefs() {
            return app.getSharedPreferences("loginPrefs", Context.MODE_PRIVATE);
        }

        private void sesiBerakhir() {
            prefs().edit().clear().apply();
            new Handler(Looper.getMainLooper()).post(() -> {
                HistoryActivity.clearCache();
                LogNotifikasiActivity.clearInboxCache();
                SimpananRinciActivity.clearSimpananCache();
                Toast.makeText(app, "Sesi berakhir. Silakan masuk kembali.", Toast.LENGTH_LONG).show();
                Intent intent = new Intent(app, LoginActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                app.startActivity(intent);
            });
        }
    }
}
