package com.rhansoft.kopkarmjsjkt2000;

public class Pinjaman {
    private String namaAgt;
    private String tglPinjaman;
    private String noPinjaman;
    private String jenisKredit;
    private Double pinjamanPokok;
    private Double saldo;
    private Double bunga;
    private Double persenBunga;
    private Integer lamaAngsuran;
    private Integer angsuranKe;

    public String getNamaAgt() {
        return namaAgt;
    }

    public void setNamaAgt(String namaAgt) {
        this.namaAgt = namaAgt;
    }

    public String getTglPinjaman() {
        return tglPinjaman;
    }

    public void setTglPinjaman(String tglPinjaman) {
        this.tglPinjaman = tglPinjaman;
    }

    public String getNoPinjaman() {
        return noPinjaman;
    }

    public void setNoPinjaman(String noPinjaman) {
        this.noPinjaman = noPinjaman;
    }

    public String getJenisKredit() {
        return jenisKredit;
    }

    public void setJenisKredit(String jenisKredit) {
        this.jenisKredit = jenisKredit;
    }

    public Double getPinjamanPokok() {
        return pinjamanPokok;
    }

    public void setPinjamanPokok(Double pinjamanPokok) {
        this.pinjamanPokok = pinjamanPokok;
    }

    public Double getSaldo() {
        return saldo;
    }

    public void setSaldo(Double saldo) {
        this.saldo = saldo;
    }


    public Double getBunga() {
        return bunga;
    }

    public void setBunga(Double bunga) {
        this.bunga = bunga;
    }

    public Double getPersenBunga() {
        return persenBunga;
    }

    public void setPersenBunga(Double persenBunga) {
        this.persenBunga = persenBunga;
    }

    public Integer getLamaAngsuran() { return lamaAngsuran; }

    public void setLamaAngsuran(Integer lamaAngsuran) {
        this.lamaAngsuran = lamaAngsuran;
    }

    public Integer getAngsuranKe() {
        return angsuranKe;
    }

    public void setAngsuranKe(Integer angsuranKe) {
        this.angsuranKe = angsuranKe;
    }

    public Double getTotalPinjaman() {
        Double totPinjaman = this.pinjamanPokok + this.bunga;
        return totPinjaman;
    }
}
