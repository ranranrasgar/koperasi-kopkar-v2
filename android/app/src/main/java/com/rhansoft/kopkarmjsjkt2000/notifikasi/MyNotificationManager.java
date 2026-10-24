package com.rhansoft.kopkarmjsjkt2000.notifikasi;

import static android.content.Context.NOTIFICATION_SERVICE;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.rhansoft.kopkarmjsjkt2000.LogNotifikasiActivity;
import com.rhansoft.kopkarmjsjkt2000.R;

import java.util.Random;

public class MyNotificationManager {
    private final Context mCtx;
    private static MyNotificationManager mInstance;

    public MyNotificationManager(Context context) {
        mCtx = context;
    }

    public static synchronized MyNotificationManager getInstance(Context context) {
        if (mInstance == null) {
            mInstance = new MyNotificationManager(context.getApplicationContext());
        }
        return mInstance;
    }

    public void displayNotification(String title, String body) {
        NotificationManager mNotifyMgr = (NotificationManager) mCtx.getSystemService(NOTIFICATION_SERVICE);
        if (mNotifyMgr == null) return;

        String channelId = Constants.CHANNEL_ID;
        
        Intent resultIntent = new Intent(mCtx, LogNotifikasiActivity.class);
        resultIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(mCtx, 0, resultIntent, flags);

        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(mCtx, channelId)
                .setSmallIcon(R.drawable.ic_notifications_none)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(pendingIntent);

        Random ran = new Random();
        mNotifyMgr.notify(ran.nextInt(1000), mBuilder.build());
    }
}
