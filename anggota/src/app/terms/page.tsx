import type { Metadata } from "next"
import Link from "next/link"
import { EMAIL_KONTAK, HalamanHukum } from "@/components/HalamanHukum"
import { kontakWa } from "@/lib/koperasi"

export const metadata: Metadata = { title: "Syarat dan Ketentuan", description: "Ketentuan penggunaan aplikasi anggota Kopkar MJS." }
export const dynamic = "force-dynamic"

export default async function SyaratKetentuanPage() {
    const wa = await kontakWa()
    return (
        <HalamanHukum judul="Syarat dan Ketentuan" diperbarui="23 Oktober 2026">
            <section>
                <p>
                    Syarat ini mengatur penggunaan aplikasi anggota Koperasi Karyawan Mattel (Kopkar MJS, &quot;koperasi&quot;). Dengan mendaftar atau
                    memakai aplikasi, Anda setuju pada syarat ini dan pada <Link className="font-semibold text-utama" href="/policy">Kebijakan Privasi</Link>.
                </p>
            </section>

            <section>
                <h2>1. Siapa yang boleh memakai</h2>
                <ul>
                    <li>Aplikasi untuk anggota koperasi dan karyawan Mattel yang NIK-nya terdaftar. Pendaftaran memerlukan NIK yang valid dan email aktif.</li>
                    <li>Akun baru <strong>tidak langsung aktif</strong>. Pengurus koperasi memeriksa pendaftaran dan dapat menyetujui atau menolaknya. Anda akan diberi tahu lewat email.</li>
                    <li>Karyawan Mattel yang belum menjadi anggota hanya mendapat akses terbatas sampai keanggotaannya diproses pengurus.</li>
                </ul>
            </section>

            <section>
                <h2>2. Akun dan keamanan</h2>
                <ul>
                    <li>Data yang Anda berikan harus benar dan milik Anda sendiri. Satu orang satu akun.</li>
                    <li>Anda bertanggung jawab menjaga kerahasiaan kata sandi, jawaban keamanan, dan akses ke email atau akun Google yang dipakai untuk masuk.</li>
                    <li>Jangan membagikan kode verifikasi kepada siapa pun, termasuk yang mengaku pengurus.</li>
                    <li>Segera hubungi kami bila akun Anda dipakai orang lain.</li>
                </ul>
            </section>

            <section>
                <h2>3. Penggunaan yang dilarang</h2>
                <ul>
                    <li>Mendaftar atau masuk memakai identitas orang lain, atau memberikan data palsu.</li>
                    <li>Mencoba mengakses data anggota lain, merusak, atau mengganggu layanan, termasuk percobaan menebak kata sandi.</li>
                    <li>Memakai aplikasi untuk tujuan yang melanggar hukum atau merugikan koperasi dan anggota lain.</li>
                </ul>
                <p>Akun yang melanggar dapat dinonaktifkan atau dihapus oleh pengurus.</p>
            </section>

            <section>
                <h2>4. Informasi keuangan dan pengajuan</h2>
                <ul>
                    <li>Saldo, pinjaman, potongan, dan SHU yang tampil adalah informasi dari pembukuan koperasi dan dapat tertunda dibanding kondisi terbaru. Bila ada selisih, catatan resmi koperasi yang berlaku.</li>
                    <li>Pengajuan kredit lewat aplikasi hanyalah permohonan. Persetujuan dan pencairan ditentukan pengurus sesuai ketentuan koperasi dan tidak dijamin.</li>
                    <li>Informasi di aplikasi bukan nasihat keuangan.</li>
                </ul>
            </section>

            <section>
                <h2>5. Notifikasi</h2>
                <p>
                    Koperasi dapat mengirim himbauan, promo, status pengajuan, dan pengumuman lewat notifikasi aplikasi dan email. Kode verifikasi dan
                    pemberitahuan keamanan tetap dikirim karena diperlukan untuk akun Anda.
                </p>
            </section>

            <section>
                <h2>6. Ketersediaan layanan</h2>
                <p>
                    Kami berupaya menjaga aplikasi tetap tersedia, tetapi tidak menjamin layanan selalu bebas gangguan. Aplikasi dapat dihentikan sementara
                    untuk pemeliharaan atau diubah tanpa pemberitahuan sebelumnya. Sejauh diizinkan hukum, koperasi tidak bertanggung jawab atas kerugian
                    tidak langsung akibat gangguan layanan atau kelalaian pengguna menjaga akunnya.
                </p>
            </section>

            <section>
                <h2>7. Penutupan akun</h2>
                <p>
                    Anda dapat meminta penghapusan akun sesuai bagian Penghapusan Akun di Kebijakan Privasi. Berakhirnya akun aplikasi tidak
                    menghapus hak dan kewajiban keanggotaan Anda di koperasi, yang diatur anggaran dasar dan ketentuan koperasi.
                </p>
            </section>

            <section>
                <h2>8. Perubahan syarat</h2>
                <p>Syarat ini dapat diperbarui. Versi terbaru ada di halaman ini; pemakaian aplikasi setelah perubahan berarti Anda menyetujuinya.</p>
            </section>

            <section>
                <h2>9. Hukum yang berlaku dan kontak</h2>
                <p>Syarat ini tunduk pada hukum Republik Indonesia. Pertanyaan dan keluhan dapat disampaikan ke:</p>
                <p>
                    Email: <a className="font-semibold text-utama" href={`mailto:${EMAIL_KONTAK}`}>{EMAIL_KONTAK}</a>
                    {wa && <> · WhatsApp: <a className="font-semibold text-utama" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">+{wa}</a></>}
                </p>
            </section>
        </HalamanHukum>
    )
}
