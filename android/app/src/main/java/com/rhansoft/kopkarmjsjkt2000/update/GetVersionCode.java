package com.rhansoft.kopkarmjsjkt2000.update;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.AsyncTask;
import android.util.Log;

import androidx.appcompat.app.AlertDialog;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.io.IOException;

public class GetVersionCode extends AsyncTask<Void, String, String> {

    private Context context;
    private int currentVersion;

    public GetVersionCode(Context context, int currentVersion) {
        this.context = context;
        this.currentVersion = currentVersion;
    }

    @Override
    protected String doInBackground(Void... voids) {

        String newVersion = null;

        try {
            Document document = Jsoup.connect("https://play.google.com/store/apps/details?id=" + context.getPackageName()+ "&hl=en") // MainActivity.this.getPackageName()  + "&hl=en")
                    .timeout(30000)
                    .userAgent("Mozilla/5.0 (Windows; U; WindowsNT 5.1; en-US; rv1.8.1.6) Gecko/20070725 Firefox/2.0.0.6")
                    .referrer("http://www.google.com")
                    .get();
            if (document != null) {
                Elements element = document.getElementsContainingOwnText("Current Version");
                for (Element ele : element) {
                    if (ele.siblingElements() != null) {
                        Elements sibElemets = ele.siblingElements();
                        for (Element sibElemet : sibElemets) {
                            newVersion = sibElemet.text();
                        }
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return newVersion;
    }

    @Override
    protected void onPostExecute(String onlineVersion) {
        super.onPostExecute(onlineVersion);

        if (onlineVersion != null && !onlineVersion.isEmpty()) {
            if (Float.valueOf(currentVersion) < Float.valueOf(onlineVersion)) {
                //show anything
                AlertDialog.Builder dialogBuilder= new AlertDialog.Builder(context);
                dialogBuilder.setTitle("Update tersedia");
                dialogBuilder.setMessage("Apakah anda ingin mengupdate aplikasi sekarang?");
                dialogBuilder.setPositiveButton("Update Sekarang", (dialogInterface, i) -> {
                    final String appPackageName = context.getPackageName(); // getPackageName() from Context or Activity object
                    try {
                        context.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + appPackageName)));
                    } catch (android.content.ActivityNotFoundException anfe) {
                        context.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + appPackageName)));
                    }
                });
                dialogBuilder.setNegativeButton("Nanti",(dialogInterface,i)->{

                });

                dialogBuilder.show();
            }
        }
        Log.d("update", "Current version " + currentVersion + " playstore version " + onlineVersion);
    }
}
