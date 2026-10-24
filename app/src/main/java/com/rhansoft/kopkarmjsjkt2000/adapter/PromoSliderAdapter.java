package com.rhansoft.kopkarmjsjkt2000.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.rhansoft.kopkarmjsjkt2000.Promo;
import com.rhansoft.kopkarmjsjkt2000.R;
import com.rhansoft.kopkarmjsjkt2000.util.Api;

import java.util.List;

public class PromoSliderAdapter extends RecyclerView.Adapter<PromoSliderAdapter.SliderViewHolder> {

    private List<Promo> promoList;
    private OnPromoClickListener listener;

    public interface OnPromoClickListener {
        void onPromoClick(Promo promo);
    }

    public PromoSliderAdapter(List<Promo> promoList, OnPromoClickListener listener) {
        this.promoList = promoList;
        this.listener = listener;
    }

    @NonNull
    @Override
    public SliderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_promo_slider, parent, false);
        return new SliderViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull SliderViewHolder holder, int position) {
        Promo promo = promoList.get(position);
        String imageUrl = Api.IMAGE_PATH + "slide_promo/" + promo.getImage();
        
        Glide.with(holder.imageView.getContext())
                .load(imageUrl)
                .placeholder(R.drawable.potongan)
                .error(R.drawable.potongan)
                .into(holder.imageView);

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onPromoClick(promo);
        });
    }

    @Override
    public int getItemCount() {
        return promoList.size();
    }

    static class SliderViewHolder extends RecyclerView.ViewHolder {
        ImageView imageView;

        public SliderViewHolder(@NonNull View itemView) {
            super(itemView);
            imageView = itemView.findViewById(R.id.imgSlider);
        }
    }
}
