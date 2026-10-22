import { NextResponse, type NextRequest } from "next/server"
import { bacaSesi, COOKIE_SESI } from "@/lib/sesi"

// Pemeriksaan awal: tanda tangan dan masa berlaku cookie. Status aktif operator diperiksa
// ulang ke database oleh layout dashboard dan setiap server action (lib/operator.ts).
export function proxy(request: NextRequest) {
    if (bacaSesi(request.cookies.get(COOKIE_SESI)?.value)) return NextResponse.next()
    const url = new URL("/login", request.url)
    const tujuan = request.nextUrl.pathname + request.nextUrl.search
    if (tujuan !== "/dashboard") url.searchParams.set("next", tujuan)
    return NextResponse.redirect(url)
}

export const config = {
    matcher: ["/dashboard/:path*", "/ganti-password"],
}
