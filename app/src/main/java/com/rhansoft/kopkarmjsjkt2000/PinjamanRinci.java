package com.rhansoft.kopkarmjsjkt2000;

public class PinjamanRinci {
    private String tglPinjaman, noReff, angsuranKe;
    private Double debit, kredit;

    public String getAngsuranKe() {
        return angsuranKe;
    }

    public void setAngsuranKe(String angsuranKe) {
        this.angsuranKe = angsuranKe;
    }

    public String getTglPinjaman() {
        return tglPinjaman;
    }

    public void setTglPinjaman(String tglPinjaman) {
        this.tglPinjaman = tglPinjaman;
    }

    public String getNoReff() {
        return noReff;
    }

    public void setNoReff(String noReff) {
        this.noReff = noReff;
    }

    public Double getDebit() {
        return debit;
    }

    public void setDebit(Double debit) {
        this.debit = debit;
    }

    public Double getKredit() {
        return kredit;
    }

    public void setKredit(Double kredit) {
        this.kredit = kredit;
    }
}
