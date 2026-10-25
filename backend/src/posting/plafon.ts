/**
 * Batas plafond pinjaman satu anggota untuk satu jenis kredit.
 *
 *  1. "Kunci jika melebihi grade" aktif dan anggota punya nominal grade (anggota.rp_grade > 0): batasnya nominal grade itu. Grade DIUTAMAKAN,
 *     walaupun jenis kredit juga punya Maksimal Plafond.
 *  2. Selain itu, bila Maksimal Plafond diisi (> 0): batasnya Maksimal Plafond. Ini juga berlaku bila grade dikunci tetapi nominal grade
 *     anggota belum diisi.
 *  3. Grade dikunci, nominal grade kosong, dan tanpa Maksimal Plafond: batas 0 (tidak ada yang boleh dipinjam sampai grade diisi),
 *     sama seperti aturan lama.
 *  4. Selain itu: tidak dibatasi (null).
 */
export type SumberBatas = 'grade' | 'maksimal';
export interface BatasPlafon { batas: number; sumber: SumberBatas }

export function batasPlafon(j: { kunciGrade: boolean; maksPlafond: number | string | null }, rpGrade: number | string | null): BatasPlafon | null {
    const grade = Number(rpGrade ?? 0) || 0;
    const maks = Number(j.maksPlafond ?? 0) || 0;
    if (j.kunciGrade && grade > 0) return { batas: grade, sumber: 'grade' };
    if (maks > 0) return { batas: maks, sumber: 'maksimal' };
    if (j.kunciGrade) return { batas: 0, sumber: 'grade' };
    return null;
}

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

/** Pesan galat bila `besar` melebihi batas; null bila boleh. */
export function pesanPlafon(besar: number, b: BatasPlafon | null, subjek: 'Anda' | 'anggota' = 'Anda'): string | null {
    if (!b || besar <= b.batas) return null;
    if (b.batas === 0) return subjek === 'Anda'
        ? 'Nominal grade (plafon) Anda belum diisi, jadi pinjaman jenis ini belum bisa diajukan. Hubungi pengurus koperasi.'
        : 'Nominal grade (plafon) anggota belum diisi; isi grade anggota dulu atau atur Maksimal Plafond jenis kredit ini.';
    return b.sumber === 'grade'
        ? `Pinjaman ini tidak boleh melebihi grade (plafon) ${subjek}, maksimal ${rp(b.batas)}.`
        : `Pinjaman jenis ini tidak boleh melebihi maksimal plafond ${rp(b.batas)}.`;
}
