/* lydklip.js — indtalte lydklip (fx bogstavlyde) gøres klar til spillet.
   Rene funktioner uden DOM, så de kan testes i Node (test/test-lydklip.js):
   mono → ny samplerate (22,05 kHz) → højpas → støjport → beskær stilhed → fast lydstyrke → fades → WAV (16 bit) → base64.
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

  // ---------- Renere optagelse (14-10-2026 — barnets navn skal kunne høres) ----------
  // Niveauerne måles i rammer på 10 ms. Støjgulvet er optagelsens stille dele, så tærsklerne følger rummet.
  const RAMME_SEK = 0.01;

  // Højpas: 4. ordens Butterworth ved 90 Hz (to biquads, RBJ-opskriften) — fjerner 50 Hz-brum, rumlen og DC, ikke stemmen
  function hoejpas(samples, rate, fc) {
    rate = rate || RATE;
    fc = fc || 90;
    const ud = Float32Array.from(samples);
    const w = 2 * Math.PI * fc / rate, c = Math.cos(w);
    for (const q of [0.5412, 1.3066]) {
      const a = Math.sin(w) / (2 * q), a0 = 1 + a;
      const b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, a1 = -2 * c / a0, a2 = (1 - a) / a0;
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < ud.length; i++) {
        const x = ud[i];
        const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = y;
        ud[i] = y;
      }
    }
    return ud;
  }

  // RMS pr. ramme: { r: Float32Array, n: prøver pr. ramme }
  function rammeRms(samples, rate) {
    const n = Math.max(1, Math.round((rate || RATE) * RAMME_SEK));
    const r = new Float32Array(Math.ceil(samples.length / n));
    for (let k = 0; k < r.length; k++) {
      const a = k * n, b = Math.min(samples.length, a + n);
      let e = 0;
      for (let i = a; i < b; i++) e += samples[i] * samples[i];
      r[k] = Math.sqrt(e / (b - a));
    }
    return { r: r, n: n };
  }

  // Støjgulvet: de stille dele af optagelsen = 10.-percentilen af rammernes RMS (mindst 1e-5, ca. -100 dBFS)
  function stoejgulv(r) {
    if (!r.length) return 1e-5;
    const s = Array.from(r).sort((a, b) => a - b);
    return Math.max(1e-5, s[Math.floor(s.length * 0.1)]);
  }

  // Rammer med lyd: over støjgulvet × 2,5 (+8 dB) og højst 40 dB under den kraftigste ramme (ellers tæller højpassets
  // efterklang med i en helt ren optagelse, hvor støjgulvet er digital stilhed). Uden nogen stille del (optagelsen
  // startede og stoppede midt i lyden) er et kraftigt signal (over ca. -30 dBFS) lyd hele vejen; et svagt er kun støj.
  function aktiveRammer(r, gulv) {
    let top = 0;
    for (const v of r) top = Math.max(top, v);
    if (top <= gulv * 2.5) return Array.from(r, () => top > 0.03);
    const graense = Math.max(gulv * 2.5, top * 0.01);
    return Array.from(r, (v) => v > graense);
  }

  // Korte, isolerede spidser er ikke lyd: et løb på højst 50 ms (et bump på 30 ms rammer op til 4-5 rammer), der ligger
  // over 200 ms fra det nærmeste længere løb — fx fingeren på ⏹ til sidst eller et pop, når mikrofonen starter. Ellers
  // holder de beskæringen åben («navn … pause … dunk») og trækker stemmen ned i normaliseringen. Korte lyde tæt på
  // stemmen (et «t» efter vokalen) bliver. Er der intet længere løb, røres intet.
  function udenSpidser(aktiv) {
    const KORT = 5, AFSTAND = 20;
    const loeb = [];
    for (let k = 0; k < aktiv.length; k++) {
      if (!aktiv[k] || (k > 0 && aktiv[k - 1])) continue;
      let j = k;
      while (j < aktiv.length && aktiv[j]) j++;
      loeb.push([k, j - 1]);
    }
    const lange = loeb.filter((l) => l[1] - l[0] + 1 > KORT);
    if (!lange.length) return aktiv.slice();
    const ud = aktiv.slice();
    for (const [a, b] of loeb) {
      if (b - a + 1 > KORT) continue;
      const afstand = Math.min(...lange.map(([la, lb]) => (lb < a ? a - lb : la - b)));
      if (afstand > AFSTAND) for (let k = a; k <= b; k++) ud[k] = false;
    }
    return ud;
  }

  // Støjport: rammer uden lyd dæmpes til 10 % (-20 dB) — porten åbner 20 ms før lyden og holder 120 ms efter, så svage
  // begyndelser og endelser bliver. Forstærkningen glider lineært fra ramme til ramme (intet klik). Er lyden ikke
  // tydeligt over støjen (under 6 × støjgulvet), gøres intet: så kunne porten tage stemmen med.
  function stoejport(samples, r, n, aktiv, gulv) {
    let top = 0;
    for (const v of r) top = Math.max(top, v);
    if (top < gulv * 6) return Float32Array.from(samples);
    const FOER = 2, EFTER = 12, DYB = 0.1;
    const aaben = new Uint8Array(r.length);
    for (let k = 0; k < r.length; k++) {
      if (aktiv[k]) for (let j = Math.max(0, k - FOER); j <= Math.min(r.length - 1, k + EFTER); j++) aaben[j] = 1;
    }
    const ud = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const x = i / n - 0.5; // rammernes midtpunkter
      const k0 = Math.max(0, Math.floor(x)), k1 = Math.min(r.length - 1, k0 + 1);
      const t = Math.min(1, Math.max(0, x - k0));
      const g0 = aaben[k0] ? 1 : DYB, g1 = aaben[k1] ? 1 : DYB;
      ud[i] = samples[i] * (g0 + (g1 - g0) * t);
    }
    return ud;
  }

  // Beskær stilhed ud fra rammerne med lyd: fra 60 ms før den første til 80 ms efter den sidste
  function beskaerAktiv(samples, n, aktiv, rate) {
    rate = rate || RATE;
    const foerste = aktiv.indexOf(true), sidste = aktiv.lastIndexOf(true);
    if (foerste < 0) return new Float32Array(0);
    const a = Math.max(0, foerste * n - Math.round(0.06 * rate));
    const b = Math.min(samples.length, (sidste + 1) * n + Math.round(0.08 * rate));
    return samples.slice(a, b);
  }

  // Begrænser: hver prøve ganges med den mindste dæmpning, der skal til inden for ±5 ms, glattet med et glidende
  // gennemsnit over samme vindue. Så kommer ingen prøve over loftet, og dæmpningen ændrer sig blødt.
  function begraens(samples, loft, rate) {
    const n = samples.length, W = Math.max(1, Math.round(0.005 * (rate || RATE)));
    const g = new Float32Array(n);
    let over = false;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(samples[i]);
      g[i] = a > loft ? loft / a : 1;
      if (a > loft) over = true;
    }
    if (!over) return Float32Array.from(samples);
    // Glidende minimum over [i - W, i + W] med en monoton kø
    const m = new Float32Array(n), koe = new Int32Array(n);
    let h0 = 0, h1 = 0;
    for (let i = 0, j = 0; i < n; i++) {
      for (; j < n && j <= i + W; j++) {
        while (h1 > h0 && g[koe[h1 - 1]] >= g[j]) h1--;
        koe[h1++] = j;
      }
      while (koe[h0] < i - W) h0++;
      m[i] = g[koe[h0]];
    }
    const sum = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) sum[i + 1] = sum[i] + m[i];
    const ud = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - W), b = Math.min(n, i + W + 1);
      ud[i] = samples[i] * ((sum[b] - sum[a]) / (b - a));
    }
    return ud;
  }

  // Fast lydstyrke: lydens RMS (kun rammerne med lyd) bliver `maal` (0,15 ≈ -16,5 dBFS), så stille og høje optagelser
  // lyder lige kraftigt. Højst × 40. Spidser over loftet (0,9) tages af begrænseren, der højst må dæmpe 6 dB — kræver en
  // spids mere, sænkes det hele i stedet. Intet klipper.
  function normaliserLydstyrke(samples, lydRms, maal, loft) {
    maal = maal || 0.15;
    loft = loft || 0.9;
    let top = 0;
    for (let i = 0; i < samples.length; i++) top = Math.max(top, Math.abs(samples[i]));
    if (top < 1e-6 || !(lydRms > 0)) return Float32Array.from(samples);
    const k = Math.min(maal / lydRms, 40, 2 * loft / top);
    return begraens(Float32Array.from(samples, (v) => v * k), loft, RATE);
  }

  // Korte fades ind og ud (10 ms), så klippet hverken starter eller slutter med et klik
  function fade(samples, rate, sek) {
    const ud = Float32Array.from(samples);
    const n = Math.min(Math.round((sek || 0.01) * (rate || RATE)), Math.floor(ud.length / 2));
    for (let i = 0; i < n; i++) {
      const g = i / n;
      ud[i] *= g;
      ud[ud.length - 1 - i] *= g;
    }
    return ud;
  }

  // Hele vejen: kanaler fra WebAudio (AudioBuffer) → færdig WAV. Returnerer null, hvis der kun var stilhed (eller jævn
  // støj uden en stemme). mono → 22,05 kHz → højpas → støjgulv → rammer med lyd (uden spidser) → støjport → beskær →
  // fast lydstyrke → fades.
  function behandl(kanaler, rate) {
    let s = tilMono(kanaler);
    s = nySamplerate(s, rate, RATE);
    s = hoejpas(s, RATE);
    const m = rammeRms(s, RATE);
    const gulv = stoejgulv(m.r);
    const aktiv = udenSpidser(aktiveRammer(m.r, gulv));
    if (aktiv.indexOf(true) < 0) return null;
    let e = 0, antal = 0;
    for (let k = 0; k < m.r.length; k++) if (aktiv[k]) { e += m.r[k] * m.r[k]; antal++; }
    s = stoejport(s, m.r, m.n, aktiv, gulv);
    s = beskaerAktiv(s, m.n, aktiv, RATE);
    s = normaliserLydstyrke(s, Math.sqrt(e / antal));
    s = fade(s, RATE);
    return { wav: lavWav(s, RATE), sek: s.length / RATE };
  }

  // Barnets navn, sagt af barnet selv eller en voksen (12-10-2026): klippet ligger KUN på enheden (IndexedDB). Det
  // kommer aldrig i lyd/, på sw.js' liste eller i eksportfilen — repoet er offentligt. «navn-» er bogstavernes navne.
  const NAVNEKLIP = 'egetnavn-';
  const navnKlipId = (barnId) => NAVNEKLIP + String(barnId);
  const erNavnKlip = (id) => typeof id === 'string' && id.indexOf(NAVNEKLIP) === 0;

  // Eksportfilen fra 🎙️ Indtal: { version: 1, klip: { id: base64WAV } }. Kun gyldige id'er og WAV'er — aldrig navneklip.
  const GYLDIGT_ID = /^[a-z][a-z0-9-]{0,40}$/;
  function lavEksport(klip) {
    const ud = { version: 1, klip: {} };
    for (const id of Object.keys(klip || {}).sort()) if (GYLDIGT_ID.test(id) && !erNavnKlip(id) && klip[id] && klip[id].length) ud.klip[id] = tilBase64(klip[id]);
    return ud;
  }
  function laesEksport(obj) {
    const ud = {};
    if (!obj || typeof obj !== 'object' || obj.version !== 1 || !obj.klip || typeof obj.klip !== 'object') return ud;
    for (const id of Object.keys(obj.klip)) {
      if (!GYLDIGT_ID.test(id) || erNavnKlip(id) || typeof obj.klip[id] !== 'string') continue;
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

  const Lydklip = { RATE, danskeStemmer, vaelgStemme, tilMono, nySamplerate, beskaerStilhed, normaliser, hoejpas, rammeRms, stoejgulv, aktiveRammer, udenSpidser, stoejport, beskaerAktiv, begraens, normaliserLydstyrke, fade, lavWav, laesWav, tilBase64, fraBase64, behandl, lavEksport, laesEksport, GYLDIGT_ID, navnKlipId, erNavnKlip };
  if (typeof module !== 'undefined' && module.exports) module.exports = Lydklip;
  else root.Lydklip = Lydklip;
})(typeof self !== 'undefined' ? self : this);
