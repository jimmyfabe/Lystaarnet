/* sw.js — service worker, så spillet virker uden net.
   Ved hver ny udgave: tæl VERSION op. Filerne hentes med cache: 'reload',
   så GitHub Pages' HTTP-cache ikke giver en blanding af gamle og nye filer. */
const VERSION = 'mat-2026-10-11-v112';
// FILER-HASH: 6372ba21bd0e11e6 mat-2026-10-11-v112 — opdateres med: node test/test-sw.js --opdater
const FILER = [
  './',
  'index.html',
  'dino.html',
  'enhjorning.html',
  // Tomme viderestillinger fra før B1 — så et gammelt hjemmeskærm-ikon også virker offline
  'alma.html',
  'ella.html',
  'voksen.html',
  'app.js',
  'app.css',
  'opgaver.js',
  'gem.js',
  'voksen.js',
  'voksen-opgaver.js',
  'lydklip.js',
  'lydpalet.js',
  'feedback-forloeb.js',
  'dansk-opgaver.js',
  'grafik.js', // tegningerne (fase A): venner, verdener, tårnet, kortet og samledyrene
  'lyd/liste.json', // listen over indtalte klip i lyd/ (læg også hver .wav-fil på FILER-listen)
  // Jimmys indtalte bogstavlyde (10-10-2026), skåret til med vaerktoej/klip-lyde.js
  'lyd/lyd-a.wav', 'lyd/lyd-a-kort.wav', 'lyd/lyd-aa.wav', 'lyd/lyd-ae.wav', 'lyd/lyd-b.wav', 'lyd/lyd-c.wav',
  'lyd/lyd-c-s.wav', 'lyd/lyd-d.wav', 'lyd/lyd-d-bloed.wav', 'lyd/lyd-e.wav', 'lyd/lyd-e-tryksvag.wav', 'lyd/lyd-f.wav',
  'lyd/lyd-g.wav', 'lyd/lyd-h.wav', 'lyd/lyd-i.wav', 'lyd/lyd-j.wav', 'lyd/lyd-k.wav', 'lyd/lyd-l.wav',
  'lyd/lyd-m.wav', 'lyd/lyd-n.wav', 'lyd/lyd-o.wav', 'lyd/lyd-o-aaben.wav', 'lyd/lyd-oe.wav', 'lyd/lyd-p.wav',
  'lyd/lyd-q.wav', 'lyd/lyd-r.wav', 'lyd/lyd-s.wav', 'lyd/lyd-t.wav', 'lyd/lyd-u.wav', 'lyd/lyd-v.wav',
  'lyd/lyd-w.wav', 'lyd/lyd-x.wav', 'lyd/lyd-y.wav', 'lyd/lyd-z.wav',
  'manifest.json',
  'manifest-dino.json',
  'manifest-enhjorning.json',
  'ikoner/index-180.png',
  'ikoner/index-192.png',
  'ikoner/index-512.png',
  'ikoner/dino-180.png',
  'ikoner/dino-192.png',
  'ikoner/dino-512.png',
  'ikoner/enhjorning-180.png',
  'ikoner/enhjorning-192.png',
  'ikoner/enhjorning-512.png',
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
