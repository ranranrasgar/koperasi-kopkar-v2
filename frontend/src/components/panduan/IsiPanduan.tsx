import Link from "next/link"
import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Element, ElementContent } from "hast"
import { slugTeks } from "@/lib/panduan-teks"
import { cn } from "@/lib/utils"

/** Teks polos dari simpul HTML hasil Markdown. */
function teksSimpul(n: ElementContent | Element): string {
    if (n.type === "text") return n.value
    if ("children" in n) return n.children.map((c) => teksSimpul(c as ElementContent)).join("")
    return ""
}

// "> **Penting:** ..." menjadi kotak merah; "> **Catatan:**" / "> **Tips:**" menjadi kotak biru.
function jenisKotak(node?: Element) {
    const p = node?.children.find((c): c is Element => c.type === "element" && c.tagName === "p")
    const tebal = p?.children.find((c): c is Element => c.type === "element")
    const kata = tebal && tebal.tagName === "strong" ? teksSimpul(tebal).toLowerCase() : ""
    if (kata.startsWith("penting") || kata.startsWith("perhatian")) return "penting"
    if (kata.startsWith("catatan") || kata.startsWith("tips") || kata.startsWith("info")) return "catatan"
    return null
}

const KOMPONEN: Components = {
    h2: ({ node, children }) => (
        <h2 id={node ? slugTeks(teksSimpul(node)) : undefined} className="scroll-mt-24 text-xl font-semibold mt-10 mb-3 pb-2 border-b">
            {children}
        </h2>
    ),
    h3: ({ children }) => <h3 className="text-base font-semibold mt-6 mb-2">{children}</h3>,
    p: ({ children }) => <p className="leading-7 my-3">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1.5 leading-7">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1.5 leading-7">{children}</ol>,
    a: ({ href = "", children }) => href.startsWith("/")
        ? <Link href={href} className="text-blue-600 dark:text-blue-400 underline underline-offset-2">{children}</Link>
        : <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline underline-offset-2">{children}</a>,
    code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>,
    pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
    table: ({ children }) => (
        <div className="my-5 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/60 text-left">{children}</thead>,
    th: ({ children }) => <th className="px-3 py-2 font-semibold align-bottom">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 border-t align-top">{children}</td>,
    blockquote: ({ node, children }) => {
        const jenis = jenisKotak(node)
        return (
            <div role={jenis === "penting" ? "note" : undefined} className={cn("my-5 rounded-lg border-l-4 px-4 py-1 [&_p]:my-2",
                jenis === "penting" ? "border-red-500 bg-red-50 text-red-950 dark:bg-red-500/10 dark:text-red-100"
                    : jenis === "catatan" ? "border-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-500/10 dark:text-blue-100"
                        : "border-muted-foreground/40 bg-muted/40")}>
                {children}
            </div>
        )
    },
    hr: () => <hr className="my-8" />,
}

/** Isi artikel panduan (Markdown + tabel GFM). HTML mentah tidak dirender, jadi aman untuk isi dari admin. */
export function IsiPanduan({ isi, className }: { isi: string; className?: string }) {
    return (
        <div className={cn("text-[15px] text-foreground", className)}>
            <Markdown remarkPlugins={[remarkGfm]} components={KOMPONEN}>{isi}</Markdown>
        </div>
    )
}
