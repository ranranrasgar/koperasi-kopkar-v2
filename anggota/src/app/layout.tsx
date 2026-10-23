import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { PekerjaLatar } from "@/components/PekerjaLatar"
import { serverUji } from "@/lib/db"
import { namaKoperasi } from "@/lib/koperasi"

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" })

export async function generateMetadata(): Promise<Metadata> {
    const nama = await namaKoperasi()
    return {
        title: { default: `${serverUji ? "[UJI] " : ""}${nama}`, template: `%s · ${nama}` },
        description: `Aplikasi anggota ${nama}: simpanan, pinjaman, SHU, dan pengajuan kredit.`,
        icons: {
            icon: [{ url: "/ikon/favicon-32.png", sizes: "32x32" }, { url: "/ikon/ikon-192.png", sizes: "192x192" }],
            apple: "/ikon/apple-touch-icon.png",
        },
        // iOS: dibuka layar penuh bila dipasang ke layar utama (Bagikan → Tambah ke Layar Utama).
        appleWebApp: { capable: true, title: "Kopkar MJS", statusBarStyle: "default" },
        formatDetection: { telephone: false },
    }
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        // Harus sama dengan --color-latar di globals.css (oklch dikonversi ke hex) supaya bilah status menyatu.
        { media: "(prefers-color-scheme: light)", color: "#f5f7f5" },
        { media: "(prefers-color-scheme: dark)", color: "#0c110e" },
    ],
}

// Dijalankan sebelum halaman tampil: pasang data-tema dari pilihan pengguna dan samakan warna bilah status.
// window.kopkarTema dipakai pilihan tema di Akun. Warna harus sama dengan viewport.themeColor di atas.
const SKRIP_TEMA = `(function(){var W={terang:"#f5f7f5",gelap:"#0c110e"};
function pasang(t){var h=document.documentElement;
if(t==="terang"||t==="gelap")h.dataset.tema=t;else delete h.dataset.tema;
document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){
if(!m.dataset.asli)m.dataset.asli=m.getAttribute("content")||"";
m.setAttribute("content",W[t]||m.dataset.asli)})}
window.kopkarTema=pasang;
function awal(){try{pasang(localStorage.getItem("kopkar-tema")||"")}catch(e){}}
awal();document.addEventListener("DOMContentLoaded",awal)})();`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="id" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
            <head><script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} /></head>
            <body className="min-h-full">
                {serverUji && (
                    <div className="bg-tunggu px-4 py-1 text-center text-xs font-semibold text-black">
                        Server uji · database {serverUji}
                    </div>
                )}
                {children}
                <PekerjaLatar />
            </body>
        </html>
    )
}
