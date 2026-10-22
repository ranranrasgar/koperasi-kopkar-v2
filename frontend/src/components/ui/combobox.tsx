"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronsUpDown, X, Search } from "lucide-react"

interface ComboboxOption {
    value: string
    label: string
}

interface ComboboxProps {
    options: ComboboxOption[]
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    disabled?: boolean
    className?: string
    emptyText?: string
    variant?: "list" | "card"
    maxDisplay?: number
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = "Pilih...",
    searchPlaceholder = "Cari...",
    disabled = false,
    className,
    emptyText = "Tidak ada data",
    variant = "list",
    maxDisplay = 6,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const selectedLabel = options.find((o) => o.value === value)?.label

    const filteredOptions = React.useMemo(() => {
        if (!search) return options
        const q = search.toLowerCase()
        return options.filter(
            (o) =>
                o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
        )
    }, [options, search])

    const displayOptions = variant === "card"
        ? filteredOptions.slice(0, maxDisplay)
        : filteredOptions

    return (
        <Popover open={open && !disabled} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "h-12 w-full min-w-0 justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal hover:bg-white disabled:!bg-white disabled:!opacity-100 disabled:!text-slate-600 disabled:!cursor-default",
                        !value && "text-slate-400",
                        className
                    )}
                >
                    <span className="truncate">
                        {selectedLabel || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl border-slate-200 bg-white shadow-lg" align="start">
                {variant === "card" ? (
                    <>
                        <div className="flex items-center border-b border-slate-100 px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="h-11 border-0 bg-transparent px-0 text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="shrink-0 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {displayOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-slate-400">
                                {emptyText}
                            </div>
                        ) : (
                            <div className="p-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {displayOptions.map((option) => (
                                        <button
                                            type="button"
                                            key={option.value}
                                            onClick={() => {
                                                onValueChange(option.value)
                                                setOpen(false)
                                                setSearch("")
                                            }}
                                            className={cn(
                                                "flex items-center justify-center rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all",
                                                option.value === value
                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                {filteredOptions.length > maxDisplay && (
                                    <p className="mt-2 text-center text-[10px] text-slate-400 font-medium">
                                        Tampilkan {maxDisplay} dari {filteredOptions.length} data. Ketik untuk mencari.
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center border-b border-slate-100 px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="h-11 border-0 bg-transparent px-0 text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="shrink-0 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <ScrollArea className="max-h-64">
                            {displayOptions.length === 0 ? (
                                <div className="py-6 text-center text-sm text-slate-400">
                                    {emptyText}
                                </div>
                            ) : (
                                <div className="p-1">
                                    {displayOptions.map((option) => (
                                        <button
                                            type="button"
                                            key={option.value}
                                            onClick={() => {
                                                onValueChange(option.value)
                                                setOpen(false)
                                                setSearch("")
                                            }}
                                            className={cn(
                                                "relative flex w-full cursor-default items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors hover:bg-emerald-50 hover:text-emerald-700",
                                                option.value === value && "bg-emerald-50 text-emerald-700 font-semibold"
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </>
                )}
            </PopoverContent>
        </Popover>
    )
}
