package com.rhansoft.kopkarmjsjkt2000;

import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class HistoryAdapter extends RecyclerView.Adapter<HistoryAdapter.ViewHolder> {

    private Context context;
    private List<History> listHistory;

    public HistoryAdapter(Context context, List<History> listHistory) {
        this.context = context;
        this.listHistory = listHistory;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_history, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        History h = listHistory.get(position);
        holder.tvTitle.setText(h.getTitle());
        holder.tvSub.setText(h.getSub() + (h.getRef() != null ? " • " + h.getRef() : ""));
        holder.tvDate.setText(h.getTgl());

        // Format Amount
        double amount = h.getAmount();
        String formatted = formatRupiah(Math.abs(amount));
        if (amount > 0) {
            holder.tvAmount.setText("+" + formatted);
            holder.tvAmount.setTextColor(Color.parseColor("#166534")); // Green
        } else if (amount < 0) {
            holder.tvAmount.setText("-" + formatted);
            holder.tvAmount.setTextColor(Color.parseColor("#991B1B")); // Red
        } else {
            holder.tvAmount.setText(formatted);
            holder.tvAmount.setTextColor(Color.parseColor("#4B5563")); // Gray
        }

        // Icon Logic
        String cat = h.getCategory() != null ? h.getCategory() : "";
        switch (cat) {
            case "SIMPANAN":
                holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_blue_light);
                holder.ivIcon.setImageResource(R.drawable.ic_save);
                holder.ivIcon.setColorFilter(Color.parseColor("#003B95"));
                break;
            case "PINJAMAN":
            case "KPR":
                holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_red_light);
                holder.ivIcon.setImageResource(R.drawable.ic_history_menu);
                holder.ivIcon.setColorFilter(Color.parseColor("#991B1B"));
                break;
            case "SHU":
                holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_green_light);
                holder.ivIcon.setImageResource(R.drawable.ic_attach_money_black_24dp);
                holder.ivIcon.setColorFilter(Color.parseColor("#166534"));
                break;
            case "PENGAJUAN":
                holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_gray_light);
                holder.ivIcon.setImageResource(R.drawable.ic_control_point_black_24dp);
                holder.ivIcon.setColorFilter(Color.parseColor("#4B5563"));
                break;
            default:
                holder.layoutIcon.setBackgroundResource(R.drawable.bg_circle_blue_light);
                holder.ivIcon.setImageResource(R.drawable.ic_history_menu);
                holder.ivIcon.setColorFilter(Color.parseColor("#003B95"));
                break;
        }
    }

    @Override
    public int getItemCount() {
        return listHistory.size();
    }

    private String formatRupiah(double number) {
        Locale localeID = new Locale("in", "ID");
        NumberFormat formatRupiah = NumberFormat.getCurrencyInstance(localeID);
        String res = formatRupiah.format(number).replace("Rp", "Rp ");
        if (res.endsWith(",00")) res = res.substring(0, res.length() - 3);
        return res;
    }

    public class ViewHolder extends RecyclerView.ViewHolder {
        public TextView tvTitle, tvSub, tvDate, tvAmount;
        public View layoutIcon;
        public ImageView ivIcon;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvTitle = itemView.findViewById(R.id.tvTitle);
            tvSub = itemView.findViewById(R.id.tvSub);
            tvDate = itemView.findViewById(R.id.tvDate);
            tvAmount = itemView.findViewById(R.id.tvAmount);
            layoutIcon = itemView.findViewById(R.id.layoutIcon);
            ivIcon = itemView.findViewById(R.id.ivIcon);
        }
    }
}
