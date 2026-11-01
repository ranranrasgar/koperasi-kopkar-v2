# Handoff

## Status Terakhir

- Branch aktif: `main`
- Commit terakhir: `feat(master): tambah aksi ubah/status/hapus pada Anggota, Karyawan Mattel, dan COA`
- Sinkronisasi remote: Siap di-push ke `origin/main` (`https://github.com/ranranrasgar/koperasi-kopkar-v2.git`).
- Status verifikasi:
  - Typecheck (`npm run typecheck`) lulus bersih (0 error).
  - Seluruh file kode `<= 500 LOC` (terbesar ~260 baris pada `modules.ts`).
  - Git diff whitespace check lulus.
- Tugas berikutnya:
  - Uji alur edit data, keluar/aktifkan status, dan validasi penghapusan di browser saat terautentikasi sebagai operator.

---

## Riwayat Perubahan (terbaru di atas)

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
