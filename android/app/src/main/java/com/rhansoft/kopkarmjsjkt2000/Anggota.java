package com.rhansoft.kopkarmjsjkt2000;

public class Anggota {
    private String nama, kdAnggota, tglDaftar, nik, jnsKelamain, alamat, kota, kodePos,
            tlpRumah, hp, noKtp, noSim, status, namaIstriSuami, jmlTanggungan, jmlAnak,
            statusStaff, agtNonAgt, grade, pekerjaan, alamatKerja, namaPerusahaan, jabatan,
            lamaBekerjaTahun, lamaBekerjaBulan, tlpKantor, npwp, fasilitasListrik, fasilitasPdam,
            fasilitasLainLain, lamaMenempatiTahun, lamaMenempatiBulan, bankNoRek, bankNama, bankAtasNama;
    private Double rpGrade, simpananPokok, simpananWajib, simpananSukarela;

    public String getNama() {
        return nama;
    }

    public void setNama(String nama) {
        this.nama = nama;
    }

    public String getKdAnggota() {
        return this.kdAnggota;
    }                  

    public void setKdAnggota(String kdAnggota) {
        this.kdAnggota = kdAnggota;
    }

    public String getTglDaftar() { return tglDaftar; }

    public void setTglDaftar(String tglDaftar) {
        this.tglDaftar = tglDaftar;
    }

    public String getNik() {
        return nik;
    }

    public void setNik(String nik) {
        this.nik = nik;
    }

    public String getJnsKelamain() {
        return jnsKelamain;
    }

    public void setJnsKelamain(String jnsKelamain) {
        this.jnsKelamain = jnsKelamain;
    }

    public String getAlamat() { return alamat; }
    public void setAlamat(String alamat) { this.alamat = alamat; }

    public String getKota() { return kota; }
    public void setKota(String kota) { this.kota = kota; }

    public String getKodePos() { return kodePos; }
    public void setKodePos(String kodePos) { this.kodePos = kodePos; }

    public String getTlpRumah() { return tlpRumah; }
    public void setTlpRumah(String tlpRumah) { this.tlpRumah = tlpRumah; }

    public String getHp() { return hp; }
    public void setHp(String hp) { this.hp = hp; }

    public String getNoKtp() { return noKtp; }
    public void setNoKtp(String noKtp) { this.noKtp = noKtp; }

    public String getNoSim() { return noSim; }
    public void setNoSim(String noSim) { this.noSim = noSim; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNamaIstriSuami() { return namaIstriSuami; }
    public void setNamaIstriSuami(String namaIstriSuami) { this.namaIstriSuami = namaIstriSuami; }

    public String getJmlTanggungan() { return jmlTanggungan; }
    public void setJmlTanggungan(String jmlTanggungan) { this.jmlTanggungan = jmlTanggungan; }

    public String getJmlAnak() { return jmlAnak; }
    public void setJmlAnak(String jmlAnak) { this.jmlAnak = jmlAnak; }

    public String getStatusStaff() { return statusStaff; }
    public void setStatusStaff(String statusStaff) { this.statusStaff = statusStaff; }

    public String getAgtNonAgt() { return agtNonAgt; }
    public void setAgtNonAgt(String agtNonAgt) { this.agtNonAgt = agtNonAgt; }

    public Double getRpGrade() { return rpGrade; }
    public void setRpGrade(Double rpGrade) { this.rpGrade = rpGrade; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public Double getSimpananPokok() { return simpananPokok; }
    public void setSimpananPokok(Double simpananPokok) { this.simpananPokok = simpananPokok; }

    public Double getSimpananWajib() { return simpananWajib; }
    public void setSimpananWajib(Double simpananWajib) { this.simpananWajib = simpananWajib; }

    public Double getSimpananSukarela() { return simpananSukarela; }
    public void setSimpananSukarela(Double simpananSukarela) { this.simpananSukarela = simpananSukarela; }

    public String getPekerjaan() { return pekerjaan; }
    public void setPekerjaan(String pekerjaan) { this.pekerjaan = pekerjaan; }

    public String getAlamatKerja() { return alamatKerja; }
    public void setAlamatKerja(String alamatKerja) { this.alamatKerja = alamatKerja; }

    public String getNamaPerusahaan() { return namaPerusahaan; }
    public void setNamaPerusahaan(String namaPerusahaan) { this.namaPerusahaan = namaPerusahaan; }

    public String getJabatan() { return jabatan; }
    public void setJabatan(String jabatan) { this.jabatan = jabatan; }

    public String getLamaBekerjaTahun() { return lamaBekerjaTahun; }
    public void setLamaBekerjaTahun(String lamaBekerjaTahun) { this.lamaBekerjaTahun = lamaBekerjaTahun; }

    public String getLamaBekerjaBulan() { return lamaBekerjaBulan; }
    public void setLamaBekerjaBulan(String lamaBekerjaBulan) { this.lamaBekerjaBulan = lamaBekerjaBulan; }

    public String getTlpKantor() { return tlpKantor; }
    public void setTlpKantor(String tlpKantor) { this.tlpKantor = tlpKantor; }

    public String getNpwp() { return npwp; }
    public void setNpwp(String npwp) { this.npwp = npwp; }

    public String getFasilitasListrik() { return fasilitasListrik; }
    public void setFasilitasListrik(String fasilitasListrik) { this.fasilitasListrik = fasilitasListrik; }

    public String getFasilitasPdam() { return fasilitasPdam; }
    public void setFasilitasPdam(String fasilitasPdam) { this.fasilitasPdam = fasilitasPdam; }

    public String getFasilitasLainLain() { return fasilitasLainLain; }
    public void setFasilitasLainLain(String fasilitasLainLain) { this.fasilitasLainLain = fasilitasLainLain; }

    public String getLamaMenempatiTahun() { return lamaMenempatiTahun; }
    public void setLamaMenempatiTahun(String lamaMenempatiTahun) { this.lamaMenempatiTahun = lamaMenempatiTahun; }

    public String getLamaMenempatiBulan() { return lamaMenempatiBulan; }
    public void setLamaMenempatiBulan(String lamaMenempatiBulan) { this.lamaMenempatiBulan = lamaMenempatiBulan; }

    public String getBankNoRek() { return bankNoRek; }
    public void setBankNoRek(String bankNoRek) { this.bankNoRek = bankNoRek; }

    public String getBankNama() { return bankNama; }
    public void setBankNama(String bankNama) { this.bankNama = bankNama; }

    public String getBankAtasNama() { return bankAtasNama; }
    public void setBankAtasNama(String bankAtasNama) { this.bankAtasNama = bankAtasNama; }

}
