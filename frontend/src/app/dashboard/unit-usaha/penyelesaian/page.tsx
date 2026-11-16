import { PenyelesaianTenant, type RiwayatPenyelesaian } from "@/components/kantin/PenyelesaianTenant"
import { query } from "@/lib/db"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function PenyelesaianTenantPage() {
    await wajibIzin("/dashboard/unit-usaha/penyelesaian") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [unit, akun, riwayat] = await Promise.all([
        query<{ id: number; nama: string; model: string; tenant: string | null }>(`SELECT u.id, u.nama, u.model, t.nama_usaha tenant FROM unit_usaha u
            LEFT JOIN tenant t ON t.id = u.tenant_id WHERE u.jenis = 'KANTIN' AND u.model <> 'milik' ORDER BY u.aktif DESC, u.nama`),
        query<{ kode_perkiraan: string; nama_perkiraan: string }>(`SELECT p.kode_perkiraan, p.nama_perkiraan FROM perkiraan p WHERE p.keterangan IN ('BANK', 'GC')
            AND NOT EXISTS (SELECT 1 FROM perkiraan c WHERE c.parent_id = p.id AND c.id <> p.id) ORDER BY p.kode_perkiraan`),
        query<RiwayatPenyelesaian>(`SELECT p.id, p.no_bukti, u.nama kantin, t.nama_usaha tenant, p.model, p.periode_mulai::text dari, p.periode_selesai::text sampai, p.tanggal::text,
                p.nota, p.total_penjualan::float8 penjualan, p.total_tunai::float8 tunai, p.total_sukarela::float8 sukarela, p.bagi_hasil::float8 bagi_hasil,
                p.tambahan::float8 tambahan, p.utang_tenant::float8 utang, p.piutang_tenant::float8 piutang, p.neto::float8 neto, p.akun_kas, p.catatan, p.opr,
                p.dibatalkan_pada::text dibatalkan, p.opr_batal
           FROM tenant_penyelesaian p JOIN unit_usaha u ON u.id = p.unit_usaha_id LEFT JOIN tenant t ON t.id = p.tenant_id ORDER BY p.id DESC LIMIT 100`),
    ])
    return <PenyelesaianTenant unit={unit} akun={akun} riwayat={riwayat} />
}
