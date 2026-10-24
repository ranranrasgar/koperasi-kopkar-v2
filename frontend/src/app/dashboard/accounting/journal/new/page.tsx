import { redirect } from "next/navigation"

// Form jurnal baru sekarang berupa modal di daftar jurnal; alamat lama dialihkan.
export default function Page() {
    redirect("/dashboard/accounting/journal")
}
