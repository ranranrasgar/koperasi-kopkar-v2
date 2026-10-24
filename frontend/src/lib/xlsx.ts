// Penulis file Excel (.xlsx) minimal tanpa pustaka luar: satu lembar, sel teks dan angka, lebar kolom.
// .xlsx adalah zip berisi beberapa XML; zip ditulis tanpa kompresi (metode STORE) sehingga cukup CRC-32.

export type Sel = string | number | null
export interface Lembar { nama: string; baris: Sel[][]; lebarKolom?: number[] }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)
    // Karakter kontrol tidak sah di XML.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")

/** Huruf kolom Excel dari indeks 0 (0 = A, 26 = AA). */
function kolom(i: number) {
    let s = ""
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s
    return s
}

function sheetXml(l: Lembar) {
    const cols = l.lebarKolom?.length
        ? `<cols>${l.lebarKolom.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : ""
    const rows = l.baris.map((r, ri) => {
        const cells = r.map((v, ci) => {
            if (v === null || v === "") return ""
            const ref = `${kolom(ci)}${ri + 1}`
            return typeof v === "number" && Number.isFinite(v)
                ? `<c r="${ref}"><v>${v}</v></c>`
                : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`
        }).join("")
        return `<row r="${ri + 1}">${cells}</row>`
    }).join("")
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows}</sheetData></worksheet>`
}

const CRC = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
        let c = n
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        t[n] = c >>> 0
    }
    return t
})()
function crc32(b: Uint8Array) {
    let c = 0xffffffff
    for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

/** Zip tanpa kompresi. */
function zip(berkas: { nama: string; isi: Uint8Array }[]): Uint8Array {
    const enc = new TextEncoder()
    const bagian: Uint8Array[] = [], pusat: Uint8Array[] = []
    let ofs = 0
    for (const f of berkas) {
        const nama = enc.encode(f.nama), crc = crc32(f.isi), n = f.isi.length
        const lokal = new DataView(new ArrayBuffer(30))
        lokal.setUint32(0, 0x04034b50, true); lokal.setUint16(4, 20, true); lokal.setUint32(14, crc, true)
        lokal.setUint32(18, n, true); lokal.setUint32(22, n, true); lokal.setUint16(26, nama.length, true)
        bagian.push(new Uint8Array(lokal.buffer), nama, f.isi)
        const p = new DataView(new ArrayBuffer(46))
        p.setUint32(0, 0x02014b50, true); p.setUint16(4, 20, true); p.setUint16(6, 20, true); p.setUint32(16, crc, true)
        p.setUint32(20, n, true); p.setUint32(24, n, true); p.setUint16(28, nama.length, true); p.setUint32(42, ofs, true)
        pusat.push(new Uint8Array(p.buffer), nama)
        ofs += 30 + nama.length + n
    }
    const panjangPusat = pusat.reduce((t, b) => t + b.length, 0)
    const akhir = new DataView(new ArrayBuffer(22))
    akhir.setUint32(0, 0x06054b50, true); akhir.setUint16(8, berkas.length, true); akhir.setUint16(10, berkas.length, true)
    akhir.setUint32(12, panjangPusat, true); akhir.setUint32(16, ofs, true)
    const semua = [...bagian, ...pusat, new Uint8Array(akhir.buffer)]
    const out = new Uint8Array(semua.reduce((t, b) => t + b.length, 0))
    let i = 0
    for (const b of semua) { out.set(b, i); i += b.length }
    return out
}

/** Buku kerja satu lembar sebagai isi file .xlsx. */
export function buatXlsx(l: Lembar): Uint8Array {
    const enc = new TextEncoder()
    const f = (nama: string, isi: string) => ({ nama, isi: enc.encode(isi) })
    const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    return zip([
        f("[Content_Types].xml", `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`),
        f("_rels/.rels", `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
        f("xl/workbook.xml", `${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(l.nama.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
        f("xl/_rels/workbook.xml.rels", `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`),
        f("xl/worksheets/sheet1.xml", sheetXml(l)),
    ])
}
