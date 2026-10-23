import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { serverUji } from "@/lib/db"
import { namaKoperasi } from "@/lib/koperasi"

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" })

export async function generateMetadata(): Promise<Metadata> {
    const nama = await namaKoperasi()
    return {
        title: { default: `${serverUji ? "[UJI] " : ""}${nama}`, template: `%s · ${nama}` },
        description: `Aplikasi anggota ${nama}: simpanan, pinjaman, SHU, dan pengajuan kredit.`,
        icons: { icon: "/logo.png", apple: "/logo.png" },
        appleWebApp: { capable: true, title: "Kopkar MJS", statusBarStyle: "default" },
    }
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f6f8f6" },
        { media: "(prefers-color-scheme: dark)", color: "#111613" },
    ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
            <body className="min-h-full">
                {serverUji && (
                    <div className="bg-tunggu px-4 py-1 text-center text-xs font-semibold text-black">
                        Server uji · database {serverUji}
                    </div>
                )}
                {children}
            </body>
        </html>
    )
}
