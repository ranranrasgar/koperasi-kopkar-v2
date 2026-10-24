package com.rhansoft.kopkarmjsjkt2000;

public class JenisKredit {
    private String kodeKredit, namaKredit;
    private Double bunga, persenAdm, persenProvisi, persenDenda;
    private String kunciStaff, kunciGrade, kunciSaldo;
    private int maxCicilan;

    public String getKodeKredit() {
        return kodeKredit;
    }

    public void setKodeKredit(String kodeKredit) {
        this.kodeKredit = kodeKredit;
    }

    public String getNamaKredit() {
        return namaKredit;
    }

    public void setNamaKredit(String namaKredit) {
        this.namaKredit = namaKredit;
    }

    public Double getBunga() {
        return bunga;
    }

    public void setBunga(Double bunga) {
        this.bunga = bunga;
    }

    public Double getPersenAdm() { return persenAdm; }

    public void setPersenAdm(Double persenAdm) { this.persenAdm = persenAdm; }

    public Double getPersenProvisi() { return persenProvisi; }

    public void setPersenProvisi(Double persenProvisi) {
        this.persenProvisi = persenProvisi;
    }

    public Double getPersenDenda() { return persenDenda; }

    public void setPersenDenda(Double persenDenda) { this.persenDenda = persenDenda; }

    public String getKunciStaff() {
        return kunciStaff;
    }

    public void setKunciStaff(String kunciStaff) {
        this.kunciStaff = kunciStaff;
    }

    public String getKunciGrade() { return kunciGrade; }

    public void setKunciGrade(String kunciGrade) { this.kunciGrade = kunciGrade; }

    public String getKunciSaldo() { return kunciSaldo; }

    public void setKunciSaldo(String kunciSaldo) { this.kunciSaldo = kunciSaldo; }

    public int getMaxCicilan() { return maxCicilan; }

    public void setMaxCicilan(int maxCicilan) { this.maxCicilan = maxCicilan; }

    @Override
    public String toString() {
        return namaKredit;
    }
}
