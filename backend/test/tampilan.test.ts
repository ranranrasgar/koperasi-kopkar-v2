import test from 'node:test';
import assert from 'node:assert/strict';
import { cssTema, kontras, PRESET, peringatanKontras, TEMA_BAWAAN, temaSah, temaSama, teksDiAtas, type Tema } from '../src/tampilan.ts';

test('temaSah: hanya #rrggbb yang diterima, dinormalkan, dan tidak ada celah menyisipkan CSS', () => {
    assert.deepEqual(temaSah({ ...TEMA_BAWAAN, aksen: '#ABCDEF' })?.aksen, '#abcdef');
    for (const buruk of ['#fff', 'red', '#ggg000', '#ffffff;}body{display:none', 'url(x)', '#ffffff ', '', null, 5]) {
        assert.equal(temaSah({ ...TEMA_BAWAAN, kanvas: buruk }), null, String(buruk));
    }
    assert.equal(temaSah({ aksen: '#000000' }), null);   // kunci kurang
    assert.equal(temaSah(null), null);
    assert.equal(temaSah('x'), null);
});

test('preset: semua sah, unik, dan terbaca (kontras tulisan menu dan tombol)', () => {
    assert.ok(PRESET.length >= 6);
    assert.equal(new Set(PRESET.map((p) => p.id)).size, PRESET.length);
    assert.ok(temaSama(PRESET[0].tema, TEMA_BAWAAN));
    for (const p of PRESET) {
        assert.ok(temaSah(p.tema), p.id);
        assert.deepEqual(peringatanKontras(p.tema), [], `${p.id}: ${peringatanKontras(p.tema).join(' ')}`);
    }
});

test('kontras dan warna tulisan di atas latar', () => {
    assert.ok(Math.abs(kontras('#000000', '#ffffff') - 21) < 0.01);
    assert.ok(Math.abs(kontras('#ffffff', '#ffffff') - 1) < 0.01);
    assert.equal(teksDiAtas('#0f2a4a'), '#ffffff');
    assert.equal(teksDiAtas('#fde68a'), '#111827');
    const buruk: Tema = { ...TEMA_BAWAAN, sidebar: '#ffffff', sidebarTeks: '#dddddd', aksen: '#fde68a' };
    assert.equal(peringatanKontras(buruk).length, 2);
});

test('cssTema: variabel, penggantian kelas biru, dan mode gelap tidak ikut berubah latarnya', () => {
    const css = cssTema(PRESET[2].tema); // navy korporat
    assert.match(css, /--aksen:#1d4ed8/);
    assert.match(css, /:root:not\(\.dark\)\{--tema-kanvas:#f1f5f9;[^}]*--tema-sidebar:#0f2a4a/);
    assert.match(css, /\.bg-blue-600/);
    assert.match(css, /--theme-surface:255 255 255/);
    assert.doesNotMatch(css, /\.dark\{/);
    assert.doesNotMatch(css, /[<>]/);
});
