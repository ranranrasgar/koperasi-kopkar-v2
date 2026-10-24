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

public class MutasiAdapter extends RecyclerView.Adapter<MutasiAdapter.ViewHolder> {
    private List<SimpananRinci> listMutasi;

    public MutasiAdapter(List<SimpananRinci> listMutasi) {
        this.listMutasi = listMutasi;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_mutasi_simple, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        SimpananRinci mutasi = listMutasi.get(position);
        
        holder.tvTitle.setText(mutasi.getNoReff());
        holder.tvSubtitle.setText(mutasi.getTglSimpanan());

        double debit = 0, kredit = 0;
        try { debit = Double.parseDouble(mutasi.getDebit().replace(",", "")); } catch (Exception e) {}
        try { kredit = Double.parseDouble(mutasi.getKredit().replace(",", "")); } catch (Exception e) {}

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
        return Math.min(listMutasi.size(), 5); // Show only top 5
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvTitle, tvSubtitle, tvAmount;
        View iconContainer;
        ImageView imgIcon;

        public ViewHolder(View itemView) {
            super(itemView);
            tvTitle = itemView.findViewById(R.id.tvTitle);
            tvSubtitle = itemView.findViewById(R.id.tvSubtitle);
            tvAmount = itemView.findViewById(R.id.tvAmount);
            iconContainer = itemView.findViewById(R.id.iconContainer);
            imgIcon = itemView.findViewById(R.id.imgIcon);
        }
    }
}
