package com.rhansoft.kopkarmjsjkt2000;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class PinjamanRinciAdapter extends RecyclerView.Adapter<PinjamanRinciAdapter.ViewHolder> {

    private Context context;
    private List<PinjamanRinci> listPinjamanRinci;

    public PinjamanRinciAdapter(Context context, List listPinjamanRinci) {
        this.context = context;
        this.listPinjamanRinci = listPinjamanRinci;
    }

    @Override
    public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(
                R.layout.sli_pinjaman_rinci, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        holder.itemView.setTag(listPinjamanRinci.get(position));
        PinjamanRinci pr = listPinjamanRinci.get(position);

        holder.txvTglPinjaman.setText(pr.getTglPinjaman());
        holder.txvAngsuranKe.setText("Angsuran ke-" + pr.getAngsuranKe());
        holder.txvKredit.setText(formatRupiah(pr.getKredit()));
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
        return listPinjamanRinci.size();
    }

    public class ViewHolder extends RecyclerView.ViewHolder {

        public TextView txvTglPinjaman, txvAngsuranKe, txvKredit;

        public ViewHolder(final View itemView) {
            super(itemView);
            txvTglPinjaman = (TextView) itemView.findViewById(R.id.txvTglPinjaman);
            txvAngsuranKe = (TextView) itemView.findViewById(R.id.txvAngsuranKe);
            txvKredit = (TextView) itemView.findViewById(R.id.txvKredit);
        }
    }
}
