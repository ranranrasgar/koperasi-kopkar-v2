import { allGroups } from "@/config/menu"

/** Pilihan "Halaman terkait" di editor panduan: semua halaman di menu, ditambah halaman tanpa menu. */
export function pilihanHalaman() {
    const grup = allGroups.map((g) => ({
        grup: g.groupLabel === "Main" ? "Utama" : g.groupLabel,
        item: g.items.filter((i) => !i.href.startsWith("/dashboard/panduan")).map((i) => ({ label: i.label, href: i.href })),
    })).filter((g) => g.item.length > 0)
    grup.push({ grup: "Lainnya", item: [
        { label: "Ganti Password", href: "/ganti-password" },
        { label: "Jurnal Umum Baru", href: "/dashboard/accounting/journal/new" },
    ] })
    return grup
}

export const namaHalaman = () => Object.fromEntries(pilihanHalaman().flatMap((g) => g.item.map((i) => [i.href, i.label])))
