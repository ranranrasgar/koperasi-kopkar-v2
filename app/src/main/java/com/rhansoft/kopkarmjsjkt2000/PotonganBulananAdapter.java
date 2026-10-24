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

import java.util.List;

public class PotonganBulananAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int TYPE_HEADER = 0;
    private static final int TYPE_ITEM = 1;
    private static final int TYPE_SUMMARY = 2;

    private Context context;
    private List<PotonganBulanan> listPotBul;

    public PotonganBulananAdapter(Context context, List<PotonganBulanan> listPotBul) {
        this.context = context;
        this.listPotBul = listPotBul;
    }

    @Override
    public int getItemViewType(int position) {
        String desc = listPotBul.get(position).getDeskripsi().trim();
        if (desc.equals("SIMPANAN KOPERASI") || desc.equals("PINJAMAN KOPERASI")) {
            return TYPE_HEADER;
        } else if (desc.contains("JUMLAH POTONGAN") || desc.contains("Potongan Kopkar")) {
            return TYPE_SUMMARY;
        }
        return TYPE_ITEM;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        if (viewType == TYPE_HEADER) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_potongan_header, parent, false);
            return new HeaderViewHolder(v);
        } else if (viewType == TYPE_SUMMARY) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_potongan_summary, parent, false);
            return new SummaryViewHolder(v);
        } else {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_potongan_card, parent, false);
            return new ItemViewHolder(v);
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        PotonganBulanan potBul = listPotBul.get(position);
        String desc = potBul.getDeskripsi();
        String amount = potBul.getJumlah();

        if (holder instanceof HeaderViewHolder) {
            HeaderViewHolder h = (HeaderViewHolder) holder;
            String title = desc.trim().equals("SIMPANAN KOPERASI") ? "Potongan Simpanan" : "Potongan Pinjaman";
            h.tvTitle.setText(title);
        } else if (holder instanceof SummaryViewHolder) {
            SummaryViewHolder s = (SummaryViewHolder) holder;
            s.tvDesc.setText(desc.trim());
            s.tvAmount.setText("Rp " + amount);
        } else if (holder instanceof ItemViewHolder) {
            ItemViewHolder i = (ItemViewHolder) holder;
            
            String[] split = desc.split("\n");
            if (split.length >= 2) {
                i.tvDesc.setText(split[0].trim());
                i.tvSub.setText(split[1].trim());
            } else {
                i.tvDesc.setText(desc.trim());
                i.tvSub.setText("Angsuran Pinjaman");
            }
            
            i.tvAmount.setText("Rp " + amount);
            
            // Icon logic based on description text
            String fullDesc = desc.toLowerCase();
            if (fullDesc.contains("wajib")) {
                i.imgIcon.setImageResource(R.drawable.ic_save);
                i.iconContainer.setBackgroundResource(R.drawable.bg_icon_wajib);
            } else if (fullDesc.contains("sukarela")) {
                i.imgIcon.setImageResource(R.drawable.ic_save);
                i.iconContainer.setBackgroundResource(R.drawable.bg_icon_sukarela);
            } else {
                i.imgIcon.setImageResource(R.drawable.ic_simulasi);
                i.iconContainer.setBackgroundResource(R.drawable.bg_circle_blue_light);
            }
        }
    }

    @Override
    public int getItemCount() {
        return listPotBul.size();
    }

    static class HeaderViewHolder extends RecyclerView.ViewHolder {
        TextView tvTitle;
        HeaderViewHolder(View itemView) {
            super(itemView);
            tvTitle = itemView.findViewById(R.id.tvSectionTitle);
        }
    }

    static class SummaryViewHolder extends RecyclerView.ViewHolder {
        TextView tvDesc, tvAmount;
        SummaryViewHolder(View itemView) {
            super(itemView);
            tvDesc = itemView.findViewById(R.id.tvSummaryDesc);
            tvAmount = itemView.findViewById(R.id.tvSummaryAmount);
        }
    }

    static class ItemViewHolder extends RecyclerView.ViewHolder {
        TextView tvDesc, tvSub, tvAmount;
        ImageView imgIcon;
        View iconContainer;
        ItemViewHolder(View itemView) {
            super(itemView);
            tvDesc = itemView.findViewById(R.id.txvDeskripsi);
            tvSub = itemView.findViewById(R.id.tvSubDesc);
            tvAmount = itemView.findViewById(R.id.txvJumlah);
            imgIcon = itemView.findViewById(R.id.imgIcon);
            iconContainer = itemView.findViewById(R.id.iconContainer);
        }
    }
}
