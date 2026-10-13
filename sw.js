/* sw.js — service worker, så spillet virker uden net.
   Ved hver ny udgave: tæl VERSION op. Filerne hentes med cache: 'reload',
   så GitHub Pages' HTTP-cache ikke giver en blanding af gamle og nye filer. */
const VERSION = 'mat-2026-10-12-v117';
// FILER-HASH: 254b97316b5c1a05 mat-2026-10-12-v117 — opdateres med: node test/test-sw.js --opdater
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
  'talefiler.js', // Piper-stemmen: sætninger → filnavne (tale/…/*.mp3 caches, når de bruges)
  'tale/liste.json',
  'lydpalet.js',
  'feedback-forloeb.js',
  'dansk-opgaver.js',
  'grafik.js', // tegningerne (fase A): venner, verdener, tårnet, kortet og samledyrene
  'lyd/liste.json', // listen over indtalte klip i lyd/ (tom: Jimmys optagelser er fjernet 12-10; læg hver ny .wav på FILER-listen)
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

// Piper-stemmen (tale/<ab>/<nøgle>.mp3): filnavnene er indholds-hashes, så en fil ændrer sig aldrig. De ligger i en
// egen cache, som overlever nye udgaver — ellers skulle iPad'en hente hele stemmen igen ved hver opdatering.
const TALE_CACHE = 'mat-tale';
const erTale = (url) => /\/tale\/[0-9a-f]{2}\/[0-9a-f]{14}\.mp3$/.test(new URL(url).pathname);

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
    await Promise.all(navne.filter((n) => n.startsWith('mat-') && n !== VERSION && n !== TALE_CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Cache først (hurtigt og offline), ellers nettet — og gem det, der hentes
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(erTale(req.url) ? TALE_CACHE : VERSION);
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
