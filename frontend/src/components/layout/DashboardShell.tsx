"use client"
import { Sidebar } from "./Sidebar"
import { Navbar } from "./Navbar"
import { useSidebar, SidebarProvider, type KoperasiTampil } from "./SidebarContext"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export interface OperatorTampil { nama: string; namaLengkap: string; grup: string | null; izin: string[] }

function ShellContent({ children, operator }: { children: React.ReactNode; operator: OperatorTampil }) {
    const { isOpen } = useSidebar()
    const pathname = usePathname()

    return (
        <div className="bg-background text-on-background font-body-md min-h-screen flex overflow-x-clip">
            {/* Sidebar (Fixed position) */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0",
                !isOpen && "md:-translate-x-full"
            )}>
                <Sidebar className={cn(!isOpen && "md:-translate-x-full")} />
            </div>

            {/* Overlay for mobile when sidebar is open */}
            {/* Handled mostly by Navbar, but we can manage desktop margin here */}
            
            {/* Main Content */}
            <div className={cn(
                "flex-1 flex flex-col min-h-screen transition-all duration-300 w-full min-w-0",
                isOpen ? "md:ml-64" : "md:ml-0"
            )}>
                <Navbar operator={operator} />
                
                <main className={cn(
                    "flex-1 p-4 md:p-6 lg:p-8 w-full animate-in fade-in duration-500",
                    // Semua halaman selebar layar (tabel dan laporan banyak kolom); hanya beranda dashboard yang dibatasi, dan form/artikel membatasi lebarnya sendiri.
                    pathname === "/dashboard" ? "max-w-7xl mx-auto" : "max-w-full"
                )}>
                    {children}
                </main>
            </div>
        </div>
    )
}

export function DashboardShell({ children, operator, koperasi, lencana = {} }: { children: React.ReactNode; operator: OperatorTampil; koperasi: KoperasiTampil; lencana?: Record<string, number> }) {
    return (
        <SidebarProvider izin={operator.izin} koperasi={koperasi} lencana={lencana}>
            <ShellContent operator={operator}>{children}</ShellContent>
        </SidebarProvider>
    )
}
