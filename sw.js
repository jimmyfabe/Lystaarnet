/* sw.js — service worker, så spillet virker uden net.
   Ved hver ny udgave: tæl VERSION op. Filerne hentes med cache: 'reload',
   så GitHub Pages' HTTP-cache ikke giver en blanding af gamle og nye filer. */
const VERSION = 'mat-2026-10-21-v229';
// FILER-HASH: d761fe06b47719d6 mat-2026-10-21-v229 — opdateres med: node test/test-sw.js --opdater
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
  'engelsk-opgaver.js', // engelsk for begyndere (13-10-2026): ordlisterne og opgaverne
  'natur-opgaver.js', // natur (20-10-2026): Gæt en lort — dyrene, fakta og opgaverne
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

// Piper-stemmen (tale/<ab>/<nøgle>.mp3): filnavnene er indholds-hashes, så en fil ændrer sig aldrig. De ligger i
// IndexedDB (TALE_DB, nøgle = filens 14 hex-tegn, værdi = ArrayBuffer), som overlever nye udgaver.
// IKKE i Cache Storage (13-10-2026, v126): WebKit indlæser oplysningerne om ALLE caches ved det første Cache API-kald —
// med 12.500 stemmefiler tog det første caches.open(VERSION) over 1,3 s ved hver start (sort skærm på iPhone).
// Den gamle cache «mat-tale» slettes ved activate; app.js (Piper.hentAlle/TaleLager) henter stemmen igen i baggrunden.
// Databasen deles med app.js (TaleLager): samme navn, version og store — test/test-sw-tale.js vogter det.
const TALE_DB = 'lystaarn-tale';
const TALE_STORE = 'filer';
const erTale = (url) => /\/tale\/[0-9a-f]{2}\/[0-9a-f]{14}\.mp3$/.test(new URL(url).pathname);
const taleNoegle = (url) => new URL(url).pathname.slice(-18, -4);

// Én forbindelse pr. service worker. Lukker browseren den (versionchange, lager ryddet), åbnes den igen næste gang.
let taleDb = null;
function aabenTale() {
  if (taleDb) return taleDb;
  if (typeof indexedDB === 'undefined' || !indexedDB) return Promise.reject(new Error('ingen IndexedDB'));
  const p = new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open(TALE_DB, 1); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(TALE_STORE)) r.result.createObjectStore(TALE_STORE); };
    r.onsuccess = () => {
      const db = r.result;
      db.onversionchange = () => { db.close(); if (taleDb === p) taleDb = null; };
      db.onclose = () => { if (taleDb === p) taleDb = null; };
      res(db);
    };
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('IndexedDB blokeret'));
  });
  taleDb = p;
  p.catch(() => { if (taleDb === p) taleDb = null; });
  return p;
}
function taleKald(mode, fn) {
  return aabenTale().then((db) => new Promise((res, rej) => {
    let tx;
    // En lukket forbindelse (InvalidStateError): glem den, så næste kald åbner en ny — ellers var stemmen væk offline
    try { tx = db.transaction(TALE_STORE, mode); } catch (err) { taleDb = null; rej(err); return; }
    const req = fn(tx.objectStore(TALE_STORE));
    tx.oncomplete = () => res(req.result);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  }));
}
// En brugbar fil: ArrayBuffer (eller Blob) med indhold — alt andet er et miss
const harIndhold = (v) => !!v && ((typeof v.byteLength === 'number' && v.byteLength > 0) || (typeof v.size === 'number' && v.size > 0));

// Kun et helt lydsvar gemmes: 200 (ikke 206 Partial Content) og audio/* (ikke en fejlside i HTML med status 200)
const heltLydsvar = (svar) => svar.status === 200 && svar.type === 'basic' && /^audio\//i.test(svar.headers.get('Content-Type') || '');

// Stemmefilen fra IndexedDB; ellers fra nettet, og et helt lydsvar gemmes bagefter (svaret venter ikke på gemningen)
async function taleSvar(e, req) {
  const n = taleNoegle(req.url);
  let gemt = null;
  try { gemt = await taleKald('readonly', (s) => s.get(n)); } catch (err) { /* uden IndexedDB: nettet */ }
  if (harIndhold(gemt)) return new Response(gemt, { headers: { 'Content-Type': 'audio/mpeg' } });
  const svar = await fetch(req);
  if (heltLydsvar(svar)) {
    const gem = svar.clone().arrayBuffer().then((ab) => (ab.byteLength ? taleKald('readwrite', (s) => s.put(ab, n)) : null)).catch(() => {});
    try { e.waitUntil(gem); } catch (err) { /* hændelsen er slut — gemningen kører alligevel videre */ }
  }
  return svar;
}

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
    // Gamle udgaver — og «mat-tale» (stemmen i Cache Storage før v126), som gjorde hver start langsom
    const navne = await caches.keys();
    await Promise.all(navne.filter((n) => n.startsWith('mat-') && n !== VERSION).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Forsiden spørger, hvilken udgave der kører (versionsnummeret i hjørnet, Jimmy 20-10-2026): svaret er VERSION,
// så tallet altid er den udgave, enheden har gemt — ikke en konstant i app.js, der kan være en anden
self.addEventListener('message', (e) => {
  if (e.data === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);
});

// Cache først (hurtigt og offline), ellers nettet — og gem det, der hentes
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (erTale(req.url)) { e.respondWith(taleSvar(e, req)); return; } // stemmen: IndexedDB, aldrig Cache API
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
