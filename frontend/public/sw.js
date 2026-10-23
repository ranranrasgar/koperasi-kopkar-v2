// Service worker admin: hanya menerima Web Push (pesan anggota masuk). Tidak menyimpan halaman atau data apa pun.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let d = {};
    try { d = event.data ? event.data.json() : {}; } catch { d = { isi: event.data ? event.data.text() : '' }; }
    event.waitUntil(self.registration.showNotification(d.judul || 'Koperasi', {
        body: d.isi || '',
        tag: typeof d.url === 'string' && d.url.startsWith('/dashboard/pesan') ? 'pesan-anggota' : undefined, // pesan beruntun menggantikan satu sama lain
        renotify: true,
        data: { url: typeof d.url === 'string' && d.url.startsWith('/dashboard/') ? d.url : '/dashboard/pesan' },
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const tujuan = new URL(event.notification.data?.url || '/dashboard/pesan', self.location.origin).href;
    event.waitUntil((async () => {
        const jendela = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const c of jendela) if (c.url.startsWith(self.location.origin) && 'focus' in c) { await c.focus(); return c.navigate(tujuan); }
        return self.clients.openWindow(tujuan);
    })());
});
