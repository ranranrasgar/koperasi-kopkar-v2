/**
 * Pilihan Flag (kolom perkiraan.keterangan) saat menambah akun COA, sama dengan form desktop. BANK/GC membuat akun muncul
 * di Bank Book dan pilihan kas; flag sistem tutup buku (Laba Ditahan, Hutang Pajak, Laba Berjalan) sengaja tidak ditawarkan
 * karena dicari per akun tunggal oleh posting SHU.
 */
export const FLAG_COA = [
    { value: "-", label: "- (akun biasa)" },
    { value: "BANK", label: "BANK (kas/bank, muncul di Bank Book)" },
    { value: "GC", label: "GC (giro/cek, muncul di Bank Book)" },
] as const
