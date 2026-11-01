# Handoff

## Status Terakhir

- Branch aktif: `main`
- Commit terakhir: `perf(coa): optimasi pemuatan bagan akun dan daftar anggota`
- Sinkronisasi remote: Siap di-push ke `origin/main` (`https://github.com/ranranrasgar/koperasi-kopkar-v2.git`).
- Status verifikasi:
  - Typecheck (`npm run typecheck`) lulus bersih (0 error).
  - Seluruh file kode `<= 500 LOC` (terbesar ~232 baris pada `laporan.ts`).
  - Git diff whitespace check lulus.
- Tugas berikutnya:
  - Pengguna melakukan git pull & update di VPS server.

---

## Riwayat Perubahan (terbaru di atas)

### 1 Nov 2026 - Optimasi Kecepatan Halaman COA (/dashboard/accounting/coa) dan Anggota
- **Apa & Mengapa**:
  - Mengatasi masalah pemuatan sangat lambat pada halaman COA (`/dashboard/accounting/coa`):
    1. **Eliminasi Subquery Berat COA**: Menghapus correlated subquery `akunCoaBisaDihapus` pada `pohonCoa()` dan `daftarCoa()` yang sebelumnya memindai 1,1 juta baris `jurnal_umum` sebanyak ~300 kali untuk setiap baris akun perkiraan (terutama akun induk yang tidak pernah dijurnal).
    2. **Perhitungan Status Hapus O(1)**: Status disable tombol hapus pada pohon COA dihitung langsung di sisi client berdasarkan struktur data in-memory (`!induk && rp_saldo_awal === 0 && saldo === 0`), sementara validasi integritas database komprehensif tetap terlindungi 100% pada server action `hapusCoaAction` saat aksi hapus dieksekusi.
    3. **Query Saldo Akhir Ringan (`saldoAkhirPerAkun`)**: Menambahkan fungsi khusus `saldoAkhirPerAkun` yang hanya melakukan agregasi penutup jurnal tanggal berjalan menggunakan index-only scan `ix_jurnal_umum_tanggal_cover`, tanpa CTE multi-kolom dan join tabel yang tidak dibutuhkan oleh pohon COA.
    4. **Optimasi Count Daftar Anggota**: Memindahkan kolom `_bisa_hapus` pada `daftarAnggota` ke opsi `kolomHalaman` agar tidak dievaluasi pada `COUNT(*)` seluruh data anggota.
- **File Utama yang Tersentuh**:
  - `frontend/src/lib/queries/akuntansi.ts` (Penyederhanaan `pohonCoa()` dan `daftarCoa()`)
  - `frontend/src/lib/queries/laporan.ts` (Implementasi `saldoAkhirPerAkun()`)
  - `frontend/src/app/dashboard/accounting/coa/page.tsx` (Menggunakan `saldoAkhirPerAkun()`)
  - `frontend/src/components/akuntansi/PohonCoa.tsx` (Evaluasi `_bisa_hapus` berbasis relasi pohon & saldo)
  - `frontend/src/lib/queries/anggota.ts` (Pindahkan `_bisa_hapus` ke `kolomHalaman`)
- **Tindakan Lanjutan**:
  - Pull ke VPS dan restart container Next.js.

### 1 Nov 2026 - Aksi Ubah, Status, dan Hapus pada Anggota, Karyawan Mattel, dan COA Master
- **Apa & Mengapa**:
  - Menambahkan aksi interaktif langsung pada daftar master data:
    1. **Anggota** (`/dashboard/members`): Tombol aksi ubah data profil anggota, ubah status keanggotaan (keluar/aktifkan kembali dengan alasan), dan hapus anggota (dengan proteksi integritas: ditolak jika memiliki riwayat simpanan, pinjaman, belanja, atau piutang).
    2. **Karyawan Mattel** (`/dashboard/members/karyawan-mattel`): Aksi edit data karyawan Mattel dan hapus data jika tidak terikat ke anggota aktif.
    3. **Bagan Akun / COA** (`/dashboard/accounting/coa`): Aksi ubah nama/kategori akun dan hapus akun COA (ditolak jika memiliki anak akun / sub-akun atau memiliki mutasi pada jurnal buku besar).
  - Tampilan COA diperbarui sehingga tombol aksi muncul baik pada mode tampilan pohon hierarkis (`PohonCoa.tsx`) maupun mode tabel.
  - Menambahkan artikel panduan master COA (`database/panduan/07-akuntansi/09-coa-master.md`) dan memperbarui panduan keanggotaan.
- **File Utama yang Tersentuh**:
  - `frontend/src/app/actions/master-aksi.ts` (Server actions aksi mutasi & validasi integritas relasi DB)
  - `frontend/src/components/master/FormEdit.tsx` (Form modal edit generik terstandarisasi)
  - `frontend/src/components/master/AksiAnggota.tsx`, `AksiKaryawanMattel.tsx`, `AksiCoa.tsx` (Komponen trigger dialog aksi baris tabel/pohon)
  - `frontend/src/components/akuntansi/PohonCoa.tsx` (Integrasi aksi pada baris pohon COA)
  - `frontend/src/app/dashboard/accounting/coa/page.tsx`
  - `frontend/src/app/dashboard/members/page.tsx`
  - `frontend/src/app/dashboard/members/karyawan-mattel/page.tsx`
  - `frontend/src/lib/queries/` (`akuntansi.ts`, `anggota.ts`, `keanggotaan.ts`)
  - `database/panduan/` (`03-keanggotaan/*.md`, `07-akuntansi/09-coa-master.md`)
- **Tindakan Lanjutan**:
  - Tidak ada migrasi DB skema baru yang dibutuhkan (menggunakan skema tabel eksisting).
