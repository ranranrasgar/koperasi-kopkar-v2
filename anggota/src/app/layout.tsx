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
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0c110e" },
    ],
}

// Dijalankan sebelum halaman tampil: pasang data-tema dari pilihan pengguna dan samakan warna bilah status.
// window.kopkarTema dipakai pilihan tema di Akun. Warna harus sama dengan viewport.themeColor di atas.
// Meta theme-color milik Next (viewport) tidak boleh diubah isinya: React lalu menganggapnya tidak cocok saat hydrate dan
// menambah meta putih baru, sehingga bilah status tetap putih saat tema gelap dipilih di HP bermode terang. Pilihan
// terang/gelap dipasang sebagai meta tersendiri tanpa media di paling atas <head> (browser memakai meta pertama yang
// cocok); "Otomatis" menghapusnya sehingga meta Next (mengikuti mode HP) yang berlaku.
const SKRIP_TEMA = `(function(){var W={terang:"#ffffff",gelap:"#0c110e"};
function pasang(t){var h=document.documentElement;
if(t==="terang"||t==="gelap")h.dataset.tema=t;else delete h.dataset.tema;
var m=document.getElementById("warna-tema");
if(!W[t]){if(m)m.remove();return}
if(!m){m=document.createElement("meta");m.id="warna-tema";m.name="theme-color"}
m.setAttribute("content",W[t]);document.head.insertBefore(m,document.head.firstChild)}
window.kopkarTema=pasang;
function awal(){try{pasang(localStorage.getItem("kopkar-tema")||"")}catch(e){}}
awal();document.addEventListener("DOMContentLoaded",awal);
try{if(sessionStorage.getItem("kopkar-splash"))document.documentElement.dataset.splash="selesai";else sessionStorage.setItem("kopkar-splash","1")}catch(e){}})();`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="id" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
            <head><script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} /></head>
            <body className="min-h-full">
                {/* Splash saat aplikasi dibuka: hanya pada pemuatan pertama per sesi, hilang sendiri lewat animasi CSS (tanpa JavaScript). */}
                <div id="splash" aria-hidden="true">
                    <img src="/ikon/ikon-192.png" alt="" width={96} height={96} />
                    <p>Kopkar MJS</p>
                    <span>Aplikasi Anggota</span>
                </div>
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
