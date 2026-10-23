// Service worker PWA anggota.
//
// Yang disimpan di HP hanya cangkang aplikasi: halaman "Tidak ada koneksi" (/luring), ikon, dan file statis
// berversi (/_next/static, nama file berisi sidik isi). Data keuangan TIDAK disimpan: halaman selalu diambil dari
// server, sehingga saldo yang tampil selalu terbaru dan tidak tertinggal di HP yang dipakai bersama (PRD bagian 5).
//
// Ganti VERSI bila isi cache awal berubah; cache versi lama dihapus saat service worker baru aktif.
const VERSI = 'v1';
const CACHE = `kopkar-anggota-${VERSI}`;
const AWAL = ['/luring', '/ikon/ikon-192.png', '/ikon/favicon-32.png', '/logo.png'];
// Server pengembangan (next dev): file /_next/static tidak berversi, jadi tidak disimpan supaya kode tidak basi.
const DEV = new URL(self.location.href).searchParams.get('dev') === '1';

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await cache.addAll(AWAL);
        // Simpan juga CSS/JS yang dipakai halaman luring, supaya tampil rapi saat tidak ada koneksi.
        if (!DEV) {
            const html = await (await cache.match('/luring')).text();
            const aset = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
            await Promise.all(aset.map((u) => cache.add(u).catch(() => undefined)));
        }
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        for (const k of await caches.keys()) if (k.startsWith('kopkar-anggota-') && k !== CACHE) await caches.delete(k);
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Pindah halaman: selalu dari jaringan; bila gagal (tidak ada koneksi), tampilkan halaman luring.
    if (req.mode === 'navigate') {
        event.respondWith(fetch(req).catch(async () => (await caches.match('/luring')) ?? Response.error()));
        return;
    }

    // File statis berversi: ambil dari cache bila ada, selain itu dari jaringan lalu simpan.
    if (!DEV && url.pathname.startsWith('/_next/static/')) {
        event.respondWith((async () => {
            const ada = await caches.match(req);
            if (ada) return ada;
            const res = await fetch(req);
            if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
            return res;
        })());
        return;
    }

    // Ikon: cache dulu (berubah sangat jarang). Permintaan lain (data, foto, server action) tidak disentuh.
    if (url.pathname.startsWith('/ikon/')) {
        event.respondWith(caches.match(req).then((ada) => ada ?? fetch(req)));
    }
});

// Web Push: tampilkan notifikasi dari server; ketuk membuka halaman tujuan (hanya alamat di situs ini).
self.addEventListener('push', (event) => {
    let d = {};
    try { d = event.data ? event.data.json() : {}; } catch { d = { isi: event.data ? event.data.text() : '' }; }
    event.waitUntil(self.registration.showNotification(d.judul || 'Kopkar MJS', {
        body: d.isi || '',
        icon: '/ikon/ikon-192.png',
        badge: '/ikon/favicon-32.png',
        // Gambar besar (Android/Windows); alamat relatif dilengkapi alamat situs ini, hanya jalur /gambar/ yang dipakai.
        image: typeof d.gambar === 'string' && d.gambar.startsWith('/gambar/') ? new URL(d.gambar, self.location.origin).href : undefined,
        data: { url: typeof d.url === 'string' && d.url.startsWith('/') ? d.url : '/notifikasi' },
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const tujuan = new URL(event.notification.data?.url || '/notifikasi', self.location.origin).href;
    event.waitUntil((async () => {
        const jendela = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const c of jendela) if (c.url.startsWith(self.location.origin) && 'focus' in c) { await c.focus(); return c.navigate(tujuan); }
        return self.clients.openWindow(tujuan);
    })());
});
