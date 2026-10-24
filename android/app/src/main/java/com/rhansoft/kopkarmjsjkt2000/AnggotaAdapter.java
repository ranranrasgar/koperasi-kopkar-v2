package com.rhansoft.kopkarmjsjkt2000;

import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Filter;
import android.widget.Filterable;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

public class AnggotaAdapter extends RecyclerView.Adapter<AnggotaAdapter.ViewHolder>
        implements Filterable {
    private Context context;
    private List<Anggota> listAnggota;
    private List<Anggota> filteredListAnggota;

    public AnggotaAdapter(Context context, List listAnggota) {
        this.context = context;
        this.listAnggota = listAnggota;
        this.filteredListAnggota = listAnggota;
    }

    @Override
    public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.single_list_item, parent, false);
        ViewHolder viewHolder = new ViewHolder(v);
        return viewHolder;
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        holder.itemView.setTag(filteredListAnggota.get(position));

        Anggota a = filteredListAnggota.get(position);

        holder.pName.setText(a.getNama());
        holder.pKdAnggota.setText(a.getKdAnggota());
    }

    @Override
    public int getItemCount() {
        //Log.i("getItemCount", String.valueOf(filteredListAnggota.size()));
        return filteredListAnggota.size();
    }

    @Override
    public Filter getFilter() {
        return new Filter() {
            @Override
            protected FilterResults performFiltering(CharSequence charSequence) {
                String charString = charSequence.toString();
                if(charString.isEmpty()) {
                    filteredListAnggota = listAnggota;
                } else {
                    List<Anggota> filteredList = new ArrayList<>();
                    for(Anggota row: listAnggota) {
                        if(row.getNama().toLowerCase().contains(charString.toLowerCase()) ||
                                row.getKdAnggota().toLowerCase().contains(charString.toLowerCase())) {
                            filteredList.add(row);
                        }
                    }

                    filteredListAnggota = filteredList;
                }

                FilterResults filterResults = new FilterResults();
                filterResults.values = filteredListAnggota;
                return filterResults;
            }

            @Override
            protected void publishResults(CharSequence charSequence, FilterResults filterResults) {
                filteredListAnggota = (ArrayList<Anggota>) filterResults.values;
                notifyDataSetChanged();
            }
        };
    }

    public class ViewHolder extends RecyclerView.ViewHolder{

        public TextView pName;
        public TextView pKdAnggota;

        public ViewHolder(final View itemView) {
            super(itemView);

            pName = (TextView) itemView.findViewById(R.id.pNametxt);
            pKdAnggota = (TextView) itemView.findViewById(R.id.pKdAnggotatxt);

            itemView.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {

                    Anggota a = (Anggota) view.getTag();

                    //Toast.makeText(view.getContext(), a.getNama()+" - "+ a.getKdAnggota(), Toast.LENGTH_LONG).show();
                    Intent i = new Intent(context, DetailAnggota.class);
                    i.putExtra("kdAnggota", a.getKdAnggota());
                    i.putExtra("nama", a.getNama());
                    i.putExtra("tglDaftar", a.getTglDaftar());
                    i.putExtra("nik", a.getNik());
                    i.putExtra("jnsKelamin", a.getJnsKelamain());
                    i.putExtra("alamat", a.getAlamat());
                    i.putExtra("kota", a.getKota());
                    i.putExtra("kodePos", a.getKodePos());
                    i.putExtra("tlpRumah", a.getTlpRumah());
                    i.putExtra("hp", a.getHp());
                    i.putExtra("noKtp", a.getNoKtp());
                    i.putExtra("noSim", a.getNoSim());
                    i.putExtra("status", a.getStatus());
                    i.putExtra("namaIstriSuami", a.getNamaIstriSuami());
                    i.putExtra("jmlTanggungan", a.getJmlTanggungan());
                    i.putExtra("jmlAnak", a.getJmlAnak());
                    i.putExtra("statusStaff", a.getStatusStaff());
                    i.putExtra("agtNonAgt", a.getAgtNonAgt());
                    i.putExtra("rpGrade", a.getRpGrade());
                    i.putExtra("grade", a.getGrade());
                    i.putExtra("simpananPokok", a.getSimpananPokok());
                    i.putExtra("simpananWajib", a.getSimpananWajib());
                    i.putExtra("simpananSukarela", a.getSimpananSukarela());
                    i.putExtra("pekerjaan", a.getPekerjaan());
                    i.putExtra("alamatKerja", a.getAlamatKerja());
                    i.putExtra("namaPerusahaan", a.getNamaPerusahaan());
                    i.putExtra("jabatan", a.getJabatan());
                    i.putExtra("lamaBekerjaTahun", a.getLamaBekerjaTahun());
                    i.putExtra("lamaBekerjaBulan", a.getLamaBekerjaBulan());
                    i.putExtra("tlpKantor", a.getTlpKantor());
                    i.putExtra("npwp", a.getNpwp());
                    i.putExtra("fasilitasListrik", a.getFasilitasListrik());
                    i.putExtra("fasilitasPdam", a.getFasilitasPdam());
                    i.putExtra("fasilitasLainLain", a.getFasilitasLainLain());
                    i.putExtra("lamaMenempatiTahun", a.getLamaMenempatiTahun());
                    i.putExtra("lamaMenempatiBulan", a.getLamaMenempatiBulan());
                    i.putExtra("bankNoRek", a.getBankNoRek());
                    i.putExtra("bankNama", a.getBankNama());
                    i.putExtra("bankAtasNama", a.getBankAtasNama());

                    context.startActivity(i);
                }
            });

        }
    }
}
