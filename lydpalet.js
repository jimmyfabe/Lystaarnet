/* lydpalet.js — Lystårnets lydeffekter (fase B1): otte bløde sinustoner, bygget med Web Audio.
   Ingen lydfiler, ingen netkald, ingen afhængigheder. Tonerne og varighederne er fra B1 i
   docs/LYSTAARNET-FORSLAG-D-A-B-C.md (ChatGPT-forslaget); koden er tilpasset spillet:
   - Én fælles AudioContext. app.js giver sin egen via `aabnKontekst` (Lyd.init + Lyd.ctx: den tomme lyd i trykket er
     spillets iOS-løsning, og klippene afspilles allerede på samme kontekst). Uden den laver paletten sin egen på samme måde.
   - De voksnes «Lydeffekter» (voksen.lyd) læses ved hvert kald via `lydTil`, så paletten aldrig kommer ud af trit med den.
   - Fejlstop: kommer `ended` ikke (fx en falsk AudioContext i e2e eller en WebKit-fejl), frakobles tonerne lidt efter
     den planlagte slutning, og løftet afsluttes med { status: 'stopped', reason: 'fejlstop' }. Så er effekten med sikkerhed tavs.
   API (instans fra lav()): unlock(), stop(), pause(), resume(), setVolume(0–1), setMuted(bool), getSettings(), getState(),
   onInterrupted(fn), play(navn), vilSpille(navn) og én funktion pr. effekt (tryk(), rigtig(), …). Effekterne giver altid et løfte:
   { status: 'played' | 'skipped' | 'stopped', reason }. Ingen kø — der spiller højst én effekt. Prioritet: en ny effekt
   afløser en, der spiller, hvis den er vigtigere (tryk < rigtig < fejring), eller hvis begge er korte tryk/svar (det nyeste
   tryk eller boblen høres; den gamle giver 'stopped'/'afloest'). Ellers springes den nye over ('busy') — fx 50 fejringer.
   I browseren er window.Lydpalet modulet (lav, NOTER, NAVNE, GRAENSER, PRIORITET, varighed); app.js laver én instans.
   Testes i Node af test/test-lydpalet.js (simuleret AudioContext). Kobling ind i spillet: docs/LYD-INTEGRATION.md. */
(function (root) {
  'use strict';

  // [start (s), frekvens (Hz), længde (s), evt. slutfrekvens (Hz)] — fra B1, uændret
  const NOTER = {
    tryk: [[0, 330, 0.11, 280]],
    rigtig: [[0, 330, 0.17], [0.19, 440, 0.23]],
    forkertBlid: [[0, 294, 0.27, 262]],
    fodspor: [[0, 150, 0.10, 115], [0.18, 165, 0.11, 125]],
    boblePop: [[0, 370, 0.14, 220]],
    niveauOp: [[0, 262, 0.16], [0.18, 330, 0.16], [0.36, 392, 0.27]],
    pauseStart: [[0, 330, 0.23], [0.26, 262, 0.32]],
    fejring: [[0, 262, 0.23], [0.27, 330, 0.23], [0.54, 392, 0.25], [0.85, 330, 0.23], [1.12, 440, 0.43]],
  };
  // Planlagt varighed inkl. slutning (B1-tabellen). test/test-lydpalet.js holder tonerne inden for dem.
  const GRAENSER = { tryk: 0.126, rigtig: 0.436, forkertBlid: 0.286, fodspor: 0.306, boblePop: 0.156, niveauOp: 0.646, pauseStart: 0.596, fejring: 1.566 };
  const NAVNE = Object.freeze(Object.keys(NOTER));
  // 0: tryk og bobler · 1: svar og fodspor · 2: lange (niveau, pause, fejring). En ny effekt afløser en på et lavere
  // niveau, eller en på samme niveau, når niveauet er 0 eller 1 (tryk lige før ✔, to bobler/svar hurtigt efter hinanden).
  // En lang effekt afløses aldrig af en anden lang — 50 fejringer giver én.
  const PRIORITET = { tryk: 0, boblePop: 0, fodspor: 1, rigtig: 1, forkertBlid: 1, niveauOp: 2, pauseStart: 2, fejring: 2 };
  const kanAfloese = (gammel, ny) => PRIORITET[ny] > PRIORITET[gammel] || (PRIORITET[ny] === PRIORITET[gammel] && PRIORITET[ny] < 2);

  const FORSINKELSE = 0.008;   // s: første tone starter lidt efter «nu», så planlægningen ikke kommer for sent
  const HALE = 0.008;          // s: oscillatoren stoppes lidt efter, at kurven er nede på 0
  const TOP = 0.22;            // kurvens top før mastergain (med 55 % ca. 0,12 i alt — som spillets gamle toner)
  const STANDARD_VOLUMEN = 0.55;
  const UNLOCK_MAKS_MS = 1000; // så længe venter unlock() på, at lyden er låst op
  const FEJLSTOP_MARGEN_MS = 1000;

  // Hele effektens længde fra kaldet til den sidste tone er stoppet (s)
  function varighed(navn) {
    let slut = 0;
    for (const [start, , laengde] of NOTER[navn] || []) slut = Math.max(slut, start + laengde);
    return FORSINKELSE + slut + HALE;
  }

  function lav(valg) {
    valg = valg || {};
    const vindue = valg.vindue || root;
    const doc = vindue.document || null;
    const lydTil = typeof valg.lydTil === 'function' ? valg.lydTil : () => true;
    const aabnKontekst = typeof valg.aabnKontekst === 'function' ? valg.aabnKontekst : null;

    let ctx = null;          // den AudioContext, paletten spiller på
    let master = null;       // fælles mastergain på ctx
    let sidsteTilstand = ''; // ctx.state, sidst vi så den (til statechange)
    let aktiv = null;        // den effekt, der spiller nu (højst én)
    let volumen = STANDARD_VOLUMEN;
    let lydloes = false;
    let pauset = false;
    const venter = new Set();        // ventende unlock-forsøg
    let ventende = null;             // løftet fra det nyeste unlock, mens det venter (første tryk efter start/afbrydelse)
    const afbrydLyttere = new Set(); // onInterrupted

    const skjult = () => !!(doc && doc.hidden);
    const resultat = (status, aarsag) => ({ status: status, reason: aarsag || '' });
    const sprunget = (aarsag) => Promise.resolve(resultat('skipped', aarsag));
    const timer = (fn, ms) => vindue.setTimeout(fn, ms);
    const fjernTimer = (id) => { if (id !== null && id !== undefined) vindue.clearTimeout(id); };

    function frakobl(job) {
      for (const n of job.noder) {
        n.oscillator.onended = null;
        try { n.oscillator.stop(); } catch (e) { /* allerede stoppet */ }
        try { n.oscillator.disconnect(); } catch (e) { /* allerede frakoblet */ }
        try { n.kurve.disconnect(); } catch (e) { /* allerede frakoblet */ }
      }
      job.noder.length = 0;
    }

    // Afslut den aktive effekt (kun den — et gammelt job kan aldrig afslutte et nyt)
    function afslut(job, status, aarsag) {
      if (aktiv === job) aktiv = null;
      fjernTimer(job.fejlstop);
      frakobl(job);
      job.resolve(resultat(status, aarsag));
    }

    // Stop alt: den aktive effekt og ventende unlock-forsøg (de afgøres med false her og nu, så de aldrig starter lyd senere)
    function annuller(aarsag) {
      for (const afgoer of Array.from(venter)) afgoer(false);
      if (aktiv) afslut(aktiv, 'stopped', aarsag);
    }

    function saetMaster() {
      if (!master || !ctx || ctx.state === 'closed') return;
      try {
        const nu = ctx.currentTime;
        master.gain.cancelScheduledValues(nu);
        master.gain.setTargetAtTime(lydloes ? 0 : volumen, nu, 0.015);
      } catch (e) { /* lyd er pynt */ }
    }

    // Egen kontekst (kun uden aabnKontekst): samme iOS-greb som Lyd.init — en tom lyd i selve trykket
    function egenKontekst() {
      if (ctx && ctx.state !== 'closed') return ctx;
      const AC = vindue.AudioContext || vindue.webkitAudioContext;
      if (!AC) return null;
      const c = new AC();
      try {
        const b = c.createBuffer(1, 1, 22050);
        const s = c.createBufferSource();
        s.buffer = b; s.connect(c.destination); s.start(0);
      } catch (e) { /* resume() herunder er nok i nyere Safari */ }
      return c;
    }

    // Ny kontekst: mastergain og lytter. Går konteksten ud af 'running' (iOS: 'interrupted', låst skærm), stoppes
    // effekten, og onInterrupted-lytterne får besked — kun herfra, så stop() aldrig udløser en afbrydelse (ingen rekursion).
    function tilknyt(c) {
      ctx = c;
      master = c.createGain();
      master.gain.value = lydloes ? 0 : volumen;
      master.connect(c.destination);
      sidsteTilstand = c.state;
      const vedSkift = () => {
        if (ctx !== c) return;
        const foer = sidsteTilstand;
        sidsteTilstand = c.state;
        if (c.state === 'running') return;
        annuller('context-' + c.state);
        if (foer !== 'running') return;
        for (const fn of Array.from(afbrydLyttere)) { try { fn(c.state); } catch (e) { /* en lytter må ikke stoppe de andre */ } }
      };
      if (typeof c.addEventListener === 'function') c.addEventListener('statechange', vedSkift);
      else c.onstatechange = vedSkift;
    }

    // Kald DIREKTE i brugerens tryk (click/pointerup), før første await. Giver true, når lyden er låst op,
    // og false efter højst 1 s, ved stop, pause eller skjult side.
    function unlock() {
      if (skjult() || pauset) return Promise.resolve(false);
      try {
        const c = aabnKontekst ? aabnKontekst() : egenKontekst();
        if (!c) return Promise.resolve(false);
        if (c !== ctx) tilknyt(c);
        let vaekket;
        if (c.state === 'running') vaekket = Promise.resolve();
        else {
          const p = c.resume(); // synkront under trykket — også i Safari
          vaekket = p && typeof p.then === 'function' ? p : Promise.resolve();
        }
        const loefte = new Promise((resolve) => {
          let afgjort = false;
          let id = null;
          const afgoer = (v) => {
            if (afgjort) return;
            afgjort = true;
            fjernTimer(id);
            venter.delete(afgoer);
            if (ventende === loefte) ventende = null;
            resolve(v);
          };
          venter.add(afgoer);
          id = timer(() => afgoer(false), UNLOCK_MAKS_MS);
          vaekket.then(() => afgoer(ctx === c && c.state === 'running' && !pauset && !skjult()), () => afgoer(false));
        });
        ventende = loefte;
        return loefte;
      } catch (e) {
        return Promise.resolve(false);
      }
    }

    // Ville play(navn) spille nu (eller når et ventende unlock lykkes)? Ændrer intet — til det, der skal ske samtidig
    // med lyden (fx ring og hånd i fejringen, der kommer med stemmen efter lyden).
    function vilSpille(navn) {
      if (!Object.prototype.hasOwnProperty.call(NOTER, navn)) return false;
      if (skjult() || pauset || lydloes || volumen === 0 || lydTil() === false) return false;
      if (!ctx || !master || ctx.state !== 'running') return !!ventende;
      return !aktiv || kanAfloese(aktiv.navn, navn);
    }

    function play(navn) {
      if (!Object.prototype.hasOwnProperty.call(NOTER, navn)) throw new TypeError('Ukendt lydeffekt: ' + navn);
      if (skjult()) return sprunget('hidden');
      if (pauset) return sprunget('paused');
      if (lydloes || volumen === 0 || lydTil() === false) return sprunget('muted');
      if (!ctx || !master || ctx.state !== 'running') {
        // Første tryk efter start eller en iOS-afbrydelse: unlock() er kaldt i samme tryk (Lyd.init), men resume() er ikke
        // færdig endnu. Så spilles effekten, når lyden er låst op — eller springes over, hvis unlock giver op eller stoppes.
        if (ventende) return ventende.then((ok) => (ok ? play(navn) : resultat('skipped', 'locked')));
        return sprunget('locked');
      }
      if (aktiv) {
        if (!kanAfloese(aktiv.navn, navn)) return sprunget('busy'); // ingen kø, heller ikke ved 50 tryk
        afslut(aktiv, 'stopped', 'afloest');
      }

      return new Promise((resolve) => {
        const noter = NOTER[navn];
        const job = { navn: navn, noder: [], tilbage: noter.length, resolve: resolve, fejlstop: null };
        aktiv = job;
        try {
          const start = ctx.currentTime + FORSINKELSE;
          for (const [forskyd, frekvens, laengde, slutFrekvens] of noter) {
            const oscillator = ctx.createOscillator();
            const kurve = ctx.createGain();
            job.noder.push({ oscillator: oscillator, kurve: kurve });
            const fra = start + forskyd;
            const til = fra + laengde;
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frekvens, fra);
            if (slutFrekvens) oscillator.frequency.exponentialRampToValueAtTime(slutFrekvens, til);
            // Blød start og hale — ingen rumklang, der klinger efter ended
            kurve.gain.setValueAtTime(0, fra);
            kurve.gain.linearRampToValueAtTime(TOP, fra + 0.018);
            kurve.gain.exponentialRampToValueAtTime(0.001, til - 0.012);
            kurve.gain.linearRampToValueAtTime(0, til);
            oscillator.connect(kurve);
            kurve.connect(master);
            oscillator.onended = () => {
              if (aktiv !== job) return; // et gammelt job må ikke afslutte et nyt
              job.tilbage -= 1;
              if (job.tilbage === 0) afslut(job, 'played');
            };
            oscillator.start(fra);
            oscillator.stop(til + HALE);
          }
          job.fejlstop = timer(() => { if (aktiv === job) afslut(job, 'stopped', 'fejlstop'); }, Math.round(varighed(navn) * 1000) + FEJLSTOP_MARGEN_MS);
        } catch (e) {
          if (aktiv === job) afslut(job, 'stopped', 'audio-error');
        }
      });
    }

    if (doc && typeof doc.addEventListener === 'function') doc.addEventListener('visibilitychange', () => { if (doc.hidden) annuller('hidden'); });
    if (typeof vindue.addEventListener === 'function') vindue.addEventListener('pagehide', () => annuller('pagehide'));

    const api = {
      NAVNE: NAVNE,
      unlock: unlock,
      play: play,
      vilSpille: vilSpille,
      stop() { annuller('stop'); },
      pause() { pauset = true; annuller('paused'); },
      resume() { pauset = false; return unlock(); }, // kaldes direkte i et nyt tryk (fx Fortsæt)
      setVolume(v) {
        if (typeof v !== 'number' || !Number.isFinite(v)) throw new TypeError('Lydstyrke skal være et tal fra 0 til 1.');
        volumen = Math.max(0, Math.min(1, v));
        if (volumen === 0) annuller('muted');
        saetMaster();
      },
      setMuted(v) {
        if (typeof v !== 'boolean') throw new TypeError('Lydløs skal være true eller false.');
        lydloes = v;
        if (lydloes) annuller('muted');
        saetMaster();
      },
      // De voksnes «Lydeffekter» fra (lydTil) tæller som lydløs
      getSettings: () => ({ volume: volumen, muted: lydloes || lydTil() === false }),
      getState: () => ({ state: ctx ? ctx.state : 'locked', busy: !!aktiv, paused: pauset }), // til fejlsøgning, ikke barnets skærm
      onInterrupted(fn) {
        if (typeof fn !== 'function') throw new TypeError('onInterrupted kræver en funktion.');
        afbrydLyttere.add(fn);
        return () => afbrydLyttere.delete(fn);
      },
    };
    for (const navn of NAVNE) api[navn] = () => play(navn);
    return Object.freeze(api);
  }

  const Lydpalet = Object.freeze({ lav: lav, NOTER: NOTER, NAVNE: NAVNE, GRAENSER: GRAENSER, PRIORITET: PRIORITET, varighed: varighed });
  if (typeof module !== 'undefined' && module.exports) module.exports = Lydpalet;
  else root.Lydpalet = Lydpalet;
})(typeof self !== 'undefined' ? self : this);
