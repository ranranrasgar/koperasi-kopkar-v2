"use client"

import React, { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, Printer, Download, Eye, ChevronLeft, ChevronRight, Loader2, ArrowUpDown, Settings2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import type { ColumnConfig, FilterConfig, ModuleConfig, PageData } from "@/config/modules"
import { formatRupiah, formatAngka, formatTanggal } from "@/lib/format"

type Row = Record<string, unknown>

interface ModuleTableProps {
    config: ModuleConfig
    data: PageData<Row>
    /** Tombol tambahan di kanan judul, mis. tautan ke form transaksi. */
    actions?: React.ReactNode
}

const badgeColorMap: Record<string, string> = {
    green: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
}

function formatValue(val: unknown, type: ColumnConfig["type"]) {
    if (val === null || val === undefined || val === "") return "-"
    if (type === "currency") return formatRupiah(Number(val))
    if (type === "number") return formatAngka(Number(val))
    if (type === "date") return formatTanggal(String(val), "long")
    if (typeof val === "boolean") return val ? "Ya" : "Tidak"
    return String(val)
}

function Badge({ val, col }: { val: unknown; col: ColumnConfig }) {
    if (!col.badgeMap || val === null || val === undefined) return <span className="text-muted-foreground">-</span>
    const mapping = col.badgeMap[String(val)]
    if (!mapping) return <span className="text-xs text-muted-foreground">{String(val)}</span>
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider cursor-default ${badgeColorMap[mapping.color] || "bg-muted text-muted-foreground"}`}>
            {mapping.label}
        </span>
    )
}

export function ModuleTable({ config, data, actions }: ModuleTableProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const [selectedItem, setSelectedItem] = useState<Row | null>(null)
    const [searchVal, setSearchVal] = useState(searchParams?.get("search") || "")
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
        Object.fromEntries(config.columns.map((col) => [col.key, !col.hidden]))
    )
    const activeColumns = config.columns.filter((col) => visibleColumns[col.key])

    const updateParams = (updates: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams?.toString() || "")
        Object.entries(updates).forEach(([key, val]) => {
            if (val === null || val === undefined || val === "") params.delete(key)
            else params.set(key, String(val))
        })
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`)
        })
    }

    const handleSort = (key: string) => {
        const nextOrder = searchParams?.get("sortBy") === key && searchParams?.get("sortOrder") === "asc" ? "desc" : "asc"
        updateParams({ sortBy: key, sortOrder: nextOrder })
    }

    const handleExport = () => {
        if (data.items.length === 0) return
        const headers = activeColumns.map((c) => `"${c.label}"`).join(",")
        const rows = data.items.map((item) => activeColumns.map((col) => {
            const val = item[col.key]
            if (val === null || val === undefined) return '""'
            const text = col.type === "date" ? formatTanggal(String(val), "2-digit") : String(val)
            return `"${text.replace(/"/g, '""')}"`
        }).join(","))
        const blob = new Blob(["﻿" + [headers, ...rows].join("\n")], { type: "text/csv;charset=utf-8" })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = `${pathname.replace(/^\/dashboard\//, "").replace(/\//g, "_")}_hal${data.page}.csv`
        link.click()
        URL.revokeObjectURL(link.href)
    }

    const renderFilter = (filter: FilterConfig, compact: boolean) => {
        const cls = compact
            ? "w-full h-8 border rounded-md px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-background"
            : "h-9 border rounded-md px-3 py-0 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-background text-foreground transition-all"
        const value = searchParams?.get(filter.key) || ""
        if (filter.type === "select") {
            return (
                <select key={filter.key} className={cls} value={value} title={filter.label}
                    onChange={(e) => updateParams({ [filter.key]: e.target.value, page: 1 })}>
                    <option value="">Semua {filter.label}</option>
                    {filter.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            )
        }
        return (
            <input key={filter.key} type={filter.type === "date" ? "date" : "text"} className={cls} title={filter.label}
                placeholder={filter.label} defaultValue={value}
                onClick={(e) => e.stopPropagation()}
                onChange={filter.type === "date" ? (e) => updateParams({ [filter.key]: e.target.value, page: 1 }) : undefined}
                onKeyDown={filter.type === "text" ? (e) => {
                    if (e.key === "Enter") updateParams({ [filter.key]: (e.target as HTMLInputElement).value, page: 1 })
                } : undefined}
            />
        )
    }

    const inline = config.filters?.slice(0, 3) ?? []
    const extra = config.filters?.slice(3) ?? []

    return (
        <div className="space-y-4 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">{config.title}</h1>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 print:hidden">
                    <Button onClick={() => window.print()} variant="outline" size="sm" className="h-9 font-medium shadow-sm">
                        <Printer className="mr-1.5 h-4 w-4" /> Cetak
                    </Button>
                    <Button onClick={handleExport} variant="outline" size="sm" className="h-9 font-medium shadow-sm" disabled={data.items.length === 0}>
                        <Download className="mr-1.5 h-4 w-4" /> Ekspor
                    </Button>
                    {actions}
                </div>
            </div>

            <Card className="bg-background border border-outline-variant shadow-sm rounded-lg overflow-hidden py-0 gap-0">
                <div className="p-3 border-b flex flex-wrap items-center gap-2 bg-background print:hidden">
                    <form className="relative w-full md:w-[260px]" onSubmit={(e) => { e.preventDefault(); updateParams({ search: searchVal, page: 1 }) }}>
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            className="w-full pl-9 pr-3 h-9 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-background transition-all"
                            placeholder={config.searchPlaceholder ?? "Cari"}
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                        />
                    </form>

                    {inline.map((f) => renderFilter(f, false))}

                    {extra.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 border-dashed text-muted-foreground hover:text-foreground">
                                    <Filter className="mr-1.5 h-4 w-4" /> Filter Lainnya
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 p-3">
                                <DropdownMenuLabel className="px-0 pt-0">Filter Tambahan</DropdownMenuLabel>
                                <div className="space-y-3 mt-2">
                                    {extra.map((f) => (
                                        <div key={f.key} className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-muted-foreground">{f.label}</label>
                                            {renderFilter(f, true)}
                                        </div>
                                    ))}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <div className="ml-auto flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 font-semibold text-muted-foreground hover:text-foreground">
                                    <Settings2 className="mr-1.5 h-4 w-4" /> Kolom
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {config.columns.map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col.key}
                                        checked={visibleColumns[col.key]}
                                        onCheckedChange={(val) => setVisibleColumns((prev) => ({ ...prev, [col.key]: val }))}
                                    >
                                        {col.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <CardContent className="p-0 overflow-x-auto relative min-h-[300px]">
                    {isPending && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40 font-bold text-muted-foreground">
                                <th className="px-4 py-3.5 w-10 text-center">No.</th>
                                {activeColumns.map((col) => {
                                    const right = col.type === "currency" || col.type === "number"
                                    const sorted = searchParams?.get("sortBy") === col.key
                                    return (
                                        <th
                                            key={col.key}
                                            onClick={() => col.sortable && handleSort(col.key)}
                                            className={`px-4 py-3.5 select-none whitespace-nowrap ${col.sortable ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""} ${right ? "text-right" : ""}`}
                                        >
                                            <div className={`flex items-center gap-1 ${right ? "justify-end" : ""}`}>
                                                {col.label}
                                                {col.sortable && <ArrowUpDown className={`h-3 w-3 ${sorted ? "text-foreground" : "opacity-40"}`} />}
                                            </div>
                                        </th>
                                    )
                                })}
                                <th className="px-4 py-3.5 text-right print:hidden">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.length === 0 ? (
                                <tr>
                                    <td colSpan={activeColumns.length + 2} className="h-24 text-center text-muted-foreground">
                                        Tidak ada data ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                data.items.map((item, index) => {
                                    const rowNum = (data.page - 1) * data.pageSize + index + 1
                                    return (
                                        <tr key={String(item[config.rowKey] ?? index)} className="border-b hover:bg-muted/20 transition-all duration-150">
                                            <td className="px-4 py-3 text-center text-xs text-muted-foreground font-semibold w-10">{rowNum}</td>
                                            {activeColumns.map((col) => {
                                                const right = col.type === "currency" || col.type === "number"
                                                const val = item[col.key]
                                                return (
                                                    <td key={col.key} className={`px-4 py-3 font-medium ${right ? "text-right tabular-nums whitespace-nowrap" : ""} ${col.type === "date" ? "whitespace-nowrap" : ""} ${col.mono ? "font-mono text-xs" : ""}`}>
                                                        {col.type === "badge" ? <Badge val={val} col={col} /> :
                                                            col.key === "nama" && (item._username || item._role) ? (
                                                                <div className="min-w-0">
                                                                    <div className="font-semibold text-sm truncate">{String(val)}</div>
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        {item._username ? <span className="text-[10px] text-muted-foreground">@{String(item._username)}</span> : null}
                                                                        {item._role ? (
                                                                            <span className="inline-flex items-center rounded-sm px-1 py-0 text-[9px] font-bold uppercase bg-primary/10 text-primary">
                                                                                {String(item._role)}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            ) : formatValue(val, col.type)}
                                                    </td>
                                                )
                                            })}
                                            <td className="px-4 py-3 text-right print:hidden whitespace-nowrap">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50" title="Detail" onClick={() => setSelectedItem(item)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>

                    <div className="flex items-center justify-between px-4 py-3 border-t print:hidden">
                        <div className="text-xs text-muted-foreground">
                            Menampilkan <span className="font-semibold">{formatAngka(Math.min(data.total, (data.page - 1) * data.pageSize + 1))}</span> - <span className="font-semibold">{formatAngka(Math.min(data.total, data.page * data.pageSize))}</span> dari <span className="font-semibold">{formatAngka(data.total)}</span> data
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.page <= 1 || isPending}
                                onClick={() => updateParams({ page: data.page - 1 })}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-semibold px-2">
                                Halaman {formatAngka(data.page)} dari {formatAngka(data.totalPages)}
                            </span>
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.page >= data.totalPages || isPending}
                                onClick={() => updateParams({ page: data.page + 1 })}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedItem && (
                <div className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-in fade-in duration-200 print:hidden">
                    <div className="absolute inset-0" onClick={() => setSelectedItem(null)} />
                    <div className="relative w-full max-w-md h-full bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-base font-extrabold text-foreground">Detail Data</h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>Tutup</Button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
                            {config.columns.map((col) => (
                                <div key={col.key} className="grid grid-cols-5 gap-2 py-2 border-b border-muted/60">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider col-span-2 pt-0.5">{col.label}</span>
                                    <span className="text-xs font-semibold text-foreground col-span-3 break-words">
                                        {col.type === "badge" ? <Badge val={selectedItem[col.key]} col={col} /> : formatValue(selectedItem[col.key], col.type)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
