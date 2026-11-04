// Penulis file Excel (.xlsx) minimal tanpa pustaka luar: satu lembar, sel teks dan angka, lebar kolom, dan (bila `bergaya`) format sel.
// .xlsx adalah zip berisi beberapa XML; zip ditulis tanpa kompresi (metode STORE) sehingga cukup CRC-32.

export type Sel = string | number | null

/** Gaya sel; urutannya = indeks cellXfs di STYLES. */
const GAYA = ["biasa", "kopNama", "kopBaris", "judul", "sub", "bagian", "kepala", "teks", "tengah", "angka", "angka2", "total", "totalAngka", "totalAngka2", "kaki", "peringatan"] as const
export type Gaya = (typeof GAYA)[number]
export type SelGaya = Sel | { v: Sel; g: Gaya }

export interface Lembar {
    nama: string; baris: SelGaya[][]; lebarKolom?: number[]
    /** Pakai format sel, garis tabel, dan pengaturan halaman. Tanpa ini file tetap polos (format file bank Potongan Gaji). */
    bergaya?: boolean
    /** Sel digabung, mis. A5:H5. */
    gabung?: string[]
    /** Bekukan baris sampai nomor ini (judul kolom tetap tampil saat digulir). */
    bekuBaris?: number
    lanskap?: boolean
}

const STYLES = `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="7"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font><font><sz val="9"/><color rgb="FF555555"/><name val="Arial"/></font><font><b/><sz val="12"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><i/><sz val="9"/><color rgb="FF555555"/><name val="Arial"/></font><font><b/><sz val="9"/><color rgb="FF92400E"/><name val="Arial"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9CA3AF"/></left><right style="thin"><color rgb="FF9CA3AF"/></right><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="16">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="3" fontId="4" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="4" fontId="4" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)
    // Karakter kontrol tidak sah di XML.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")

/** Huruf kolom Excel dari indeks 0 (0 = A, 26 = AA). */
export function kolomExcel(i: number) {
    let s = ""
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s
    return s
}

/** Pas selebar kertas, tanpa garis bantu Excel, judul kolom dibekukan. Urutan elemen mengikuti skema worksheet. */
const tataLembarAwal = (l: Lembar) => `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0">${
    l.bekuBaris ? `<pane ySplit="${l.bekuBaris}" topLeftCell="A${l.bekuBaris + 1}" activePane="bottomLeft" state="frozen"/>` : ""}</sheetView></sheetViews>`
const tataLembarAkhir = (l: Lembar) => `${l.gabung?.length ? `<mergeCells count="${l.gabung.length}">${l.gabung.map((g) => `<mergeCell ref="${g}"/>`).join("")}</mergeCells>` : ""
    }<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${l.lanskap ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>`

function sheetXml(l: Lembar) {
    const cols = l.lebarKolom?.length
        ? `<cols>${l.lebarKolom.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : ""
    const rows = l.baris.map((r, ri) => {
        const cells = r.map((sel, ci) => {
            const bergaya = typeof sel === "object" && sel !== null
            const v = bergaya ? sel.v : sel
            const s = bergaya && sel.g !== "biasa" ? ` s="${GAYA.indexOf(sel.g)}"` : ""
            const ref = `${kolomExcel(ci)}${ri + 1}`
            if (v === null || v === "") return s ? `<c r="${ref}"${s}/>` : "" // sel kosong tetap berbingkai
            return typeof v === "number" && Number.isFinite(v)
                ? `<c r="${ref}"${s}><v>${v}</v></c>`
                : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`
        }).join("")
        return `<row r="${ri + 1}">${cells}</row>`
    }).join("")
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${l.bergaya ? tataLembarAwal(l) : ""}${cols}<sheetData>${rows}</sheetData>${l.bergaya ? tataLembarAkhir(l) : ""}</worksheet>`
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
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>${l.bergaya ? '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' : ""}</Types>`),
        f("_rels/.rels", `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
        f("xl/workbook.xml", `${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${l.bergaya ? "<bookViews><workbookView/></bookViews>" : ""}<sheets><sheet name="${esc(l.nama.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
        f("xl/_rels/workbook.xml.rels", `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>${l.bergaya ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' : ""}</Relationships>`),
        f("xl/worksheets/sheet1.xml", sheetXml(l)),
        ...(l.bergaya ? [f("xl/styles.xml", H + STYLES)] : []),
    ])
}
