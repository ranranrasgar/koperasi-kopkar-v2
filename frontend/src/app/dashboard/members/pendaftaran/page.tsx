import { redirect } from "next/navigation"

// Halaman Pendaftaran Baru sudah digabung ke User Mobile (filter "menunggu"). Dipertahankan hanya sebagai pengalihan karena
// notifikasi lama (lonceng, push, email pengurus) masih menyimpan tautan ke alamat ini.
export default function PendaftaranBaruLama() {
    redirect("/dashboard/members/mobile-users?status=menunggu")
}
