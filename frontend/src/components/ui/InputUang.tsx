"use client"

import { Input } from "@/components/ui/input"

/** Nilai mentah ("1500000.5") ke tampilan Indonesia ("1.500.000,5"). */
const tampil = (mentah: string) => {
    if (!mentah) return ""
    const [bulat, desimal] = mentah.split(".")
    const ribuan = bulat.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    return desimal === undefined ? ribuan : `${ribuan},${desimal}`
}

/** Dari ketikan ("1.500.000,5") ke nilai mentah: hanya angka dan satu koma desimal (maksimal 4 digit). */
const mentahkan = (teks: string) => {
    const [bulat, ...sisa] = teks.replace(/\./g, "").replace(/[^\d,]/g, "").split(",")
    const b = bulat.replace(/^0+(?=\d)/, "")
    return sisa.length ? `${b || "0"}.${sisa.join("").slice(0, 4)}` : b
}

/**
 * Isian uang berformat ribuan Indonesia. Yang tampil memakai titik ribuan dan koma desimal; yang dikirim lewat `name`
 * (input tersembunyi) dan dikembalikan ke `onChange` adalah angka mentah berpemisah titik, siap dipakai server.
 */
export function InputUang({ value, onChange, name, readOnly, className, ...rest }: {
    value: string; onChange: (mentah: string) => void; name?: string; readOnly?: boolean; className?: string
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "name" | "type">) {
    return (
        <>
            {name && <input type="hidden" name={name} value={value} />}
            <Input {...rest} type="text" inputMode="decimal" autoComplete="off" readOnly={readOnly} className={className}
                value={tampil(value)} onChange={(e) => onChange(mentahkan(e.target.value))} onFocus={(e) => e.currentTarget.select()} />
        </>
    )
}
