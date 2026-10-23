"use client"

import { useActionState, useRef, startTransition } from "react"
import { Camera, LoaderCircle } from "lucide-react"
import { fotoAction } from "@/app/actions/foto"

/** Foto profil (atau inisial) dengan tombol ganti; foto langsung diunggah setelah dipilih. */
export function FotoProfil({ inisial, versi, bisaUnggah }: { inisial: string; versi: string | null; bisaUnggah: boolean }) {
    const [hasil, kirim, proses] = useActionState(fotoAction, null)
    const input = useRef<HTMLInputElement>(null)
    const pilih = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const f = new FormData()
        f.set("foto", file)
        startTransition(() => kirim(f))
        e.target.value = ""
    }
    return (
        <div className="shrink-0">
            <div className="relative">
                {versi
                    ? <img src={`/akun/foto?v=${versi}`} alt="Foto profil" className="size-16 rounded-full object-cover" />
                    : <span className="grid size-16 place-items-center rounded-full bg-utama-lembut text-xl font-bold text-utama">{inisial}</span>}
                {bisaUnggah && (
                    <button type="button" onClick={() => input.current?.click()} disabled={proses} aria-label="Ganti foto profil"
                        className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-permukaan bg-utama text-pada-utama">
                        {proses ? <LoaderCircle size={15} className="animate-spin" /> : <Camera size={15} strokeWidth={2} />}
                    </button>
                )}
            </div>
            {bisaUnggah && <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pilih} />}
            {hasil && !hasil.ok && <p role="alert" className="mt-2 max-w-40 text-xs font-medium text-keluar">{hasil.error}</p>}
        </div>
    )
}
