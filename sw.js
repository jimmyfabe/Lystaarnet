/* sw.js — service worker, så spillet virker uden net.
   Ved hver ny udgave: tæl VERSION op. Filerne hentes med cache: 'reload',
   så GitHub Pages' HTTP-cache ikke giver en blanding af gamle og nye filer. */
const VERSION = 'mat-2026-10-04-v37';
// FILER-HASH: cd2aff687445c77b mat-2026-10-04-v37 — opdateres med: node test/test-sw.js --opdater
const FILER = [
  './',
  'index.html',
  'alma.html',
  'ella.html',
  'voksen.html',
  'app.js',
  'app.css',
  'opgaver.js',
  'gem.js',
  'voksen.js',
  'voksen-opgaver.js',
  'manifest.json',
  'manifest-alma.json',
  'manifest-ella.json',
  'ikoner/index-180.png',
  'ikoner/index-192.png',
  'ikoner/index-512.png',
  'ikoner/alma-180.png',
  'ikoner/alma-192.png',
  'ikoner/alma-512.png',
  'ikoner/ella-180.png',
  'ikoner/ella-192.png',
  'ikoner/ella-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    // Alt eller intet: mangler bare én fil (ustabilt net, halv udrulning), fejler opdateringen.
    // Så beholder iPad'en den gamle, hele udgave og prøver igen næste gang — i stedet for en hvid skærm offline.
    const svar = await Promise.all(FILER.map((f) => fetch(new Request(f, { cache: 'reload' }))));
    const mangler = FILER.filter((f, i) => !svar[i].ok);
    if (mangler.length) throw new Error('Mangler: ' + mangler.join(', '));
    const cache = await caches.open(VERSION);
    await Promise.all(svar.map((r, i) => cache.put(FILER[i], r)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const navne = await caches.keys();
    await Promise.all(navne.filter((n) => n.startsWith('mat-') && n !== VERSION).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Cache først (hurtigt og offline), ellers nettet — og gem det, der hentes
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const fundet = await cache.match(req, { ignoreSearch: true });
    if (fundet) return fundet;
    try {
      const svar = await fetch(req);
      if (svar.ok && svar.type === 'basic') cache.put(req, svar.clone());
      return svar;
    } catch (err) {
      if (req.mode === 'navigate') {
        const forside = await cache.match('index.html');
        if (forside) return forside;
      }
      throw err;
    }
  })());
});
