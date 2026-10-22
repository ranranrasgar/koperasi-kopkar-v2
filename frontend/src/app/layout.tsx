import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { identitasKoperasi } from "@/lib/koperasi"
import { serverUji } from "@/lib/db"

// Judul tab dan ikon aplikasi mengikuti Pengaturan Perusahaan.
export async function generateMetadata(): Promise<Metadata> {
    const k = await identitasKoperasi()
    return {
        title: `${serverUji ? "[UJI] " : ""}${k.nama} · Management System`,
        description: "Management Information System untuk Koperasi Kopkar Mattel",
        icons: { icon: k.logo, apple: k.logo },
    }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="id" suppressHydrationWarning className="h-full antialiased">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="min-h-full flex flex-col" suppressHydrationWarning>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
