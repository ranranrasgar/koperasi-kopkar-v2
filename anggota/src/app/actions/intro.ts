"use server"

import { redirect } from "next/navigation"
import { anggotaSesi } from "@/lib/anggota"
import { tandaiIntroDilihat } from "@/lib/intro"

/** Selesai atau lewati pengantar: tandai sudah dilihat, lalu ke Beranda. */
export async function selesaiIntroAction() {
    const a = await anggotaSesi()
    if (!a) redirect("/masuk")
    await tandaiIntroDilihat(a.userId)
    redirect("/beranda")
}
