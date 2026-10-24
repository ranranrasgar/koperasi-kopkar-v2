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
import java.util.List;

public class SimpananRinciAdapter extends RecyclerView.Adapter<SimpananRinciAdapter.ViewHolder> {
    private Context context;
    private List<SimpananRinci> listSimpananRinci;

    public SimpananRinciAdapter(Context context, List<SimpananRinci> listSimpananRinci) {
        this.context = context;
        this.listSimpananRinci = listSimpananRinci;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_simpanan_rinci_new, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        SimpananRinci rinci = listSimpananRinci.get(position);
        
        holder.tvTitle.setText(rinci.getNoReff());
        holder.tvSubtitle.setText(rinci.getTglSimpanan());
        holder.tvStatus.setText("Berhasil");

        double debit = 0, kredit = 0;
        try { debit = Double.parseDouble(rinci.getDebit().replace(",", "")); } catch (Exception e) {}
        try { kredit = Double.parseDouble(rinci.getKredit().replace(",", "")); } catch (Exception e) {}

        if (debit > 0) {
            holder.tvAmount.setText("+ " + formatRupiah(debit));
            holder.tvAmount.setTextColor(Color.parseColor("#166534"));
            holder.iconContainer.setBackgroundResource(R.drawable.bg_transaction_plus);
            holder.imgIcon.setImageResource(R.drawable.ic_control_point_black_24dp);
            holder.imgIcon.setColorFilter(Color.parseColor("#166534"));
        } else {
            holder.tvAmount.setText("- " + formatRupiah(kredit));
            holder.tvAmount.setTextColor(Color.parseColor("#EF4444"));
            holder.iconContainer.setBackgroundResource(R.drawable.bg_transaction_minus);
            holder.imgIcon.setImageResource(R.drawable.ic_remove_circle_red);
            holder.imgIcon.setColorFilter(Color.parseColor("#EF4444"));
        }
    }

    private String formatRupiah(double number) {
        DecimalFormat decimalFormat = new DecimalFormat("#,##0");
        return "Rp " + decimalFormat.format(number).replace(",", ".");
    }

    @Override
    public int getItemCount() {
        return listSimpananRinci.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvTitle, tvSubtitle, tvAmount, tvStatus;
        View iconContainer;
        ImageView imgIcon;

        public ViewHolder(View itemView) {
            super(itemView);
            tvTitle = itemView.findViewById(R.id.tvTitle);
            tvSubtitle = itemView.findViewById(R.id.tvSubtitle);
            tvAmount = itemView.findViewById(R.id.tvAmount);
            tvStatus = itemView.findViewById(R.id.tvStatus);
            iconContainer = itemView.findViewById(R.id.iconContainer);
            imgIcon = itemView.findViewById(R.id.imgIcon);
        }
    }
}
