import { NextResponse, type NextRequest } from "next/server"
import { bacaSesi, COOKIE_SESI } from "@/lib/sesi"

// Pemeriksaan awal: tanda tangan dan masa berlaku cookie. Status akun dan anggota diperiksa ulang
// ke database oleh layout aplikasi dan setiap server action (lib/anggota.ts).
export function proxy(request: NextRequest) {
    if (bacaSesi(request.cookies.get(COOKIE_SESI)?.value)) return NextResponse.next()
    return NextResponse.redirect(new URL("/masuk", request.url))
}

export const config = {
    matcher: ["/beranda/:path*", "/simpanan/:path*", "/pinjaman/:path*", "/potongan/:path*", "/shu/:path*", "/riwayat/:path*",
        "/notifikasi/:path*", "/ajukan/:path*", "/akun/:path*", "/lengkapi-email"],
}
