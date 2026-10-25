import { bolehHalaman } from "./akses"

export interface MenuItem {
    label: string
    icon: string
    href: string
    active?: boolean
    permission?: string
    locked?: boolean
}

export interface MenuGroup {
    groupLabel: string
    items: MenuItem[]
}

/*
 * Urutan menu: dari yang paling sering dipakai harian ke yang jarang, mengikuti susunan perangkat lunak akuntansi koperasi simpan pinjam:
 * Dashboard -> Keanggotaan (master) -> Simpanan -> Pinjaman -> Potongan Gaji bulanan -> Akuntansi (jurnal, buku, laporan, COA) ->
 * Tutup Buku & SHU (proses akhir tahun, berurutan) -> Data Master -> Komunikasi -> Sistem -> Bantuan.
 * Di tiap grup: transaksi harian dulu, lalu laporan dan penelusuran, lalu analisis.
 */
export const allGroups: MenuGroup[] = [
    {
        groupLabel: "Main",
        items: [
            {
                label: "Dashboard",
                icon: "dashboard",
                href: "/dashboard"
            }
        ]
    },
    {
        groupLabel: "Keanggotaan",
        items: [
            {
                label: "Daftar Anggota",
                icon: "groups",
                href: "/dashboard/members"
            },
            {
                label: "Karyawan Mattel",
                icon: "work",
                href: "/dashboard/members/karyawan-mattel"
            },
            {
                label: "User Mobile",
                icon: "smartphone",
                href: "/dashboard/members/mobile-users"
            },
            {
                label: "Absensi Fingerprint",
                icon: "fingerprint",
                href: "/dashboard/attendance"
            }
        ]
    },
    {
        groupLabel: "Simpanan",
        items: [
            {
                label: "Setoran Simpanan",
                icon: "credit_card",
                href: "/dashboard/savings/deposit"
            },
            {
                label: "Pengambilan Simpanan",
                icon: "call_made",
                href: "/dashboard/savings/withdraw"
            },
            {
                label: "Rekap Simpanan",
                icon: "account_balance_wallet",
                href: "/dashboard/savings"
            },
            {
                label: "Buku Simpanan",
                icon: "menu_book",
                href: "/dashboard/savings/ledger"
            },
            {
                label: "Kartu Simpanan",
                icon: "badge",
                href: "/dashboard/savings/cards"
            },
            {
                label: "Simpanan Berjangka",
                icon: "calendar_month",
                href: "/dashboard/savings/time-deposits"
            },
            {
                label: "Grafik Analisa",
                icon: "monitoring",
                href: "/dashboard/savings/analytics"
            }
        ]
    },
    {
        groupLabel: "Pinjaman",
        items: [
            {
                label: "Setoran Angsuran",
                icon: "sync",
                href: "/dashboard/loans/payment"
            },
            {
                label: "Pengajuan Kredit",
                icon: "assignment",
                href: "/dashboard/loans/apply"
            },
            {
                label: "Input Pinjaman Tunai",
                icon: "payments",
                href: "/dashboard/loans/create-cash"
            },
            {
                label: "Input Pinjaman KPR",
                icon: "real_estate_agent",
                href: "/dashboard/loans/create-kpr"
            },
            {
                label: "Setoran Titipan (Escrow)",
                icon: "layers",
                href: "/dashboard/loans/escrow"
            },
            {
                label: "Daftar Pinjaman",
                icon: "receipt_long",
                href: "/dashboard/loans"
            },
            {
                label: "Cari Pinjaman",
                icon: "manage_search",
                href: "/dashboard/loans/cari"
            },
            {
                label: "Kredit Macet",
                icon: "trending_down",
                href: "/dashboard/loans/bad-debts"
            }
        ]
    },
    {
        groupLabel: "Potongan Gaji",
        items: [
            {
                label: "Generate & Posting",
                icon: "calendar_month",
                href: "/dashboard/deductions/periode"
            },
            {
                label: "Transaksi Potongan",
                icon: "format_list_numbered",
                href: "/dashboard/deductions"
            }
        ]
    },
    {
        groupLabel: "Akuntansi",
        items: [
            {
                label: "Jurnal Umum",
                icon: "menu_book",
                href: "/dashboard/accounting/journal"
            },
            {
                label: "Jurnal Penyesuaian",
                icon: "rule",
                href: "/dashboard/accounting/adjusting"
            },
            {
                label: "Bank Book",
                icon: "account_balance",
                href: "/dashboard/accounting/bank-book"
            },
            {
                label: "Buku Besar",
                icon: "auto_stories",
                href: "/dashboard/accounting/ledger"
            },
            {
                label: "Trial Balance",
                icon: "bar_chart",
                href: "/dashboard/accounting/trial-balance"
            },
            {
                label: "Laporan Keuangan",
                icon: "summarize",
                href: "/dashboard/accounting/reports"
            },
            {
                label: "Chart of Accounts (COA)",
                icon: "account_tree",
                href: "/dashboard/accounting/coa"
            }
        ]
    },
    {
        groupLabel: "Tutup Buku & SHU",
        items: [
            {
                label: "Tutup Buku",
                icon: "lock_clock",
                href: "/dashboard/accounting/closing"
            },
            {
                label: "Sisa Hasil Usaha (SHU)",
                icon: "emoji_events",
                href: "/dashboard/shu"
            }
        ]
    },
    {
        groupLabel: "Data Master",
        items: [
            {
                label: "Jenis Pinjaman",
                icon: "sell",
                href: "/dashboard/settings/jenis-pinjaman"
            },
            {
                label: "Jenis Simpanan",
                icon: "sell",
                href: "/dashboard/settings/jenis-simpanan"
            },
            {
                label: "Grade Anggota",
                icon: "military_tech",
                href: "/dashboard/settings/grade"
            }
        ]
    },
    {
        groupLabel: "Komunikasi",
        items: [
            {
                label: "Kirim Notifikasi",
                icon: "campaign",
                href: "/dashboard/notifikasi"
            },
            {
                label: "Himbauan & Promo",
                icon: "local_offer",
                href: "/dashboard/himbauan"
            }
        ]
    },
    {
        groupLabel: "Sistem",
        items: [
            {
                label: "Pengaturan Perusahaan",
                icon: "business",
                href: "/dashboard/settings"
            },
            {
                label: "Operator",
                icon: "manage_accounts",
                href: "/dashboard/settings/operator"
            },
            {
                label: "Kelola Hak Akses",
                icon: "admin_panel_settings",
                href: "/dashboard/settings/akses"
            },
            {
                label: "Backup & Restore",
                icon: "backup",
                href: "/dashboard/settings/backup"
            },
            {
                label: "Mode Uji / Live",
                icon: "science",
                href: "/dashboard/settings/mode"
            },
            {
                label: "Kelola Panduan",
                icon: "edit_note",
                href: "/dashboard/panduan/kelola"
            }
        ]
    },
    {
        groupLabel: "Bantuan",
        items: [
            {
                label: "Pusat Panduan",
                icon: "menu_book",
                href: "/dashboard/panduan"
            }
        ]
    }
]

/** Menu untuk operator: item yang tidak diizinkan grupnya (opr_hak_akses) disembunyikan. */
export function getMenuGroups(pathname: string, izin: readonly string[]): MenuGroup[] {
    const groups = allGroups
        .map(group => ({ ...group, items: group.items.filter(item => item.locked || bolehHalaman(item.href, izin)) }))
        .filter(group => group.items.length > 0)
    const allItems = groups.flatMap(g => g.items)
    const globalMatches = allItems
        .filter(item => {
            if (item.href === "/dashboard") return pathname === "/dashboard"
            return pathname === item.href || pathname.startsWith(item.href + "/")
        })
        .sort((a, b) => b.href.length - a.href.length)

    const globalBestMatch = globalMatches[0]?.href

    return groups.map(group => ({
        ...group,
        items: group.items.map(item => ({
            ...item,
            active: globalBestMatch ? item.href === globalBestMatch : false
        }))
    }))
}
