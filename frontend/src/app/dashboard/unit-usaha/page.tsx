import { KelolaUnitUsaha, type BarisUnit, type PilihanOperator } from "@/components/kantin/KelolaUnitUsaha"
import { query } from "@/lib/db"
import { sqlBuka, sqlKetBuka } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function UnitUsahaPage() {
    await wajibIzin("/dashboard/unit-usaha") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [unit, operator] = await Promise.all([
        query<BarisUnit>(`SELECT u.id, u.kode, u.nama, u.lokasi, to_char(u.jam_buka, 'HH24:MI') jam_buka, to_char(u.jam_tutup, 'HH24:MI') jam_tutup,
                u.status_buka, u.pesan_tutup, u.tutup_sampai::text, ${sqlBuka('u')} buka_sekarang, ${sqlKetBuka('u')} ket_buka,
                u.aktif, u.tampil_anggota, u.model, u.terima_tunai, u.terima_sukarela, u.batas_sukarela_transaksi::text, u.batas_sukarela_harian::text,
                u.saldo_sukarela_minimal::text, u.menit_batal_pesanan,
                t.nama_usaha, t.pemilik, t.telepon, t.email, t.bank, t.no_rekening, t.nama_rekening,
                k.mulai::text kontrak_mulai, k.selesai::text kontrak_selesai, k.persen_bagi_hasil::text, k.minimum_bulanan::text, k.sewa_bulanan::text,
                k.periode_penyelesaian,
                COALESCE((SELECT json_agg(p.kode_perkiraan || ' ' || p.nama_perkiraan ORDER BY p.kode_perkiraan) FROM perkiraan p
                   WHERE p.id IN (u.akun_kas_id, u.akun_persediaan_id, u.akun_penjualan_id, u.akun_hpp_id, u.akun_piutang_tenant_id,
                                  u.akun_utang_tenant_id, u.akun_pendapatan_tenant_id)), '[]') akun,
                COALESCE((SELECT json_agg(json_build_object('oprId', o.opr_id, 'peran', o.peran)) FROM unit_usaha_opr o WHERE o.unit_usaha_id = u.id), '[]') operator,
                (SELECT count(*) FROM kantin_produk p WHERE p.unit_usaha_id = u.id) produk
           FROM unit_usaha u LEFT JOIN tenant t ON t.id = u.tenant_id
           LEFT JOIN LATERAL (SELECT * FROM tenant_kontrak k WHERE k.unit_usaha_id = u.id ORDER BY k.mulai DESC LIMIT 1) k ON true
          WHERE u.jenis = 'KANTIN' ORDER BY u.aktif DESC, u.nama`),
        query<PilihanOperator>(`SELECT o.id, o.nama, NULLIF(o.nama_lengkap, '') nama_lengkap, g.nama_grup FROM opr o LEFT JOIN opr_grup g ON g.id = o.grup_id
          WHERE upper(trim(o.status_aktif)) <> 'NON AKTIF' ORDER BY (g.nama_grup = 'Kantin') DESC NULLS LAST, o.nama`),
    ])
    return <KelolaUnitUsaha unit={unit} operator={operator} />
}
