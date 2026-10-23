import type { Metadata } from "next"
import { EMAIL_KONTAK, HalamanHukum } from "@/components/HalamanHukum"
import { kontakWa } from "@/lib/koperasi"

export const metadata: Metadata = { title: "Kebijakan Privasi", description: "Bagaimana aplikasi anggota Kopkar MJS mengumpulkan, memakai, dan melindungi data Anda." }
export const dynamic = "force-dynamic"

export default async function KebijakanPrivasiPage() {
    const wa = await kontakWa()
    return (
        <HalamanHukum judul="Kebijakan Privasi" diperbarui="23 Oktober 2026">
            <section>
                <p>
                    Kebijakan ini menjelaskan data apa yang dikumpulkan aplikasi anggota Koperasi Karyawan Mattel (Kopkar MJS, selanjutnya
                    &quot;koperasi&quot; atau &quot;kami&quot;), untuk apa data itu dipakai, dan pilihan yang Anda miliki. Dengan mendaftar atau memakai
                    aplikasi, Anda menyatakan telah membaca kebijakan ini.
                </p>
            </section>

            <section>
                <h2>1. Data yang kami kumpulkan</h2>
                <ul>
                    <li><strong>Data pendaftaran:</strong> NIK karyawan, username, email, dan kata sandi (disimpan hanya dalam bentuk hash, tidak bisa dibaca). Akun lama dapat juga memiliki jawaban pertanyaan keamanan (juga di-hash).</li>
                    <li><strong>Data dari akun Google</strong> bila Anda memilih &quot;Lanjut dengan Google&quot;: nama, alamat email, foto profil, dan pengenal akun Google Anda. Kami tidak meminta akses ke Gmail, kontak, Drive, kalender, atau data Google lainnya.</li>
                    <li><strong>Data keanggotaan:</strong> data anggota yang sudah dikelola koperasi, yaitu simpanan, pinjaman, potongan gaji, SHU, riwayat transaksi, dan pengajuan kredit yang Anda buat lewat aplikasi.</li>
                    <li><strong>Foto profil</strong> yang Anda unggah atau yang disalin dari akun Google atas pilihan Anda.</li>
                    <li><strong>Pesan</strong> yang Anda kirim ke pengurus lewat fitur pesan di aplikasi.</li>
                    <li><strong>Data perangkat untuk notifikasi:</strong> langganan notifikasi push dari browser atau perangkat Anda, bila Anda mengizinkannya.</li>
                    <li><strong>Data teknis keamanan:</strong> cookie sesi masuk dan catatan percobaan masuk untuk mencegah penyalahgunaan.</li>
                </ul>
            </section>

            <section>
                <h2>2. Untuk apa data dipakai</h2>
                <ul>
                    <li>Memverifikasi bahwa Anda anggota atau karyawan Mattel, dan membuat serta mengamankan akun Anda.</li>
                    <li>Menampilkan simpanan, pinjaman, potongan, dan SHU Anda, serta memproses pengajuan kredit.</li>
                    <li>Mengirim kode verifikasi, pemberitahuan status pendaftaran dan pengajuan, himbauan, dan pengumuman koperasi lewat email dan notifikasi aplikasi.</li>
                    <li>Memungkinkan pengurus menyetujui atau menolak pendaftaran akun baru dan menjawab pesan Anda.</li>
                    <li>Menjaga keamanan layanan dan mencegah penyalahgunaan.</li>
                </ul>
                <p>
                    Data dari akun Google hanya dipakai untuk mengisi data pendaftaran dan membuktikan bahwa email itu milik Anda. Data itu tidak dipakai
                    untuk iklan, tidak dijual, dan tidak dibagikan ke pihak lain di luar yang dijelaskan di bawah.
                </p>
            </section>

            <section>
                <h2>3. Dengan siapa data dibagikan</h2>
                <p>Kami tidak menjual atau menyewakan data pribadi. Data hanya dapat diakses oleh:</p>
                <ul>
                    <li>Pengurus dan operator koperasi yang berwenang, sesuai hak aksesnya.</li>
                    <li>Penyedia layanan yang membantu operasional, misalnya penyedia email (untuk mengirim email ke Anda), Google (untuk masuk dengan Google), dan layanan notifikasi push browser. Mereka hanya menerima data yang diperlukan untuk layanan itu.</li>
                    <li>Pihak lain bila diwajibkan oleh hukum atau permintaan resmi pihak berwenang.</li>
                </ul>
            </section>

            <section>
                <h2>4. Penyimpanan dan keamanan</h2>
                <p>
                    Data disimpan di server koperasi. Koneksi ke aplikasi memakai HTTPS, kata sandi disimpan sebagai hash, dan akses
                    pengurus dibatasi menurut hak akses. Tidak ada sistem yang sepenuhnya bebas risiko; bila Anda menduga akun disalahgunakan,
                    segera ganti kata sandi dan hubungi kami.
                </p>
                <p>
                    Data keanggotaan dan transaksi disimpan selama Anda menjadi anggota dan selama diwajibkan untuk pembukuan, audit, dan peraturan
                    yang berlaku. Data akun aplikasi disimpan selama akun Anda ada.
                </p>
            </section>

            <section>
                <h2>5. Hak Anda</h2>
                <ul>
                    <li>Melihat dan memperbarui data akun Anda di menu Akun.</li>
                    <li>Mencabut izin notifikasi kapan saja lewat pengaturan browser atau perangkat.</li>
                    <li>Meminta salinan, koreksi, atau penghapusan data akun aplikasi Anda.</li>
                    <li>Mencabut akses aplikasi ini dari akun Google Anda di <em>myaccount.google.com/permissions</em>. Akun aplikasi tetap ada dan Anda masih bisa masuk dengan username dan kata sandi.</li>
                </ul>
            </section>

            <section>
                <h2>6. Penghapusan akun</h2>
                <p>
                    Untuk meminta penghapusan akun, kirim email ke <a className="font-semibold text-utama" href={`mailto:${EMAIL_KONTAK}?subject=Permintaan%20penghapusan%20akun`}>{EMAIL_KONTAK}</a> dari
                    email yang terdaftar, sertakan nama lengkap, NIK, dan username Anda. Setelah identitas Anda diverifikasi, akun aplikasi beserta
                    foto, langganan notifikasi, dan pesan Anda dihapus. Data keuangan koperasi (simpanan, pinjaman, transaksi) dapat tetap disimpan
                    sepanjang diperlukan untuk pembukuan, audit, dan kewajiban hukum.
                </p>
            </section>

            <section>
                <h2>7. Anak-anak</h2>
                <p>Aplikasi ditujukan untuk anggota koperasi dan karyawan dewasa. Kami tidak dengan sengaja mengumpulkan data anak-anak.</p>
            </section>

            <section>
                <h2>8. Perubahan kebijakan</h2>
                <p>Kebijakan ini dapat diperbarui. Versi terbaru selalu ada di halaman ini, dengan tanggal pembaruan di bagian atas.</p>
            </section>

            <section>
                <h2>9. Hubungi kami</h2>
                <p>
                    Email: <a className="font-semibold text-utama" href={`mailto:${EMAIL_KONTAK}`}>{EMAIL_KONTAK}</a>
                    {wa && <> · WhatsApp: <a className="font-semibold text-utama" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">+{wa}</a></>}
                </p>
            </section>
        </HalamanHukum>
    )
}
