package com.rhansoft.kopkarmjsjkt2000;

import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

public class LogNotifikasiAdapter extends RecyclerView.Adapter<LogNotifikasiAdapter.ViewHolder> {

    private Context context;
    private List<LogNotifikasi> listLog;

    public LogNotifikasiAdapter(Context context, List<LogNotifikasi> listLog) {
        this.context = context;
        this.listLog = listLog;
    }

    @Override
    public LogNotifikasiAdapter.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_log_notifikasi, parent, false);
        return new LogNotifikasiAdapter.ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(LogNotifikasiAdapter.ViewHolder holder, int position) {
        LogNotifikasi ln = listLog.get(position);
        holder.tvTitle.setText(ln.getTitle());
        holder.tvPesan.setText(ln.getPesan());
        holder.tvTanggal.setText(ln.getTanggal());

        // Handle Read Status
        holder.unreadDot.setVisibility(ln.isRead() ? View.GONE : View.VISIBLE);

        // Determine Icon and Background based on Title or Type
        String title = ln.getTitle().toLowerCase();
        if (title.contains("pengumuman") || title.contains("jam operasional")) {
            holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_blue_light);
            holder.ivIcon.setImageResource(R.drawable.ic_notifications_none);
            holder.ivIcon.setColorFilter(Color.parseColor("#003B95"));
        } else if (title.contains("pencairan") || title.contains("berhasil") || title.contains("sukses")) {
            holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_green_light);
            holder.ivIcon.setImageResource(R.drawable.ic_attach_money_black_24dp);
            holder.ivIcon.setColorFilter(Color.parseColor("#166534"));
        } else if (title.contains("keamanan") || title.contains("password") || title.contains("akun")) {
            holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_gray_light);
            holder.ivIcon.setImageResource(R.drawable.ic_security_green);
            holder.ivIcon.setColorFilter(Color.parseColor("#4B5563"));
        } else if (title.contains("jatuh tempo") || title.contains("peringatan") || title.contains("tunggakan")) {
            holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_red_light);
            holder.ivIcon.setImageResource(R.drawable.ic_info_outline_blue);
            holder.ivIcon.setColorFilter(Color.parseColor("#991B1B"));
        } else {
            // Default
            holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_blue_light);
            holder.ivIcon.setImageResource(R.drawable.ic_notifications_none);
            holder.ivIcon.setColorFilter(Color.parseColor("#003B95"));
        }
    }

    @Override
    public int getItemCount() {
        return listLog.size();
    }

    public class ViewHolder extends RecyclerView.ViewHolder {

        public TextView tvTitle, tvPesan, tvTanggal;
        public View layoutIcon, unreadDot;
        public ImageView ivIcon;

        public ViewHolder(final View itemView) {
            super(itemView);

            tvTitle = itemView.findViewById(R.id.tvTitle);
            tvPesan = itemView.findViewById(R.id.tvPesan);
            tvTanggal = itemView.findViewById(R.id.tvTanggal);
            layoutIcon = itemView.findViewById(R.id.layoutIcon);
            ivIcon = itemView.findViewById(R.id.ivIcon);
            unreadDot = itemView.findViewById(R.id.unreadDot);

            itemView.setOnClickListener(view -> {
                int position = getBindingAdapterPosition();
                if (position != RecyclerView.NO_POSITION) {
                    LogNotifikasi ln = listLog.get(position);
                    ln.setRead(true);
                    notifyItemChanged(position);
                }
            });
        }
    }
}
