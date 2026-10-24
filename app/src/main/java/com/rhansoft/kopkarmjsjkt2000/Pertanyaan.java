package com.rhansoft.kopkarmjsjkt2000;

public class Pertanyaan {
    private int idPertanyaan;
    private String pertanyaan;

    public int getIdPertanyaan() {
        return idPertanyaan;
    }

    public void setIdPertanyaan(int idPertanyaan) {
        this.idPertanyaan = idPertanyaan;
    }

    public String getPertanyaan() {
        return pertanyaan;
    }

    public void setPertanyaan(String pertanyaan) {
        this.pertanyaan = pertanyaan;
    }

    @Override
    public String toString() {
        return pertanyaan;
    }
}
