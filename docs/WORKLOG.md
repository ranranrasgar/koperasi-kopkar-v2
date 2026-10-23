# WORKLOG

Log kerja untuk agent berikutnya. **Entri terbaru di paling atas.** Tiap entri: apa yang dikerjakan, cara verifikasi dan hasilnya, apa yang tersisa, jebakan yang ditemukan. Jangan menghapus entri lama.

## Status ringkas dan serah terima (perbarui setiap sesi)

Terakhir diperbarui 24 Oktober 2026 (pagi). Agent baru: baca bagian ini dulu, lalu entri bertanggal bila butuh rincian. Ada dua gaya entri: `### judul (23 Oktober)` tepat di bawah bagian ini, dan `## 2026-10-24 — judul` setelah **Jebakan yang sudah ditemui** (entri 24 Oktober ada di sana).

### Keadaan repo
- Branch `main`, remote `origin` = github.com/ranranrasgar/koperasi-kopkar-v2. Semua commit sudah di-push (`main` = `origin/main` per 24 Oktober pagi). `.env.local` tidak ikut repo; buat ulang di komputer lain.
- Commit terakhir: `b407a71` (catatan migrasi ulang), `3887484` (menu Cari Pinjaman), `182bdd5` (detail pinjaman). Rangkaian PWA: Tahap 1 `80bbfba`, 2 `fc7bd56`, 3 `c25ec60`, 4 `7423eb4`, 5 `298af4a`, lalu banyak commit `anggota:`/`feat(anggota)` (lihat `git log`).
- Dokumen PWA: `docs/prd-pwa-anggota.md` (PRD, keputusan K1-K11, rencana DNS/Nginx/PM2 belum dijalankan) dan `docs/analisis-aplikasi-mobile-lama.md`. Sumber lama di luar repo: Android `G:\Rhansoft\Android\KopkarMJS2000_Rhansoft_upgrade`, PHP live `C:\laragon\www\KopkarMJS2000_2026`.
- Berkas tak terlacak `.FullName` di akar repo berisi satu baris kunci host SSH (`101.50.3.222`), tampaknya keluaran perintah yang salah arah. Belum dihapus; tanyakan pengguna.

### Yang sudah jadi
- **Admin (`frontend/`, port 3100)**: semua menu punya halaman (Absensi placeholder); laporan akuntansi cocok dengan tutup buku desktop 2024-2025; mode Uji/Live dari Sistem & Pengaturan (**database asli saat ini mode Uji**); Pusat Panduan; pendaftaran anggota baru (setujui/tolak/hapus di User Mobile, karyawan Mattel otomatis dibuatkan anggota berkode lama BBTT-NNNN); Kirim Notifikasi, himbauan/promo bergambar dengan sasaran, Pesan Anggota; notifikasi dan pesan di dropdown navbar; dokumen cetak per laporan berkop; Daftar Pinjaman seperti desktop (tunggakan dari jadwal, kolom bisa diurutkan dan dipilih, detail pinjaman, Cari Pinjaman); Rekap Simpanan bergaya tabel standar.
- **PWA anggota (`anggota/`, port 3200, uji 3201)**: PRD Tahap 1-5 selesai (masuk, Beranda, simpanan, pinjaman, potongan, SHU, riwayat, notifikasi, pengajuan kredit dengan validasi server, daftar akun dengan persetujuan admin, masuk/daftar dengan Google, verifikasi email, lupa password, foto, pesan ke koperasi, manifest + service worker + Web Push, splash/pengantar, halaman /terms dan /policy). Tampilan disegarkan ala desain Stitch. Tahap 6 (keamanan dan beban) belum.
- **Backend + mobile-api**: `npm test` = 61 uji backend + 3 mobile-api, semua lolos di database asli dan uji (24 Oktober).
- Database uji `kopkar_mjs_2000_uji` (`npm run uji:reset`, server `npm run dev:uji` port 3101, `npm run dev:anggota:uji` port 3201).

### Belum selesai / perlu keputusan
- **Foreign key tabel web hilang (ditemukan dan diperbaiki 24 Oktober)**: di database asli **dan** uji, semua FK dari tabel `anggota-web.sql` ke tabel hasil migrasi (`app_user`, `anggota`, `opr`) tidak ada; yang tersisa hanya FK antar tabel web (`notif_admin_baca`, `pengumuman_gambar_ref`, `pesan_isi`). Penyebab yang paling mungkin: migrasi ulang `--reset` membuat ulang tabel induk (DROP ... CASCADE ikut membuang FK), sedangkan `CREATE TABLE IF NOT EXISTS` di `anggota-pasang` tidak memasang FK lagi. Akibat: menghapus akun meninggalkan baris yatim (foto, tautan Google, langganan push, verifikasi email) dan uji `hapus akun aplikasi` gagal (`app_user_foto 1 !== 0`). **Diperbaiki (24 Oktober)**: `anggota:pasang` kini memasang ulang FK secara idempoten (daftar FK dibaca dari `anggota-web.sql`; baris yatim CASCADE dihapus, SET NULL diisi NULL, FK tanpa ON DELETE tidak dipasang bila ada yatim, kode keluar 2; `-- --periksa` hanya melapor). Periksa di kedua database: 10 FK hilang, 0 baris yatim, semua tabel web kosong. **Sudah dijalankan di database uji** (10 FK terpasang, jalan ulang tanpa tindakan, `npm test` 61/61 di database uji, jalur yatim diuji dengan data buatan lalu dibersihkan). **Database asli juga sudah** (24 Oktober, atas persetujuan pengguna): 10 FK terpasang, 0 baris diubah, `--periksa` sesudahnya: semua terpasang; `npm test` di database asli 61/61 + 3.
- Email: SMTP `smtp.emailarray.com` sudah bisa login; **SPF** domain di DNS belum; sandi SMTP yang sempat ditulis di percakapan perlu diganti pengguna.
- PWA: Tahap 6 (uji akses silang, beban); uji produksi `npm run build -w anggota` dan uji di HP (pasang ke layar utama, `/luring`, push nyata di mode Live); gambar/foto lama dari server PHP (K10) belum dipindahkan; akun lama belum dipaksa mengisi dan memverifikasi email, tombol "Hubungkan Google" untuk akun lama belum ada.
- Admin: dokumen cetak belum diuji di setiap laporan sungguhan; 182 pinjaman lunas masih bersaldo buku (96 belum ditemukan jurnal baliknya, lihat `lib/queries/pinjaman-sql.ts`); tutup buku dari web hanya pratinjau; 4 bukti desktop berakun `0` dan 2 tanggal salah ketik perlu dibetulkan akuntan; `jenis_macet` kosong.
- Cutover dari MySQL belum: sistem live masih desktop + PHP. Sebelum migrasi ulang ke database yang sudah dipakai aplikasi baru, baca catatan di `database/postgres/README.md` (ekspor operator/grup buatan web, lalu jalankan ulang `anggota:pasang`, `pengaturan:pasang`, `panduan:pasang`).
- `npm audit`: `next` 16.2.10 punya celah kritis *Proxy bypass*; halaman dan actions tetap cek sesi di server, tetapi sebaiknya `next` dinaikkan.

### Lingkungan
- `frontend/.env.local`: `PG_URL`, `SESSION_SECRET`, `SMTP_*`, `VAPID_*`. `anggota/.env.local`: `PG_URL`, `ANGGOTA_SESSION_SECRET`, `SMTP_*`, `VAPID_*` (harus sama dengan admin), `GOOGLE_CLIENT_ID/SECRET`. Jangan isi `KOPKAR_UJI_ROLLBACK` di server utama (mengunci saklar mode).
- Server dev dijalankan dari sesi Claude; bila sesi ditutup, servernya mati: `npm run dev`, `npm run dev:anggota`, dan versi `:uji` bila perlu.
- **Disk C: sering hampir penuh**: cache `.next/dev/cache` bisa 2 GB+, `.next-uji` ±430 MB, database uji ±600 MB. Cek ruang disk sebelum `uji:reset`, `dev:uji`, atau build.
- Akun uji PWA di database **uji**: `Fendra` (app_user.id 146, anggota 958, punya pinjaman/SHU/notifikasi/email/foto), `sulastri` (id 60), `uji_rohayati_pwa`; atur password uji sendiri di database uji saja.
- Saat aturan transaksi atau halaman berubah, perbarui artikel di `database/panduan` (dan di database bila belum disunting admin).

### SMTP benar: smtp.emailarray.com; tinggal SPF di DNS (23 Oktober)
- Penyebab 535: kotak "Mail Business" `support@kopkarmjsmattel.com` ada di **platform emailarray** (terbukti dari pesan pentalan qmail `smtp8.emailarray.com` + webmail Group-Office), bukan di server cPanel `solodns.jagoanhosting.com`. Host yang benar **`smtp.emailarray.com`** (587 STARTTLS, sertifikat `*.emailarray.com` valid, AUTH LOGIN/PLAIN); login dengan sandi pengguna **berhasil** dan email percobaan diterima server. `SMTP_HOST` di kedua `.env.local` sudah diganti (sandi tidak disentuh). Sandi sempat dipakai dalam percakapan dan dijanjikan pengguna akan diganti.
- **Kendala berikutnya**: Gmail menolak email dari domain ini (`550 5.7.26`, SPF `[kopkarmjsmattel.com]` ip 65.39.216.67 tidak lulus; DKIM tidak ada) karena **domain belum punya record SPF**. Perlu TXT `@` pada DNS (dikelola di Jagoan Hosting): `v=spf1 ip4:65.39.216.1/25 ip4:69.28.212.192/27 ip4:69.90.179.1/28 ip4:69.172.250.0/24 ip4:66.179.84.0/24 ~all` (rentang dari SPF jagoanhosting.com untuk emailarray). Detail dan MX (hanya untuk menerima) di `docs/smtp-email.md` bagian 0. **Belum dipasang**; pengiriman ke Gmail belum teruji sampai SPF aktif.

### Login SMTP ditolak (535): pengaturan sudah benar, sandi yang salah (23 Oktober)
- `npm run email:uji` dari komputer pengembang: koneksi + STARTTLS (587) berhasil, server menolak login `535 Incorrect authentication data`. Pemeriksaan `.env.local` (tanpa menampilkan sandi): `SMTP_HOST/PORT/SECURE/USER/FROM` benar dan sama di `anggota` dan `frontend`; `SMTP_PASS` 12 karakter, tanpa kutip/karakter khusus/spasi tepi, LF (bukan CRLF). Server = Exim (cPanel) dengan `AUTH PLAIN LOGIN` setelah TLS, `MAILMAX=1000`, banner melarang bulk mail; username harus alamat lengkap (sudah benar). **Kesimpulan: sandi di env tidak sama dengan sandi kotak email yang berlaku**; perlu dibetulkan pengguna (uji di webmail, atur ulang lewat ikon pensil di panel Jagoan Hosting).
- Ditambah `npm run email:sandi` (`backend/scripts/email-atur.mjs`): tanya sandi tanpa ditampilkan, tulis `SMTP_PASS` ke kedua `.env.local` (kutip ganda + escape `\ " $` bila perlu; diuji bolak-balik untuk karakter khusus) lalu cek login. `email-uji.mjs` kini ikut membaca nilai berkutip/ber-escape. Catatan: dua percobaan login dari pengembang memakai sandi karangan (untuk menguji skrip) ditolak server; jangan banyak mencoba (risiko blokir IP).

### SMTP koperasi di Jagoan Hosting dan kuota kirim (23 Oktober)
- Akun Gmail pengguna tertahan pemeriksaan keamanan Google (tidak bisa membuat sandi aplikasi), jadi dipakai **kotak email domain di Jagoan Hosting** (`support@kopkarmjsmattel.com`, paket Basic Mail). Hasil pemeriksaan DNS/TLS dari komputer pengembang: MX `kopkarmjsmattel.com` menunjuk ke hosting sendiri; `mail.kopkarmjsmattel.com` = 103.163.138.39 = `solodns.jagoanhosting.com`; port 465/587/25 terbuka; **sertifikat TLS hanya untuk `solodns.jagoanhosting.com`** (Let's Encrypt, berlaku s.d. 19 Jan 2027), jadi `SMTP_HOST` harus `solodns.jagoanhosting.com` (bukan `mail.<domain>`). Pengaturan lengkap ada di `docs/smtp-email.md` bagian 0. **Login SMTP belum dicoba** (butuh sandi kotak email dari pengguna).
- Ditambah **kuota kirim**: `EMAIL_MAKS_PER_JAM` dan `EMAIL_MAKS_PER_HARI` (kosong = tanpa batas; `sisaKuota` di `antrean.ts`). Email biasa (siaran/notifikasi) hanya sebanyak sisa kuota; **verifikasi dan sistem (kode, reset) didahulukan dan tidak kena kuota**. Alasan: hosting bersama biasanya membatasi per jam, dan laju bawaan pekerja (±170/menit) terlalu cepat. Uji baru di `email.test.ts` (8 uji).

### Panduan SMTP dan alat uji email (23 Oktober)
- Pengguna bertanya kenapa email verifikasi tidak masuk di `localhost:3201`: **SMTP belum diisi dan server uji memang tidak pernah mengirim email nyata** (kode ada di terminal server: `[email dicatat, SMTP belum diatur] jenis=verifikasi ...`). Ditambahkan `docs/smtp-email.md` (Gmail: verifikasi 2 langkah, sandi aplikasi di `myaccount.google.com/apppasswords`, isi `SMTP_*` di `anggota/.env.local` DAN `frontend/.env.local`, jalankan ulang server; batas Gmail ±500/hari, Workspace ±2.000/hari; alternatif Brevo/Mailgun/SES; SPF/DKIM; cara uji di server uji dengan `EMAIL_UJI_KIRIM=1` sementara; kueri pemantauan antrean) dan skrip `npm run email:uji -- alamat@penerima.com` (`backend/scripts/email-uji.mjs`: cek koneksi + login + kirim satu email percobaan, dengan petunjuk galat 535/koneksi). Pengiriman SMTP sungguhan tetap belum dicoba (belum ada akun).

### Detail pinjaman ala desain Stitch (23 Oktober)
- `pinjaman/[jenis]/[id]/page.tsx` ditata ulang: kartu judul (chip Aktif/Lunas, nama, no. pinjaman, tanggal akad, progres "n dari m angsuran selesai" + %, sisa tenor, target lunas = tanggal angsuran terakhir), kartu hero `HeroPinjaman` (sisa pokok, pokok awal, jasa % per bulan, angsuran rutin; nominal bisa disembunyikan lewat `useSembunyiSaldo`), sorotan **angsuran berikutnya** (jatuh tempo + H-n, nominal tagihan, porsi pokok/jasa/biaya), **Rincian finansial** (pokok, pokok terbayar, jasa dibayar, sisa jasa, sisa angsuran; terbayar dihitung dari pembayaran sungguhan di rincian), lalu tab Jadwal angsuran / Riwayat pembayaran (baris pembayaran memakai nomor angsuran dalam lingkaran).
- Tidak diambil dari contoh: Pelunasan Dipercepat, rekening gaji, nama perusahaan/auto-cut payroll, berkas akad PDF, suku bunga efektif (tidak ada fiturnya/datanya, atau menyangkut privasi). Rumus tidak berubah.
- Verifikasi: typecheck. **Belum dilihat di layar.**

### Email: antrean, SMTP, verifikasi saat daftar (23 Oktober)
- **Antrean email** (`email_antrean`, `backend/src/email/antrean.ts`): penulis (aplikasi anggota dan admin) hanya memasukkan baris; **pekerja** (`backend/src/email/pekerja.ts`, dinyalakan dari `src/instrumentation.ts` kedua aplikasi) kirim tiap 20 detik sampai 20 email dengan jeda 350 md (±170/menit); `FOR UPDATE SKIP LOCKED` + sewa 5 menit, ulang 3x dengan jeda bertambah lalu `gagal`; email kode verifikasi/reset langsung diproses (`kirimSekarang`). `EMAIL_PEKERJA=0` mematikan pekerja. Templat teks + HTML sederhana (`templat.ts`, HTML dilepas karakter berbahaya).
- **SMTP belum diisi = mode catat** (status `dicatat`, isi kode verifikasi/reset ikut ditulis ke log untuk pengujian). Env di `anggota/.env.local` dan `frontend/.env.local`: `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_SECURE` (`1` TLS langsung, otomatis di 465), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (mis. `Kopkar MJS <no-reply@...>`), `ANGGOTA_URL`, `ADMIN_URL`, `EMAIL_NOTIF_ADMIN`. **Pengaman: server uji (`KOPKAR_SERVER_UJI`) tidak pernah mengirim email nyata** karena database uji berisi email anggota sungguhan (`EMAIL_UJI_KIRIM=1` untuk menimpa; hati-hati). Pustaka: `nodemailer` (di `serverExternalPackages`).
- **Notifikasi ikut ke email** (`push.ts` `emailKeAnggota`): himbauan, promo, Kirim Notifikasi, keputusan setuju/tolak pengajuan ke anggota; **hanya ke email yang terverifikasi dan masih sama dengan email akun**; **pesan chat dikecualikan** (`kabariAnggotaBalasan` memakai `email:false`; notifikasi percobaan `catat:false` juga tidak). Pengajuan baru ke pengurus (`beritahuAdmin`): ke alamat di `EMAIL_NOTIF_ADMIN` (tabel `opr` tidak punya kolom email). **Belum**: email untuk himbauan/promo ke operator internal, per-operator email, opt-out/berhenti berlangganan, gambar di email.
- **Pendaftaran dengan verifikasi email**: form Daftar kini wajib email (valid, unik); akun dibuat `status=false` dan baru aktif setelah kode 6 angka benar (`app_user_email_verif`, HMAC kode dengan `ANGGOTA_SESSION_SECRET`, berlaku 15 menit, maks. 5 salah, kirim ulang 60 detik + batas per jam/IP); halaman `/verifikasi-email?u=<token 60 menit>` (publik, token bertanda tangan); login akun belum aktif diarahkan ke verifikasi (tautan "Verifikasi email sekarang"). Aturan NIK tidak diubah: NIK 6 karakter, anggota aktif atau ada di `karyawan_mattel`, selain itu ditolak (anggota ber-NIK tidak dicek ke karyawan_mattel, paritas server lama; belum ada jawaban pengguna untuk memperketat).
- **Akun lama**: email yang sudah ada belum terverifikasi sehingga belum menerima email notifikasi; Akun > Email menampilkan status dan tombol "Kirim kode verifikasi" (`mintaVerifikasiEmailAction`); menyimpan email baru mengirim kode ke email baru dan bisa dilewati sementara.
- Verifikasi: typecheck tiga workspace; `npm test` backend **53 lulus** (uji baru `email.test.ts`: templat aman, antrean/pengiriman JSON, mode catat, kode benar/salah/kedaluwarsa/terkunci/jeda, akun aktif setelah verifikasi, penerima email hanya yang terverifikasi, chat dan percobaan tanpa email, email pengurus dari env; `anggota-akun.test.ts` diperbarui untuk email wajib). Halaman publik `/daftar` (kolom email) dan `/verifikasi-email` (token salah) dicoba lewat HTTP. **Belum dicoba**: alur daftar-verifikasi-masuk di browser dan **pengiriman SMTP sungguhan** (belum ada akun SMTP). Artikel Panduan `03-user-mobile.md` diperbarui di berkas; perbarui juga di database bila belum disunting admin (`npm run panduan:pasang`).
- Catatan: disk C: sangat tipis (sempat 815 MB); server mulai aneh bila disk penuh.

### Akun PWA ala desain Stitch, tetap privat (23 Oktober)
- Layar Akun mengikuti contoh Stitch "Akun Anggota": kartu hero profil (foto dengan tombol ganti, nama, `@username`, chip "Anggota · No. ..."), tiga kelompok menu berikon dalam lingkaran (**Keanggotaan dan finansial**: Riwayat, Potongan gaji, SHU; **Layanan**: Ajukan, Pesan (lencana "n baru"), Notifikasi; **Keamanan dan bantuan**: Email, Ganti password, Panduan penggunaan), Tampilan (tema), catatan privasi, tombol Keluar, footer. `BarisTautan` kini menerima `ikon` dan `lencana`.
- **Sengaja tidak diambil dari contoh**: perusahaan/divisi/jabatan, tanggal bergabung, rekening bank, kartu Total Simpanan dan Estimasi SHU, skor keaktifan, E-KTA/QR, e-Voting, proteksi jiwa, voucher, PIN/biometrik, ADART, helpdesk, slogan footer (keputusan pengguna: Akun tanpa data detail; fitur-fitur itu belum ada).
- Verifikasi: typecheck; belum dilihat di layar.

### Notifikasi otomatis tanpa tombol; Simpanan tanpa progress bar (23 Oktober)
- **Notifikasi PWA otomatis** (`components/NotifikasiOtomatis.tsx` di `(app)/layout.tsx`, khusus anggota; helper `lib/push-klien.ts`): izin sudah diberikan -> perangkat didaftarkan ke server otomatis, sekali per sesi tab (`sessionStorage` `kopkar-push-sinkron`); izin belum ditanya -> **diminta sekali pada ketukan pertama** (browser menolak permintaan tanpa tindakan pengguna; iPhone hanya bila PWA dipasang ke layar utama), bila diabaikan ditanya lagi paling cepat seminggu (`localStorage` `kopkar-izin-notif-ditanya`); diblokir -> diam. **Tidak ada lagi tombol aktif/matikan.** `AktifkanNotifikasi` di halaman Notifikasi kini hanya cadangan: tombol "Izinkan" bila izin masih belum diberikan, petunjuk bila diblokir, petunjuk "pasang ke layar utama" di iPhone; tombol "Kirim percobaan" hanya di pengembangan (`NODE_ENV !== production`, action ditolak di server production).
- **Keluar** (`components/TombolKeluar.tsx`) melepas langganan push perangkat dari akun (`matikanPushAction` + `unsubscribe`) sebelum keluar, supaya pengguna berikutnya di HP yang sama tidak menerima notifikasi akun lama; gagal melepas tidak menghalangi keluar. Sesi yang habis sendiri (12 jam) tidak melepas langganan; login akun lain di perangkat yang sama memindahkan langganan ke akun baru saat sinkron (endpoint unik, `ON CONFLICT` memindahkan pemiliknya). Halaman `lengkapi-email` masih memakai `keluarAction` langsung (belum ada langganan di sana).
- **Simpanan**: bilah porsi di Rincian tabungan dihapus (simpanan tidak punya target); keterangan jadi "Lihat mutasi" tanpa persen.
- Verifikasi: typecheck. **Belum dicoba di HP/Chrome**: perlu uji alur izin pada ketukan pertama, sinkron otomatis, dan keluar-masuk akun berbeda di satu perangkat.

### Form Ajukan ala desain Stitch (23 Oktober)
- `ajukan/FormAjukan.tsx` ditata ulang: penanda **Langkah n dari 3** (isi, periksa, terkirim; layar terkirim kini ikon hero + pesan), kartu hero **plafon** (jenis yang mengunci grade: "Maks. Rp ..."; selain itu "Tanpa batas plafon grade" + maks lama), **jumlah pengajuan** besar dengan slider (kelipatan Rp 500 rb, batas atas = plafon bila terkunci, selain itu Rp 100 juta; isian angka tetap bebas sampai batas server) dan chip nominal cepat, **tenor** berupa ubin (3/6/12/18/24/36/48/60 sesuai maks) + stepper manual 1..maks, chip **keperluan** yang mengisi kolom keperluan (teks bebas maks. 100 karakter tetap ada), **estimasi angsuran bulanan** terinci (pokok, jasa, biaya adm+provisi, angsuran pertama, total jasa), dan **Kelayakan dan persyaratan**.
- Daftar kelayakan **hanya berisi aturan yang benar-benar dicek sistem** (jenis sesuai status, plafon bila terkunci, lama <= maks, tanggal sah, tidak ada pengajuan sejenis yang menunggu; `namaMenunggu` dari halaman). Tidak ada "masa kerja" atau "DSR" seperti di contoh desain (tidak ada aturannya). Tombol Lanjutkan tetap hanya aktif bila semua lolos; server tetap memeriksa ulang semuanya. Rumus estimasi tidak berubah (`estimasiAngsuran`).
- Verifikasi: typecheck. **Belum dilihat di layar** dan belum dicoba kirim lewat form baru.

### Halaman Simpanan dan Pinjaman ala desain Stitch, latar putih (23 Oktober)
- **Simpanan** (`app/(app)/simpanan/page.tsx`): kartu portofolio gradasi (`HeroSimpanan`, total + jumlah rekening + transaksi terakhir, nominal bisa disembunyikan), **Rincian tabungan** per jenis (ikon menurut nama, porsi % dari total + bilah tipis), **grafik tren** 6 bulan (`GrafikTren`: saldo akhir bulan, sumbu mulai dari 0, bulan ini disorot, penanda pertumbuhan; `trenSimpanan` di `data.ts`, bulan terakhir = saldo saat ini), **Riwayat pembagian SHU** (2 tahun buku terbaru yang ada nilainya), dan **Mutasi terakhir** dengan chip filter jenis (`?jenis=kode`, `mutasiSimpananTerakhir`). `useSembunyiSaldo` dipakai bersama kartu saldo Beranda.
- **Pinjaman** (`pinjaman/page.tsx`): ringkasan "Kewajiban anggota" (total sisa tunai, KPR terpisah, plafon grade dengan tautan Ajukan), **kartu kontrak berjalan** (pokok awal/sisa/jasa, % terbayar, cicilan x dari y, mulai-selesai, sorotan jatuh tempo berikutnya dengan penghitung H-n; `PinjamanAktif` kini membawa `persen_bunga` dan `selesai`), **Jadwal angsuran** kontrak pertama (1 mendatang + 3 terakhir lunas, chip status), dan **Riwayat pinjaman** (lunas) dalam `<details>` yang bisa dibuka-tutup. Tidak ditiru dari desain: Pelunasan Dipercepat, Top Up/Tarik Dana, estimasi dividen, "otomatis dipotong dari payroll" (tidak ada datanya/fiturnya).
- Rumus tidak berubah: angsuran berikutnya = jadwal tagihan (contoh `CR-0823-16030`: pokok 5.688.300 + jasa 16.780 = **Rp 5.705.080**, dikonfirmasi pengguna benar).
- **Latar mode terang kini putih murni** (`--color-latar: oklch(1 0 0)`) atas permintaan pengguna (sesuai aplikasi lama; cocok dengan gaya datar). Ikut diubah: `viewport.themeColor` terang, `SKRIP_TEMA`, dan `background_color` manifest jadi `#ffffff`. **Jika latar diganti lagi, ubah keempatnya** (`--color-latar`, themeColor, SKRIP_TEMA, manifest). Mode gelap tidak berubah (`#0c110e`).
- Verifikasi: typecheck; kueri tren/mutasi/pinjaman aktif diuji ke database uji untuk `rohimahr` (tren akhir bulan = saldo saat ini Rp 29.265.410). **Halaman belum dilihat di layar.**

### Perbaikan daftar pinjaman aktif: pinjaman lunas dengan sisa rincian (23 Oktober)
- Temuan pengguna (akun `rohimahr`, anggota 1123): PWA menampilkan 2 pinjaman aktif, padahal hanya `CR-0823-16030` (angsuran Rp 7.705.080) yang berjalan. Penyebab: **`CR-0321-10998` sudah lunas** (cicilan 48 dari 47; ke-44..47 dibayar sekaligus 9 Agustus 2023 dengan pokok lebih kecil; pelunasan dengan potongan tidak mencatat debit pokok penuh), tetapi rincian masih menyisakan Rp 27.430.924 (kredit pokok 224.387.400 − debit 196.956.476), dan PWA menilai aktif hanya dari rincian.
- **Aturan baru** (`anggota/src/lib/data.ts`, komentar di atas `SISA_LUNAS`): pinjaman LUNAS bila sisa rincian <= Rp 100 **atau** `jml_cicilan >= lama_angsuran`; aktif = kebalikannya. Berlaku untuk daftar aktif, daftar lunas (tunai dan KPR), dan rincian (sisa ditampilkan 0 dan tidak pernah negatif untuk yang lunas; label "Pinjaman lunas"). Ini mengikuti API aplikasi lama (`DbOperation::getPinjaman`: plafon − pokok/lama × jml_cicilan > 0), yang menilai dari jumlah cicilan.
- Pengukuran di database uji (22.948 pinjaman tunai ber-rincian): aktif API lama 1.612, PWA versi kemarin (rincian saja) 1.730, aturan baru 1.548. Beda dengan API lama: 246 -> **64** (semuanya "lama aktif, baru tidak": rincian sudah nol tetapi penghitung cicilan belum penuh; rincian dipercaya). `rohimahr`: aturan baru = API lama = 1 pinjaman.
- **Belum disesuaikan** (perlu keputusan): (1) laporan pinjaman di admin masih menilai dari rincian, jadi `CR-0321-10998` masih terlihat berjalan di sana; (2) kunci sisa pengajuan (`backend/src/anggota/pengajuan.ts`) memakai saldo rincian + bunga seperti `getSaldoJenisPinjaman` aplikasi lama, jadi pinjaman semacam ini tetap menghalangi pengajuan jenis yang sama (paritas dengan aplikasi lama); (3) data asal perlu dibetulkan akuntan (potongan pelunasan sebaiknya dicatat sebagai debit).

### Splash dan pengantar anggota baru (23 Oktober)
- **Splash**: `<div id="splash">` di `app/layout.tsx` (ikon, "Kopkar MJS", "Aplikasi Anggota", latar `--color-latar` jadi ikut tema) memudar sendiri lewat animasi CSS (`globals.css`, tanpa JavaScript, ±1,45 detik) dan **hanya pada pemuatan pertama per sesi**: skrip di `<head>` memasang `data-splash="selesai"` bila `sessionStorage` `kopkar-splash` sudah ada. Terverifikasi: muat kedua dalam sesi -> `display:none`. **Animasi memudar tidak bisa diukur di browser pane** (pane tersembunyi, tak ada frame); cek di HP/Chrome. Catatan: splash bawaan sistem saat PWA terpasang di Android memakai `background_color` manifest (terang `#f5f7f5`, bisa terlihat terang sesaat di mode gelap) dan ikon; iPhone tidak punya splash bawaan tanpa `apple-touch-startup-image` per ukuran layar (belum dibuat).
- **Pengantar** (`/selamat-datang`, `components/Pengantar.tsx`): 5 slide (simpanan, pinjaman, ajukan, pesan+notifikasi, privasi), Lewati/Lanjut/Mulai. Anggota yang pertama kali membuka Beranda dialihkan ke sana (`sudahLihatIntro` di `lib/intro.ts`, tabel `app_user_intro` per akun di `anggota-web.sql`; sudah dipasang di database asli dan uji; tanpa tabel = tidak muncul). Hanya anggota (karyawan non-anggota tidak). Bisa dibuka lagi dari **Akun > Panduan penggunaan**. **Semua akun yang sudah ada akan melihatnya sekali**; untuk mengulang pada akun uji: `DELETE FROM app_user_intro WHERE app_user_id = ...`.
- Verifikasi: typecheck; **halaman pengantar dan alur redirect belum dilihat di layar** (butuh login).

### Admin Pengajuan Kredit: pencarian, filter, paginasi (23 Oktober)
- `/dashboard/loans/apply` (`PengajuanList`, `daftarPengajuan` di `lib/queries/keanggotaan.ts` kini memakai `paged()` seperti tabel lain): **pencarian** KPK (= `anggota.nik`; di UI ini disebut KPK), nama, kode anggota, dan NIK/KTP (`anggota_detail.no_ktp_sim`, lewat `EXISTS` supaya detail ganda tidak menggandakan baris); filter **status** (bawaan Menunggu; "Semua" = `status=` kosong), **jenis kredit**, rentang **tanggal realisasi**, dan `lama` (parameter URL, belum ada kolom UI); **paginasi** + **baris per halaman** (`PilihBaris`, 25/50/100/200/Semua), urut per kolom, tombol Atur ulang. Pokok batas lama 300 baris dihapus.
- Verifikasi: typecheck; SQL dicoba di database uji (semua 114, menunggu 16; pencarian nama/KPK/kode/KTP masing-masing menemukan anggota contoh; filter jenis dan tanggal jalan). **Halaman belum dilihat di layar.**
- Aturan pengajuan di server (`backend/src/anggota/pengajuan.ts`, 4 uji lulus): anggota aktif; produk staff vs non staff; plafon (grade) bila jenis mengunci grade; kunci sisa (pinjaman jenis sama yang belum lunas, receh <= Rp 100 diabaikan); lama 1..maks cicilan jenis; besar > 0 dan <= Rp 1 miliar; tanggal realisasi sah, tidak sebelum hari ini, maks. 1 tahun; keterangan <= 100 karakter; satu pengajuan menunggu per jenis. **Tidak ada** pemeriksaan masa kerja minimal atau rasio potongan gaji/DSR (tidak ada di aplikasi lama; di desain Stitch hanya contoh).

### Notifikasi pengajuan ke admin dan perbaikan halaman berhasil (23 Oktober)
- **Pengajuan baru dari anggota -> admin**: `ajukanAction` (PWA, di luar mode uji) memanggil `beritahuAdmin` (`backend/src/anggota/notif-admin.ts`): catat di `notif_admin` (+ `notif_admin_baca` per operator) lalu Web Push ke browser operator yang grupnya berizin menu `Pengajuan Pinjaman` (atau superadmin); `MENU_PENGAJUAN` harus sama dengan `MENU.pengajuan`. Masuk **lonceng navbar admin** (angka = pengumuman + notifikasi sistem belum dibuka); halaman `/dashboard/pengumuman` kini bernama **Notifikasi** (menu juga) dan menggabungkan notifikasi sistem (bisa diketuk ke `/dashboard/loans/apply`, disimpan 30 hari) dengan himbauan/promo untuk grup operator.
- **Setuju/tolak -> anggota**: sudah ada (riwayat Notifikasi + push + titik merah lonceng PWA); pesan kini menyebut jenis pinjaman dan lama. Status pengajuan di data hanya `P`/`Y`/`N`; **tidak ada status "dibatalkan"**, jadi tidak ada notifikasi cancel tersendiri.
- **Halaman berhasil di Ajukan**: tombol "Selesai" sebelumnya `<a href>` (muat ulang penuh); kini mereset form di tempat. Galat hidrasi di Chrome pengguna (`<div hidden>` vs teks kosong di MetadataWrapper) tidak muncul di browser pane tanpa ekstensi; kemungkinan besar ulah ekstensi browser (sebelumnya terbukti `simulator-pre-loader`). **Jebakan**: skrip tema lewat `next/script` `beforeInteractive` TIDAK berjalan di sini (`window.kopkarTema` tak terdefinisi); tetap pakai `<head><script>` di `layout.tsx` (terverifikasi).
- Verifikasi: typecheck ketiga workspace; `anggota-notif-admin.test.ts` 2 uji (izin menu, penanda baca per operator, batas kolom). Belum dilihat di layar.

### Penyegaran tampilan PWA: gaya datar, tanpa banyak kartu (23 Oktober)
- Pengguna **tidak suka terlalu banyak kartu** dan minta semua halaman disesuaikan, bukan hanya Beranda. Aturan gaya baru (`components/ui.tsx`): `Kartu` kini **kelompok baris datar** (`-mx-5 border-y border-garis`, tanpa latar/sudut bulat/kotak; penuh lebar layar), baris di dalamnya `px-5` supaya sejajar dengan judul (induk halaman memakai `px-5`); `Blok` = ringkasan angka utama tanpa kotak; judul bagian tanpa `px-1` (`mb-1 mt-8`). Satu-satunya kartu berkotak yang disengaja: **kartu saldo hero** di Beranda dan **slide pengumuman** (butuh banner gambar); `AjakanPasang`/`AktifkanNotifikasi` masih kotak (sementara). Baris/ikon berlatar `bg-garis/50` (jangan `bg-latar`: sama dengan latar halaman, tak terlihat).
- Berlaku di Beranda (pintasan ubin tanpa kotak, kartu angsuran jadi pita datar), Simpanan (+ mutasi), Pinjaman (+ rincian), Potongan, SHU, Riwayat, Notifikasi (+ detail: gambar penuh lebar), Pesan, Ajukan (langkah periksa), Akun. Baris riwayat dipakai bersama lewat `BarisRiwayat`.
- Verifikasi: typecheck lolos. **Belum dilihat di layar** (butuh login). Bila ada halaman baru, ikuti pola ini: `Kartu` untuk daftar, `Blok` untuk ringkasan, jangan menambah `border bg-permukaan rounded`.

### Penyegaran tampilan PWA, tahap 1: header dan Beranda (23 Oktober)
- Acuan: lima screenshot desain Stitch (Beranda, Simpanan, Pinjaman, Ajukan, Akun) yang dikirim pengguna; hanya diambil arah visualnya. **Tidak ditiru**: Katalog Toko, e-Voting, voucher, proteksi jiwa, PIN/biometrik, E-KTA/QR, estimasi SHU persen, skor keaktifan, data perusahaan/rekening di Akun (bertentangan dengan keputusan privasi), badge dan gradasi berlebihan. **Navigasi bawah tetap 5 tab (termasuk Akun)** atas permintaan pengguna.
- `components/AppBar.tsx` (di `(app)/layout.tsx`): header menempel di lima halaman utama saja (logo, "Kopkar MJS", nama halaman, ikon pesan, lonceng, avatar ke Akun); halaman rincian tetap memakai `Kepala` dengan tombol kembali. Titik merah lonceng = notifikasi lebih baru dari yang terakhir dibuka (`localStorage` `kopkar-notif-dilihat`; pertama kali dianggap sudah dilihat); titik pesan = balasan belum dibaca; disegarkan tiap 30 detik lewat `statusAppBarAction`. **Jebakan**: file `"use server"` mengekspos SEMUA fungsi yang diekspor ke klien, jadi fungsi yang menerima `anggotaId` (`statusAppBar`) ada di `lib/status-appbar.ts` (server-only) dan action hanya memakai id dari sesi.
- Beranda: sapaan + chip nomor anggota, kartu saldo gradasi hijau (`.hero`, variabel `--hero-a/b` per tema di `globals.css`; teks tetap terang), pintasan ubin (Ajukan pinjaman, Potongan, SHU, Riwayat; Notifikasi pindah ke lonceng), kartu "Angsuran berjalan" (pinjaman pertama dengan kemajuan, terbayar, sisa pokok, jatuh tempo; sisanya baris ringkas), "Bulan ini", dan **Aktivitas terakhir** (4 transaksi dari `riwayat`). `components/BarisRiwayat.tsx` dipakai bersama halaman Riwayat. Halaman Simpanan, Pinjaman, Akun, Ajukan tidak lagi punya judul sendiri (sudah di header).
- Verifikasi: typecheck lolos. **Belum dilihat di layar** (butuh login; form login di browser pane Claude diblokir). Tahap berikutnya: Simpanan (grafik tren 6 bulan, chip filter mutasi), lalu Pinjaman dan Ajukan.

### Akun PWA: tema dan privasi (23 Oktober)
- **Halaman Akun dipangkas** ke hal yang menyangkut akun: foto, nama, username, pesan ke koperasi, email, ganti password, tampilan, keluar. **Keanggotaan, data diri, pekerjaan, dan rekening tidak lagi ditampilkan di PWA** (privasi, mis. HP dipinjam); dikelola/dilihat pengurus di admin. Datanya tetap ada di database dan `profil()` masih dipakai Beranda (status staff, plafon), bukan halaman Akun.
- **Tema Otomatis/Terang/Gelap** (`components/PilihTema.tsx`, bagian Tampilan di Akun): disimpan di `localStorage` kunci `kopkar-tema` per perangkat. Skrip kecil di `<head>` (`SKRIP_TEMA` di `layout.tsx`) memasang `data-tema` pada `<html>` sebelum render (tanpa kedip) dan menyamakan `meta theme-color` (bilah status) lewat `window.kopkarTema`; dijalankan ulang saat DOMContentLoaded karena meta bisa belum ada. CSS: palet gelap berlaku bila HP gelap kecuali `data-tema="terang"`, atau bila `data-tema="gelap"`; `color-scheme` ikut. Palet gelap ada dua salinan di `globals.css`; ubah keduanya sekaligus. Warna hex `theme-color` harus tetap sama dengan `--color-latar` (lihat catatan Tahap 5).
- Verifikasi: typecheck; di browser pane (halaman Masuk): terang memaksa latar terang dan `color-scheme: light`, gelap tetap gelap, otomatis kembali mengikuti HP, meta theme-color berubah, pilihan bertahan setelah muat ulang. **Halaman Akun belum dilihat di layar** (butuh login).

### Sasaran pengumuman + ikon pesan/lonceng terpisah (23 Oktober)
- **Himbauan dan promo punya sasaran** (`pengumuman_sasaran`, `backend/src/anggota/sasaran.ts`): **anggota** (semua, atau status staff tertentu: kini hanya `Staff` 3 orang dan `No Staff` 1077; ini satu-satunya "peran" anggota di data) dan/atau **internal kantor** (pengguna aplikasi admin: semua grup operator, atau grup tertentu: admin, Kasir, Pengurus, supervisor, Pengawas, karyawan, superadmin). Tanpa baris sasaran = semua anggota saja (perilaku lama). Form admin `Himbauan & Promo` punya bagian "Untuk siapa" dan label "Untuk: ..." di daftar. Opsi "kirim juga sebagai notifikasi" mengikuti sasaran: anggota (filter status staff) dan/atau browser operator di grup terpilih (`kirimKeOperatorGrup`).
- Beranda PWA: slide hanya memuat yang ditujukan ke anggota itu (`slidePengumuman(statusStaff)`). **API lama Android** (`getHimbauan`/`getPromos` di `queries.ts`) menyembunyikan pengumuman khusus internal atau khusus status tertentu (API lama tidak tahu siapa anggotanya); tanpa tabel sasaran tetap seperti dulu.
- Admin: halaman **Pengumuman** (`/dashboard/pengumuman`, semua operator, tanpa izin khusus; menu di grup Main) memuat himbauan/promo untuk grup operator itu, tanda BARU, gambar, dan tombol aktifkan notifikasi; membukanya menandai terbaca (`pengumuman_baca_opr`). Navbar kini **dua ikon**: **chat** (percakapan anggota, hanya yang berizin Pesan Anggota) dan **lonceng** (pengumuman internal), masing-masing angka merah yang diperbarui tiap 10 detik (`jumlahBadgeAction`). Langganan push browser operator (`aktifkan/matikan/statusPushOprAction`) kini boleh semua operator, bukan hanya yang berizin pesan.
- **Navbar admin tetap di atas saat scroll**: penyebabnya `overflow-x-hidden` pada pembungkus `DashboardShell` yang mematikan `position: sticky`; diganti `overflow-x-clip`.
- Verifikasi: typecheck ketiga workspace; `npm test` 44 backend + 3 mobile-api lulus (uji baru `anggota-sasaran.test.ts`: validasi sasaran, penyimpanan, filter grup operator + tanda baca, tidak bocor ke API lama, siaran per status staff). Semua halaman baru dialihkan ke login tanpa sesi. **Belum dilihat di layar** (form sasaran, dua ikon navbar, navbar sticky, halaman Pengumuman).
- Catatan: pengumuman yang dibuat sebelum fitur ini tidak punya baris sasaran, jadi hanya untuk anggota; untuk menjadikannya internal, ubah lewat form. "Kirim Notifikasi" (pesan langsung ke anggota) belum punya pilihan internal.

### Pesan anggota ke koperasi (23 Oktober)
- Percakapan dua arah, **teks saja** (sengaja tanpa gambar: alamat `/gambar/<token>` itu publik, tidak cocok untuk berkas pribadi anggota). Tabel `pesan_percakapan`, `pesan_isi`, `opr_push` (`anggota-web.sql`, sudah dipasang di database asli dan uji). Logika di `backend/src/anggota/pesan.ts`; push operator di `push.ts` (`kirimKeOperator`, `simpanLanggananOpr`, ...; `kirimKeBaris` dipakai bersama anggota).
- Anggota (PWA): `/pesan` (daftar), `/pesan/baru`, `/pesan/[id]` (gelembung percakapan + balas), tautan "Pesan ke koperasi" di Akun dengan penanda "n baru". Aturan: isi maks. 1000, subjek maks. 100, jeda 10 detik, maks. 20 pesan/24 jam per anggota, percakapan hanya milik sendiri (id lain 404). Kirim pesan memberi Web Push ke operator (di luar mode uji).
- Admin: menu **Pesan Anggota** (`/dashboard/pesan`, izin `Pesan Anggota (web)`: superadmin atau grup yang diberi lewat Kelola Hak Akses; nama harus sama dengan `MENU_PESAN` di backend). Daftar Terbuka/Selesai (belum dibaca di atas), halaman percakapan dengan balasan dan tombol selesai/buka kembali; balasan mencatat nama operator dan memberi anggota notifikasi (riwayat `log_notifikasi` + push, ketukan membuka `/pesan/<id>`). Notifikasi ke browser operator: tombol "Aktifkan" di halaman itu mendaftarkan service worker admin `frontend/public/sw.js` (hanya push, tanpa cache) dan langganan di `opr_push`; push dikirim ke semua operator aktif yang grupnya berizin menu itu. Pesan anggota yang diketuk membuka percakapan.
- Mode uji: pesan dan balasan tidak tersimpan dan tidak mengirim push (sama seperti form lain); langganan push browser tetap tersimpan.
- Verifikasi: typecheck frontend, anggota, backend; `npm test -w backend` 38 lulus (uji baru `anggota-pesan.test.ts`: validasi, jeda dan batas harian, isolasi antaranggota, balasan + tanda baca + selesai/dibuka lagi, langganan operator). Semua halaman baru dialihkan ke login saat tanpa sesi. **Belum dicoba di layar**: alur kirim-balas di dua browser dan notifikasi di browser admin (butuh server frontend uji dijalankan ulang agar header `/sw.js` dan menu baru terbaca).
- Penanda pesan baru di admin: menu **Pesan Anggota** dipindah ke grup Keanggotaan (sebelumnya terkubur di Sistem & Pengaturan), lencana merah di sidebar, kartu pengingat di Dashboard, dan **lonceng di navbar** (`components/layout/Lonceng.tsx`, hanya untuk yang berizin) dengan angka merah yang diperbarui tiap 30 detik lewat `jumlahPesanBaruAction` (hanya saat tab terlihat). Angka = percakapan terbuka yang belum dibuka operator.
- **Percakapan langsung (near real-time)**: di halaman percakapan, admin dan anggota menerima pesan baru tanpa muat ulang. `PercakapanLangsung` (dua salinan: `anggota/src/components`, `frontend/src/components/notifikasi`) polling `pesanBaruAction`/`pesanBaruAdminAction` tiap 2,5 detik hanya saat tab terlihat, juga segera setelah kirim (peristiwa `pesan:segarkan`); backend `pesanSetelah` (pesan setelah id tertentu, dan menandai terbaca pihak yang sedang membuka). Auto-scroll hanya bila pembaca dekat dasar. Dipilih polling, bukan SSE/WebSocket, karena tahan di balik Nginx/proxy tanpa konfigurasi khusus; bila perlu lebih instan, ganti dengan SSE + Postgres LISTEN/NOTIFY. Di luar halaman percakapan, lonceng admin menyegarkan angka tiap 10 detik. Status selesai/buka tidak diperbarui otomatis.
- Tersisa/ide: lampiran privat bila diperlukan (butuh penyajian gambar dengan sesi, bukan token publik).

### Gambar pengumuman + slide Beranda (23 Oktober)
- Himbauan, promo, dan notifikasi dari admin bisa membawa **satu gambar**. Browser admin mengecilkannya (`frontend/src/lib/kompres-gambar.ts`: maks. 1000 px, WEBP/JPEG, ≤ 300 KB); server memeriksa ulang jenis dari isi file dan ukuran ≤ 400 KB (`backend/src/anggota/gambar.ts`). Disimpan di database: `pengumuman_gambar` (token acak 32 hex, bytea) + `pengumuman_gambar_ref` (`jenis` himbauan/promo/notifikasi, `ref_id`); sudah dipasang di database asli dan uji (`npm run anggota:pasang`). Gambar lama Android (kolom `image`, file di server PHP) tidak disentuh dan tidak tampil di PWA.
- Gambar tampil: slide Beranda, detail notifikasi `/notifikasi/[id]`, dan **gambar besar di push** (Android/Windows Chrome; iOS tidak menampilkan gambar di push). Alamat publik `anggota/src/app/gambar/[token]/route.ts` **sengaja tanpa login** (sistem notifikasi HP mengambilnya langsung; token 128 bit, hanya gambar pengumuman). Service worker melengkapi alamat relatif dengan origin situs, jadi tidak perlu env URL. Admin memakai pratinjau `/dashboard/gambar/[token]` (butuh login).
- Siaran: satu gambar dipakai bersama semua penerima (satu baris ref per baris riwayat). Gambar yang tidak dirujuk siapa pun dibersihkan (`bersihkanYatim`) saat diganti/dihapus.
- **Beranda: slide** (`KarosselPengumuman`, scroll-snap + titik) berisi semua himbauan aktif lalu semua promo aktif; Android lama tetap hanya himbauan terbaru.
- Verifikasi: typecheck ketiga workspace; `npm test` backend 33 lulus (uji baru `anggota-gambar.test.ts`: sniff jenis, tolak kosong/bukan gambar/terlalu besar, ganti-lepas-bersihkan, siaran bergambar); route `/gambar/<token>` di server uji: sah 200 tanpa login, token tak dikenal/tak valid 404. **Belum dilihat di layar**: form unggah admin, kompresi di browser, slide, dan gambar di push.
- Catatan: uji kontrak `mobile-api` gagal di **database uji** karena data himbauan/promo hasil percobaan (kontrak direkam saat kosong); di database asli 3/3 lulus.

### Himbauan, Promo, dan perapihan detail anggota (23 Oktober)
- Admin **Himbauan & Promo** (`/dashboard/himbauan`, izin `Kelola Himbauan & Promo (web)`, `frontend/src/app/actions/pengumuman.ts`): tambah, ubah, tampil/sembunyikan, hapus; opsi "kirim juga sebagai notifikasi ke semua anggota" (memakai `kirimKeSemuaAnggota`, tujuan `/beranda`). Teks maks. 255 karakter (batas kolom). Gambar belum bisa diunggah (K10). Mode uji: tidak tersimpan dan tidak terkirim. Himbauan: hanya satu terbaru yang tampil (sama dengan Android); promo: semua yang aktif, kini tampil di Beranda PWA.
- Detail simpanan: total setoran/penarikan dan deskripsi transaksi. Pinjaman: bagian "Sudah lunas" di daftar (detailnya sudah bisa dibuka), status lunas, angsuran berikutnya dan sisa jasa di rincian.
- Verifikasi: typecheck frontend dan anggota lolos; kueri pinjaman lunas dan total simpanan dicoba di database uji (anggota 958: 30 lunas, 1123: 12). **Halaman belum dilihat di layar** (login form diblokir di browser pane Claude).
- Repo punya remote: `origin` = github.com/ranranrasgar/koperasi-kopkar-v2, branch `main` (dulu `master`).

### PWA anggota Tahap 5: pemasangan + Web Push (23 Oktober, belum di-commit)
- **Teknologi notifikasi = Web Push standar (VAPID, pustaka `web-push`), bukan Firebase**: FCM di web hanya membungkus Web Push yang sama, jadi tanpa akun/ketergantungan Google. Notifikasi muncul di layar HP walau aplikasi ditutup (diterima service worker); iOS hanya bila PWA dipasang ke layar utama (16.4+). Terbukti: langganan Chrome (endpoint fcm.googleapis.com) tersimpan dan push uji diterima server FCM (201).
- Manifest `app/manifest.ts` (standalone, start `/beranda`, ikon any+maskable, 3 shortcut), ikon `public/ikon/` (`scripts/buat-ikon.mjs`), `public/sw.js` (cangkang saja: `/luring`, ikon, `/_next/static`; navigasi selalu ke jaringan, data keuangan tidak di-cache; handler `push` dan `notificationclick`), `app/luring`, `PekerjaLatar` (daftar SW), `AjakanPasang` di Beranda, ikon Simpanan diganti `WalletCards` (bukan celengan).
- **Warna bilah status** harus sama dengan `--color-latar`: `theme-color` di `layout.tsx` = `#f5f7f5` (terang) / `#0c110e` (gelap), hasil konversi oklch; manifest sengaja tanpa `theme_color` supaya meta yang berlaku (mengikuti mode). Ubah `--color-latar` = ubah kedua hex.
- Web Push: tabel `app_user_push` (`anggota-web.sql`, sudah dipasang di database asli dan uji), `backend/src/anggota/push.ts` (`kirimNotifikasi` ke satu anggota, `kirimKeSemuaAnggota`, `ringkasanPush`; mencatat `log_notifikasi` per anggota lalu push; langganan 404/410 dihapus; tidak melempar), `anggota/src/app/actions/push.ts`, tombol `AktifkanNotifikasi` di halaman Notifikasi (izin diminta saat diketuk, ada "Kirim percobaan" dan "Matikan"). Detail `/notifikasi/[id]` (hanya milik sendiri); push diketuk membuka detail itu (pengajuan: `/ajukan`).
- Admin: menu **Kirim Notifikasi** (`/dashboard/notifikasi`, izin `Kirim Notifikasi (web)`: superadmin atau grup yang diberi lewat Kelola Hak Akses): semua anggota aktif atau satu anggota, judul maks. 50, isi maks. 500, konfirmasi sebelum siaran, ringkasan perangkat, 15 kiriman terakhir. Setuju/tolak pengajuan (`putuskanPengajuanAction`) otomatis mengirim notifikasi ke anggota. **Mode uji: tidak ada yang dicatat atau dikirim.**
- **Env baru** (`anggota/.env.local` dan `frontend/.env.local`, gitignored, harus sama di keduanya): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Di server produksi isi dengan kunci yang sama; mengganti kunci memutus semua langganan lama (anggota harus mengaktifkan ulang).
- Verifikasi: typecheck frontend + anggota lolos; uji `backend/test/anggota-push.test.ts` (4 uji, siaran = jumlah anggota aktif dengan nomor urut unik); seluruh `npm test` 29 + 3 lolos; di Chrome pengguna: SW terdaftar, langganan tersimpan, push uji diterima server FCM. Browser pane Claude tidak mendukung SW dan login ke form diblokir, jadi halaman admin Kirim Notifikasi dan detail notifikasi **belum dicoba di layar**.
- Tersisa: coba halaman admin dan notifikasi dari admin ke HP (siaran nyata hanya di mode Live); gambar himbauan/promo (K10); admin untuk himbauan/promo di Beranda (belum ada UI); SMTP (K9); uji offline `/luring` dan ajakan pasang di HP; uji produksi (`npm run build -w anggota`); artikel Panduan untuk menu Kirim Notifikasi. Catatan operasional: disk C: hampir penuh, `.next-uji` dihapus 23 Oktober (dibuat ulang otomatis); jenis galat "Jest worker ... child process exceptions" = biasanya disk penuh. Peringatan hidrasi `simulator-pre-loader` di dev berasal dari ekstensi browser pengguna, bukan kode.

### PWA anggota Tahap 4: akun (23 Oktober)
- Keputusan pengguna: bagian email dibuat tanpa kirim sungguhan sampai akun SMTP koperasi siap. `kirimEmail` (`anggota/src/lib/email.ts`) menulis isi email ke log server; `emailSiap()` = false. Setelah SMTP siap: pasang pustaka SMTP, isi `SMTP_*` di `anggota/.env.local`, ganti bagian itu; `ANGGOTA_URL` untuk alamat tautan.
- `backend/src/anggota/akun.ts`: `daftarAkun` (paritas `createNewRegisterUser`: username/anggota sudah punya akun, NIK 6 karakter, NIK anggota → akun anggota, selain itu NIK karyawan Mattel → akun tanpa keanggotaan dengan `kode_agt` = NIK dan `karyawan_mattel_id`; tambahan: password K6, username 3-50 karakter, anggota harus aktif, kunci advisory), jawaban keamanan scrypt format migrasi, `pertanyaanUntuk` (username fiktif tetap mendapat pertanyaan supaya tidak membocorkan), `resetLewatJawaban`, `gantiPassword`, `aturEmail` (unik tanpa beda huruf), `akunUntukResetEmail`.
- **Perbaikan login**: username dicocokkan `lower(trim())` seperti MySQL lama (collation _ci). Sebelumnya 93 username lama berspasi di tepi tidak bisa masuk di PWA. Data saat ini unik menurut aturan ini.
- PWA: `/daftar`, `/lupa-password` (tab pertanyaan keamanan / email), `/atur-password?token=` (token HMAC 30 menit, sekali pakai karena memuat sidik password, ditandatangani berbeda dari cookie sesi), `/lengkapi-email` (wajib setelah masuk bila email < 5 karakter, dicek di `wajibMasuk`), Akun → Ganti password (sesi perangkat lain berakhir) / Email / foto. Tautan "Lupa password?" dan "Daftar" di halaman Masuk. Pembatasan percobaan di memori (`lib/batas.ts`). Form memakai `tanpaReset` supaya isian tidak hilang saat server menolak.
- Foto profil: tabel baru `app_user_foto` (bytea, satu per akun; `database/postgres/anggota-web.sql`, `npm run anggota:pasang`), JPG/PNG/WEBP maks. 5 MB dicek dari isi file, `serverActions.bodySizeLimit` 6 MB, disajikan hanya ke pemiliknya di `/akun/foto`. Bila tabel belum dipasang, tombol foto tidak tampil. **Sudah dipasang di database asli dan uji.** Foto lama Android (`app_user.foto`, file di server PHP) belum dipindahkan (K10).
- Uji: `backend/test/anggota-akun.test.ts` kini 7 uji (daftar anggota/karyawan, semua pesan tolak, username lama, jawaban, reset, ganti password, email unik). Browser (server uji, 375×812): login Fendra tanpa email → Lengkapi Email; email salah ditolak dan isian tetap; email benar → Beranda (email tercatat di log, tidak terkirim); foto PNG terunggah dan tampil; file teks bernama .png ditolak; `/akun/foto` tanpa sesi dialihkan; ganti password (lama salah ditolak, benar tetap masuk); Daftar NIK anggota 372941 berhasil; lupa password lewat jawaban (huruf berbeda) berhasil; lewat email: tautan dari log membuka halaman, password tersimpan, tautan yang sama ditolak saat dipakai ulang; token reset tidak bisa dipakai sebagai cookie sesi.

### PWA anggota Tahap 3: pengajuan kredit (23 Oktober)
- Keputusan pengguna: sisa pinjaman (pokok + jasa) sampai Rp 100 dianggap lunas dan tidak mengunci pengajuan (`SISA_LUNAS` di `backend/src/anggota/pengajuan.ts`).
- `backend/src/anggota/pengajuan.ts`: `jenisKreditUntuk` (paritas `getJenisKreditV1`), `ajukanPinjaman` (semua aturan di server, urutan sama dengan aplikasi lama: staff, grade, kunci sisa, lama, besar; tambahan: tanggal realisasi hari ini s/d +1 tahun, keterangan maks. 100 karakter, satu pengajuan Menunggu per jenis), persen bunga/adm/provisi/denda dari `jenis_kredit`, baris anggota dikunci `FOR UPDATE`. `pengajuan-hitung.ts`: estimasi dari `jadwal()` mesin posting (K4), tanpa database sehingga dipakai juga di browser.
- Uji `backend/test/anggota-pengajuan.test.ts` (rollback): estimasi = jadwal pinjaman nyata CR-0826-22883, produk per status staff, semua pesan tolak, simpan (status P, persen dari jenis kredit, id identity > id lama), tolak pengajuan ganda, kunci sisa (receh tidak mengunci, sisa besar mengunci). Backend kini 21 uji.
- PWA: tab **Ajukan** menggantikan Riwayat di navigasi bawah (Riwayat tetap dari pintasan Beranda, kini dengan tombol kembali). Form: jenis, besar (terformat), lama (pilihan 1..maks), tanggal realisasi, keperluan; estimasi langsung; langkah Periksa sebelum Kirim; daftar "Pengajuan saya" dengan status Menunggu/Disetujui/Ditolak. Server action `ajukanAction` memakai `tx()` (mode uji berlaku), jeda 5 detik antar kiriman per akun.
- Uji di browser (server uji, akun Fendra): estimasi 3 juta × 5 bulan = Rp 660.000/bulan, pertama Rp 690.000; kirim → id 17328 berstatus P, muncul paling atas di kueri daftar Pengajuan Kredit admin; kirim ulang jenis sama → ditolak dengan pesan. Data uji ini ada di database **uji** saja.
- Dicek: identity `pengajuan_pinjaman`, `app_user`, `himbauan`, `promo` sudah berada di atas id lama (nilai berikutnya 17328, 2339, 2, 4); `pg_sequences.last_value` NULL hanya berarti sequence belum pernah dipanggil.
- Catatan alat uji: `computer type` tidak mengisi input berformat (terkontrol); tombol keyboard satu per satu berfungsi.

### PWA anggota Tahap 2 (23 Oktober)
- Halaman: Beranda (kartu saldo dengan tombol sembunyikan nominal yang diingat per perangkat, pintasan, potongan bulan ini, SHU, pinjaman berjalan), Simpanan + mutasi per jenis dengan saldo berjalan, Pinjaman (tunai dan KPR terpisah) + rincian dengan tab Jadwal/Pembayaran, Potongan, SHU per tahun buku, Riwayat, Notifikasi, Akun (data diri, keanggotaan, rekening, keluar), halaman 404. Navigasi bawah: Beranda, Simpanan, Pinjaman, Riwayat, Akun.
- Data: `anggota/src/lib/data.ts`, semua lewat `anggotaId` dari sesi. Rincian pinjaman dicek `id + anggota_id` (pinjaman anggota lain → 404, diuji). Query bersama backend dipanggil lewat `poolAngka` (`lib/db.ts`) supaya angka sampai sebagai number.
- Keputusan yang diterapkan: sisa pinjaman = sisa pokok dari rincian (`SUM(kredit_pokok - debit_pokok)`), lunas bila ≤ Rp 100 (sama dengan status lunas laporan admin), KPR terpisah (K3); potongan bulan ini = rumus `proyeksiPotongan` admin untuk satu anggota (K2); karyawan bukan anggota hanya melihat Beranda berisi penjelasan dan Akun (K5, `wajibAnggota()`).
- **Temuan SHU**: di tutup buku 2025 `temp_shu_backup.rp_labaditahan` = 0 untuk semua anggota, sehingga rumus aplikasi lama (`getShu`, juga di Android dan mobile-api) selalu menghasilkan 0. PWA menampilkan `rp_pencairan` (hasil hitung SHU desktop per anggota) sebagai SHU diterima, rumus lama hanya bila kosong. Komponen SHU hanya tampil bila rumus lama menghasilkan nilai. Perlu dikonfirmasi pengguna/akuntan.
- **Beda sisa pinjaman**: sisa pokok dari rincian berbeda dari rumus lama (`pokok - pokok/lama × cicilan`) pada 7.607 dari 22.957 pinjaman; 1.730 pinjaman masih bersisa menurut rincian vs 1.621 menurut rumus.
- Uji di browser (server uji 3201, 375×812, gelap dan terang) dengan akun Fendra: semua halaman tampil; total simpanan Beranda = total Simpanan − simpanan pokok; sisa pinjaman cocok dengan sisa jadwal; tombol sembunyikan nominal tersimpan setelah muat ulang. Diperbaiki saat uji: `kode_pos` bertipe integer (galat `trim`), saldo mutasi terpotong, kotak KPR kosong, baris riwayat terlalu terpotong.
- Belum: gambar himbauan/promo (file di server PHP, K10), Web Push, manifest/service worker (Tahap 5), ganti password/email/foto (Tahap 4).

### PWA anggota Tahap 1 (23 Oktober)
- Keputusan pengguna: K1-K10 semua usulan PRD; tampilan profesional, modern, tidak harus mirip Android lama, tanpa "AI slop" (PRD bagian 8 dan 11). Relasi wajib lewat id/FK, bukan `kode_agt`.
- `mobile-api/src/queries.ts` dipindah ke `backend/src/anggota/queries.ts` (mobile-api tinggal re-export). Semua fungsi kini menerima `anggotaId` / id pinjaman dan memfilter lewat `anggota_id`, `pinjaman_tunai_id`, `kpr_id`; `mobile-api/src/server.ts` mengubah `kdAnggota`/`noPinjaman` menjadi id sekali di awal (`idAnggota`, `idPinjaman`). `getanggota` dengan kode yang tidak ada tetap mengembalikan `[]`. Filter tahun SHU memakai rentang tanggal (indeks `(anggota_id, tgl_tutup_buku)`), satu query, bukan empat.
- Verifikasi: kueri lama vs baru dibandingkan untuk 40 anggota acak + 10 KPR (537 perbandingan): **0 beda nilai**, total waktu 3.794 ms → 481 ms. Urutan `getSaldoJenisPinjaman` dibuat pasti (sebelumnya pinjaman berkode sama urutannya acak). Kontrak Android 17 endpoint 0 beda.
- Baris tanpa FK yang sengaja tidak terbaca: 10.872 `log_notifikasi` ber-`kode_agt` berupa tanggal (bukan anggota) dan 149 `pinjaman_tunai_rincian_tagih` tanpa pinjaman induk.
- `backend/src/anggota/akun.ts`: login anggota (urutan sama dengan `login.php`), MD5 cocok → diganti bcrypt `$2y$` (`bcryptjs`, terbaca PHP), aturan password baru K6. Uji `backend/test/anggota-akun.test.ts` (rollback).
- `anggota/`: Next 16.2.10, port 3200, tema sendiri hijau koperasi (`globals.css`, oklch, mode gelap mengikuti HP, font Plus Jakarta Sans), sesi cookie HMAC 30 hari `kopkar_anggota` (rahasia `ANGGOTA_SESSION_SECRET`), dicek ulang ke database tiap request (`lib/anggota.ts`), kunci 5 kali gagal, pesan login disamarkan kecuali akun nonaktif. Halaman: `/masuk`, `/beranda` (kerangka), tombol keluar.
- Uji di browser (server uji 3201, ukuran HP): belum login → `/masuk`; password salah → pesan; benar → `/beranda`, hash berubah `$2y$10$`; keluar → `/beranda` kembali ke `/masuk`.
- **Temuan untuk Tahap 3 (aturan "kunci sisa")**: 1.179 dari 2.836 pinjaman yang masih "bersaldo" sisanya < Rp 100 (receh pembulatan, mis. Rp 2 atau Rp 3,67). Dengan aturan lama (saldo > 0), anggota itu tidak bisa mengajukan kredit jenis yang sama. Perlu keputusan pengguna: ikuti lama atau beri ambang.
- Jebakan: `String.replace` dengan teks pengganti berisi `$2y$` diikuti backtick menyisipkan isi file (`$` + backtick = bagian sebelum cocokan). Pakai fungsi sebagai pengganti.
- Belum: Web Push, manifest/service worker (Tahap 5), daftar/lupa password/wajib email (Tahap 4), landing page.

### Analisis aplikasi mobile lama dan PRD PWA (23 Oktober)
- Dibaca: aplikasi Android (52 file Java, `util/Api.java`, layar login/pengajuan/simpanan/pinjaman/SHU/potongan) dan server PHP `C:\laragon\www\KopkarMJS2000_2026` (`v1/Api.php`, `login.php`, `user.php`, `dashboard.php`, `includes/DbOperation.php`, `Auth.php`, `MailHelper.php`, `reset-password.php`). `cleaned.txt` di folder Android hanya potongan 43 baris, bukan sumber lengkap.
- Dicek ke PostgreSQL v2: kolom `app_user` (`password_hash`, `jawaban_hash`, `fcm_token`), `pengajuan_pinjaman`, kunci di `jenis_kredit`, jumlah hash MD5/bcrypt, email terisi.
- Hasil ditulis di `docs/analisis-aplikasi-mobile-lama.md` dan `docs/prd-pwa-anggota.md`. Belum ada kode PWA.
- Catatan: query `getpinjaman`, `getshu`, dan lainnya sudah ada versi PostgreSQL di `mobile-api/src/queries.ts` (SHU sudah memperbaiki bug filter tahun di PHP); PRD mengusulkan memindahkannya ke `backend/src/anggota/` agar dipakai bersama.

### Optimasi Daftar Anggota (23 Oktober)
- Pengguna meminta tabel `anggota` dipecah karena lambat. Hasil pengukuran: `anggota` hanya 31 kolom, 2.026 baris, 1 MB; membaca 25 baris = 2 ms. **Tabel tidak dipecah.** Pemecahan juga akan menyentuh mesin posting, kontrak API mobile, `mapping.mjs`/migrasi, dan rekonsiliasi.
- Penyebab lambat: saldo simpanan dijumlah dari 301 ribu baris untuk semua anggota setiap kali halaman dibuka (171-1.201 ms).
- Perbaikan di `lib/queries/anggota.ts`:
  - Saldo dihitung per baris lewat indeks `simpanan(anggota_id)`: halaman 1 dari 225 ms menjadi 5 ms; cari nama 6 ms; halaman 40 141 ms.
  - Hasil identik dengan query lama.
  - Saat diurutkan per saldo tetap memakai agregat sekali (lebih cepat untuk kasus itu).
- Detail anggota menampilkan field yang umumnya terisi lewat kolom tersembunyi di `membersConfig`: jenis kelamin, status perkawinan, alamat, kode pos (`0` → kosong), rekening atas nama, potongan simpanan pokok/wajib/sukarela per bulan, tanggal/alasan keluar, pencatat. Kolom terisi <10% (`telp_rmh`, `status_acc`, `keterangan_acc`) tidak dimuat.

### Saldo Buku Simpanan (23 Oktober)
- Kolom Saldo di `/dashboard/savings/ledger` sebelumnya membaca `simpanan.rp_saldo`. Desktop tidak mengisi kolom itu: 295.339 dari 301.577 baris bernilai 0.
- Sekarang saldo berjalan dihitung di `lib/queries/simpanan.ts`: jumlah setoran − pengambilan anggota itu untuk jenis yang sama sampai transaksi tersebut, dari seluruh riwayat. Urutan `(tgl_transaksi, urut, id)` karena `urut` tidak unik.
- Saldo dihitung lewat opsi baru `kolomHalaman` di `paged()`, yaitu kolom mahal yang dihitung setelah LIMIT/OFFSET. Tanpa itu halaman 100 butuh 4,5 detik karena baris yang dilewati ikut dihitung.
- Diverifikasi: KPK 350295 jenis 02 saldo terbaru 23.945.730, sama dengan Kartu Simpanan dan total saldo.
- Atas permintaan pengguna, Buku Simpanan hanya bisa diurutkan menurut Tanggal (kolom lain `sortable` dihapus), supaya saldo berjalan tetap terbaca. Kunci urut gabungan `(tgl_transaksi, urut, id)`, sehingga arah urut juga berlaku untuk transaksi di tanggal yang sama. Diverifikasi kedua arah, termasuk tanggal dengan dua transaksi.
- Disk penuh lagi (0 MB) saat bekerja. Cache Turbopack `.next/dev/cache` tumbuh lagi menjadi ±1 GB dan dihapus; ruang kemudian naik sendiri ke ±4 GB, jadi ada proses lain di komputer yang juga memakai disk.
- Belum ditangani: daftar tanpa filter tetap ±0,7 detik karena urut/hitung 301 ribu baris tanpa indeks `simpanan(tgl_transaksi, urut)`. Indeks bisa ditambah lewat `mapping.mjs` bila perlu.

### Pilihan baris per halaman (23 Oktober)
- Semua tabel berpaginasi punya pilihan **25 / 50 / 100 / 200 / Semua** (`components/ui/PilihBaris.tsx`): `ModuleTable`, Rekap Simpanan (`SavingsSummary`), dan Daftar Pinjaman (`LoansDashboard`; bawaan 20 → 25, footer tampil walau satu halaman).
- Aturan bersama di `lib/halaman.ts` (aman untuk klien): parameter URL `pageSize` berupa angka 1..200 atau `semua`. "Semua" dibatasi `MAKS_SEMUA` = 5.000 baris supaya jurnal (1,1 juta) dan simpanan (301 ribu) tidak membuat server macet; label menjadi "Semua (maks. 5.000)" bila total lebih besar. Mengganti ukuran kembali ke halaman 1.
- Daftar Anggota: halaman >200 baris memakai penjumlahan saldo sekaligus (2,2× lebih cepat untuk "Semua" daripada per baris).
- Diverifikasi lewat URL dan klik:
  - anggota Semua 2.026 baris
  - COA 152
  - jurnal Semua dibatasi 5.000
  - pinjaman Semua 192
  - `pageSize=999999` → bawaan 25
  - ganti ke 100 dari halaman 3 → halaman 1 dari 21
- Waktu muat diukur saat CPU komputer 90–97% (Chrome), jadi angkanya tidak mewakili. Buku Simpanan "Semua" tanpa filter ±3 dtk di database.
- Panduan *Membaca layar* dibetulkan: sebelumnya menyebut pilihan baris padahal belum ada.

### Jebakan yang sudah ditemui
- PowerShell 5.1 `Set-Content -Encoding utf8` menambah BOM. Di `.env.local` ini membuat `PG_URL` tidak terbaca; tulis dengan `[IO.File]::WriteAllText` atau Write tool.
- Typecheck gagal *"does not satisfy the constraint AppRoutes"*: `.next/types` usang bertabrakan dengan `.next/dev/types`. Perbaiki dengan `npx next typegen` di `frontend`.
- Git Bash mengubah argumen yang diawali `/` (misal `/dashboard/...`) menjadi path Windows; jalankan skrip seperti itu dari PowerShell.
- Uji halaman di balik login tanpa password: buat cookie sesi bertanda tangan dari `SESSION_SECRET` untuk operator superadmin. Format ada di `lib/sesi.ts`: `pv` = sha256(password_hash) base64url 16 karakter; nama cookie `kopkar_sesi`, atau `kopkar_sesi_uji` di server uji.
- Server action menulis lewat `tx()` supaya ikut mode uji. Yang sengaja tidak memakai `tx()`: akses/operator, ganti password, dan saklar mode.

---

## 2026-10-24 — Admin: Cari Pinjaman, tabel seragam, pinjaman lunas bersaldo buku, pendaftaran, navbar

- **Cari Pinjaman** (`/dashboard/loans/cari`, menu baru di Pinjaman, izin `MENU_DETAIL_PINJAMAN_GRUP` di `config/akses.ts`): pintu ke detail pinjaman tanpa izin Daftar Pinjaman. Nomor yang cocok persis langsung membuka `/dashboard/loans/[no]`; potongan nomor, nama, KPK, atau kode anggota menampilkan daftar pilihan (`cariPinjaman` di `lib/queries/pinjaman-detail.ts`, dibatasi grup pinjaman yang berizin).
- **Bilah halaman seragam** dan menempel di dasar layar untuk semua tabel daftar (`ModuleTable`, `SavingsSummary`, `PengajuanList`). Daftar Pinjaman: filter satu baris di dalam kartu tabel, menu Kolom sebaris dengan baris per halaman, tata letak tabel data standar.
- **Rekap Simpanan**: toolbar satu baris, kepala tabel dan baris Total/Grand Total selalu terlihat saat digulir; cetak hanya saldo per jenis, lanskap.
- **Pinjaman lunas bersaldo buku**: lunas = sisa buku <= Rp 100 **atau** semua cicilan terbayar (`jml_cicilan >= lama`), sama dengan PWA dan API lama. Pinjaman seperti itu tampil dengan sisa pokok 0 dan tanda bila buku masih bersaldo: 182 pinjaman (Rp 1.502.623.670), umumnya pinjaman bank (BRI) yang di-top-up atau dilunasi anggota langsung ke bank, dibereskan koperasi dengan jurnal umum manual ("jurnal balik") tanpa mengubah rincian pinjaman. 86 di antaranya (Rp 531,5 juta) jurnalnya ditemukan; 96 belum. Hasil pemeriksaan per pinjaman ada di folder `hasil-periksa/` (memuat data anggota, masuk `.gitignore`).
- **Pendaftaran anggota baru (admin)**: aksi setujui/tolak/hapus di **User Mobile** dengan filter Anggota baru / Sudah disetujui / Ditolak (kolom `app_user.keputusan_daftar`). Menyetujui karyawan Mattel yang belum anggota otomatis membuat baris `anggota` (+ `anggota_detail` kosong) berkode lama **BBTT-NNNN** (bulan-tahun pencatatan + urut tertinggi + 1, `jadikanAnggota` di `backend/src/anggota/akun.ts`, kunci `anggota_baru`), grade/simpanan bawaan dari anggota aktif terbaru bergrade sama. Halaman lama Pendaftaran Baru mengalihkan ke User Mobile. Hapus akun aplikasi menghapus data aplikasi; anggota dan data keuangannya tetap.
- **Navbar admin**: dua ikon dengan dropdown, pesan anggota (bila berizin) dan lonceng yang dikelompokkan per jenis (pendaftaran, pengajuan kredit, himbauan, promo, lainnya); angka diperbarui tiap 10 detik saat tab terlihat (`actions/navbar.ts`, `components/layout/Lonceng.tsx`).
- **Migrasi ulang** (`database/postgres/README.md`): `migrate.mjs`/`reconcile.mjs` butuh paket `mariadb` yang tidak ada di `package.json` (`npm install --no-save mariadb`); `--reset` menghapus operator/grup buatan web, jadi ekspor dulu lalu buat ulang, dan jalankan ulang `anggota:pasang`, `pengaturan:pasang`, `panduan:pasang`.
- **Diperiksa saat menulis entri ini**: `npm test` 60 dari 61 uji backend lolos + 3 mobile-api. Yang gagal: `hapus akun aplikasi`, karena FK tabel web hilang. Diperbaiki hari yang sama lewat `anggota:pasang` (lihat ringkasan atas); sesudahnya 61/61. Kolom `menunggu_admin`, `keputusan_daftar` dan tabel `app_user_google`, `app_user_foto`, `email_antrean` sudah ada di database asli dan uji.

---

## 2026-10-24 — Daftar Pinjaman: bayar/sisa dari buku pinjaman dan query lebih cepat

- Penyebab kolom Bayar Pokok/Bayar Bunga 0: pinjaman yang ditampilkan dibuat 19 Okt 2026 dan **memang belum ada angsuran** (`jml_cicilan = 0`, rincian hanya baris pencairan). Bukan bug.
- Namun rumus lama (`pokok / lama x jml_cicilan`, rumus desktop dan API mobile lama) hanya perkiraan: meleset ±350 pinjaman (pokok) dan ±440 (bunga) dari 22.957, hampir semuanya sebelum 2024; 2024-2026 hanya 8 dari 6.506 yang berbeda. Kolom baru diambil dari buku pinjaman `pinjaman_tunai_rincian`: **Bayar Pokok = SUM(debit_pokok)**, **Bayar Bunga = SUM(debit_bunga)**, **Sisa Pokok = SUM(kredit_pokok - debit_pokok)** (sama dengan aplikasi anggota). Lunas = sisa <= 100 ATAU `jml_cicilan >= lama` (aturan yang sama dengan PWA dan API lama); pinjaman lunas tampil sisa cicilan 0 dan tunggakan 0.
- **Jangan pakai `pinjaman_tunai_rincian.saldo_pokok/saldo_bunga`**: pada baris angsuran nilainya 0 (bukan saldo berjalan). `pinjaman_tunai.rp_bayar_pokok` berisi sisa tersimpan, bukan jumlah dibayar.
- Pinjaman tanpa baris rincian (9 di data, mis. CR-0626-22530) sebelumnya hilang karena INNER JOIN; sekarang tampil (bayar 0, sisa = plafond). KPR ada di tabel `kpr` (440), bukan `pinjaman_tunai`, jadi tidak ada di halaman ini.
- Query dipindah ke `lib/queries/pinjaman-sql.ts` (tanpa import server, bisa diuji skrip): rentang tanggal memakai indeks `tgl_pinjaman` (bukan EXTRACT), tanpa GROUP BY, halaman dipilih dulu lalu buku dihitung untuk baris itu saja. Ukur di data asli: 6-30 ms (sebelumnya 46-63 ms). Kolom baru Sisa Pokok di tabel dan cetak.
- Daftar Pinjaman meniru layar desktop: 24 kolom (Realisasi ... #Opr), status radio Semua/Tunggak/Lunas/Belum Lunas, kotak centang Anggota aktif, warna baris (merah tunggak, biru jatuh tempo hari ini, abu lunas). **Filter periode (bulan/tahun) dibuang**; daftar memuat semua pinjaman (22.957) dengan paginasi (6-430 ms). **Tunggak dihitung dari jadwal tagih** (angsuran jatuh tempo hari ini - jml_cicilan), bukan `jml_tunggakan` yang usang (14 terisi vs ±160 menunggak sebenarnya); Kredit Macet memakai aturan lunas yang sama (162 pinjaman tunai).
- **Kolom tabel tersimpan**: `useKolomTersimpan` (`lib/kolom-tersimpan.ts`) menyimpan kolom yang tampil per halaman di localStorage browser (`kopkar.kolom:<pathname>`); `PilihKolom` = menu Kolom (tetap terbuka saat mencentang, Pilih semua, Kembalikan bawaan). Dipakai `ModuleTable` (Daftar Anggota, Karyawan, User Mobile, Jurnal, Buku Simpanan, COA tabel) dan Daftar Pinjaman (cetak ikut kolom yang tampil). Per browser, bukan per operator/perangkat.
- **Urut kolom Daftar Pinjaman**: klik judul kolom (naik, turun, lalu kembali ke bawaan); parameter URL `sortBy`/`sortOrder`, daftar putih di `pinjaman-sql.ts` (kolom kontrak diurutkan sebelum halaman dipilih, 70-180 ms; kolom hitungan seperti Byr Pokok, Sisa Pokok, Tunggak, Jatuh Tempo butuh buku pinjaman untuk semua baris, 0,6-1,2 detik). Urutan ikut dipertahankan saat pindah halaman, ganti filter, dan di cetak.
- **Aturan tunggakan (24 Okt)**: dari jadwal tagih (`pinjaman_tunai_rincian_tagih`), bukan `tgl_akhir_bayar` (hanya 902 dari 22.957 terisi). Angsuran dianggap terlambat bila **bulan jatuh temponya sudah berakhir** (jatuh tempo < tanggal 1 bulan ini), karena potongan gaji dibukukan sekitar tanggal 27-30 (jatuh tempo di jadwal tanggal 9). Berlaku di Daftar Pinjaman (`pinjaman-sql.ts`) dan Kredit Macet (`pinjaman-lap.ts`), jadi angkanya sama: 132 pinjaman tunai (sebelumnya 162; 30 hanya menunggu potongan bulan ini) + 43 KPR di Kredit Macet. Kredit Macet kini punya kolom Hari tunggak (DPD dari jatuh tempo tertua yang belum dibayar) dan Kolektibilitas; bila tabel `jenis_macet` kosong dipakai tingkatan perbankan/OJK: 1-90 hari Dalam Perhatian Khusus, 91-120 Kurang Lancar, 121-180 Diragukan, >180 Macet (tunai: 19 / 3 / 6 / 104). Pinjaman tanpa jadwal tagih (10) tidak bisa dinilai dan dicatat di catatan halaman.
- **Detail pinjaman** `/dashboard/loans/[no]` (`lib/queries/pinjaman-detail.ts`): No.Pinjaman di Daftar Pinjaman dan Kredit Macet (tunai) bisa diklik. Ringkasan memakai `sqlLaporanPinjaman` (angka sama dengan daftar), tab **Jadwal Angsuran** (jadwal tagih + status Terbayar/Terlambat/Jatuh tempo bulan ini/Belum jatuh tempo, tanggal bayar, jumlah, no. bukti) dan **Riwayat Pembayaran** (buku pinjaman: pencairan dan setoran, dengan sisa pokok berjalan dihitung dari kredit - debit). Izin sama dengan Daftar Pinjaman. KPR belum punya halaman detail.
- Parity: `backend/src/anggota/queries.ts` (getpinjaman untuk API mobile lama) masih memakai rumus lama, sengaja (paritas dengan aplikasi Android lama).

---

## 2026-10-24 — Dokumen cetak per laporan dan perbaikan daftar pilihan (combo)

- **Combo**: `globals.css` kini memberi warna tema pada `select option` (di mode gelap tulisan sebelumnya terang di latar terang). Berlaku untuk semua `<select>` bawaan.
- **Mesin cetak** (`frontend/src/lib/cetak-klien.ts`, `app/actions/cetak.ts`): tombol Cetak membuka **jendela dokumen sendiri** (bukan `window.print()` halaman): kop surat dari Pengaturan Perusahaan (nama, alamat, alamat 2/telepon, kota, email, website, logo), judul + keterangan filter, isi, nama pencetak + waktu, nomor halaman. Pratinjau di jendela itu sama dengan hasil cetak; ada tombol Potret / Lanskap / Cetak.
- **Orientasi otomatis**: lebar alami tabel diukur (sel tanpa pecah baris); ≤ 700 px = potret, selain itu lanskap. Bila masih lebih lebar, isi diperkecil (skala minimum 0,62, lalu diperkecil lagi hanya bila masih terpotong) sehingga tidak ada kolom yang terpotong.
- **Dua cara isi**: (1) daftar bertabel mencetak SEMUA baris sesuai filter dan urutan lewat `dataCetakAction` (maks. 5.000 baris; `DAFTAR` di `cetak.ts` memetakan alamat halaman ke query): Daftar Anggota, Karyawan Mattel, User Mobile, Jurnal Umum, Buku Simpanan, Daftar Pinjaman (dengan total), Rekap Simpanan (kepala berkelompok, dengan total). (2) halaman laporan lain menyalin isi halaman yang dibersihkan dari form/tombol: area diambil dari induk blok `KopLaporan` (Buku Kas/Besar, Neraca Saldo, Neraca, Rugi Laba, Potongan Gaji) atau elemen `data-area-cetak` (+ `data-judul-cetak`, `data-subjudul-cetak`): Kartu Simpanan, Tunggakan, SHU per Anggota, Bagan Akun COA (blok tersembunyi berisi seluruh pohon), artikel Panduan.
- `KopLaporan` memakai nama koperasi dari Pengaturan (sebelumnya teks tetap) dan bertanda `data-tanpa-cetak` karena kop dan judul dibuat dokumen cetak.
- **Belum diuji di halaman admin sungguhan** (butuh login): mesinnya diuji dengan dokumen contoh di browser (tabel sempit = potret 100%, 13 kolom = lanskap 96%, tanpa terpotong). Periksa tiap laporan sekali.
- Jebakan: kolom tabel ber-`width:%` membuat ukuran alami salah ukur (kolom No. memakai `1px`).

---

## 2026-10-23 — Masuk dan daftar dengan Google (PWA anggota)

- Tombol **Lanjut dengan Google** di `/masuk` dan `/daftar` (muncul bila `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` ada di `anggota/.env.local`). Alur OIDC kode otorisasi + PKCE di `anggota/src/lib/google.ts`, rute `app/auth/google` (mulai) dan `app/auth/google/callback`.
- Alamat balik: `GOOGLE_REDIRECT_URI` bila berupa alamat lengkap, selain itu dari host permintaan (`http://localhost:3201/auth/google/callback` di server uji). Alamat yang sama harus terdaftar di Google Console (uji `:3201`, dev `:3200`, dan produksi).
- Sudah tertaut (`app_user_google.sub`) atau email Google sama dengan email akun **yang terverifikasi** (`cariAkunGoogle`): langsung masuk. Selain itu data Google (cookie bertanda tangan 30 menit) dibawa ke `/daftar/google`: nama, email, foto terisi; pengguna mengisi NIK Mattel, username, password, pertanyaan keamanan. Akun langsung aktif (email dari Google dianggap terverifikasi, tanpa kode 6 angka); foto Google disalin ke `app_user_foto`.
- Tabel baru `app_user_google` di `anggota-web.sql`: jalankan `npm run anggota:pasang` di database produksi sebelum dipakai (di database uji sudah dipasang). Tes baru di `backend/test/anggota-akun.test.ts`.
- Email lama yang belum terverifikasi sengaja tidak ditautkan otomatis (mencegah pengambilalihan akun); anggota itu masuk dengan username/password dan memverifikasi email di menu Akun.
- **Semua pendaftaran baru (Google maupun kode email) menunggu persetujuan admin.** Kolom baru `app_user.menunggu_admin` (anggota-web.sql; WAJIB `npm run anggota:pasang` di database sebelum kode ini dijalankan, karena `cariAkun` membacanya). Akun baru: `status=false, menunggu_admin=true`; setelah email terbukti (kode atau Google) pendaftar melihat `/daftar/diterima` (nama + foto Google, tombol WhatsApp). Admin memutuskan di **User Mobile** (`/dashboard/members/mobile-users`, panel Pendaftaran Baru di atas tabel; `putuskanPendaftaran` di backend): setujui = aktif (email pemberitahuan ke pendaftar), tolak = tetap nonaktif. Setujui ditolak bila email belum terverifikasi. Admin juga mendapat lonceng/push/email pengurus (`beritahuPendaftaranBaru`).
- Nomor WhatsApp: `pengaturan_web.wa_kontak`, diisi di admin Pengaturan (kartu Kontak WhatsApp); tombol tidak tampil bila kosong.
- Pertanyaan keamanan **dihapus dari pendaftaran** (manual dan Google). Lupa password: email jadi cara utama; jalur pertanyaan ("Akun lama") hanya untuk akun yang belum punya email terverifikasi (`resetLewatJawaban` menolak yang sudah terverifikasi). Belum dikerjakan: paksa akun lama mengisi dan memverifikasi email, dan tombol "Hubungkan Google" di menu Akun untuk anggota lama.
- Pusat Panduan: kategori baru `10-pendaftaran-anggota-baru` (untuk admin, 5 artikel) dan `11-panduan-anggota` (bahasa anggota, 5 artikel); artikel `user-mobile` ditulis ulang. `npm run panduan:pasang` hanya menambah slug baru, jadi artikel `user-mobile` yang sudah ada di database harus diperbarui lewat Kelola Panduan (atau `--timpa`, yang menghapus suntingan admin). Terpasang di database uji; belum di database asli.
- Jebakan tampilan: tema mendefinisikan `--spacing-xl/lg/md/sm/xs` di `globals.css`; pakai nilai eksplisit (`max-w-[36rem]`) alih-alih `max-w-xl` pada elemen baru. `max-w-xl` di hero Pusat Panduan sempat membuat paragraf dan kotak cari menyempit.
- Belum ada: pendaftar karyawan Mattel yang bukan anggota tidak otomatis dibuatkan data anggota (kode anggota, simpanan pokok); itu proses menu desktop "Request User && Anggota Baru" yang aturannya belum tersedia.

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
