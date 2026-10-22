# WORKLOG

Log kerja untuk agent berikutnya. **Entri terbaru di paling atas.** Tiap entri: apa yang dikerjakan, cara verifikasi dan hasilnya, apa yang tersisa, jebakan yang ditemukan. Jangan menghapus entri lama.

## Status ringkas (perbarui setiap sesi)
- Backend (mesin posting) + mobile-api: selesai dan lolos uji (14 + 3).
- Frontend: semua item menu sudah punya halaman (tidak ada lagi `locked`). Halaman absensi hanya placeholder (data tidak dimigrasi).
- Semua pekerjaan frontend sudah di-commit di `master` (8 commit per kelompok mulai 19dfe4a, terakhir "docs: CLAUDE.md dan WORKLOG"), belum di-push.
- Form master dan pengajuan ikut mode uji (`tx()`). Yang belum diuji: tombol cetak.
- Database uji terpisah tersedia: `npm run uji:reset` lalu `npm run dev:uji` (port 3101), lihat entri 2026-10-22 (larut).
- Pusat Panduan (`/dashboard/panduan`) dan Kelola Panduan sudah ada; 9 kategori, 35 artikel terpasang di `kopkar_mjs_2000` (commit 5bf70d9).
- Mode uji/live diatur dari **Sistem & Pengaturan → Mode Uji / Live** (admin + superadmin), bukan lagi `.env.local`. Database asli saat ini mode **Uji**.

---

## 2026-10-22 (larut, 3) — Saklar mode Uji / Live di pengaturan

**Permintaan pengguna:** mode uji dinyalakan/dimatikan dari pengaturan, bukan `.env.local`; hanya grup admin dan superadmin.

**Dibuat/diubah:**
- Tabel `pengaturan_web` (kunci/nilai, `database/postgres/pengaturan-web.sql`), dipasang dengan `npm run pengaturan:pasang`. Skrip yang sama memberi grup `admin` izin menu `Mode Aplikasi (web)` di `opr_hak_akses`. Nilai awal diambil dari env atau `--mode=uji|live`, dan nilai yang sudah ada tidak diubah.
- `lib/db.ts`:
  - `modeUji` dari konstanta menjadi `async modeUji()` / `modeAplikasi()` yang membaca database setiap transaksi.
  - `KOPKAR_UJI_ROLLBACK=1/0` di env mengunci mode (`modeUjiTerkunci`).
  - Tabel belum ada dianggap live.
- Semua action (`transaksi`, `master`, `pengajuan`, `panduan`) memakai `await modeUji()`.
- Banner kuning: teks tanpa nama env, plus tautan "Ubah ke Live" bagi yang berizin.
- Halaman `/dashboard/settings/mode` (`SaklarMode`, `actions/mode.ts`): saklar geser dua posisi dengan konfirmasi, info terakhir diubah, tabel perbedaan, dan status terkunci bila env diisi. Saklar menulis langsung (bukan `tx()`), jadi tetap tersimpan saat mode uji.
- `frontend/.env.local`: baris `KOPKAR_UJI_ROLLBACK=1` dihapus supaya saklar berlaku. Database asli dipasang dengan mode awal Uji, jadi perilakunya sama seperti sebelumnya.
- Panduan *Mode uji dan database uji* dan *Hak akses* diperbarui di file isi awal dan di kedua database (hanya karena `diubah_oleh = 'isi awal'`).

**Verifikasi di server utama:**
- Banner dan tautan tampil.
- Simpan jenis simpanan → "MODE UJI, tidak tersimpan".
- Geser ke Live: konfirmasi muncul, banner hilang tanpa restart.
- Geser kembali ke Uji: tercatat oleh superadmin 17:38; `pengaturan_web.mode_uji = 1`.
- Izin di database: hanya grup admin bernilai T.
- Typecheck lolos.
- **Tidak diuji di UI:** login sebagai operator admin (di database asli tidak ada operator admin yang punya password), dan tampilan saklar terkunci di server uji.

**Insiden disk penuh (C: 0 MB):**
- Penyebab: disk memang hampir penuh, ditambah cache Turbopack `.next/dev/cache` 2,1 GB, `.next-uji` 433 MB, dan database uji 582 MB.
- `.next-uji` dan `.next/dev/cache` dihapus (cache, dibuat ulang); server uji dihentikan, server utama dijalankan ulang. Sisa disk sekitar 2,5 GB.
- Satu Edit gagal (ENOSPC) tanpa merusak file.
- Jebakan saat menghapus baris env: `Set-Content -Encoding utf8` di PowerShell 5.1 menambah BOM ke `.env.local`, sehingga `PG_URL` tidak terbaca. BOM sudah dibuang.
- Typecheck sempat gagal karena `.next/types/routes.d.ts` usang (14:43) bertabrakan dengan `.next/dev/types`; diperbaiki dengan `npx next typegen`.

---

## 2026-10-22 (larut, 2) — Pusat Panduan dan kelola panduan

**Dibuat:**
- **Tabel** `panduan_kategori` dan `panduan` (`database/postgres/panduan.sql`), dipasang `npm run panduan:pasang` (`panduan-pasang.mjs`). Isi awal ditulis sebagai Markdown di `database/panduan/` (frontmatter `judul`, `ringkasan`, `menu`; urutan dari awalan angka nama file).
- **Halaman baca** `(baca)/page.tsx` dan `(baca)/[slug]/page.tsx` di `app/dashboard/panduan`, gaya pusat bantuan:
  - navigasi kiri per kategori (lipat di bawah 1280 px)
  - indeks dengan pencarian (`?q=`, judul/ringkasan/isi dengan cuplikan)
  - artikel dengan daftar isi "Di halaman ini", tombol ke halaman terkait, cetak, dan Sebelumnya/Berikutnya
- **Kelola** `/dashboard/panduan/kelola` (+ `artikel/baru`, `artikel/[id]`):
  - CRUD artikel dan kategori; terbit/draf
  - editor dengan toolbar format dan tab Pratinjau
  - `actions/panduan.ts` lewat `tx()`, jadi ikut mode uji
- **Izin**: menu web `Kelola Panduan (web)` (`MENU.kelolaPanduan`); superadmin otomatis, grup lain lewat matriks hak akses. Membaca terbuka untuk semua operator yang login.
- **Tombol "?" di navbar**: `/dashboard/panduan?untuk=<path>` → artikel dengan `href_menu` cocok persis, atau halaman induk terpanjang. `/dashboard` hanya cocok persis.
- **Render Markdown**: `react-markdown@10.1.0` + `remark-gfm@4.0.1` (`components/panduan/IsiPanduan.tsx`). HTML mentah tidak dirender. Kotak `> **Penting:**` merah, `> **Catatan:**`/`> **Tips:**` biru.

**Isi panduan diverifikasi ke kode/data.** Angka contoh pinjaman dihitung dengan `pinjaman-calc.ts`; nomor bukti, pesan galat, dan aturan dari mesin posting dan actions. Klaim yang ternyata salah saat dicek dan sudah dibetulkan:
- produk *hide* tetap muncul di form pencairan (bertanda *[disembunyikan]*)
- form simpanan tidak menampilkan pinjaman berjalan
- tombol mata di tabel membuka dialog Detail
- Kredit Macet mencakup KPR
- pencarian Daftar Pinjaman memakai pilihan kolom

Arti kolom SHU Jasa Uang/Barang tidak bisa dipastikan dari kode web (hasil hitung desktop), jadi ditulis netral.

**Verifikasi** (server uji 3101, lalu database asli):
- Tombol "?" dari 7 halaman mengarah ke artikel yang benar, termasuk `/journal/new` → jurnal-umum. Pertama kali escrow salah ke Daftar pinjaman, lalu artikel titipan dan kredit macet dipisah.
- Pencarian: "pengambilan" 8 hasil, "provisi" 7 hasil. Slug tidak ada → 404; id tidak ada → 404.
- Editor (artikel 104):
  - slug otomatis; toolbar; pratinjau sama dengan halaman baca
  - simpan baru → dialihkan ke halaman ubah dengan pesan
  - sembunyikan → pembaca 404 dan hilang dari navigasi
  - hapus artikel
  - kategori baru (slug `&` → `dan`); hapus kategori berisi artikel ditolak; hapus kategori kosong
  - slug ganda dan slug tidak valid ditolak, isian tetap
- Bug toolbar ditemukan saat uji dan diperbaiki: blok yang disisipkan saat placeholder tabel masih terpilih memotong baris tabel. Sekarang blok disisipkan di akhir baris kursor.
- Operator grup Pengawas (password acak sementara hanya di database uji, lalu `uji:reset`): bisa membaca, tidak melihat tautan kelola/Ubah, ketiga halaman kelola → `/dashboard?akses=ditolak`.
- Mode gelap dicek. Typecheck lolos.
- Database asli: halaman menampilkan petunjuk "belum dipasang" sebelum `panduan:pasang`, lalu terisi 35 artikel.

**Catatan:**
- `npm audit`: 5 temuan bawaan (next, postcss, sharp, typography), bukan dari paket Markdown. `next` punya celah kritis "Proxy bypass" pada Turbopack; halaman dan actions tetap memeriksa sesi ulang di server.
- Isi panduan perlu diperbarui saat aturan transaksi berubah; artikel ada di `database/panduan` (bawaan) dan di database (suntingan admin).

---

## 2026-10-22 (larut) — Database uji dan server uji terpisah

**Kebutuhan.** Mode uji (rollback per simpan) tidak bisa dipakai menelusuri alur antar halaman (pencairan pinjaman -> daftar pinjaman -> jurnal -> buku besar -> neraca), karena data tidak pernah tersimpan.

**Dibuat:**
- `database/postgres/uji-reset.mjs` (`npm run uji:reset`): DROP ... WITH (FORCE) lalu CREATE `<db>_uji`, pg_dump format direktori paralel, lalu pg_restore, lalu cocokkan jumlah baris 6 tabel. Nama tujuan wajib berakhiran `_uji`, di server yang sama. pg_dump dicari di `KOPKAR_PG_BIN`, Laragon (`C:/laragon/bin/postgresql/*/bin`), lalu PATH, dengan versi mayor sama dengan server. `CREATE DATABASE ... TEMPLATE` tidak dipakai karena butuh nol koneksi ke database asli.
- `frontend/scripts/dev-uji.mjs` (`npm run dev:uji`): next dev port 3101 dengan env `PG_URL` ke database uji (process.env mengalahkan .env.local), `KOPKAR_UJI_ROLLBACK=0`, `KOPKAR_SERVER_UJI`, dan `KOPKAR_DIST_DIR=.next-uji`.
- `next.config.ts`: `distDir` dan `typescript.tsconfigPath` dari env. Ini perlu karena `.next/dev/lock` menolak dev server kedua, dan tanpa tsconfig terpisah Next menulis ulang `tsconfig.json`.
- `lib/db.ts` `serverUji`; banner ungu di layout dashboard; judul tab diawali "[UJI]"; `lib/sesi.ts` nama cookie `kopkar_sesi_uji` di server uji (cookie tidak dibedakan per port).
- Script root `dev`, `dev:uji`, `uji:reset`; `.next-uji` di .gitignore.

**Verifikasi:**
- `uji:reset`: 29 detik, 6 tabel cocok (jurnal_umum 1.124.000).
- Server 3100 dan 3101 berjalan bersamaan.
- Ubah nama koperasi di 3101: tersimpan di `kopkar_mjs_2000_uji` saja, database asli dan server 3100 tetap "KOP - KAR MJS".
- `uji:reset` saat server uji hidup: server tetap jalan, log tanpa galat, data kembali seperti asli.
- `tsconfig.json` tidak berubah saat dev:uji dijalankan. Typecheck lolos.

## 2026-10-22 (malam) — Verifikasi laporan akuntansi terhadap tutup buku desktop

**Paritas saldo (model `saldoPerAkun` di `lib/queries/laporan.ts`).** Saldo akhir tiap akun tahun Y dibandingkan dengan baris saldo pembuka TBT Y+1:
- 2024 -> 2025-01-01: 123 akun, **0 selisih**.
- 2025 -> 2026-01-01: 125 akun, **0 selisih** kecuali akun `0` (lihat di bawah). Bank OCBC 1.1.01.41 = 9.952.969.417,09 di kedua sisi.
- 2018-2023: 4-10 akun berselisih per tahun (data lama diubah setelah tutup buku di desktop). Model hanya dijamin untuk 2024 ke atas.

**Rugi laba.** SHU web (klasifikasi 40/50, tanpa TBT) sama dengan nilai yang ditutup jurnal TBT 31-12: 2024 = 1.462.648.154,66 dan 2025 = 1.703.638.348,53, selisih 0. Tahun 2023 berselisih 508.078 (akun 6.0.00.13, data lama).

**Akun `0` (data asal, bukan bug).** Ada 307 baris `jurnal_umum` dengan `kode_perkiraan = '0'` (2025-2026, opr subigbyo/rohimah). Hampir semuanya bernilai 0. Ada 4 bukti yang membuat jurnal tidak seimbang:
- BB/250814/002: 159
- BB/250901/002: 18.100.000
- BB/251222/002: 8.230.000
- BB/260211/005: 17.650.000

Neraca saldo dan neraca menampilkannya sebagai "(akun tidak ada di COA)" dengan peringatan selisih. Bukti ini perlu dibetulkan akunnya oleh pengguna/akuntan. Sisa selisih kecil sekitar 3.468 berasal dari pembulatan jurnal lama sebelum 2019.

**Typecheck frontend:** lolos.

**Uji render halaman di balik login.** Dev server lama (PID 8396) macet: `/login` timeout dan CPU tinggi. Atas izin pengguna server dimatikan lalu dijalankan ulang (`npm run dev -w frontend`, port 3100).

Cara uji: cookie sesi superadmin dibuat dari `SESSION_SECRET` di `.env.local` untuk operator superadmin yang sudah ada, lalu setiap halaman diambil dengan GET. Tidak ada tulis ke database. Hasilnya:
- 25 halaman dashboard (semua halaman baru dan form transaksi) mengembalikan 200, tanpa redirect akses ditolak dan tanpa galat di log server. Semua menampilkan data.
- Halaman dengan parameter juga lolos:
  - kartu simpanan `?kode=2703-6506`
  - buku besar OCBC Desember 2025
  - neraca saldo 2025: OCBC akhir 9.952.969.417, peringatan selisih 26.333.627
  - neraca per 31-12-2025: aktiva 31.898.561.938, pasiva 31.898.558.470
  - rugi laba 2025: SHU 1.703.638.349

**Perbaikan:** teks peringatan di `accounting/reports` (neraca) sebelumnya menulis selisih 3.468 "termasuk" akun di luar COA. Faktanya akun `0` tidak masuk neraca sama sekali, jadi kalimatnya diubah menjadi "di luar itu ada saldo di akun yang tidak ada di COA dan tidak masuk neraca". Typecheck lolos.

**Form master dan pengajuan sekarang ikut mode uji.** Sebelumnya `actions/master.ts` dan `actions/pengajuan.ts` menulis lewat `query()` langsung, sehingga di mode `KOPKAR_UJI_ROLLBACK=1` perubahannya tetap tersimpan (banner "semua transaksi dibatalkan" menyesatkan). Perubahannya:
- Keduanya sekarang menulis lewat `tx()` dari `lib/db.ts`.
- Di mode uji pesan diberi awalan "MODE UJI, tidak tersimpan:" dan `revalidatePath` dilewati, sama dengan `transaksi.ts`.
- Di `master.ts`, `akun()` menerima `db`, dan empat lookup COA jenis pinjaman dijalankan berurutan (satu koneksi transaksi tidak bisa paralel).

**Perbaikan `components/master/FormEdit.tsx`.** Form memakai `<form action>`, sehingga React 19 mengosongkan semua isian saat validasi server menolak (contoh: kode dan nama jenis pinjaman baru hilang setelah "Tanggal jatuh tempo minimal 1"). Sekarang memakai `onSubmit` + `startTransition`, pola yang sama dengan `useAksiForm`.

**Uji di browser** (sesi superadmin uji, mode uji aktif). Semua menampilkan pesan "MODE UJI, tidak tersimpan":
- Simpan perusahaan.
- Ubah jenis simpanan.
- Ubah jenis pinjaman.
- Tambah jenis pinjaman `ZZ99`. Ditolak dulu karena validasi, isian tetap ada, lalu berhasil setelah tanggal diisi.
- Setujui pengajuan 0525-1889 dan tolak 0626-2033.

Sidik isi tabel `perusahaan`, `jenis_simpanan`, `jenis_kredit`, dan `pengajuan_pinjaman` sebelum dan sesudah uji: **identik**. Typecheck lolos.

**Masih belum diuji:** tombol cetak (`TombolCetak`), yang perlu dicek manual di browser (dialog print).

---

## 2026-10-22 (sore) — Audit v2, CLAUDE.md, dan verifikasi query halaman baru

**Konteks.** Sesi sebelumnya sempat bekerja di `Koperasi-Kopkar-Web` (aplikasi Next.js + Prisma lama). Itu proyek lama; **proyek aktif adalah `Koperasi-Kopkar-v2`** (monorepo backend/mobile-api/frontend, tanpa Prisma). Jangan melanjutkan pekerjaan di folder Web.

**Keadaan yang ditemukan di v2** (branch `master`, commit terakhir `ffd56ec` "grup superadmin..."): 37 entri perubahan belum di-commit, yaitu halaman-halaman yang sebelumnya `locked` di menu sekarang sudah dibuat:
- Anggota: `members/karyawan-mattel`, `members/mobile-users` (config di `modules.ts`, query di `lib/queries/keanggotaan.ts`).
- Simpanan: `savings/cards` (kartu simpanan), `savings/analytics` (grafik), `savings/time-deposits` (rekap berjangka) — `lib/queries/simpanan-lap.ts`.
- Pinjaman: `loans/apply` (pengajuan; setuju/tolak lewat `actions/pengajuan.ts`), `loans/escrow`, `loans/bad-debts` (tunggakan) — `lib/queries/pinjaman-lap.ts`.
- `deductions` (proyeksi potongan gaji), `shu`.
- Akuntansi: `accounting/ledger`, `trial-balance`, `reports` (neraca + rugi laba), `closing` — `lib/queries/laporan.ts`.
- Pengaturan: `settings`, `settings/jenis-pinjaman`, `settings/jenis-simpanan` (form edit lewat `components/master/*` dan `actions/master.ts`).
- `attendance`: placeholder saja (tabel absensi kosong dan tidak dimigrasi).
- `config/akses.ts` diperluas (`MENU` dan `AKSES_HALAMAN`) untuk semua halaman di atas; `config/menu.ts` menghapus flag `locked`.

**Verifikasi yang dijalankan (semua dari proyek v2, database lokal `kopkar_mjs_2000`):**
- `npm run typecheck -w frontend`: lolos.
- `PG_URL=... npm test`: backend 14/14 lolos, mobile-api 3/3 lolos (17 endpoint sesuai kontrak).
- Smoke test 17 fungsi query halaman baru langsung ke PostgreSQL (stub `@/lib/db`, jalankan tsx dengan tsconfig yang memetakan alias): semua tanpa galat. Contoh hasil: `saldoPerAkun` 153 akun, `daftarTunggakan` 269, `proyeksiPotongan` 1080, `shuAnggota` 1032, `riwayatTutupBuku` 16, `daftarPengajuan('P')` 14.
- Server dev berjalan di port 3100 dan mengarahkan ke `/login`.

**Yang BELUM diverifikasi:**
- Tampilan dan perilaku halaman di balik login (tidak ada kredensial operator yang dipakai agent; `set-password` mengubah database sehingga tidak dijalankan tanpa izin pengguna). Perlu dicek manual: render tiap halaman baru, cetak (`TombolCetak`), simpan form master, setuju/tolak pengajuan.
- `accounting/closing` hanya pratinjau + riwayat jurnal TBT, **tidak memposting**. Teks di halaman: posting otomatis tutup buku harus diuji paritas dulu terhadap tutup buku 2024 dan 2025; sampai itu selesai tutup buku tetap dilakukan di aplikasi desktop.
- Tidak ada lint di frontend; tidak ada uji frontend.

**Dibuat sesi ini:** `CLAUDE.md` (panduan agent, termasuk kewajiban memperbarui log ini) dan `docs/WORKLOG.md`.

**Jebakan:**
- Port 3100 mungkin sudah dipakai dev server milik pengguna; `npm run dev -w frontend` akan gagal `EADDRINUSE`. Pakai server yang sudah ada.
- `.claude/launch.json` v2 hanya terbaca bila sesi berada di folder v2; di folder lain `preview_start` menjalankan proyek yang salah.
- `git` menampilkan peringatan LF/CRLF pada file yang diubah; tidak berbahaya.

**Langkah berikutnya (usulan):**
1. Pengguna login lalu menelusuri halaman baru; perbaiki yang rusak.
2. Commit pekerjaan yang belum tersimpan (per kelompok: anggota, simpanan, pinjaman, akuntansi, pengaturan) setelah pengguna setuju.
3. Tentukan sumber data absensi (ekspor mesin fingerprint atau API) bila halaman itu dibutuhkan.
4. Pertimbangkan menambah lint dan uji untuk frontend.
