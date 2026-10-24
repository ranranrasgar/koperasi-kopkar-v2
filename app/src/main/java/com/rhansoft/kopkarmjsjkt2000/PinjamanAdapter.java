package com.rhansoft.kopkarmjsjkt2000;

import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class PinjamanAdapter extends RecyclerView.Adapter<PinjamanAdapter.ViewHolder> {

    private Context context;
    private List<Pinjaman> listPinjaman;

    public PinjamanAdapter(Context context, List listPinjaman) {
        this.context = context;
        this.listPinjaman = listPinjaman;
    }

    @Override
    public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(
                R.layout.sli_pinjaman, parent, false);
        ViewHolder viewHolder = new ViewHolder(v);
        return viewHolder;
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        holder.itemView.setTag(listPinjaman.get(position));
        Pinjaman p = listPinjaman.get(position);
        
        holder.txvNoPinjaman.setText(p.getNoPinjaman());
        holder.txvJnsPinjaman.setText(p.getJenisKredit());
        
        Locale localeID = new Locale("in", "ID");
        NumberFormat formatRupiah = NumberFormat.getCurrencyInstance(localeID);
        String formattedSaldo = formatRupiah.format(p.getSaldo()).replace("Rp", "Rp ");
        if (formattedSaldo.endsWith(",00")) {
            formattedSaldo = formattedSaldo.substring(0, formattedSaldo.length() - 3);
        }
        holder.txvSaldo.setText(formattedSaldo);
        
        int angsuranKe = p.getAngsuranKe() != null ? p.getAngsuranKe() : 0;
        holder.txvTenor.setText(angsuranKe + " / " + p.getLamaAngsuran() + " Bln");
        
        if (p.getPinjamanPokok() != null && p.getPinjamanPokok() > 0) {
            double dibayar = p.getPinjamanPokok() - p.getSaldo();
            double progress = (dibayar / p.getPinjamanPokok()) * 100;
            holder.pbPinjaman.setProgress((int) Math.max(0, Math.min(100, progress)));
        } else {
            holder.pbPinjaman.setProgress(0);
        }
    }

    @Override
    public int getItemCount() {
        return listPinjaman.size();
    }

    public class ViewHolder extends RecyclerView.ViewHolder {

        public TextView txvNoPinjaman, txvJnsPinjaman, txvSaldo, txvTenor;
        public ProgressBar pbPinjaman;

        public ViewHolder(final View itemView) {
            super(itemView);

            txvNoPinjaman = (TextView) itemView.findViewById(R.id.txvNoPinjaman);
            txvJnsPinjaman = (TextView) itemView.findViewById(R.id.txvJnsPinjaman);
            txvSaldo = (TextView) itemView.findViewById(R.id.txvSaldo);
            txvTenor = (TextView) itemView.findViewById(R.id.txvTenor);
            pbPinjaman = (ProgressBar) itemView.findViewById(R.id.pbPinjaman);

            itemView.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {

                    Pinjaman p = (Pinjaman) view.getTag();

                    Intent i = new Intent(view.getContext(), PinjamanRinciActivity.class);
                    i.putExtra("nmAnggota", p.getNamaAgt());
                    i.putExtra("noPinjaman", p.getNoPinjaman());
                    i.putExtra("jnsKredit", p.getJenisKredit());
                    i.putExtra("tglPinjaman", p.getTglPinjaman());
                    i.putExtra("lamaAngsuran", p.getLamaAngsuran());
                    i.putExtra("persenBunga", p.getPersenBunga());
                    i.putExtra("totalSaldo", p.getSaldo());
                    
                    int angsuranKe = p.getAngsuranKe() != null ? p.getAngsuranKe() : 0;
                    i.putExtra("angsuranKe", angsuranKe);
                    
                    DecimalFormat decimalFormat = new DecimalFormat("#,##0");
                    i.putExtra("totalPinjaman", decimalFormat.format(p.getPinjamanPokok()));
                    
                    double cicilanPokok = 0;
                    double bungaAmount = 0;
                    if (p.getLamaAngsuran() != null && p.getLamaAngsuran() > 0) {
                        cicilanPokok = p.getPinjamanPokok() / p.getLamaAngsuran();
                        bungaAmount = (p.getBunga() != null ? p.getBunga() : 0) / p.getLamaAngsuran();
                    }
                    i.putExtra("pinjamanPokok", decimalFormat.format(cicilanPokok));
                    i.putExtra("bungaAmount", decimalFormat.format(bungaAmount));

                    view.getContext().startActivity(i);
                }
            });
        }
    }
}
