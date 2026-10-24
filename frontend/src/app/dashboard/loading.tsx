import { Skeleton } from "@/components/ui/skeleton"

// Kerangka sementara saat halaman dasbor baru sedang diambil dari server.
export default function Loading() {
    return (
        <div role="status" aria-label="Memuat halaman" className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="rounded-lg border">
                <div className="flex gap-3 border-b p-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-9 w-32" /><Skeleton className="ml-auto h-9 w-24" /></div>
                <div className="space-y-3 p-4">
                    {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                </div>
            </div>
        </div>
    )
}
