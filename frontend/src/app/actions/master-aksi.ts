"use server"

import { catatAksi } from "@/lib/aktivitas"
import { revalidatePath } from "next/cache"
import { bahanAnggotaBaru, tambahAnggota, type LengkapAnggota } from "@kopkar/backend/src/anggota/akun.ts"
import { batalTutupPinjaman, tutupPinjaman } from "@kopkar/backend/src/posting/penutupan.ts"
import type { Db } from "@kopkar/backend/src/db.ts"
import { modeUji, pool, query, tx } from "@/lib/db"
import { isTanggal } from "@/lib/list"
import { GalatSesi, operatorAktif, wajibAksi, type Operator } from "@/lib/operator"
import { AKSES_HALAMAN, MENU, type AksiIzin } from "@/config/akses"
import type { HasilSimpan } from "./master"

class Salah extends Error {}

async function simpan(menu: readonly string[], path: string, aksi: AksiIzin | null, fn: (db: Db, operator: Operator) => Promise<string>): Promise<HasilSimpan> {
    try {
        const operator = await operatorAktif(menu)
        if (aksi) wajibAksi(operator, menu, aksi)
        const pesan = await tx(async (db) => {
            const hasil = await fn(db, operator)
            await catatRiwayat(db, operator, hasil)
            return hasil
        })
        await catatAksi(menu[0], pesan, operator)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}` }
        revalidatePath(path)
        return { ok: true, pesan }
    } catch (e) {
        if (!(e instanceof Salah) && !(e instanceof GalatSesi)) console.error("aksi master gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" }
    }
}

async function catatRiwayat(db: Db, operator: Operator, ket: string) {
    await db.query("SELECT pg_advisory_xact_lock(73912026)")
    const { rows: [r] } = await db.query<{ urut: number }>("SELECT COALESCE(MAX(urut), 0) + 1 AS urut FROM opr_history")
    await db.query(
        `INSERT INTO opr_history (urut, opr, tanggal, datetime, jam, ket, jns_trx, opr_edit, operator_id)
         VALUES ($1, $2, CURRENT_DATE, now(), LOCALTIME(0), $3, 'Edit Master', $2, $4)`,
        [r.urut, operator.nama, ket.slice(0, 255), operator.id])
}

function idForm(f: FormData) {
    const id = Number(f.get("id"))
    if (!Number.isSafeInteger(id) || id < 1) throw new Salah("ID data tidak valid")
    return id
}

function teks(f: FormData, k: string, label: string, maks: number, wajib = false) {
    const nilai = String(f.get(k) ?? "").trim()
    if (wajib && !nilai) throw new Salah(`${label} wajib diisi`)
    if (nilai.length > maks) throw new Salah(`${label} maksimal ${maks} karakter`)
    return nilai
}

function angka(f: FormData, k: string, label: string, maks = 999_999_999_999) {
    const nilai = String(f.get(k) ?? "").trim().replace(",", ".")
    const n = Number(nilai || "0")
    if (!Number.isFinite(n) || n < 0 || n > maks) throw new Salah(`${label} harus angka antara 0 dan ${maks}`)
    return nilai || "0"
}

/** Tutup pinjaman tanpa jurnal mengubah status pinjaman tanpa bukti kas, jadi hanya untuk superadmin dan admin. */
const wajibAdmin = (o: Operator) => {
    if (!o.superadmin && o.grup?.trim().toLowerCase() !== "admin") throw new Salah("Hanya superadmin atau admin yang boleh menutup pinjaman")
}

export async function tutupPinjamanAction(noPinjaman: string, alasan: string): Promise<HasilSimpan> {
    return simpan(AKSES_HALAMAN["/dashboard/loans/[no]"], "/dashboard/loans", null, async (db, operator) => {
        wajibAdmin(operator)
        const h = await tutupPinjaman(db as never, { noPinjaman, alasan, opr: operator.nama, operatorId: operator.id }).catch((e: Error) => { throw new Salah(e.message) })
        const draf = h.drafPotongan.length ? ` Generate ulang Potongan Gaji ${h.drafPotongan.join(", ")}.` : ""
        return `Pinjaman ${noPinjaman} ditutup tanpa jurnal.${draf}`
    })
}

export async function batalTutupPinjamanAction(noPinjaman: string): Promise<HasilSimpan> {
    return simpan(AKSES_HALAMAN["/dashboard/loans/[no]"], "/dashboard/loans", null, async (db, operator) => {
        wajibAdmin(operator)
        await batalTutupPinjaman(db as never, { noPinjaman, opr: operator.nama }).catch((e: Error) => { throw new Salah(e.message) })
        return `Penutupan pinjaman ${noPinjaman} dibatalkan`
    })
}

/** Isian awal form Tambah Anggota (nilai simpanan dan daftar grade), dimuat saat form dibuka. */
export async function bahanAnggotaBaruAction() {
    try {
        await operatorAktif([MENU.inputAnggota])
        return { ok: true as const, ...await bahanAnggotaBaru({ query: (t: string, p?: unknown[]) => pool.query(t, p) } as never) }
    } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Gagal memuat form" }
    }
}

export async function tambahAnggotaAction(nik: string, data: LengkapAnggota): Promise<HasilSimpan> {
    return simpan([MENU.inputAnggota], "/dashboard/members", "tambah", async (db, operator) => {
        const r = await tambahAnggota(db as never, nik, data, { id: operator.id, nama: operator.nama })
        if (!r.ok) throw new Salah(r.error)
        return `Anggota baru ${r.kode} (${data.nama.trim()}) ditambahkan oleh ${operator.nama}`
    })
}

/** Kolom anggota_detail di form Ubah Anggota: nama kolom -> [label, panjang kolom]. */
const DETAIL_ANGGOTA = {
    no_ktp_sim: ["No. KTP / SIM", 25], npwp: ["NPWP", 25], nama_istri_suami: ["Nama istri / suami", 25], jml_tanggungan: ["Jumlah tanggungan", 2], jml_anak: ["Jumlah anak", 2],
    jabatan: ["Jabatan", 25], pekerjaan: ["Pekerjaan", 15], departemen: ["Departemen", 15], nama_perusahaan: ["Nama perusahaan", 25], telp_ktr: ["Telepon kantor", 20],
    lama_bekerja_tahun: ["Lama bekerja (tahun)", 10], lama_bekerja_bulan: ["Lama bekerja (bulan)", 10], alamat_kerja: ["Alamat kerja", 84],
} as const

/** Data rinci untuk form Ubah Anggota, termasuk gaji, jadi hanya untuk operator yang boleh mengubah anggota. */
export async function detailAnggotaAction(id: number) {
    try {
        await operatorAktif([MENU.daftarAnggota])
        const [[d], grade] = await Promise.all([query<Record<string, string | number | null>>(
            `SELECT a.status, NULLIF(a.kodepos, 0) AS kodepos, a.telp_rmh, NULLIF(ad.rp_gaji_pokok, 0) AS rp_gaji_pokok, ${Object.keys(DETAIL_ANGGOTA).map((k) => `ad.${k}`).join(", ")}
               FROM anggota a LEFT JOIN anggota_detail ad ON ad.anggota_id = a.id WHERE a.id = $1`, [id]),
            query<{ nama: string; nominal: number }>("SELECT nama, nominal FROM grade ORDER BY nominal, nama")])
        return d ? { data: d, grade } : { error: "Anggota tidak ditemukan" }
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Gagal membaca data anggota" }
    }
}

export async function simpanAnggotaAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan([MENU.daftarAnggota], "/dashboard/members", "ubah", async (db, operator) => {
        const id = idForm(f)
        const { rows: [lama] } = await db.query<{ kode_agt: string }>("SELECT kode_agt FROM anggota WHERE id = $1 FOR UPDATE", [id])
        if (!lama) throw new Salah("Anggota tidak ditemukan")
        const nama = teks(f, "nama", "Nama", 50, true)
        const nik = teks(f, "nik", "KPK", 25)
        const jk = teks(f, "jns_kelamin", "Jenis kelamin", 1)
        if (jk && jk !== "L" && jk !== "P") throw new Salah("Jenis kelamin harus L atau P")
        const grade = teks(f, "grade", "Grade", 15)
        const { rows: [g] } = grade
            ? await db.query<{ id: string; nominal: string }>("SELECT id, nominal FROM grade WHERE lower(nama) = lower($1)", [grade])
            : { rows: [] as { id: string; nominal: string }[] }
        if (grade && !g) throw new Salah(`Grade ${grade} tidak ada di Data Master`)
        const staff = teks(f, "status_staff", "Status staff", 15)
        if (staff && !["Staff", "No Staff"].includes(staff)) throw new Salah("Status staff tidak valid")
        const aktif = f.get("aktif") === "true"
        const tglKeluar = aktif ? null : teks(f, "tgl_keluar", "Tanggal keluar", 10, true)
        if (tglKeluar && !isTanggal(tglKeluar)) throw new Salah("Tanggal keluar tidak valid")
        const alasanKeluar = aktif ? "" : teks(f, "alasan_keluar", "Alasan keluar", 100, true)
        const kodepos = teks(f, "kodepos", "Kode pos", 9)
        if (kodepos && !/^\d+$/.test(kodepos)) throw new Salah("Kode pos harus angka")
        await db.query(
            `UPDATE anggota SET nama=$1, nik=$2, jns_kelamin=$3, alamat=$4, kota=$5, hp=$6, status_staff=$7,
                 grade=$8, grade_id=$9, rp_grade=$10, bank_nama=$11, bank_no_rek=$12, bank_atas_nama=$13,
                 simpanan_pokok=$14, simpanan_wajib=$15, simpanan_sukarela=$16, opr=$17,
                 status=$19, kodepos=$20, telp_rmh=$21, aktif=$22, agt_non_agt=$23, tgl_keluar=$24, alasan_keluar=$25
             WHERE id=$18`,
            [nama, nik, jk, teks(f, "alamat", "Alamat", 100), teks(f, "kota", "Kota", 50), teks(f, "hp", "No. HP", 20),
             staff, grade, g?.id ?? null, g?.nominal ?? 0, teks(f, "bank_nama", "Nama bank", 15),
             teks(f, "bank_no_rek", "No. rekening", 15), teks(f, "bank_atas_nama", "Nama pemilik rekening", 50),
             angka(f, "simpanan_pokok", "Simpanan pokok"), angka(f, "simpanan_wajib", "Simpanan wajib"),
             angka(f, "simpanan_sukarela", "Simpanan sukarela"), operator.nama.slice(0, 15), id,
             teks(f, "status", "Status perkawinan", 15), Number(kodepos || 0), teks(f, "telp_rmh", "Telepon rumah", 20),
             aktif, f.get("agt_non_agt") === "true", tglKeluar, alasanKeluar])
        // Satu baris per anggota; anggota lama yang belum punya dibuatkan, sama dengan anggota baru (akun.ts).
        const kolom = Object.keys(DETAIL_ANGGOTA) as (keyof typeof DETAIL_ANGGOTA)[]
        const isi = kolom.map((k) => teks(f, k, DETAIL_ANGGOTA[k][0], DETAIL_ANGGOTA[k][1]))
        if (!(await db.query("SELECT 1 FROM anggota_detail WHERE anggota_id = $1", [id])).rowCount)
            await db.query("INSERT INTO anggota_detail (anggota_id, urut, kode_agt) SELECT $1, COALESCE(MAX(urut), 0) + 1, $2 FROM anggota_detail", [id, lama.kode_agt])
        await db.query(`UPDATE anggota_detail SET rp_gaji_pokok = $2, ${kolom.map((k, n) => `${k} = $${n + 3}`).join(", ")} WHERE anggota_id = $1`,
            [id, angka(f, "rp_gaji_pokok", "Gaji"), ...isi])
        return `Anggota ${lama.kode_agt} (${nama}) diubah oleh ${operator.nama}`
    })
}

export async function ubahStatusAnggotaAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan([MENU.daftarAnggota], "/dashboard/members", "ubah", async (db, operator) => {
        const id = idForm(f)
        const keluar = f.get("keluar") === "true"
        const { rows: [anggota] } = await db.query<{ kode_agt: string; aktif: boolean }>(
            "SELECT kode_agt, aktif FROM anggota WHERE id = $1 FOR UPDATE", [id])
        if (!anggota) throw new Salah("Anggota tidak ditemukan")
        if (keluar) {
            if (!anggota.aktif) throw new Salah("Anggota sudah berstatus keluar")
            const tanggal = teks(f, "tgl_keluar", "Tanggal keluar", 10, true)
            if (!isTanggal(tanggal)) throw new Salah("Tanggal keluar tidak valid")
            const alasan = teks(f, "alasan_keluar", "Alasan keluar", 100, true)
            await db.query("UPDATE anggota SET aktif=false, tgl_keluar=$1, alasan_keluar=$2, opr=$3 WHERE id=$4",
                [tanggal, alasan, operator.nama.slice(0, 15), id])
            return `Anggota ${anggota.kode_agt} dinonaktifkan`
        }
        if (anggota.aktif) throw new Salah("Anggota sudah aktif")
        await db.query("UPDATE anggota SET aktif=true, tgl_keluar=NULL, alasan_keluar='', opr=$1 WHERE id=$2", [operator.nama.slice(0, 15), id])
        return `Anggota ${anggota.kode_agt} diaktifkan kembali`
    })
}

export async function hapusAnggotaAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan([MENU.daftarAnggota], "/dashboard/members", "hapus", async (db, operator) => {
        const id = idForm(f)
        const { rows: [anggota] } = await db.query<{ kode_agt: string; nama: string }>(
            "SELECT kode_agt, nama FROM anggota WHERE id = $1 FOR UPDATE", [id])
        if (!anggota) throw new Salah("Anggota tidak ditemukan")
        if (teks(f, "konfirmasi", "Konfirmasi kode anggota", 15, true) !== anggota.kode_agt)
            throw new Salah("Kode anggota yang diketik tidak cocok")
        const { rows: [r] } = await db.query<{ dipakai: boolean }>(
            `SELECT
                EXISTS (SELECT 1 FROM simpanan WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM pinjaman_tunai WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM kpr WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM pengajuan_pinjaman WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM shu_anggota WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM potongan_gaji_anggota WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM potongan_gaji_pinjaman WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM temp_potongan_all WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM temp_potongan_bank WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM temp_potongan_koperasi WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM temp_potongan_kpr WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM temp_shu WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM temp_shu_backup WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM temp_simpanan WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM log_notifikasi WHERE anggota_id=$1)
                OR EXISTS (SELECT 1 FROM app_user WHERE anggota_id=$1 OR (anggota_id IS NULL AND kode_agt=$2)) AS dipakai`,
            [id, anggota.kode_agt])
        if (r.dipakai) throw new Salah(`Anggota ${anggota.kode_agt} punya transaksi atau akun terkait; gunakan Keluar`)
        await db.query("DELETE FROM anggota WHERE id=$1", [id])
        return `Anggota ${anggota.kode_agt} dihapus oleh ${operator.nama}`
    })
}

export async function simpanKaryawanMattelAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan([MENU.karyawanMattel, MENU.daftarKaryawan], "/dashboard/members/karyawan-mattel", "ubah", async (db) => {
        const id = idForm(f)
        const { rows: [lama] } = await db.query<{ nik: string }>("SELECT nik FROM karyawan_mattel WHERE id=$1 FOR UPDATE", [id])
        if (!lama) throw new Salah("Karyawan tidak ditemukan")
        const tgl = (k: string, label: string) => {
            const v = teks(f, k, label, 10)
            if (v && !isTanggal(v)) throw new Salah(`${label} tidak valid`)
            return v || null
        }
        await db.query(
            `UPDATE karyawan_mattel SET plant=$1, nama=$2, deptname=$3, sectname=$4, grade=$5, joindate=$6,
                 tgl_lahir=$7, no_rek=$8, emphone=$9, sts=$10 WHERE id=$11`,
            [teks(f, "plant", "Plant", 25, true), teks(f, "nama", "Nama", 50, true),
             teks(f, "deptname", "Departemen", 50), teks(f, "sectname", "Seksi", 50), teks(f, "grade", "Grade", 5),
             tgl("joindate", "Tanggal masuk"), tgl("tgl_lahir", "Tanggal lahir"), teks(f, "no_rek", "No. rekening", 50),
             teks(f, "emphone", "No. HP", 50), teks(f, "sts", "Status", 10), id])
        return `Data karyawan ${lama.nik} diubah`
    })
}

export async function hapusKaryawanMattelAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan([MENU.karyawanMattel, MENU.daftarKaryawan], "/dashboard/members/karyawan-mattel", "hapus", async (db) => {
        const id = idForm(f)
        const { rows: [k] } = await db.query<{ nik: string; nama: string | null }>(
            "SELECT nik, nama FROM karyawan_mattel WHERE id=$1 FOR UPDATE", [id])
        if (!k) throw new Salah("Karyawan tidak ditemukan")
        if (teks(f, "konfirmasi", "Konfirmasi NIK", 25, true).toUpperCase() !== k.nik.toUpperCase())
            throw new Salah("NIK yang diketik tidak cocok")
        const { rows: [r] } = await db.query<{ dipakai: boolean }>(
            `SELECT EXISTS (SELECT 1 FROM anggota WHERE karyawan_mattel_id=$1)
                 OR EXISTS (SELECT 1 FROM app_user WHERE karyawan_mattel_id=$1 OR (karyawan_mattel_id IS NULL AND kode_agt=$2)) AS dipakai`,
            [id, k.nik])
        if (r.dipakai) throw new Salah(`Karyawan ${k.nik} sudah tertaut ke anggota atau akun aplikasi`)
        await db.query("DELETE FROM karyawan_mattel WHERE id=$1", [id])
        return `Karyawan ${k.nik} (${k.nama ?? "-"}) dihapus`
    })
}

export async function simpanCoaAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan([MENU.coa], "/dashboard/accounting/coa", "ubah", async (db) => {
        const id = idForm(f)
        const { rows: [lama] } = await db.query<{ kode_perkiraan: string }>(
            "SELECT kode_perkiraan FROM perkiraan WHERE id=$1 FOR UPDATE", [id])
        if (!lama) throw new Salah("Akun COA tidak ditemukan")
        const dk = teks(f, "d_k", "Posisi D/K", 1, true).toUpperCase()
        if (dk !== "D" && dk !== "C") throw new Salah("Posisi normal harus D atau K/C")
        await db.query("UPDATE perkiraan SET nama_perkiraan=$1, d_k=$2, keterangan=$3, rp_budget=$4 WHERE id=$5",
            [teks(f, "nama_perkiraan", "Nama perkiraan", 100, true), dk,
             teks(f, "keterangan", "Keterangan", 100), angka(f, "rp_budget", "Anggaran"), id])
        return `Akun COA ${lama.kode_perkiraan} diubah`
    })
}

export async function hapusCoaAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan([MENU.coa], "/dashboard/accounting/coa", "hapus", async (db, operator) => {
        const id = idForm(f)
        const { rows: [akun] } = await db.query<{ kode_perkiraan: string; pr_id: number; rp_saldo_awal: string }>(
            "SELECT kode_perkiraan, pr_id, rp_saldo_awal FROM perkiraan WHERE id=$1 FOR UPDATE", [id])
        if (!akun) throw new Salah("Akun COA tidak ditemukan")
        if (Number(akun.rp_saldo_awal) !== 0) throw new Salah(`Akun ${akun.kode_perkiraan} masih memiliki saldo awal; tidak bisa dihapus`)
        const { rows: [r] } = await db.query<{ dipakai: boolean }>(
            `SELECT
                EXISTS (SELECT 1 FROM jurnal_umum WHERE perkiraan_id=$1 OR kode_perkiraan=$2)
                OR EXISTS (SELECT 1 FROM perkiraan WHERE id<>$1 AND (parent_id=$1 OR pr_parent=$3))
                OR EXISTS (SELECT 1 FROM jenis_simpanan WHERE coa_id=$1)
                OR EXISTS (SELECT 1 FROM jenis_kredit WHERE coa_kredit_id=$1 OR coa_jasa_id=$1 OR coa_adm_id=$1 OR coa_provisi_id=$1)
                OR EXISTS (SELECT 1 FROM jenis_pos_shu WHERE perkiraan_id=$1 OR kode_coa=$2)
                OR EXISTS (SELECT 1 FROM variable_akun WHERE perkiraan_id=$1)
                OR EXISTS (SELECT 1 FROM saldo_perkiraan WHERE perkiraan_id=$1) AS dipakai`,
            [id, akun.kode_perkiraan, akun.pr_id])
        if (r.dipakai) throw new Salah(`Akun ${akun.kode_perkiraan} masih dipakai jurnal, sub-akun, saldo, atau pengaturan; tidak bisa dihapus`)
        await db.query("DELETE FROM perkiraan WHERE id=$1", [id])
        return `Akun COA ${akun.kode_perkiraan} dihapus oleh ${operator.nama}`
    })
}
