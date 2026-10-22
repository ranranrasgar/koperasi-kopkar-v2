/** Ditampilkan bila tabel panduan belum dibuat di database yang sedang dipakai. */
export function PanduanBelumDipasang() {
    return (
        <div className="rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-6 text-amber-900 dark:text-amber-200">
            <h1 className="text-lg font-semibold">Pusat Panduan belum dipasang di database ini</h1>
            <p className="mt-2 text-sm">
                Jalankan <code className="font-mono">npm run panduan:pasang</code> di folder proyek untuk membuat tabel dan isi awal panduan.
            </p>
        </div>
    )
}
