"use client"
import { Sidebar } from "./Sidebar"
import { Navbar } from "./Navbar"
import { useSidebar, SidebarProvider } from "./SidebarContext"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

function ShellContent({ children }: { children: React.ReactNode }) {
    const { isOpen } = useSidebar()
    const pathname = usePathname()

    return (
        <div className="bg-background text-on-background font-body-md min-h-screen flex overflow-x-hidden">
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
                <Navbar />
                
                <main className={cn(
                    "flex-1 p-4 md:p-6 lg:p-8 w-full animate-in fade-in duration-500",
                    ["/dashboard/savings", "/dashboard/loans", "/dashboard/accounting/journal"].some((p) => pathname.startsWith(p)) ? "max-w-full" : "max-w-7xl mx-auto"
                )}>
                    {children}
                </main>
            </div>
        </div>
    )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <ShellContent>{children}</ShellContent>
        </SidebarProvider>
    )
}
