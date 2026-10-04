/* lydklip.js — indtalte lydklip (fx bogstavlyde) gøres klar til spillet.
   Rene funktioner uden DOM, så de kan testes i Node (test/test-lydklip.js):
   mono → ny samplerate (22,05 kHz) → beskær stilhed → normalisér → WAV (16 bit) → base64.
   Optagelsen selv (MediaRecorder + WebAudio) og IndexedDB ligger i app.js / voksen.js. */
(function (root) {
  'use strict';

  const RATE = 22050;

  // Flere kanaler (Float32Array pr. kanal) → én kanal (gennemsnit)
  function tilMono(kanaler) {
    if (!kanaler || !kanaler.length) return new Float32Array(0);
    if (kanaler.length === 1) return Float32Array.from(kanaler[0]);
    const n = Math.min(...kanaler.map((k) => k.length));
    const ud = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (const k of kanaler) s += k[i];
      ud[i] = s / kanaler.length;
    }
    return ud;
  }

  // Ny samplerate med lineær interpolation (optagelser er typisk 44,1 eller 48 kHz)
  function nySamplerate(samples, fra, til) {
    til = til || RATE;
    if (!samples.length || fra === til) return Float32Array.from(samples);
    const n = Math.max(1, Math.round(samples.length * til / fra));
    const ud = new Float32Array(n);
    const f = fra / til;
    for (let i = 0; i < n; i++) {
      const x = i * f;
      const a = Math.floor(x), b = Math.min(samples.length - 1, a + 1);
      const t = x - a;
      ud[i] = samples[Math.min(a, samples.length - 1)] * (1 - t) + samples[b] * t;
    }
    return ud;
  }

  // Skær stilhed væk i starten og slutningen. Tærsklen er relativ til den højeste top (så et svagt klip
  // ikke skæres helt væk), og der beholdes en lille margen (60 ms), så stoplyde ikke klippes over.
  function beskaerStilhed(samples, rate, taerskel, margenSek) {
    rate = rate || RATE;
    taerskel = taerskel === undefined ? 0.06 : taerskel;
    const margen = Math.round((margenSek === undefined ? 0.06 : margenSek) * rate);
    let top = 0;
    for (let i = 0; i < samples.length; i++) top = Math.max(top, Math.abs(samples[i]));
    if (top < 1e-4) return new Float32Array(0); // kun stilhed
    const graense = top * taerskel;
    let start = 0, slut = samples.length - 1;
    while (start < samples.length && Math.abs(samples[start]) < graense) start++;
    while (slut > start && Math.abs(samples[slut]) < graense) slut--;
    return samples.slice(Math.max(0, start - margen), Math.min(samples.length, slut + 1 + margen));
  }

  // Normalisér, så den højeste top bliver `maal` (0,9 = lidt luft til 16 bit)
  function normaliser(samples, maal) {
    maal = maal || 0.9;
    let top = 0;
    for (let i = 0; i < samples.length; i++) top = Math.max(top, Math.abs(samples[i]));
    if (top < 1e-6) return Float32Array.from(samples);
    const k = maal / top;
    return Float32Array.from(samples, (v) => v * k);
  }

  // WAV-fil (RIFF, PCM 16 bit, mono)
  function lavWav(samples, rate) {
    rate = rate || RATE;
    const n = samples.length;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const tekst = (pos, t) => { for (let i = 0; i < t.length; i++) v.setUint8(pos + i, t.charCodeAt(i)); };
    tekst(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); tekst(8, 'WAVE');
    tekst(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    tekst(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + i * 2, s < 0 ? Math.round(s * 32768) : Math.round(s * 32767), true);
    }
    return new Uint8Array(buf);
  }

  // Læs en WAV-fil (kun vores eget format: PCM 16 bit). Til tests og kontrol af en importeret fil.
  function laesWav(bytes) {
    if (!bytes || bytes.length < 44) return null;
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const tekst = (pos, l) => String.fromCharCode(...bytes.slice(pos, pos + l));
    if (tekst(0, 4) !== 'RIFF' || tekst(8, 4) !== 'WAVE') return null;
    let pos = 12, fmt = null, data = null;
    while (pos + 8 <= bytes.length) {
      const id = tekst(pos, 4), str = v.getUint32(pos + 4, true);
      if (id === 'fmt ') fmt = { format: v.getUint16(pos + 8, true), kanaler: v.getUint16(pos + 10, true), rate: v.getUint32(pos + 12, true), bits: v.getUint16(pos + 22, true) };
      else if (id === 'data') data = { pos: pos + 8, str: Math.min(str, bytes.length - pos - 8) };
      pos += 8 + str + (str % 2);
    }
    if (!fmt || !data || fmt.format !== 1 || fmt.bits !== 16) return null;
    const n = Math.floor(data.str / 2 / fmt.kanaler);
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i++) samples[i] = v.getInt16(data.pos + i * 2 * fmt.kanaler, true) / 32768;
    return { rate: fmt.rate, kanaler: fmt.kanaler, bits: fmt.bits, samples: samples };
  }

  // base64 uden btoa (virker ens i Node og browseren, også for store klip)
  const TEGN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function tilBase64(bytes) {
    let ud = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
      const n = (a << 16) | ((b || 0) << 8) | (c || 0);
      ud += TEGN[(n >> 18) & 63] + TEGN[(n >> 12) & 63] + (b === undefined ? '=' : TEGN[(n >> 6) & 63]) + (c === undefined ? '=' : TEGN[n & 63]);
    }
    return ud;
  }
  function fraBase64(s) {
    s = String(s || '').replace(/[^A-Za-z0-9+/]/g, '');
    const ud = new Uint8Array(Math.floor(s.length * 3 / 4));
    let j = 0;
    for (let i = 0; i < s.length; i += 4) {
      const n = (TEGN.indexOf(s[i]) << 18) | (TEGN.indexOf(s[i + 1]) << 12) | ((s[i + 2] ? TEGN.indexOf(s[i + 2]) : 0) << 6) | (s[i + 3] ? TEGN.indexOf(s[i + 3]) : 0);
      if (j < ud.length) ud[j++] = (n >> 16) & 255;
      if (j < ud.length && s[i + 2]) ud[j++] = (n >> 8) & 255;
      if (j < ud.length && s[i + 3]) ud[j++] = n & 255;
    }
    return ud.slice(0, j);
  }

  // Hele vejen: kanaler fra WebAudio (AudioBuffer) → færdig WAV. Returnerer null, hvis der kun var stilhed.
  function behandl(kanaler, rate) {
    let s = tilMono(kanaler);
    s = nySamplerate(s, rate, RATE);
    s = beskaerStilhed(s, RATE);
    if (!s.length) return null;
    s = normaliser(s, 0.9);
    return { wav: lavWav(s, RATE), sek: s.length / RATE };
  }

  // Eksportfilen fra 🎙️ Indtal: { version: 1, klip: { id: base64WAV } }. Kun gyldige id'er og WAV'er.
  const GYLDIGT_ID = /^[a-z][a-z0-9-]{0,40}$/;
  function lavEksport(klip) {
    const ud = { version: 1, klip: {} };
    for (const id of Object.keys(klip || {}).sort()) if (GYLDIGT_ID.test(id) && klip[id] && klip[id].length) ud.klip[id] = tilBase64(klip[id]);
    return ud;
  }
  function laesEksport(obj) {
    const ud = {};
    if (!obj || typeof obj !== 'object' || obj.version !== 1 || !obj.klip || typeof obj.klip !== 'object') return ud;
    for (const id of Object.keys(obj.klip)) {
      if (!GYLDIGT_ID.test(id) || typeof obj.klip[id] !== 'string') continue;
      const b = fraBase64(obj.klip[id]);
      if (laesWav(b)) ud[id] = b;
    }
    return ud;
  }

  // ---------- Stemmevalg (talesyntese) ----------
  // Rækkefølge: den voksnes gemte valg → navn med «Premium/Enhanced/Forbedret» → ikke «compact» → lokal (virker
  // offline) → første danske. Findes den gemte stemme ikke længere, vælges der automatisk.
  const erDansk = (v) => !!v && /^da([-_]|$)/i.test(v.lang || '');
  function danskeStemmer(stemmer) { return (stemmer || []).filter(erDansk); }
  function vaelgStemme(stemmer, gemtNavn) {
    const da = danskeStemmer(stemmer);
    if (!da.length) return null;
    if (gemtNavn) { const g = da.find((v) => v.name === gemtNavn); if (g) return g; }
    const god = (v) => /premium|enhanced|forbedret|forbättrad|förbättrad/i.test(v.name || '');
    const kompakt = (v) => /compact|kompakt/i.test(v.name || '');
    return da.find((v) => god(v) && v.localService) || da.find(god) ||
      da.find((v) => !kompakt(v) && v.localService) || da.find((v) => !kompakt(v)) ||
      da.find((v) => v.localService) || da[0];
  }

  const Lydklip = { RATE, danskeStemmer, vaelgStemme, tilMono, nySamplerate, beskaerStilhed, normaliser, lavWav, laesWav, tilBase64, fraBase64, behandl, lavEksport, laesEksport, GYLDIGT_ID };
  if (typeof module !== 'undefined' && module.exports) module.exports = Lydklip;
  else root.Lydklip = Lydklip;
})(typeof self !== 'undefined' ? self : this);
