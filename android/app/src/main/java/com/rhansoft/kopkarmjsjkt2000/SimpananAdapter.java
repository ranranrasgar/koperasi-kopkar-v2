package com.rhansoft.kopkarmjsjkt2000;

import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class SimpananAdapter extends RecyclerView.Adapter<SimpananAdapter.ViewHolder> {

    private Context context;
    private List<Simpanan> listSimpanan;

    public SimpananAdapter(Context context, List<Simpanan> listSimpanan) {
        this.context = context;
        this.listSimpanan = listSimpanan;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(
                R.layout.item_simpanan_card, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Simpanan s = listSimpanan.get(position);

        holder.tvNamaSimpanan.setText(s.getNamaSimpanan());
        
        double totalValue = 0;
        try {
            totalValue = Double.parseDouble(s.getTotalSimpanan().replace(",", ""));
        } catch (Exception e) {}
        
        final double finalTotal = totalValue;
        holder.tvTotal.setText(formatRupiah(finalTotal));

        // Set dynamic icon background based on type
        if (s.getJnsSimpanan().equals("S01")) {
            holder.iconContainer.setBackgroundResource(R.drawable.bg_icon_pokok);
        } else if (s.getJnsSimpanan().equals("S02")) {
            holder.iconContainer.setBackgroundResource(R.drawable.bg_icon_wajib);
        } else {
            holder.iconContainer.setBackgroundResource(R.drawable.bg_icon_sukarela);
        }

        holder.itemView.setOnClickListener(v -> {
            Intent i = new Intent(context, SimpananRinciActivity.class);
            i.putExtra("nmAnggota", s.getNamaAnggota());
            i.putExtra("kdAnggota", s.getKdAnggota());
            i.putExtra("jnsSimpanan", s.getJnsSimpanan());
            i.putExtra("namaSimpanan", s.getNamaSimpanan());
            i.putExtra("total", formatRupiah(finalTotal));
            context.startActivity(i);
        });
    }

    private String formatRupiah(double number) {
        Locale localeID = new Locale("in", "ID");
        NumberFormat formatRupiah = NumberFormat.getCurrencyInstance(localeID);
        String formatted = formatRupiah.format(number);
        if (formatted.endsWith(",00")) {
            formatted = formatted.substring(0, formatted.length() - 3);
        }
        return formatted.replace("Rp", "Rp ");
    }

    @Override
    public int getItemCount() {
        return listSimpanan.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        public TextView tvNamaSimpanan, tvTotal;
        public View iconContainer;
        public ImageView imgIcon;

        public ViewHolder(final View itemView) {
            super(itemView);
            tvNamaSimpanan = itemView.findViewById(R.id.tvNamaSimpanan);
            tvTotal = itemView.findViewById(R.id.tvTotal);
            iconContainer = itemView.findViewById(R.id.iconContainer);
            imgIcon = itemView.findViewById(R.id.imgIcon);
        }
    }
}
