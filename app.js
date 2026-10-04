/* app.js — al logik til Matematikspillet («Lystårnet»).
   Skallerne (index.html, dino.html, enhjorning.html, voksen.html) sætter kun farver og window.TEMA.
   Opgaver og facit kommer fra opgaver.js, gem/indlæs fra gem.js. */
(function () {
  'use strict';

  const T = window.TEMA || { side: 'index' };
  const O = window.Opgaver;
  const G = window.Gem;

  // ---------- Fælles indhold ----------
  // Rejsevenner. Skallerne vælger hvilke fire, der vises (TEMA.figurer).
  const FIGURER = {
    bobo:  { e: '🦕', navn: 'Bobo' },
    rex:   { e: '🦖', navn: 'Rex' },
    luna:  { e: '🦄', navn: 'Luna' },
    rosa:  { e: '👸', navn: 'Rosa' },
    gnist: { e: '🐉', navn: 'Gnist' },
    rap:   { e: '🦊', navn: 'Rap' },
  };

  // Verdenerne på kortet i samme rækkefølge som skolens bog (se docs/INSPIRATION.md).
  // De første ÅBNE_FRA_START er åbne; resten åbner, når verdenen før er mestret.
  const VERDENER = [
    { id: 'taelle', e: '🌲', navn: 'Tælleskoven', emne: 'taelle', tale: 'Tælleskoven. Her tæller vi til 20.' },
    { id: 'former', e: '🔺', navn: 'Formbyen', emne: 'former', tale: 'Formbyen. Cirkler, trekanter og firkanter.' },
    { id: 'plus10', e: '⛰️', navn: 'Plusbjerget', emne: 'plus10', tale: 'Plusbjerget. Her lægger vi sammen.' },
    { id: 'venner', e: '🏝️', navn: 'Venneøen', emne: 'venner', tale: "Venneøen. 5'er-venner og 10'er-venner." },
    { id: 'minus', e: '🌊', navn: 'Minussøen', emne: 'minus', tale: 'Minussøen. Vi tager væk og finder forskellen.' },
    { id: 'tiere', e: '🏗️', navn: 'Klodsbyen', emne: 'tiere', tale: 'Klodsbyen. Tiere og enere.' },
    { id: 'tierbro', e: '🌉', navn: 'Tierbroen', emne: 'tierbro', tale: 'Tierbroen. Plus og minus til 20.' },
    { id: 'moenstre', e: '🏰', navn: 'Mønsterslottet', emne: 'moenstre', tale: 'Mønsterslottet. Mønstre og talrækker.' },
    { id: 'torvet', e: '🕰️', navn: 'Klokketorvet', emne: 'maaling', tale: 'Klokketorvet. Klokken og penge.' },
    { id: 'taarn', e: '🗼', svg: true, navn: 'Lystårnet', emne: 'taarn', blandet: true, tale: 'Lystårnet. Det hele blandet.' },
  ];
  const AABNE_FRA_START = 4;

  // Skolens ord bruges i oplæsningen (tælle videre, tage væk, forskel, 10'er-venner …)
  const HJAELP_TALE = {
    tael: 'Lad os tælle sammen.',
    tallinje: 'Lad os hoppe på tallinjen.',
    fingre: 'Lad os tælle på fingrene.',
    fingreMangler: 'Lad os tælle videre på fingrene.',
    kugle: 'Lad os kigge under bladet.',
    talstreg: 'Lad os tælle hen ad talslangen.',
    visTal: 'Se her.',
    sammenlign: 'Lad os bygge et tårn for hvert tal.',
    tilbage: 'Lad os tælle dem, der er tilbage.',
    klodserVaek: 'Lad os tage klodserne væk én ad gangen.',
    klodserPlus: 'Lad os tælle videre med klodser.',
    tiFoerst: 'Lad os fylde 10-stangen først.',
    forskel: 'Lad os se, hvor mange flere der er.',
    parvis: 'Lad os sætte dem sammen to og to.',
    par: 'Lad os stille klodserne to og to.',
    raekke: 'Lad os tælle sammen.',
    staenger: 'Lad os tælle stængerne. Hver stang er 10.',
    visForm: 'Se her.',
    hjoerner: 'Lad os tælle hjørnerne.',
    kanter: 'Lad os tælle kanterne.',
    moenster: 'Lad os sige mønstret højt.',
    urVisere: 'Lad os kigge på viserne.',
    visUr: 'Se her.',
    moenter: 'Lad os tælle kronerne. Vi starter med den største mønt.',
  };

  // Figurer i Formbyen som SVG (egen grafik). Hjørnerne får små prikker, som hjælpen kan tælle.
  const FORM_PUNKTER = (() => {
    const polygon = (n, r, start) => Array.from({ length: n }, (_, i) => {
      const a = start + i * 2 * Math.PI / n;
      return [50 + r * Math.cos(a), 52 + r * Math.sin(a)];
    });
    return {
      trekant: [[50, 8], [93, 88], [7, 88]],
      firkant: [[12, 20], [84, 8], [92, 86], [16, 90]], // en firkant er ikke altid et kvadrat
      kvadrat: [[12, 12], [88, 12], [88, 88], [12, 88]],
      rektangel: [[2, 26], [98, 26], [98, 78], [2, 78]],
      femkant: polygon(5, 46, -Math.PI / 2),
      sekskant: polygon(6, 46, -Math.PI / 2),
    };
  })();
  function formSvg(form, farve, drej, medHjoerner) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '-4 -4 108 108');
    svg.setAttribute('class', 'form-svg form-farve-' + ((farve || 0) % 6));
    svg.setAttribute('aria-hidden', 'true');
    const g = document.createElementNS(ns, 'g');
    if (drej) g.setAttribute('transform', 'rotate(' + drej + ' 50 50)');
    let figur;
    if (form === 'cirkel') {
      figur = document.createElementNS(ns, 'circle');
      figur.setAttribute('cx', 50); figur.setAttribute('cy', 50); figur.setAttribute('r', 44);
    } else {
      figur = document.createElementNS(ns, 'polygon');
      figur.setAttribute('points', FORM_PUNKTER[form].map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
    }
    figur.setAttribute('class', 'form-figur');
    g.append(figur);
    if (medHjoerner && FORM_PUNKTER[form]) {
      // Kanterne som streger (til «tæl kanterne») og hjørnerne som prikker
      const pk = FORM_PUNKTER[form];
      pk.forEach((p, i) => {
        const q = pk[(i + 1) % pk.length];
        const l = document.createElementNS(ns, 'line');
        l.setAttribute('x1', p[0]); l.setAttribute('y1', p[1]); l.setAttribute('x2', q[0]); l.setAttribute('y2', q[1]);
        l.setAttribute('class', 'kant');
        g.append(l);
      });
      FORM_PUNKTER[form].forEach((p) => {
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', 7);
        c.setAttribute('class', 'hjoerne taelbar');
        g.append(c);
      });
    }
    svg.append(g);
    return svg;
  }

  // Lystårnet tegnet som inline SVG (egen grafik)
  const FYRTAARN = '<svg viewBox="0 0 100 120" aria-hidden="true"><path d="M50 30 L6 14 L6 46 Z M50 30 L94 14 L94 46 Z" fill="#ffe680" opacity=".75"/>' +
    '<path d="M36 112 L40 40 L60 40 L64 112 Z" fill="#fffdf8" stroke="#4a2f1c" stroke-width="2"/>' +
    '<path d="M38.4 84 L61.6 84 L62.4 98 L37.6 98 Z M39.6 58 L60.4 58 L61 70 L39 70 Z" fill="#e5484d"/>' +
    '<rect x="38" y="26" width="24" height="14" rx="3" fill="#ffc83d" stroke="#4a2f1c" stroke-width="2"/>' +
    '<path d="M35 27 L50 12 L65 27 Z" fill="#e5484d" stroke="#4a2f1c" stroke-width="2"/>' +
    '<rect x="26" y="110" width="48" height="8" rx="4" fill="#4a2f1c" opacity=".5"/></svg>';
  function fyrtaarn(klasse) {
    const n = document.createElement('span');
    n.className = 'fyrtaarn ' + (klasse || '');
    n.innerHTML = FYRTAARN;
    return n;
  }

  // ---------- Små hjælpere ----------
  function h(tag, props) {
    const n = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style') n.style.cssText = v;
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) tilfoejBoern(n, arguments[i]);
    return n;
  }
  function tilfoejBoern(n, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach((x) => tilfoejBoern(n, x)); return; }
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  // ?hurtig i adressen afspiller hjælpen hurtigere (bruges kun af test/test-e2e.js)
  const TEMPO = /[?&]hurtig/.test(location.search) ? 0.12 : 1;
  // Mens hjælpens indledning siges (Tale.foerst), starter ventetiden først, når den er sagt færdig
  const vent = (ms) => {
    const tid = () => new Promise((r) => setTimeout(r, ms * TEMPO));
    return Tale.foerst ? Tale.foerst.then(tid) : tid();
  };

  // ---------- Lager ----------
  let lager;
  let lagerIHukommelse = false; // localStorage kan ikke bruges (blokerede websitedata): intet gemmes
  let lagerFuldt = false;       // localStorage kan læses, men ikke skrives (fuldt, eller privat browsing på ældre iOS)
  try {
    lager = window.localStorage;
    lager.getItem('mat_test'); // kaster, hvis adgang er spærret
  } catch (e) {
    lager = G.hukommelsesLager();
    lagerIHukommelse = true;
  }
  if (!lagerIHukommelse) {
    // Et fuldt lager må IKKE skifte til et tomt hukommelseslager — så ville pigernes data se ud til at være væk,
    // og «Gem en kopi» ville gemme en tom fil. Vi bliver på localStorage, kan læse alt og advarer om, at der ikke gemmes.
    try { lager.setItem('mat_test', '1'); lager.removeItem('mat_test'); } catch (e) { lagerFuldt = true; }
  }
  // Data under de gamle nøgler kopieres til de nye (den gamle nøgle bliver liggende som backup) — på alle sider
  G.migrerNoegler(lager);
  let voksenRes = G.indlaesVoksen(lager);
  const voksen = voksenRes.data;

  // ---------- Lyd (WebAudio — ingen lydfiler) ----------
  const Lyd = {
    ctx: null,
    init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        if (!this.ctx) {
          this.ctx = new AC();
          // iOS: en tom lyd i selve trykket låser lyden op
          const b = this.ctx.createBuffer(1, 1, 22050);
          const s = this.ctx.createBufferSource();
          s.buffer = b; s.connect(this.ctx.destination); s.start(0);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { this.ctx = null; }
    },
    tone(f, start, dur, type, vol, slutF) {
      const c = this.ctx;
      if (!c || !voksen.lyd) return;
      try {
        const t = c.currentTime + (start || 0);
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f, t);
        if (slutF) o.frequency.exponentialRampToValueAtTime(slutF, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + dur + 0.03);
      } catch (e) { /* lyd er pynt — spillet virker uden */ }
    },
    tryk() { this.tone(560, 0, 0.06, 'sine', 0.07); },
    rigtig() { [660, 880, 1320].forEach((f, i) => this.tone(f, i * 0.07, 0.18, 'triangle', 0.17)); },
    blid() { this.tone(440, 0, 0.18, 'sine', 0.1); this.tone(370, 0.15, 0.28, 'sine', 0.09); },
    tael() { if (!Tale.foerst) this.tone(780, 0, 0.07, 'sine', 0.07); }, // ikke oven i den blide lyd og hjælpens indledning
    fejring() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i * 0.1, 0.24, 'triangle', 0.15)); },
    pling() { this.tone(1568, 0, 0.5, 'sine', 0.13); this.tone(2093, 0.09, 0.6, 'sine', 0.09); this.tone(2637, 0.18, 0.7, 'sine', 0.06); },
    knaek() { this.tone(240, 0, 0.09, 'square', 0.05, 140); this.tone(180, 0.1, 0.09, 'square', 0.05, 110); },
    hop() { this.tone(260, 0, 0.22, 'sine', 0.13, 720); },
  };

  // ---------- Oplæsning (speechSynthesis, dansk) ----------
  const Tale = {
    stemme: null,
    udenDansk: false,
    foerst: null,  // løfte, mens hjælpens indledning siges (sigFoerst)
    gen: 0,        // tælles op ved stop(), så ventende sætninger ikke siges på en ny skærm
    findes: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    init() {
      if (!this.findes) return;
      const vaelgStemme = () => {
        const alle = window.speechSynthesis.getVoices() || [];
        const da = alle.filter((v) => /^da([-_]|$)/i.test(v.lang || ''));
        // foretræk en lokal stemme (virker offline), ellers den første danske
        this.stemme = da.find((v) => v.localService) || da[0] || null;
        // Ingen dansk stemme: «hør og find» kan ikke bruges (iOS ville læse op på et andet sprog). En tom liste
        // (stemmerne er ikke hentet endnu) tæller også som «ingen dansk» — hellere springe de opgaver over.
        this.udenDansk = !this.stemme;
      };
      this.opdaterStemmer = vaelgStemme;
      vaelgStemme();
      if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', vaelgStemme);
      else window.speechSynthesis.onvoiceschanged = vaelgStemme;
    },
    sig(tekst, efter) {
      // Hjælpens indledning er i gang: denne sætning venter, til den er sagt færdig (se sigFoerst)
      const f = this.foerst;
      if (f) {
        const g = this.gen;
        f.then(() => { if (g === this.gen) this.sig(tekst, efter); else if (efter) efter(); });
        return;
      }
      let faerdig = false;
      const slut = () => { if (!faerdig) { faerdig = true; if (efter) efter(); } };
      if (!this.findes || !voksen.tale || !tekst) { if (efter) setTimeout(slut, 0); return; }
      try {
        const s = window.speechSynthesis;
        const travl = s.speaking || s.pending;
        if (travl) s.cancel();
        if (s.paused) s.resume();
        const u = new SpeechSynthesisUtterance(tekst);
        this.aktuel = u; // holdes fast, ellers kan Chrome glemme onend
        u.lang = 'da-DK';
        if (this.stemme) u.voice = this.stemme;
        u.rate = 0.92;
        u.pitch = 1.08;
        if (efter) {
          u.onend = slut; u.onerror = slut;
          setTimeout(slut, (1200 + tekst.length * 85) * TEMPO); // hvis onend aldrig kommer
        }
        // Safari taber nogle gange en sætning, der startes lige efter cancel()
        if (travl) setTimeout(() => { if (this.aktuel === u) s.speak(u); }, 60);
        else s.speak(u);
      } catch (e) { if (efter) setTimeout(slut, 0); }
    },
    // Sig noget og vent, til det er sagt (så næste sætning ikke skærer det over)
    sigVent(tekst) {
      return new Promise((r) => this.sig(tekst, r));
    },
    // Hjælpens indledning («Lad os tælle sammen.»), sagt efter `forsinkelse` ms. Indtil den er sagt
    // færdig, venter andre sætninger og vent() på den — så animationen kan vise sit første trin med
    // det samme, uden at dens tal skærer indledningen over.
    sigFoerst(tekst, forsinkelse) {
      let slip;
      let sagt = false;
      const f = new Promise((r) => { slip = r; });
      this.foerst = f;
      const faerdig = () => { sagt = true; if (this.foerst === f) this.foerst = null; slip(); };
      setTimeout(() => {
        if (this.foerst !== f) { slip(); return; } // stoppet imens (skærmskift)
        this.foerst = null; // kun indledningen selv slipper forbi
        this.sig(tekst, faerdig);
        if (!sagt && this.foerst === null) this.foerst = f;
      }, forsinkelse || 0);
      return f;
    },
    stop() {
      this.gen++;
      this.foerst = null;
      if (!this.findes) return;
      this.aktuel = null; // så en sætning, der venter på at blive startet (60 ms efter cancel), ikke starter alligevel
      try { window.speechSynthesis.cancel(); } catch (e) { /* ingenting */ }
    },
  };

  // ---------- Tilstand ----------
  const S = {
    token: 0,          // tælles op ved hvert skærmskift, så gamle animationer stopper
    taster: null,      // tastatur-håndtering for den aktuelle skærm
    gentagTale: '',    // det 🔊-knappen læser op
    runde: null,
  };

  let data = null;     // barnets data
  let skrivebeskyttet = false; // sættes, hvis gemte data ikke kunne læses og ikke kunne kopieres
  let indlaesAdvarsel = null;  // forklaringen fra gem.js, når data ikke kunne læses
  let gemFejlet = false;       // sidste forsøg på at gemme mislykkedes (fx fuldt lager)
  const app = () => document.getElementById('app');

  function gem() {
    // Skrivebeskyttet: gemte data kunne ikke læses, og der var ikke plads til en kopi — rør dem ikke
    if (!T.noegle || !data || skrivebeskyttet) return;
    gemFejlet = !G.gemBarn(lager, T.noegle, data);
  }

  // Voksendata gemmes kun, hvis de ikke er skrivebeskyttede (ulæselige og uden plads til en kopi)
  function gemVoksen() {
    if (voksenRes.skrivebeskyttet) return false;
    return G.gemVoksen(lager, voksen);
  }

  // Besked til en voksen, når spillet ikke kan gemme — barnet ser kun ⚠️ (og hører «Hent en voksen»)
  function lagerAdvarsel() {
    if (lagerIHukommelse) return 'Spillet kan ikke gemme på denne enhed (fx privat browsing eller blokerede websitedata). Fremskridtet forsvinder, når siden lukkes.';
    if (skrivebeskyttet) return indlaesAdvarsel || 'Gemte data kunne ikke læses. Spillet gemmer ikke, før en voksen har ryddet op under Voksen → Indstillinger.';
    if (gemFejlet || lagerFuldt) return 'Spillet kan ikke gemme — lageret er fuldt (eller enheden er i privat browsing). Det, der allerede er gemt, er der stadig. Tag en kopi under Voksen → Indstillinger, og ryd plads (fx data fra andre websider på samme adresse).';
    if (T.side === 'voksen' && voksenRes.skrivebeskyttet) return voksenRes.advarsel;
    return null;
  }

  function advarselKnap() {
    const t = lagerAdvarsel();
    if (!t) return null;
    return ikonKnap('⚠️', 'Besked til en voksen', () => {
      Tale.sig('Hent en voksen.');
      setTimeout(() => alert('Til den voksne: ' + t), 300);
    }, 'advarsel-knap');
  }

  function skift(node, taster) {
    S.token++;
    S.spaertTil = performance.now() + 380; // et dobbelttryk må ikke ramme den nye skærm
    Tale.stop();
    S.taster = taster || null;
    const a = app();
    a.textContent = '';
    a.append(node);
    return S.token;
  }

  function ikonKnap(ikon, label, onclick, ekstraKlasse) {
    return h('button', {
      class: 'ikon-knap' + (ekstraKlasse ? ' ' + ekstraKlasse : ''),
      'aria-label': label, title: label, type: 'button',
      onclick: (e) => { Lyd.init(); Lyd.tryk(); onclick(e); },
    }, ikon);
  }

  // Tom plads lige så bred som en ikonknap, så titlen står midt på skærmen
  function topbarPlads() {
    return h('span', { class: 'topbar-plads', 'aria-hidden': 'true' });
  }

  function hoejttaler() {
    return ikonKnap('🔊', 'Læs op igen', () => Tale.sig(S.gentagTale), 'hoejttaler');
  }

  function minFigur() {
    const id = data && data.figur && FIGURER[data.figur] ? data.figur : (T.figurer || ['bobo'])[0];
    return Object.assign({ id: id }, FIGURER[id] || FIGURER.bobo);
  }

  // =====================================================================
  //  STARTSIDEN (index.html) — vælg spiller
  // =====================================================================
  function visIndex() {
    // Hvert barn har sit faste dyr (🦖 Dino, 🦄 Enhjørning) — det er det, barnet genkender uden at læse
    const kort = (T.spillere || []).map((sp) => h('a', { class: 'spiller-kort spiller-' + sp.id, href: sp.side, 'aria-label': sp.navn },
      h('span', { class: 'spiller-figur', 'aria-hidden': 'true' }, sp.e),
      h('span', { class: 'spiller-navn' + (sp.navn.length > 6 ? ' langt' : '') }, sp.navn)));
    if (T.voksenSide) {
      kort.push(h('a', { class: 'spiller-kort spiller-voksen', href: T.voksenSide, 'aria-label': 'Voksen' },
        h('span', { class: 'spiller-figur', 'aria-hidden': 'true' }, '🔐'),
        h('span', { class: 'spiller-navn' }, 'Voksen')));
    }
    skift(h('div', { class: 'skaerm index' },
      h('div', { class: 'index-titel' }, fyrtaarn(), 'Lystårnet'),
      h('div', { class: 'spiller-liste' }, kort)));
  }

  // =====================================================================
  //  BØRNEDELEN
  // =====================================================================

  // ---------- Startskærm (låser også lyd og oplæsning op på iPad) ----------
  function visStart() {
    const fig = minFigur();
    const start = () => {
      Lyd.init();
      Lyd.rigtig();
      if (!data.figur) {
        visFigurValg(true, 'Hej ' + data.navn + '! Hvem skal med dig på rejsen? Tryk på en.');
      } else {
        visKort('Hej ' + data.navn + '! Skal vi rejse videre? Tryk på den store knap.');
      }
    };
    const taarn = h('button', {
      class: 'start-taarn-knap', type: 'button', 'aria-label': 'Hør historien om Lystårnet',
      style: '--lys:' + lysStyrke(),
      onclick: () => { Lyd.init(); visHistorie(() => visStart()); },
    }, fyrtaarn('start-taarn'), data.runderIalt ? h('span', { class: 'perle-tal' }, '✨ ' + data.runderIalt) : null);
    skift(h('div', { class: 'skaerm start' },
      h('a', { class: 'ikon-knap hjem', href: 'index.html', 'aria-label': 'Skift spiller', title: 'Skift spiller' }, '🏠'),
      advarselKnap(),
      taarn,
      h('div', { class: 'start-figur', 'aria-hidden': 'true' }, fig.e),
      h('div', { class: 'start-navn' }, data.navn),
      h('button', { class: 'stor-knap spil-knap puls', type: 'button', 'aria-label': 'Start', onclick: start }, '▶')),
    (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
  }

  // ---------- Vælg rejseven ----------
  function visFigurValg(foersteGang, hilsen) {
    // Højst to valg pr. skærm (docs/DESIGN-NOTER.md)
    const ids = (T.figurer || ['bobo', 'rex']).filter((id) => FIGURER[id]).slice(0, 2);
    let valgt = data.figur;
    const knapper = {};
    const okKnap = h('button', {
      class: 'stor-knap ok-knap' + (valgt ? '' : ' skjult'), type: 'button', 'aria-label': 'Færdig',
      onclick: () => {
        if (!valgt) return;
        Lyd.init(); Lyd.rigtig();
        data.figur = valgt;
        gem();
        if (!data.historie) { visHistorie(() => visKort(false), 'Godt valgt! ' + FIGURER[valgt].navn + ' tager med.'); return; }
        visKort('Godt valgt! ' + FIGURER[valgt].navn + ' tager med. Tryk på den store knap, så rejser vi.');
      },
    }, '✔');
    const vaelgFigur = (id) => {
      Lyd.init(); Lyd.tryk();
      valgt = id;
      for (const k in knapper) knapper[k].classList.toggle('valgt', k === id);
      knapper[id].classList.remove('hop'); void knapper[id].offsetWidth; knapper[id].classList.add('hop');
      okKnap.classList.remove('skjult');
      okKnap.classList.add('puls');
      Tale.sig('Hej, jeg hedder ' + FIGURER[id].navn + '! Tryk på den grønne knap.');
    };
    const liste = ids.map((id) => {
      knapper[id] = h('button', {
        class: 'figur-knap' + (id === valgt ? ' valgt' : ''), type: 'button', 'aria-label': FIGURER[id].navn,
        onclick: () => vaelgFigur(id),
      }, h('span', { class: 'figur-emoji', 'aria-hidden': 'true' }, FIGURER[id].e), h('span', { class: 'figur-navn' }, FIGURER[id].navn));
      return knapper[id];
    });
    S.gentagTale = 'Hvem skal med dig på rejsen? Tryk på en.';
    skift(h('div', { class: 'skaerm figurvalg' },
      h('div', { class: 'topbar' },
        foersteGang ? topbarPlads() : ikonKnap('🗺️', 'Tilbage til kortet', () => visKort(false)),
        h('div', { class: 'topbar-titel' }, 'Vælg din ven'),
        hoejttaler()),
      h('div', { class: 'figur-liste' }, liste),
      okKnap),
    (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= ids.length) vaelgFigur(ids[n - 1]);
      else if (e.key === 'Enter') okKnap.click();
    });
    // Synkront efter skærmskiftet (stadig i tryk-handleren): iOS kræver en brugergestus til den første oplæsning
    if (hilsen) Tale.sig(hilsen);
  }

  // ---------- Verdenskort ----------
  function verdenAaben(i) {
    const v = VERDENER[i];
    if (!v.emne || (!O.EMNER[v.emne] && !v.blandet)) return false;
    if (i < AABNE_FRA_START) return true;
    if (voksen.aabneAlle && voksen.aabneAlle[T.id]) return true;
    // Den nærmeste verden før, som er slået til — en verden, forælderen har slået fra, må ikke låse resten
    let j = i - 1;
    while (j >= 0 && !VERDENER[j].blandet && !emneSlaaetTil(VERDENER[j].emne)) j--;
    if (j < 0) return true;
    const e = data.emner[VERDENER[j].emne];
    return !!(e && e.mestret);
  }

  function emneSlaaetTil(emne) {
    const f = voksen.emner && voksen.emner[T.id];
    return !(f && f[emne] === false);
  }

  function anbefaletVerden() {
    const aabne = VERDENER.map((v, i) => i).filter((i) => verdenAaben(i) && emneSlaaetTil(VERDENER[i].emne));
    if (!aabne.length) return 0;
    // En afbrudt mission (🗺️ midt i runden) går forud, så de fyldte fodspor ikke tabes
    const p = S.pausetRunde;
    if (p) {
      const pi = VERDENER.findIndex((v) => v.id === p.verden.id);
      if (aabne.indexOf(pi) >= 0) return pi;
    }
    const sidst = VERDENER.findIndex((v) => v.id === data.sidsteVerden);
    if (aabne.indexOf(sidst) >= 0) {
      const e = data.emner[VERDENER[sidst].emne];
      if (!e || !e.mestret) return sidst;
    }
    const ikkeMestret = aabne.find((i) => { const e = data.emner[VERDENER[i].emne]; return !e || !e.mestret; });
    return ikkeMestret !== undefined ? ikkeMestret : aabne[aabne.length - 1];
  }

  function stjerner(emne) {
    const e = data.emner[emne];
    if (!e) return 0;
    if (!O.EMNER[emne]) return Math.min(3, e.runder); // Lystårnet: én stjerne pr. runde
    if (e.mestret) return 3;
    return Math.min(2, e.niveau - 1);
  }

  // En verden, der husker hjælpen: der gror noget, jo flere runder barnet har spillet der
  function verdenHusker(v) {
    const e = data.emner[v.emne];
    if (!e || !e.runder) return null;
    const tegn = e.mestret ? '👑' : e.runder >= 6 ? '🌳' : e.runder >= 3 ? '🌿' : '🌱';
    return h('span', { class: 'station-groede', 'aria-hidden': 'true' }, tegn);
  }

  // Lystårnets lys: én lysperle pr. runde (forudsigeligt), fuldt lys ved 30
  function lysStyrke() {
    return Math.min(1, (data ? data.runderIalt : 0) / 30).toFixed(2);
  }

  function visKort(hils) {
    S.runde = null; // ingen runde i gang, så tid tælles ikke på kortet
    const fig = minFigur();
    const anbefalet = anbefaletVerden();
    const flade = h('div', { class: 'kort-flade' });
    const sti = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sti.setAttribute('class', 'kort-sti');
    sti.setAttribute('aria-hidden', 'true');
    flade.append(sti);

    const stationer = VERDENER.map((v, i) => {
      const aaben = verdenAaben(i) && emneSlaaetTil(v.emne);
      const kommer = !v.emne;
      const antalStj = v.emne ? stjerner(v.emne) : 0;
      const knap = h('button', {
        class: 'station' + (aaben ? ' aaben' : ' laast') + (kommer ? ' kommer' : '') + (i === anbefalet ? ' anbefalet' : ''),
        type: 'button', 'aria-label': v.navn,
        onclick: () => {
          Lyd.init();
          if (aaben) { Lyd.tryk(); startRunde(v); }
          else { Lyd.tryk(); Tale.sig(v.tale + (kommer ? ' Den kommer snart.' : ' Den åbner, når du har klaret verdenen før.')); }
        },
      },
      v.svg ? fyrtaarn('station-ikon') : h('span', { class: 'station-ikon', 'aria-hidden': 'true' }, v.e),
      !aaben ? h('span', { class: 'station-laas', 'aria-hidden': 'true' }, '🔒') : null,
      h('span', { class: 'station-navn' }, v.navn),
      aaben ? h('span', { class: 'station-stjerner', 'aria-label': antalStj + (antalStj === 1 ? ' stjerne' : ' stjerner') },
        [0, 1, 2].map((k) => h('i', { class: k < antalStj ? 'fuld' : '' }, '★'))) : null,
      aaben ? verdenHusker(v) : null);
      flade.append(knap);
      return knap;
    });

    const ven = h('button', {
      class: 'kort-ven', type: 'button', 'aria-label': 'Skift ven: ' + fig.navn,
      onclick: () => { Lyd.init(); Lyd.tryk(); visFigurValg(false); },
    }, fig.e);
    flade.append(ven);

    const v = VERDENER[anbefalet];
    const spil = () => { Lyd.init(); Lyd.tryk(); startRunde(v); };
    const spilKnap = h('button', { class: 'stor-knap spil-knap kort-spil puls', type: 'button', 'aria-label': 'Spil: ' + v.navn, onclick: spil },
      h('span', { 'aria-hidden': 'true' }, '▶'), h('span', { class: 'kort-spil-ikon', 'aria-hidden': 'true' }, v.e));
    flade.append(spilKnap);

    S.gentagTale = 'Tryk på den store knap for at spille. Eller tryk på en verden.';
    // ⚠️ (spillet kan ikke gemme) står på den tomme plads til venstre. Så er der ikke plads til lysperlerne
    // i titlen på en smal telefon — de ses stadig på startskærmen.
    const advarsel = advarselKnap();
    skift(h('div', { class: 'skaerm kort' },
      h('div', { class: 'topbar' },
        h('a', { class: 'ikon-knap', href: 'index.html', 'aria-label': 'Skift spiller', title: 'Skift spiller' }, '🏠'),
        advarsel || topbarPlads(), // to knapper til højre — så titlen står i midten
        h('div', { class: 'topbar-titel' }, data.navn, data.runderIalt && !advarsel ? h('span', { class: 'perle-tal lille' }, ' ✨ ' + data.runderIalt) : null),
        h('div', { class: 'topbar-hoejre' },
          ikonKnap('📖', 'Samlebog', () => visSamlebog()),
          hoejttaler())),
      flade),
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spil(); }
      const n = Number(e.key);
      if (n >= 1 && n <= stationer.length) stationer[n - 1].click();
    });

    // Placér stationerne langs en snoet sti (genberegnes ved drej/størrelse)
    const placer = () => {
      const w = flade.clientWidth, hh = flade.clientHeight;
      if (!w || !hh) return;
      const n = VERDENER.length;
      const liggende = w >= hh * 1.05;
      const knap = spilKnap.offsetWidth || 130;
      const punkter = VERDENER.map((_, i) => {
        const t = i / (n - 1);
        // Den sidste station står altid i øverste række (liggende) / til venstre (højkant), så ▶ nederst til højre ikke dækker den
        const top = (n - 1 - i) % 2 === 0;
        if (liggende) {
          // ▶-knappen har sin egen plads nederst til højre
          const x0 = Math.min(90, w * 0.08), x1 = w - knap - 40;
          return { x: x0 + (x1 - x0) * t, y: hh * (top ? 0.3 : 0.7) };
        }
        const y0 = Math.min(80, hh * 0.08), y1 = hh - knap - 50;
        return { x: w * (top ? 0.3 : 0.7), y: y0 + (y1 - y0) * t };
      });
      punkter.forEach((p, i) => { stationer[i].style.left = p.x + 'px'; stationer[i].style.top = p.y + 'px'; });
      // glat kurve gennem punkterne
      let d = 'M' + punkter[0].x + ',' + punkter[0].y;
      for (let i = 1; i < punkter.length; i++) {
        const p0 = punkter[Math.max(0, i - 2)], p1 = punkter[i - 1], p2 = punkter[i], p3 = punkter[Math.min(punkter.length - 1, i + 1)];
        const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2.x + ',' + p2.y;
      }
      sti.setAttribute('viewBox', '0 0 ' + w + ' ' + hh);
      sti.innerHTML = '<path d="' + d + '" class="sti-kant"/><path d="' + d + '" class="sti-midte"/>';
      // Vennen står skråt over den anbefalede verden — men altid inden for kortet
      const p = punkter[anbefalet];
      const vs = ven.offsetWidth || 80;
      const ss = stationer[anbefalet].offsetWidth || 100;
      let vx, vy;
      if (liggende) {
        vx = p.x - ss * 0.55;
        vy = p.y - ss * 0.5 - vs * 0.75;
        if (vy < vs * 0.5) {
          // Ingen plads over stationen: ved siden af (til venstre, ellers til højre) — under den står næste stations stjerner
          vy = p.y;
          vx = p.x - ss * 0.5 - vs * 0.6;
          if (vx < vs * 0.5 + 2) vx = p.x + ss * 0.5 + vs * 0.6;
        }
      } else {
        // Højkant: stationerne står tæt lodret — vennen står ved siden af, ud mod kanten, så den ikke dækker et navn
        vx = p.x < w / 2 ? p.x - ss * 0.5 - vs * 0.6 : p.x + ss * 0.5 + vs * 0.6;
        vy = p.y - ss * 0.15;
      }
      vx = Math.max(vs * 0.5 + 2, Math.min(w - vs * 0.5 - 2, vx));
      ven.style.left = vx + 'px';
      ven.style.top = vy + 'px';
    };
    placer(); // med det samme, så et hurtigt tryk ikke rammer stationer, der står oven i hinanden
    requestAnimationFrame(placer);
    kortPlacer = placer;
    if (typeof hils === 'string') Tale.sig(hils); // skift() ovenfor stoppede al tale — sig hilsenen nu
  }
  let kortPlacer = null;
  window.addEventListener('resize', () => { if (kortPlacer && document.querySelector('.kort-flade')) kortPlacer(); });

  // ---------- Runde = en lille mission: hjælp et bestemt dyr med 5 opgaver ----------
  // Valgfri daglig tidsgrænse fra voksendelen — en igangværende runde gøres altid færdig
  function tidOpbrugt() {
    const g = voksen.tidsgraense && voksen.tidsgraense[T.id];
    if (!g) return false;
    const d = data.dage[G.idag()];
    return !!d && d.sek >= g * 60;
  }

  function visTidBrugt() {
    const fig = minFigur();
    skift(h('div', { class: 'skaerm pause tid-brugt' },
      h('div', { class: 'topbar' },
        h('a', { class: 'ikon-knap', href: 'index.html', 'aria-label': 'Til forsiden', title: 'Til forsiden' }, '🏠'),
        h('div', { class: 'topbar-titel' }, 'Vi ses i morgen'),
        ikonKnap('🗺️', 'Til kortet', () => visKort(false))),
      h('div', { class: 'pause-midte' },
        h('div', { class: 'pause-ven', 'aria-hidden': 'true' }, fig.e + '💤'),
        h('div', { class: 'pause-tekst' }, 'Nu har vi spillet nok matematik i dag.'))));
    S.gentagTale = 'Nu har vi spillet nok matematik i dag. ' + fig.navn + ' hviler sig. Vi ses i morgen!';
    Tale.sig(S.gentagTale);
  }

  function startRunde(verden) {
    if (tidOpbrugt()) { visTidBrugt(); return; }
    // Afbrudt med 🗺️? Så fortsætter vi samme mission med de fodspor, der allerede er fyldt
    const p = S.pausetRunde;
    if (p && p.verden.id === verden.id && p.i < p.opgaver.length) {
      S.pausetRunde = null;
      S.runde = p;
      p.sidstAktiv = Date.now();
      try {
        visRundeSkaerm(true);
        return;
      } catch (e) {
        // Missionen kunne ikke tegnes (fx fra en anden udgave): glem den og start en ny
        S.runde = null;
        data.pauset = null;
      }
    }
    S.pausetRunde = null;
    data.pauset = null; // en ny mission i en anden verden erstatter den afbrudte
    const emne = verden.emne;
    if (Tale.opdaterStemmer) Tale.opdaterStemmer(); // stemmerne kan være kommet siden opstart (iOS)
    const udenLyt = !voksen.tale || !Tale.findes || Tale.udenDansk;
    if (!data.emner[emne]) data.emner[emne] = G.standardEmne();
    const ed = data.emner[emne];
    const rng = O.lavRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    let opgaver;
    if (verden.blandet) {
      // Lystårnet: en opgave fra hvert åbent emne, på barnets eget niveau i emnet
      const niveauer = {};
      VERDENER.forEach((v, i) => {
        if (!v.blandet && verdenAaben(i) && emneSlaaetTil(v.emne)) niveauer[v.emne] = data.emner[v.emne] ? data.emner[v.emne].niveau : 1;
      });
      opgaver = O.lavBlandetRunde(niveauer, rng, { ting: T.ting, udenLyt: udenLyt });
    } else {
      ed.niveau = O.klemNiveau(emne, ed.niveau);
      opgaver = O.lavRunde(emne, ed.niveau, rng, { ting: T.ting, gentag: (data.gentag[emne] || []).filter(opgaveKendt), udenLyt: udenLyt });
    }
    if (!opgaver || !opgaver.length) { visKort(); return; } // fx alle emner slået fra — aldrig en tom runde
    data.sidsteVerden = verden.id;
    gem();
    S.runde = {
      verden: verden, emne: emne, opgaver: opgaver, i: 0, forsoeg: 0,
      sidstAktiv: Date.now(), aktivMs: 0, niveauOp: false, registreret: -1,
      maerke: O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e), // dyret, vi hjælper — kendt fra start
    };
    visRundeSkaerm();
  }

  // Missionen gemmes undervejs, så den kan fortsætte, også hvis siden lukkes eller genindlæses
  function huskMission() {
    const r = S.runde;
    if (!r || r.test) return;
    data.pauset = { verden: r.verden.id, i: r.i, opgaver: r.opgaver, niveauOp: r.niveauOp, registreret: r.registreret, maerke: r.maerke.id };
  }

  // En gemt opgave (afbrudt mission, «kommer igen») kan stamme fra en anden udgave af spillet: brug den kun,
  // hvis emnet, visningen og tingene stadig findes — ellers kan runden gå i stå
  const KENDTE_VISNINGER = ['ting', 'terning', 'terninger', 'klodser', 'streger', 'fingre', 'haand', 'kugleramme', 'par', 'flest', 'forskel', 'lyt', 'talstreg', 'plus', 'regnestykke', 'mangler', 'stoerst', 'minus', 'raekke', 'staenger', 'form', 'formScene', 'ur', 'moenter', 'koeb', 'moenster'];
  function opgaveKendt(o) {
    return !!(o && O.EMNER[o.emne] && o.vis && KENDTE_VISNINGER.indexOf(o.vis.art) >= 0 && (!o.vis.ting || O.TING[o.vis.ting]) &&
      (!o.vis.form || O.FORMER[o.vis.form]));
  }

  // Ved opstart: en gemt, afbrudt mission bliver til S.pausetRunde (▶ på kortet fortsætter den)
  function hentMission() {
    const p = data.pauset;
    const verden = p && VERDENER.find((v) => v.id === p.verden);
    if (!verden || !p.opgaver.every(opgaveKendt)) { S.pausetRunde = null; data.pauset = null; return; }
    const pulje = O.MAERKER[T.samling] || O.MAERKER.jungle;
    S.pausetRunde = {
      verden: verden, emne: verden.emne, opgaver: p.opgaver, i: p.i, forsoeg: 0,
      sidstAktiv: Date.now(), aktivMs: 0, niveauOp: p.niveauOp, registreret: p.registreret,
      maerke: pulje.find((m) => m.id === p.maerke) || O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e),
    };
  }

  function registrerAktivitet() {
    const r = S.runde;
    if (!r) return;
    const nu = Date.now();
    r.aktivMs += Math.min(60000, nu - r.sidstAktiv); // pauser over et minut tæller ikke
    r.sidstAktiv = nu;
  }

  const pronomen = (m) => (m.art === 'et' ? 'det' : 'den');
  const stort = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  function visRundeSkaerm(genoptag) {
    const r = S.runde;
    // Fodspor, der fyldes undervejs, og dyret for enden af sporet
    const prikker = h('div', { class: 'fremdrift', 'aria-hidden': 'true' },
      r.opgaver.map(() => h('span', { class: 'prik' })),
      h('span', { class: 'fremdrift-dyr' }, r.maerke.e));
    const fig = minFigur();
    r.dom = {
      prikker: prikker,
      visning: h('div', { class: 'visning' }),
      hjaelp: h('div', { class: 'hjaelp-felt' }),
      tekst: h('div', { class: 'spoerg-tekst' }),
      svar: h('div', { class: 'svar-panel' }),
      ven: h('div', { class: 'runde-ven', 'aria-hidden': 'true' }, fig.e),
    };
    r.dom.krop = h('div', { class: 'runde-krop' },
      h('div', { class: 'visning-panel' }, r.dom.tekst, r.dom.visning, r.dom.hjaelp, r.dom.ven),
      r.dom.svar);
    skift(h('div', { class: 'skaerm runde' },
      h('div', { class: 'topbar' },
        ikonKnap('🗺️', 'Tilbage til kortet', () => { registrerAktivitet(); gemTid(); S.pausetRunde = S.runde; visKort(false); }),
        prikker,
        hoejttaler()),
      r.dom.krop),
    rundeTaster);
    // Fodspor, der allerede er fyldt (når en afbrudt mission fortsætter)
    [...prikker.querySelectorAll('.prik')].slice(0, r.i).forEach((pk) => pk.classList.add('fuld'));
    // Kort missionsbesked før første spørgsmål — lange sætninger mister man undervejs
    visOpgave(genoptag ? 'Vi fortsætter.' : 'Hjælp ' + r.maerke.bestemt + '!');
  }

  function gemTid() {
    const r = S.runde;
    if (!r || !r.aktivMs) return;
    G.dag(data).sek += Math.round(r.aktivMs / 1000);
    r.aktivMs = 0;
    gem();
  }

  function visOpgave(forTale) {
    const r = S.runde;
    const opg = r.opgaver[r.i];
    r.forsoeg = 0;
    r.laast = false;
    r.visSvar = false;
    r.buffer = '';
    S.spaertTil = performance.now() + 300; // et dobbelttryk på sidste svar må ikke besvare den nye opgave
    [...r.dom.prikker.querySelectorAll('.prik')].forEach((p, i) => p.classList.toggle('nu', i === r.i));
    r.dom.tekst.textContent = '';
    r.dom.tekst.append(h('span', { class: 'opgave-ikon', 'aria-hidden': 'true' }, opg.ikon || ''), ' ' + opg.tekst);
    r.dom.visning.textContent = '';
    r.dom.visning.append(tegnVisning(opg));
    r.dom.hjaelp.textContent = '';
    r.dom.hjaelp.parentNode.classList.remove('med-hjaelp');
    r.dom.svar.classList.remove('venter');
    r.dom.svar.textContent = '';
    r.dom.svar.classList.toggle('tast', !opg.valg);
    // «Hvor er der flest?»: grupperne i svarkortene ER opgaven — de får pladsen, vægten i midten bliver lille
    r.dom.krop.classList.toggle('gruppe-opgave', opg.valgArt === 'gruppe');
    r.dom.svar.append(opg.valg ? valgKnapper(opg) : taltastatur(opg));
    S.gentagTale = opg.tale;
    Tale.sig(forTale ? forTale + ' ' + opg.tale : opg.tale);
    huskMission();
    gem();
  }

  // ---------- Visninger (skolens repræsentationer: fingre, terning, klodser, tallinje — ingen tierramme) ----------
  function tegnVisning(opg) {
    const v = opg.vis;
    switch (v.art) {
      case 'ting': return tingGruppe(v.antal, O.TING[v.ting].e);
      case 'terning': return terning(v.antal);
      case 'terninger': return h('div', { class: 'terninger' }, terning(v.a, 'a'), h('span', { class: 'plus-tegn', 'aria-hidden': 'true' }, '+'), terning(v.b, 'b'));
      case 'klodser': return klodser(v.a, v.b);
      case 'streger': return streger(v.antal);
      case 'fingre': return haender(v.a, v.b, 10);
      case 'haand': return haender(v.a, 0, 5);
      case 'kugleramme': return kugleramme(v.a, v.hel, true);
      case 'par': return parKlodser(v.antal);
      case 'flest': {
        // Barnet kan ikke læse «flest»/«færrest»: en bunke af tingen (flest) eller én enkelt (færrest) under vægten
        const e = O.TING[v.ting].e;
        const faa = v.spoerg === 'faerrest';
        return h('div', { class: 'flest-billede', 'aria-hidden': 'true' },
          h('span', { class: 'vaegt' }, '⚖️'),
          h('span', { class: 'flest-bunke' + (faa ? ' faa' : '') }, faa ? h('i', null, e) : [h('i', null, e), h('i', null, e), h('i', null, e)]));
      }
      case 'forskel': return taarne(v.a, v.b);
      case 'lyt': return h('button', {
        class: 'lyt-knap', type: 'button', 'aria-label': 'Hør igen',
        onclick: () => { Lyd.init(); Tale.sig(opg.tale); },
      }, h('span', { 'aria-hidden': 'true' }, '👂'));
      case 'talstreg': return talstreg(v);
      case 'plus': {
        const st = Math.max(v.a, v.b) <= 3 ? 'stor' : Math.max(v.a, v.b) <= 5 ? 'mellem' : 'lille';
        // Få ting må gerne være store: CSS deler bredden med antallet af kolonner (rækker af 5) og højden med rækkerne.
        // Mange ting (over 5 kolonner) stilles under hinanden i høje felter (se app.css) — så bruges begge sæt mål.
        const ra = Math.ceil(v.a / 5), rb = Math.ceil(v.b / 5);
        const mange = Math.min(v.a, 5) + Math.min(v.b, 5) > 5;
        return h('div', {
          class: 'plus-ting' + (mange ? ' mange' : ''),
          style: '--kol:' + (Math.min(v.a, 5) + Math.min(v.b, 5)) + ';--raek:' + Math.max(ra, rb) +
            ';--kol2:' + Math.max(Math.min(v.a, 5), Math.min(v.b, 5)) + ';--raek2:' + (ra + rb),
        },
          tingGruppe(v.a, O.TING[v.ting].e, 'a', st),
          h('span', { class: 'plus-tegn', 'aria-hidden': 'true' }, '+'),
          tingGruppe(v.b, O.TING[v.ting].e, 'b', st));
      }
      case 'regnestykke': return regnestykke([v.a, v.op || '+', v.b, '=', '?']);
      case 'mangler': return regnestykke([v.a, '+', '?', '=', v.sum]);
      case 'stoerst': return h('div', { class: 'krokodille', 'aria-hidden': 'true' }, v.spoerg === 'mindst' ? '🐭' : '🐊');
      case 'minus':
        if (v.stil === 'klodser') {
          const kl = klodser(v.a, 0);
          [...kl.querySelectorAll('.klods')].slice(v.a - v.b).forEach((k) => { k.classList.add('vaek'); k.classList.remove('taelbar'); });
          return kl;
        } else {
          const gr = tingGruppe(v.a, O.TING[v.ting].e);
          [...gr.querySelectorAll('.ting')].slice(v.a - v.b).forEach((t) => { t.classList.add('vaek'); t.classList.remove('taelbar'); });
          return gr;
        }
      case 'raekke': return raekke(v);
      case 'staenger': return staenger(v.tiere, v.enere);
      case 'form': return h('div', { class: 'form-stor' }, formSvg(v.form, v.farve, v.drej, true));
      case 'formScene': return h('div', { class: 'form-scene' }, v.former.map((f) =>
        h('span', { class: 'scene-form' + (f.form === v.spoerg ? ' taelbar' : '') }, formSvg(f.form, f.farve, f.drej, false))));
      case 'ur': return h('div', { class: 'ur-ramme' }, urSvg(v.klokke));
      case 'moenter': return moentRaekke(v.moenter);
      case 'koeb': return h('div', { class: 'koeb' },
        h('div', { class: 'koeb-vare' }, h('span', { class: 'moent-plads' }, moentSvg(v.har)), h('span', { class: 'koeb-pris' }, v.har + ' kr')),
        h('span', { class: 'koeb-pil', 'aria-hidden': 'true' }, '→'),
        h('div', { class: 'koeb-vare' }, h('span', { class: 'koeb-emoji', 'aria-hidden': 'true' }, v.vare), h('span', { class: 'koeb-pris' }, v.pris + ' kr')));
      case 'moenster': {
        const celler = [];
        for (let i = 0; i < v.vist; i++) celler.push(h('span', { class: 'brik-celle taelbar', 'data-brik': v.enhed[i % v.enhed.length] }, v.enhed[i % v.enhed.length]));
        celler.push(h('span', { class: 'brik-celle hul' }, '?'));
        // Grupper pr. gentagelse, så mønstret kun brydes mellem to hele gentagelser (smalle skærme)
        const grupper = [];
        for (let i = 0; i < celler.length; i += v.enhed.length) grupper.push(h('span', { class: 'moenster-enhed' }, celler.slice(i, i + v.enhed.length)));
        return h('div', { class: 'moenster' }, grupper);
      }
      default: return h('div');
    }
  }

  // Ting i rækker af 5 — og blokke af 10, når der er flere end 10
// ---------- Ekstra: ur og mønter (egen grafik som SVG) ----------
  // Analogt ur: lille viser = timer, stor viser = minutter. Tallene 1–12 står på skiven.
  function urSvg(klokke, lille) {
    const [t, m] = String(klokke).split(':').map(Number);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'ur-svg' + (lille ? ' lille' : ''));
    svg.setAttribute('aria-hidden', 'true');
    const el = (tag, a) => { const n = document.createElementNS(ns, tag); for (const k in a) n.setAttribute(k, a[k]); svg.append(n); return n; };
    el('circle', { cx: 50, cy: 50, r: 46, class: 'ur-skive' });
    // Det lille ur (i svarknapperne) viser kun 12, 3, 6 og 9 — store nok til at læse — og en streg for hver time
    for (let k = 1; k <= 12; k++) {
      const v = (k / 12) * 2 * Math.PI;
      if (lille) {
        el('line', { x1: (50 + 41 * Math.sin(v)).toFixed(1), y1: (50 - 41 * Math.cos(v)).toFixed(1), x2: (50 + 44 * Math.sin(v)).toFixed(1), y2: (50 - 44 * Math.cos(v)).toFixed(1), class: 'ur-streg' });
        if (k % 3) continue;
      }
      const rr = lille ? 31 : 35;
      const tx = el('text', { x: (50 + rr * Math.sin(v)).toFixed(1), y: (50 - rr * Math.cos(v) + (lille ? 8 : 5)).toFixed(1), class: 'ur-tal', 'data-tal': k });
      tx.textContent = String(k);
    }
    // Viserne stopper før tallene, så tallet, den peger på, kan ses
    el('line', { x1: 50, y1: 50, x2: 50, y2: lille ? 34 : 31, class: 'ur-time', transform: 'rotate(' + (((t % 12) + m / 60) * 30) + ' 50 50)' });
    el('line', { x1: 50, y1: 50, x2: 50, y2: lille ? 29 : 25, class: 'ur-minut', transform: 'rotate(' + (m * 6) + ' 50 50)' });
    el('circle', { cx: 50, cy: 50, r: 3.5, class: 'ur-midte' });
    return svg;
  }

  // Mønter: 1, 2 og 5 kr er sølv med hul, 10 og 20 kr er guld (forenklet, egen tegning)
  function moentSvg(kr) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'moent moent-' + kr);
    svg.setAttribute('data-kr', kr);
    const r = { 1: 36, 2: 41, 5: 46, 10: 40, 20: 46 }[kr] || 40;
    const el = (tag, a) => { const n = document.createElementNS(ns, tag); for (const k in a) n.setAttribute(k, a[k]); svg.append(n); return n; };
    el('circle', { cx: 50, cy: 50, r: r, class: kr >= 10 ? 'moent-guld' : 'moent-soelv' });
    el('circle', { cx: 50, cy: 50, r: r - 5, class: 'moent-kant' });
    if (kr < 10) el('circle', { cx: 50, cy: 50, r: 8, class: 'moent-hul' });
    const tx = el('text', { x: 50, y: kr < 10 ? 38 : 60, class: 'moent-tal' + (kr < 10 ? ' over-hul' : '') }); // over hullet på sølvmønterne
    tx.textContent = String(kr);
    return svg;
  }

  function moentRaekke(liste) {
    return h('div', { class: 'moenter' }, liste.map((kr) => h('span', { class: 'moent-plads taelbar', 'data-kr': kr }, moentSvg(kr))));
  }

  function tingGruppe(antal, emoji, gruppe, stoerrelse) {
    stoerrelse = stoerrelse || (antal <= 5 ? 'stor' : antal <= 10 ? 'mellem' : 'lille');
    const blokke = [];
    for (let start = 0; start < antal; start += 10) {
      const blok = h('div', { class: 'ting-blok' });
      for (let r = start; r < Math.min(antal, start + 10); r += 5) {
        const raekke = h('div', { class: 'ting-raekke' });
        for (let k = r; k < Math.min(antal, r + 5, start + 10); k++) {
          raekke.append(h('span', { class: 'ting taelbar' + (gruppe ? ' gruppe-' + gruppe : '') }, emoji));
        }
        blok.append(raekke);
      }
      blokke.push(blok);
    }
    return h('div', { class: 'ting-gruppe ' + stoerrelse + (gruppe ? ' gruppe-' + gruppe : '') }, blokke);
  }

  function terning(antal, gruppe) {
    const pladser = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[antal] || [];
    const t = h('div', { class: 'terning' + (gruppe ? ' lille-terning' : '') });
    for (let p = 1; p <= 9; p++) t.append(h('span', { class: 'terning-felt' }));
    pladser.forEach((p) => t.children[p - 1].append(h('i', { class: 'pip taelbar' + (gruppe ? ' gruppe-' + gruppe : '') })));
    return t;
  }

  // Klikklodser: a røde/temafarvede + b blå. Over 10: en hel 10-stang og løse klodser.
  // Én farve skifter nuance ved hver 5. klods, så man kan se fem uden at tælle.
  function klodser(a, b) {
    b = b || 0;
    const ud = h('div', { class: 'klodser' });
    const lavKlods = (gruppe, nr) => h('i', {
      class: 'klods taelbar gruppe-' + gruppe + (b ? (gruppe === 'a' ? ' rod' : ' blaa') : (Math.floor(nr / 5) % 2 ? ' tema-lys' : ' tema')),
    });
    const stang = () => h('span', { class: 'stang-raekke' });
    if (a + b <= 10) {
      const s = stang();
      for (let k = 0; k < a; k++) s.append(lavKlods('a', k));
      for (let k = 0; k < b; k++) s.append(lavKlods('b', a + k));
      ud.append(s);
    } else if (b === 0 || a === 10) {
      // 10-stang + løse klodser (tælle 11–20, eller 10 + b)
      const ti = stang(); ti.classList.add('ti-stang');
      for (let k = 0; k < 10; k++) ti.append(lavKlods('a', k));
      const rest = stang();
      const n = b === 0 ? a - 10 : b;
      for (let k = 0; k < n; k++) rest.append(lavKlods(b === 0 ? 'a' : 'b', 10 + k));
      ud.append(ti, rest);
    } else {
      // 8 og 5: to stænger hver for sig — hjælpen fylder den første op til 10
      const s1 = stang(); for (let k = 0; k < a; k++) s1.append(lavKlods('a', k));
      const s2 = stang(); for (let k = 0; k < b; k++) s2.append(lavKlods('b', a + k));
      ud.append(s1, s2);
    }
    // Den længste række bestemmer størrelsen: få klodser må gerne være store (CSS: --n)
    ud.style.setProperty('--n', a + b <= 10 ? Math.max(a + b, 1) : 10);
    return ud;
  }

  // Tællestreger i bundter af 5: fire lodrette og den femte på tværs
  function streger(antal) {
    const ud = h('div', { class: 'streger' });
    for (let start = 0; start < antal; start += 5) {
      const bundt = h('span', { class: 'bundt' });
      const n = Math.min(5, antal - start);
      for (let k = 0; k < n; k++) bundt.append(h('i', { class: 'streg taelbar' + (k === 4 ? ' tvaers' : '') }));
      if (n === 5) bundt.classList.add('fuldt');
      ud.append(bundt);
    }
    return ud;
  }

  // Hænder med fingre: a fingre oppe (gruppe a) + b fingre oppe (gruppe b), resten nede.
  // To hænder tælles fra venstre mod højre: lillefinger → tommelfinger, tommelfinger → lillefinger.
  function haender(a, b, maks) {
    const ud = h('div', { class: 'haender' });
    const antalHaender = maks > 5 ? 2 : 1;
    let k = 0;
    for (let hd = 0; hd < antalHaender; hd++) {
      const venstre = antalHaender === 2 && hd === 0;
      const haand = h('span', { class: 'haand' + (venstre ? ' venstre' : '') });
      const fingre = [];
      for (let f = 0; f < 5; f++) {
        const oppe = k < a + b;
        const gruppe = k < a ? 'a' : 'b';
        fingre.push(h('i', { class: 'finger f' + (venstre ? 4 - f : f) + (oppe ? ' oppe taelbar gruppe-' + gruppe : ' nede gruppe-b') }));
        k++;
      }
      haand.append(h('span', { class: 'haandflade' }));
      fingre.forEach((fi) => haand.append(fi));
      ud.append(haand);
    }
    return ud;
  }

  // Kugleramme: a kugler til venstre, resten til højre — evt. gemt under et blad
  function kugleramme(a, hel, skjul) {
    const ramme = h('div', { class: 'kugleramme' + (skjul ? ' skjul' : '') });
    const stang = h('div', { class: 'kugle-stang' });
    const venstre = h('span', { class: 'kugle-side' });
    const hoejre = h('span', { class: 'kugle-side hoejre' });
    for (let k = 0; k < a; k++) venstre.append(h('i', { class: 'kugle rod taelbar gruppe-a' }));
    for (let k = a; k < hel; k++) hoejre.append(h('i', { class: 'kugle blaa taelbar gruppe-b' }));
    hoejre.append(h('span', { class: 'kugle-blad', 'aria-hidden': 'true' }, '🍃'));
    stang.append(venstre, hoejre);
    ramme.append(stang);
    return ramme;
  }

  // Klodser to og to (lige/ulige): hvert par står i en søjle
  function parKlodser(antal) {
    const ud = h('div', { class: 'par-klodser' });
    for (let k = 0; k < antal; k += 2) {
      const soejle = h('span', { class: 'par-soejle' + (k + 1 >= antal ? ' alene' : '') });
      soejle.append(h('i', { class: 'klods tema taelbar' }));
      if (k + 1 < antal) soejle.append(h('i', { class: 'klods tema-lys taelbar' }));
      ud.append(soejle);
    }
    return ud;
  }

  // To tårne af klodser (forskel og sammenligning)
  function taarne(a, b) {
    const ud = h('div', { class: 'taarne' });
    ud.style.setProperty('--n', Math.max(a, b, 1)); // lave tårne må gerne have store klodser
    [a, b].forEach((n, i) => {
      const taarn = h('span', { class: 'taarn taarn-' + (i ? 'b' : 'a') });
      for (let k = 0; k < n; k++) taarn.append(h('i', { class: 'klods ' + (i ? 'blaa' : 'rod') }));
      ud.append(h('span', { class: 'taarn-kolonne' }, taarn, h('b', { class: 'taarn-tal' }, String(n))));
    });
    return ud;
  }

  function talstreg(v) {
    const ud = h('div', { class: 'talstreg' });
    for (let n = v.fra; n <= v.til; n++) {
      const skjult = n === v.skjult;
      ud.append(h('span', { class: 'tal-celle taelbar' + (skjult ? ' hul' : '') + (n >= 100 ? ' tre-cifre' : ''), 'data-tal': n }, skjult ? '?' : String(n)));
    }
    return h('div', { class: 'talstreg-ramme' }, ud, h('div', { class: 'talstreg-linje' }));
  }

  function regnestykke(dele) {
    return h('div', { class: 'regnestykke' }, dele.map((d) => h('span', {
      class: d === '?' ? 'ukendt' : (d === '+' || d === '=' || d === '−') ? 'tegn' : 'tal',
    }, String(d))));
  }

  // Talrække: 10, 20, 30, ? — som felter på en sti
  function raekke(v) {
    const ud = h('div', { class: 'talstreg raekke' });
    for (let i = 0; i < v.laengde; i++) {
      const tal = v.start + i * v.trin;
      const skjult = i === v.skjult;
      ud.append(h('span', { class: 'tal-celle taelbar' + (skjult ? ' hul' : '') + (tal >= 100 ? ' tre-cifre' : ''), 'data-tal': tal }, skjult ? '?' : String(tal)));
    }
    return h('div', { class: 'talstreg-ramme' }, ud, h('div', { class: 'talstreg-linje' }));
  }

  // 10-stænger og løse klodser
  function staenger(tiere, enere) {
    const ud = h('div', { class: 'staenger' });
    for (let t = 0; t < tiere; t++) {
      const stang = h('span', { class: 'stang taelbar' });
      for (let k = 0; k < 10; k++) stang.append(h('i', { class: 'klods' }));
      ud.append(stang);
    }
    if (enere) {
      const en = h('span', { class: 'enere' });
      for (let k = 0; k < enere; k++) en.append(h('i', { class: 'klods ener taelbar' }));
      ud.append(en);
    }
    return ud;
  }

  // Tallinje med hop-buer (hjælpens sidste trin)
  function tallinjeEl(fra, til) {
    const linje = h('div', { class: 'tallinje' });
    const skala = h('div', { class: 'tl-skala' });
    for (let n = fra; n <= til; n++) skala.append(h('span', { class: 'tl-tal', 'data-tal': n }, h('i', { class: 'tl-streg' }), h('b', null, String(n))));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tl-buer');
    svg.setAttribute('aria-hidden', 'true');
    linje.append(svg, skala, h('span', { class: 'tl-figur', 'aria-hidden': 'true' }, minFigur().e));
    return linje;
  }

  // ---------- Svar: knapper ----------
  // Indholdet af en svarknap: tal, figur, gruppe af ting, ord eller mønsterbrik
  function valgIndhold(opg, x) {
    const v = opg.vis;
    if (opg.valgArt === 'form') return formSvg(x, ['cirkel', 'trekant', 'firkant', 'kvadrat', 'rektangel', 'femkant', 'sekskant'].indexOf(x), 0, false);
    if (opg.valgArt === 'gruppe') return tingGruppe(x === 'a' ? v.a : v.b, O.TING[v.ting].e, x, 'knap');
    if (opg.valgArt === 'ur') return urSvg(x, true);
    if (opg.valgArt === 'tid') return h('span', { class: 'tid-tekst' }, x);
    if (opg.valgArt === 'ord') {
      // lige: alle har en makker · ulige: én står alene
      const ikon = h('span', { class: 'ord-ikon', 'aria-hidden': 'true' }, x === 'lige' ? '●● ●●' : '●● ●');
      return [ikon, h('span', { class: 'ord-tekst' }, x)];
    }
    return String(x);
  }

  function valgKnapper(opg) {
    const indhold = (x) => valgIndhold(opg, x);
    return h('div', { class: 'valg' + (opg.valgArt ? ' valg-' + opg.valgArt : '') + ' antal-' + opg.valg.length }, opg.valg.map((x) => h('button', {
      class: 'valg-knap', type: 'button', 'data-v': x,
      'aria-label': opg.valgArt === 'gruppe' ? (x === 'a' ? 'Venstre gruppe' : 'Højre gruppe') : String(x),
      onclick: (e) => { Lyd.init(); svar(x, e.currentTarget); },
    }, indhold(x))));
  }

  // ---------- Svar: eget taltastatur (intet <input>) ----------
  function taltastatur(opg) {
    const r = S.runde;
    const display = h('div', { class: 'tast-display', 'aria-live': 'polite' }, '');
    const opdater = () => {
      display.textContent = r.buffer;
      okKnap.disabled = !r.buffer;
      okKnap.classList.toggle('puls', !!r.buffer);
      clearTimeout(r.mindTimer);
      if (r.buffer) {
        const token = S.token, i = r.i;
        r.mindTimer = setTimeout(() => { if (token === S.token && r.i === i && r.buffer && !r.laast) Tale.sig('Tryk på den grønne knap, når du er færdig.'); }, 3500);
      }
      const ukendt = r.dom.visning.querySelector('.regnestykke .ukendt');
      if (ukendt) ukendt.textContent = r.buffer || '?';
    };
    const tast = (t) => {
      if (r.laast) return;
      Lyd.init(); Lyd.tryk();
      if (t === '⌫') r.buffer = r.buffer.slice(0, -1);
      else if (t === '✔') { if (r.buffer) svar(Number(r.buffer), display); return; }
      else if (r.buffer.length < 2) r.buffer = (r.buffer === '0' ? '' : r.buffer) + t;
      opdater();
    };
    const knap = (t, kl, label) => h('button', { class: 'tast ' + (kl || ''), type: 'button', 'aria-label': label || t, onclick: () => tast(t) }, t);
    const okKnap = knap('✔', 'tast-ok', 'Færdig');
    const taster = h('div', { class: 'taster' },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((t) => knap(t)),
      knap('⌫', 'tast-slet', 'Slet'), knap('0'), okKnap);
    r.tast = tast;
    r.opdaterDisplay = opdater;
    const ud = h('div', { class: 'taltastatur' }, display, taster);
    setTimeout(opdater, 0);
    return ud;
  }

  function rundeTaster(e) {
    const r = S.runde;
    if (!r) return;
    const opg = r.opgaver[r.i];
    if (e.key === 'Escape') { registrerAktivitet(); gemTid(); S.pausetRunde = r; visKort(false); return; }
    if (e.key === ' ' || e.key === 'r' || e.key === 'R') { e.preventDefault(); Tale.sig(S.gentagTale); return; }
    if (!opg || r.laast) return;
    if (r.visSvar) {
      if (e.key === 'Enter') { const k = r.dom.svar.querySelector('.vis-svar'); if (k) k.click(); }
      return;
    }
    if (!opg.valg) {
      if (/^[0-9]$/.test(e.key)) r.tast(e.key);
      else if (e.key === 'Backspace') { e.preventDefault(); r.tast('⌫'); }
      else if (e.key === 'Enter') r.tast('✔');
      return;
    }
    // Figurer, grupper, ord og mønsterbrikker: 1, 2, 3 vælger knappen efter plads
    if (opg.valgArt) {
      const n = Number(e.key);
      const knapper = r.dom.svar.querySelectorAll('.valg-knap');
      if (n >= 1 && n <= knapper.length && !knapper[n - 1].disabled) knapper[n - 1].click();
      return;
    }
    // Tal-knapper: tast tallet på knappen (også tocifrede)
    if (/^[0-9]$/.test(e.key)) {
      const aktive = [...r.dom.svar.querySelectorAll('.valg-knap:not(.forkert)')].map((k) => k.getAttribute('data-v'));
      let buf = r.buffer + e.key;
      if (!aktive.some((v) => v.indexOf(buf) === 0)) buf = e.key;
      r.buffer = buf;
      const lige = aktive.filter((v) => v === buf);
      const laengere = aktive.filter((v) => v !== buf && v.indexOf(buf) === 0);
      if (lige.length && !laengere.length) {
        r.buffer = '';
        const k = r.dom.svar.querySelector('.valg-knap[data-v="' + buf + '"]');
        if (k) k.click();
      }
      clearTimeout(r.bufferTimer);
      r.bufferTimer = setTimeout(() => { r.buffer = ''; }, 1500);
    } else if (e.key === 'Enter' && r.buffer) {
      const k = r.dom.svar.querySelector('.valg-knap[data-v="' + r.buffer + '"]:not(.forkert)');
      r.buffer = '';
      if (k) k.click();
    }
  }

  // ---------- Svar ----------
  function svar(v, knap) {
    const r = S.runde;
    if (!r || r.laast) return;
    const opg = r.opgaver[r.i];
    registrerAktivitet();
    clearTimeout(r.mindTimer);
    Tale.stop();
    if (v === opg.svar) rigtigtSvar(opg, knap);
    else forkertSvar(opg, knap);
  }

  function hop(el, klasse) {
    if (!el) return;
    el.classList.remove(klasse); void el.offsetWidth; el.classList.add(klasse);
  }

  // Rigtigt: én rolig hændelse — en lille lyd og et fodspor, der fyldes. Ingen tale oveni.
  function rigtigtSvar(opg, knap) {
    const r = S.runde;
    r.laast = true;
    if (r.forsoeg === 0) registrer(opg, true);
    if (knap && knap.classList) {
      knap.classList.remove('vis-svar'); // ellers bliver svaret hvid tekst på guld
      knap.classList.add('rigtig');
    }
    Lyd.rigtig();
    const prik = r.dom.prikker.querySelectorAll('.prik')[r.i];
    prik.classList.add('fuld');
    hop(prik, 'pop');
    const token = S.token;
    if (r.forsoeg > 0) {
      // Efter hjælp: sig svaret, når lyden er færdig
      setTimeout(() => { if (token === S.token) Tale.sig(opg.valgArt ? 'Ja!' : 'Ja, det er ' + opg.svar + '!'); }, 350);
    }
    setTimeout(() => {
      if (token !== S.token) return;
      r.i++;
      if (r.i < r.opgaver.length) visOpgave();
      else afslutRunde();
    }, r.forsoeg === 0 ? 900 : 1700);
  }

  // Forkert: blid lyd, knappen toner ned, og hjælpetrappen tager næste trin
  function forkertSvar(opg, knap) {
    const r = S.runde;
    r.forsoeg++;
    Lyd.blid();
    hop(r.dom.ven, 'taenk');
    if (knap && knap.classList && knap.classList.contains('valg-knap')) {
      knap.classList.add('forkert');
      knap.disabled = true;
    } else {
      hop(r.dom.svar.querySelector('.tast-display'), 'ryst');
      r.buffer = '';
      if (r.opdaterDisplay) r.opdaterDisplay();
    }
    if (r.forsoeg === 1) registrer(opg, false);
    const tilbage = opg.valg ? r.dom.svar.querySelectorAll('.valg-knap:not(.forkert)').length : Infinity;
    const trin = opg.hjaelp[r.forsoeg - 1];
    if (trin) visHjaelp(opg, trin, tilbage <= 1);
    else visSvaret(opg);
  }

  // Første forsøg tæller i statistikken og i den tilpassede sværhedsgrad
  function registrer(opg, rigtig) {
    const r = S.runde;
    // En opgave tæller kun én gang — også når en afbrudt mission fortsætter ved samme opgave
    if (r.registreret === r.i) return;
    r.registreret = r.i;
    if (data.pauset && !r.test) data.pauset.registreret = r.i;
    const emne = opg.emne;
    const ed = G.normaliserEmne(data.emner[emne]);
    ed.ialt++;
    if (rigtig) ed.rigtige++;
    const res = O.opdaterNiveau(ed, rigtig, O.EMNER[emne].maxNiveau);
    data.emner[emne] = res.data;
    if (res.aendring > 0) { r.niveauOp = true; if (data.pauset && !r.test) data.pauset.niveauOp = true; }
    const d = G.dag(data);
    d.opgaver++;
    if (rigtig) d.rigtige++;
    if (rigtig) {
      if (opg.gentaget) G.fjernGentag(data, opg);
    } else {
      G.tilfoejGentag(data, opg);
      if (!data.fejl[emne]) data.fejl[emne] = {};
      data.fejl[emne][opg.noegle] = (data.fejl[emne][opg.noegle] || 0) + 1;
    }
    gem();
  }

  // ---------- Hjælpetrappen (fingre → terning/klodser → tallinje) ----------
  async function visHjaelp(opg, trin, visSvarBagefter) {
    const r = S.runde;
    const token = S.token;
    const i = r.i;
    const levende = () => token === S.token && S.runde === r && r.i === i;
    r.laast = true;
    r.dom.visning.classList.add('hjaelp');
    r.dom.svar.classList.add('venter'); // knapperne hviler synligt, mens hjælpen viser
    const plusVidere = trin.art === 'tael' && erPlusVisning(opg) && taelVidere(opg);
    // Den blide lyd først, så indledningen. Animationen går i gang med det samme, så barnet ser
    // noget ske; dens tal og pauser venter, til indledningen er sagt færdig (Tale.sigFoerst).
    const intro = Tale.sigFoerst(plusVidere ? 'Lad os tælle videre fra det største tal.' : (HJAELP_TALE[trin.art] || 'Lad os se.'), 250 * TEMPO);
    try {
      await hjaelpAnimation(opg, trin, levende);
    } catch (e) { /* hjælp er pynt — spillet fortsætter */ }
    await intro; // en animation uden tal og pauser må ikke låse op midt i indledningen
    if (!levende()) return;
    r.dom.visning.classList.remove('hjaelp');
    r.dom.svar.classList.remove('venter');
    r.laast = false;
    if (visSvarBagefter) { visSvaret(opg); return; }
    Tale.sig('Prøv igen.');
    S.gentagTale = 'Prøv igen. ' + opg.tale;
  }

  const erPlusVisning = (opg) => ['plus', 'klodser', 'fingre', 'terninger'].indexOf(opg.vis.art) >= 0 && opg.vis.b > 0;
  const taelVidere = (opg) => opg.niveau >= 2 || Math.max(opg.vis.a, opg.vis.b) >= 5;

  // Tal-mærket på en talt ting. På små ting (klodser, kugler) flytter mærket med, så det ikke dækker naboerne.
  function saetTal(el, n, forrige) {
    if (forrige && el.offsetWidth && el.offsetWidth < 44) forrige.removeAttribute('data-n');
    el.setAttribute('data-n', n);
  }

  async function taelOp(elementer, fraTal, levende, pause) {
    for (let k = 0; k < elementer.length; k++) {
      if (!levende()) return false;
      const el = elementer[k];
      el.classList.add('talt');
      saetTal(el, fraTal + k, elementer[k - 1]);
      Lyd.tael();
      Tale.sig(String(fraTal + k));
      await vent(pause || 600);
    }
    return true;
  }

  // Sig et tal og markér en hel gruppe på én gang («5», «10»)
  async function markerGruppe(elementer, tal, levende) {
    if (!levende() || !elementer.length) return;
    elementer.forEach((el) => el.classList.add('talt'));
    elementer[elementer.length - 1].setAttribute('data-n', tal);
    Lyd.tael();
    Tale.sig(String(tal));
    await vent(1000);
  }

  function hjaelpeFelt(node) {
    const r = S.runde;
    r.dom.hjaelp.textContent = '';
    r.dom.hjaelp.parentNode.classList.toggle('med-hjaelp', !!node); // vennen træder til side
    if (node) { r.dom.hjaelp.append(node); hop(node, 'glid-ind'); }
    return node;
  }

  async function hjaelpAnimation(opg, trin, levende) {
    const r = S.runde;
    const vis = r.dom.visning;
    const art = trin.art;

    if (art === 'tael') {
      const alle = [...vis.querySelectorAll('.taelbar')];
      // Plus: tæl videre fra den største gruppe («6 … 7»)
      if (erPlusVisning(opg) && taelVidere(opg)) {
        const ga = alle.filter((el) => el.classList.contains('gruppe-a'));
        const gb = alle.filter((el) => el.classList.contains('gruppe-b'));
        const [stor, lille] = ga.length >= gb.length ? [ga, gb] : [gb, ga];
        await markerGruppe(stor, stor.length, levende);
        await taelOp(lille, stor.length + 1, levende);
        return;
      }
      // Mange ting i blokke af 10: «10», så tæl videre (halverer tiden)
      const blok = opg.vis.art === 'ting' && opg.vis.antal > 10 ? vis.querySelector('.ting-blok') : null;
      if (blok) {
        const ti = [...blok.querySelectorAll('.taelbar')];
        await markerGruppe(ti, 10, levende);
        await taelOp(alle.filter((el) => ti.indexOf(el) < 0), 11, levende);
        return;
      }
      // En hel 10-stang: «10», så tæl videre
      const tiStang = vis.querySelector('.ti-stang');
      if (tiStang) {
        const ti = [...tiStang.querySelectorAll('.taelbar')];
        await markerGruppe(ti, 10, levende);
        await taelOp(alle.filter((el) => ti.indexOf(el) < 0), 11, levende);
        return;
      }
      // Tællestreger: 5, 10, 15 … for hvert fuldt bundt
      if (opg.vis.art === 'streger') {
        let n = 0;
        for (const b of vis.querySelectorAll('.bundt.fuldt')) { n += 5; await markerGruppe([...b.children], n, levende); }
        await taelOp([...vis.querySelectorAll('.bundt:not(.fuldt) .streg')], n + 1, levende);
        return;
      }
      await taelOp(alle, 1, levende);
      return;
    }

    if (art === 'tallinje') {
      const slut = trin.start + trin.hop;
      const lo = Math.min(trin.start, slut), hi = Math.max(trin.start, slut);
      let fra = Math.max(0, lo - 1), til = fra + 10;
      if (til < hi) { til = hi; fra = Math.max(0, til - 10); }
      const linje = hjaelpeFelt(tallinjeEl(fra, til));
      await vent(150);
      const celler = [...linje.querySelectorAll('.tl-tal')];
      const figur = linje.querySelector('.tl-figur');
      const svg = linje.querySelector('.tl-buer');
      const midt = (n) => { const c = celler[n - fra]; return c.offsetLeft + c.offsetWidth / 2; };
      const flyt = (n) => { figur.style.left = midt(n) + 'px'; celler[n - fra].classList.add('talt'); };
      svg.setAttribute('viewBox', '0 0 ' + linje.offsetWidth + ' ' + linje.offsetHeight);
      flyt(trin.start);
      Tale.sig(String(trin.start));
      await vent(1000);
      const retning = trin.hop < 0 ? -1 : 1;
      for (let k = 1; k <= Math.abs(trin.hop); k++) {
        if (!levende()) return;
        const fraN = trin.start + (k - 1) * retning, tilN = trin.start + k * retning;
        const x1 = midt(fraN), x2 = midt(tilN), y = linje.querySelector('.tl-skala').offsetTop + 4;
        const bue = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bue.setAttribute('d', 'M' + x1 + ',' + y + ' Q' + ((x1 + x2) / 2) + ',' + (y - 34) + ' ' + x2 + ',' + y);
        bue.setAttribute('class', 'tl-bue');
        svg.append(bue);
        if (trin.taelHop) {
          // «Hvor mange mangler/forskel»: skriv og sig hoppenes antal
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.setAttribute('x', (x1 + x2) / 2); t.setAttribute('y', y - 22); t.setAttribute('class', 'tl-hop-tal');
          t.textContent = String(k);
          svg.append(t);
        }
        flyt(tilN);
        Lyd.hop();
        Tale.sig(String(trin.taelHop ? k : tilN));
        await vent(800);
      }
      if (trin.taelHop) await Tale.sigVent(Math.abs(trin.hop) === 1 ? 'Et hop.' : 'Så mange hop.');
      return;
    }

    if (art === 'fingre' || art === 'fingreMangler') {
      const a = trin.a;
      const b = art === 'fingre' ? trin.b : trin.sum - trin.a;
      const maks = a + b > 5 ? 10 : 5;
      const hd = hjaelpeFelt(haender(a, 0, maks));
      const nede = [...hd.querySelectorAll('.finger.nede')].slice(0, b);
      await markerGruppe([...hd.querySelectorAll('.finger.oppe')], a, levende);
      const fraEn = art === 'fingreMangler'; // «hvor mange mangler»: tæl de nye fingre 1, 2, 3
      for (let k = 0; k < nede.length; k++) {
        if (!levende()) return;
        nede[k].classList.remove('nede');
        nede[k].classList.add('oppe', 'talt');
        const n = fraEn ? k + 1 : a + k + 1;
        nede[k].setAttribute('data-n', n);
        Lyd.tael();
        Tale.sig(String(n));
        await vent(760);
      }
      if (fraEn) await Tale.sigVent(nede.length === 1 ? 'Der manglede en finger.' : 'Så mange fingre manglede.');
      return;
    }

    if (art === 'kugle') {
      let ramme = vis.querySelector('.kugleramme');
      if (!ramme) ramme = hjaelpeFelt(kugleramme(trin.a, trin.hel, true));
      await vent(300);
      await markerGruppe([...ramme.querySelectorAll('.gruppe-a')], trin.a, levende);
      ramme.classList.remove('skjul'); // bladet løftes
      await vent(400);
      await taelOp([...ramme.querySelectorAll('.gruppe-b')], 1, levende); // tæl de gemte: 1, 2, 3
      if (levende()) await Tale.sigVent('Så mange gemte sig under bladet.');
      return;
    }

    if (art === 'tilbage') {
      const tilbage = [...vis.querySelectorAll('.taelbar')];
      vis.querySelectorAll('.vaek').forEach((el) => el.classList.add('vaek-helt'));
      await vent(500);
      if (!tilbage.length) { await Tale.sigVent('Der er ingen tilbage. Det er nul.'); return; }
      await taelOp(tilbage, 1, levende);
      return;
    }

    if (art === 'klodserVaek' || art === 'klodserPlus' || art === 'tiFoerst') {
      const a = trin.a, b = trin.b;
      let kl = art === 'tiFoerst' ? vis.querySelector('.klodser') : null;
      if (!kl) kl = hjaelpeFelt(art === 'klodserVaek' ? klodser(a, 0) : klodser(a, b));
      if (art === 'klodserVaek') {
        const alle = [...kl.querySelectorAll('.klods')];
        Lyd.tael(); Tale.sig(String(a));
        await vent(1000);
        for (let k = 0; k < b; k++) {
          if (!levende()) return;
          const kd = alle[a - 1 - k];
          kd.classList.add('vaek');
          Lyd.tael();
          Tale.sig(String(a - 1 - k));
          await vent(760);
          // Over tieren: først de løse klodser ned til 10, så resten fra 10-stangen
          if (a > 10 && a - 1 - k === 10 && k < b - 1) await Tale.sigVent('Nu er vi nede på 10. Og så resten.');
        }
        if (levende()) await Tale.sigVent('Hvor mange er der tilbage?');
        return;
      }
      const ga = [...kl.querySelectorAll('.gruppe-a')];
      const gb = [...kl.querySelectorAll('.gruppe-b')];
      // Den største gruppe først (tælle videre / fylde op fra det største tal)
      const [stor, lille] = ga.length >= gb.length ? [ga, gb] : [gb, ga];
      await markerGruppe(stor, stor.length, levende);
      if (art === 'tiFoerst' && stor.length < 10 && a + b > 10) {
        // Fyld den største stang op til 10 med klodser fra den mindste — så resten
        const stang = stor[0].parentNode;
        const fyld = lille.slice(0, 10 - stor.length);
        await Tale.sigVent(stor.length + ' og ' + fyld.length + ' er 10\'er-venner. Først op til 10.');
        for (let k = 0; k < fyld.length; k++) {
          if (!levende()) return;
          stang.append(fyld[k]);
          fyld[k].classList.add('talt');
          saetTal(fyld[k], stor.length + k + 1, fyld[k - 1]);
          Lyd.tael();
          Tale.sig(String(stor.length + k + 1));
          await vent(760);
        }
        stang.classList.add('ti-stang');
        if (stang.previousElementSibling) stang.parentNode.prepend(stang); // 10-stangen øverst, resten under
        hop(stang, 'pop');
        await Tale.sigVent('10. Og så resten.');
        await taelOp(lille.slice(10 - stor.length), 11, levende);
        return;
      }
      await taelOp(lille, stor.length + 1, levende);
      return;
    }

    if (art === 'forskel') {
      const ta = [...vis.querySelectorAll('.taarn-a .klods')];
      const tb = [...vis.querySelectorAll('.taarn-b .klods')];
      const lav = Math.min(ta.length, tb.length);
      // Klodser i samme højde passer sammen — de ekstra er forskellen
      for (let k = 0; k < lav; k++) { ta[k].classList.add('parret'); tb[k].classList.add('parret'); }
      await Tale.sigVent('De her passer sammen.');
      const ekstra = (ta.length > tb.length ? ta : tb).slice(lav);
      await taelOp(ekstra, 1, levende);
      if (levende()) await Tale.sigVent('Så mange flere er der. Det er forskellen.');
      return;
    }

    if (art === 'parvis') {
      // Flest/færrest: sæt én fra hver gruppe sammen ad gangen
      const ka = [...r.dom.svar.querySelectorAll('.valg-knap[data-v="a"] .ting')];
      const kb = [...r.dom.svar.querySelectorAll('.valg-knap[data-v="b"] .ting')];
      const lav = Math.min(ka.length, kb.length);
      for (let k = 0; k < lav; k++) {
        if (!levende()) return;
        ka[k].classList.add('parret'); kb[k].classList.add('parret');
        Lyd.tael();
        await vent(420);
      }
      const ekstra = (ka.length > kb.length ? ka : kb).slice(lav);
      // Flest: dem til overs lyser (der er svaret). Færrest: de dæmpes — øjet skal over til den anden gruppe.
      ekstra.forEach((el) => el.classList.add(opg.vis.spoerg === 'faerrest' ? 'overs' : 'talt'));
      await Tale.sigVent(opg.vis.spoerg === 'faerrest'
        ? 'Her er nogle til overs. Så er der færrest i den anden gruppe.'
        : 'Her er nogle til overs. Der er flest her.');
      return;
    }

    if (art === 'par') {
      const soejler = [...vis.querySelectorAll('.par-soejle')];
      for (let k = 0; k < soejler.length; k++) {
        if (!levende()) return;
        soejler[k].classList.add('talt');
        Lyd.tael();
        await vent(380);
      }
      const alene = vis.querySelector('.par-soejle.alene');
      if (alene) hop(alene, 'pop');
      await Tale.sigVent(alene ? 'En klods står alene uden makker. Så er tallet ulige.' : 'Alle klodser har en makker. Så er tallet lige.');
      return;
    }

    if (art === 'visTal') {
      const n = trin.tal;
      const tiere = Math.floor(n / 10), enere = n % 10;
      hjaelpeFelt(h('div', { class: 'vis-tal' },
        h('div', { class: 'vis-tal-tal' }, String(n)),
        n > 20 ? staenger(tiere, enere) : n > 0 ? klodser(n, 0) : null));
      let tekst = 'Sådan ser ' + n + ' ud. Find det samme tal.';
      if (n > 20) tekst = 'Sådan ser ' + n + ' ud. Det er ' + tiere + ' tiere' + (enere === 1 ? ' og 1 ener' : enere ? ' og ' + enere + ' enere' : '') + '. Find det samme tal.';
      else if (n > 10) tekst = 'Sådan ser ' + n + ' ud. Det er 10 og ' + (n - 10) + '. Find det samme tal.';
      await Tale.sigVent(tekst);
      return;
    }

    if (art === 'sammenlign') {
      const kol = trin.tal.map((t) => h('span', { class: 'taarn-kolonne' },
        h('span', { class: 'taarn' }, Array.from({ length: t }, () => h('i', { class: 'klods tema' }))),
        h('b', { class: 'taarn-tal' }, String(t))));
      // Tårnene står i selve opgavefeltet (der er plads til 20 klodser), krokodillen træder til side
      vis.textContent = '';
      vis.append(h('div', { class: 'taarne sammenlign' + (Math.max.apply(null, trin.tal) > 10 ? ' hoeje' : '') }, kol));
      hop(kol[opg.vis.spoerg === 'mindst' ? 0 : kol.length - 1], 'pop');
      await Tale.sigVent(opg.vis.spoerg === 'mindst' ? 'Det mindste tal har det laveste tårn.' : 'Det største tal har det højeste tårn.');
      return;
    }

    if (art === 'talstreg') {
      const celler = [...vis.querySelectorAll('.tal-celle')];
      const idx = celler.findIndex((c) => c.classList.contains('hul'));
      const foer = celler.slice(0, idx);
      const liste = foer.length ? foer : celler.slice(idx + 1).reverse();
      for (const c of liste) {
        if (!levende()) return;
        c.classList.add('talt');
        Lyd.tael();
        Tale.sig(c.getAttribute('data-tal'));
        await vent(760);
      }
      hop(celler[idx], 'pop');
      await Tale.sigVent(foer.length ? 'Og så kommer?' : 'Og før det?');
      return;
    }

    if (art === 'raekke' || art === 'moenster') {
      const celler = [...vis.querySelectorAll(art === 'raekke' ? '.tal-celle' : '.brik-celle')];
      for (const c of celler) {
        if (!levende()) return;
        if (c.classList.contains('hul')) {
          hop(c, 'pop');
          await Tale.sigVent('Og så?');
          continue;
        }
        c.classList.add('talt');
        Lyd.tael();
        const brik = O.MOENSTER_BRIKKER[c.getAttribute('data-brik')];
        Tale.sig(art === 'raekke' ? c.getAttribute('data-tal') : (brik ? brik.navn : ''));
        await vent(art === 'raekke' ? 900 : 780);
      }
      if (art === 'raekke' && opg.vis.trin && Math.abs(opg.vis.trin) !== 1) {
        await Tale.sigVent(opg.vis.trin > 0 ? 'Vi lægger ' + opg.vis.trin + ' til hver gang.' : 'Vi trækker ' + (-opg.vis.trin) + ' fra hver gang.');
      } else if (art === 'raekke' && opg.vis.trin === -1) {
        await Tale.sigVent('Vi tæller ned.');
      }
      return;
    }

    if (art === 'staenger') {
      const st = [...vis.querySelectorAll('.stang')];
      for (let k = 0; k < st.length; k++) {
        if (!levende()) return;
        st[k].classList.add('talt');
        st[k].setAttribute('data-n', (k + 1) * 10);
        Lyd.tael();
        Tale.sig(String((k + 1) * 10));
        await vent(850);
      }
      await taelOp([...vis.querySelectorAll('.ener')], st.length * 10 + 1, levende, 760);
      return;
    }

// Ekstra: klokken — viserne forklares, og uret vises med navn
    if (art === 'urVisere') {
      const [t, m] = String(opg.svar).split(':').map(Number);
      const ur = vis.querySelector('.ur-svg');
      const minut = ur && ur.querySelector('.ur-minut'), time = ur && ur.querySelector('.ur-time');
      if (minut) minut.classList.add('lyser');
      await Tale.sigVent(m === 30 ? 'Den store viser peger på 6. Så er klokken halv.' : 'Den store viser peger på 12. Så er klokken hel.');
      if (!levende()) return;
      if (minut) minut.classList.remove('lyser');
      if (time) time.classList.add('lyser');
      await Tale.sigVent(m === 30
        ? 'Den lille viser er gået forbi ' + t + '. Den er på vej mod ' + ((t % 12) + 1) + '. Så er klokken halv ' + O.klokkeNavn(((t % 12) + 1) + ':00') + '.'
        : 'Den lille viser peger på ' + t + '. Så er klokken ' + O.klokkeNavn(opg.svar) + '.');
      return;
    }
    if (art === 'visUr') {
      hjaelpeFelt(h('div', { class: 'vis-ur' }, urSvg(trin.klokke), h('div', { class: 'vis-ur-tid' }, trin.klokke)));
      await Tale.sigVent('Sådan ser klokken ' + O.klokkeNavn(trin.klokke) + ' ud.' + (opg.valgArt === 'ur' ? ' Find det samme ur.' : ''));
      return;
    }
    // Ekstra: mønter — tæl videre fra den største mønt
    if (art === 'moenter') {
      const pladser = [...vis.querySelectorAll('.moent-plads')];
      let sum = 0;
      for (const p of pladser) {
        if (!levende()) return;
        sum += Number(p.getAttribute('data-kr'));
        p.classList.add('talt');
        Lyd.tael();
        await Tale.sigVent(String(sum));
      }
      await Tale.sigVent('Det er ' + sum + ' kroner i alt.');
      return;
    }

    if (art === 'visForm') {
      const form = trin.form;
      hjaelpeFelt(h('div', { class: 'form-stor lille' }, formSvg(form, 1, 0, true)));
      const F = O.FORMER[form];
      let tekst = 'Sådan ser ' + F.ubestemt + ' ud.' + (F.hjoerner ? ' Den har ' + F.hjoerner + ' hjørner.' : ' Den er rund og har ingen hjørner.');
      if (form === 'kvadrat') tekst = 'Sådan ser et kvadrat ud. Det har fire rette hjørner, og alle kanter er lige lange.';
      if (form === 'rektangel') tekst = 'Sådan ser et rektangel ud. Det har fire rette hjørner.';
      await Tale.sigVent(tekst);
      return;
    }

    if (art === 'hjoerner' || art === 'kanter') {
      const dele = [...vis.querySelectorAll(art === 'hjoerner' ? '.hjoerne' : '.kant')];
      if (!dele.length) {
        await Tale.sigVent('En cirkel er rund. Den har ingen hjørner.');
        return;
      }
      for (let k = 0; k < dele.length; k++) {
        if (!levende()) return;
        dele[k].classList.add('talt');
        Lyd.tael();
        Tale.sig(String(k + 1));
        await vent(800);
      }
    }
  }

  // ---------- Sidste trin: svaret lyser, og barnet trykker på det ----------
  function visSvaret(opg) {
    const r = S.runde;
    r.visSvar = true;
    if (opg.valg) {
      r.dom.svar.querySelectorAll('.valg-knap').forEach((k) => {
        if (k.getAttribute('data-v') === String(opg.svar)) { k.classList.add('vis-svar'); k.disabled = false; }
        else { k.classList.add('forkert'); k.disabled = true; }
      });
    } else {
      r.dom.svar.textContent = '';
      r.dom.svar.append(h('div', { class: 'valg antal-1' }, h('button', {
        class: 'valg-knap vis-svar', type: 'button', 'data-v': opg.svar, 'aria-label': String(opg.svar),
        onclick: (e) => { Lyd.init(); svar(opg.svar, e.currentTarget); },
      }, String(opg.svar))));
    }
    let navn = opg.svar;
    if (opg.valgArt === 'form') navn = O.FORMER[opg.svar].bestemt;
    else if (opg.valgArt === 'brik') navn = O.MOENSTER_BRIKKER[opg.svar] ? O.MOENSTER_BRIKKER[opg.svar].bestemt : '';
    else if (opg.valgArt === 'gruppe') navn = 'den her';
    else if (opg.valgArt === 'ur' || opg.valgArt === 'tid') navn = 'klokken ' + O.klokkeNavn(opg.svar);
    const tekst = opg.valgArt ? 'Det er ' + navn + '. Tryk på den, der lyser.' : 'Det er ' + opg.svar + '. Tryk på ' + opg.svar + '.';
    S.gentagTale = tekst;
    Tale.sig(tekst);
  }

  // ---------- Runden er slut: dyret, vi hjalp, kommer med ----------
  function afslutRunde() {
    const r = S.runde;
    // Data kan være læst igen midt i runden (storage-hændelse) uden dette emne — normalisér som i registrer()
    const ed = data.emner[r.emne] = G.normaliserEmne(data.emner[r.emne]);
    ed.runder++;
    data.runderIalt++;
    data.rundeTaeller++;
    const d = G.dag(data);
    d.runder++;
    registrerAktivitet();
    gemTid();
    const maerke = r.maerke;
    data.maerker[maerke.id] = (data.maerker[maerke.id] || 0) + 1;
    if (!r.test) { S.pausetRunde = null; data.pauset = null; } // en testrunde rører ikke en rigtig afbrudt mission
    gem();
    visFejring(maerke, r.niveauOp, r.verden);
  }

  // Fejring — én hændelse ad gangen: først lyd og stjerner, så tale, så dyret
  function visFejring(maerke, niveauOp, verden) {
    const fig = minFigur();
    const r = S.runde;
    const sidsteTal = r.opgaver.map((o) => o.svar).filter((x) => typeof x === 'number' && x >= 3 && x <= 8).pop();
    const videre = (fn) => { Lyd.init(); Lyd.tryk(); if (data.rundeTaeller >= 3) visBevaegelse(fn, sidsteTal); else fn(); };
    const knapper = h('div', { class: 'fejring-knapper skjult' },
      h('button', { class: 'stor-knap igen-knap', type: 'button', 'aria-label': 'Spil igen', onclick: () => videre(() => startRunde(verden)) }, '▶'),
      h('button', { class: 'stor-knap kort-knap', type: 'button', 'aria-label': 'Til kortet', onclick: () => videre(() => visKort(false)) }, '🗺️'));
    let aabnet = false;
    let token = -1; // sættes efter skærmskiftet nedenfor
    const dyr = h('button', { class: 'fund-dyr skygge', type: 'button', 'aria-label': maerke.navn }, maerke.e);
    const navn = h('div', { class: 'fund-navn skjult' }, maerke.navn);
    // Barnet kan ikke læse «tryk på skyggen»: en ring om skyggen og en hånd, der peger på den.
    // De dukker op sammen med stemmen (CSS-forsinkelse) — ingen ekstra lyd.
    const ring = h('div', { class: 'fund-ring', 'aria-hidden': 'true' });
    const haand = h('div', { class: 'fund-haand', 'aria-hidden': 'true' }, '👆');
    const aabn = () => {
      if (aabnet) return;
      aabnet = true;
      Lyd.init();
      ring.remove();
      haand.remove();
      dyr.classList.remove('skygge');
      hop(dyr, 'frem');
      navn.classList.remove('skjult');
      Lyd.pling();
      flyvPerle();
      setTimeout(() => {
        if (token !== S.token) return;
        const tekst = stort(maerke.bestemt) + ' er med! ' + stort(pronomen(maerke)) + ' er nu i din samlebog.';
        S.gentagTale = tekst;
        Tale.sig(tekst);
        knapper.classList.remove('skjult');
      }, 600);
    };
    // En lysperle flyver fra dyret til tårnet, og tårnet lyser op (historiens røde tråd)
    const perle = h('div', { class: 'fejring-perle', style: '--lys:' + lysStyrke(), 'aria-hidden': 'true' }, fyrtaarn(), h('span', { class: 'perle-tal' }, '✨ ' + data.runderIalt));
    const flyvPerle = () => {
      try {
        const a = dyr.getBoundingClientRect(), b = perle.firstChild.getBoundingClientRect();
        const p = h('span', { class: 'flyvende-perle', 'aria-hidden': 'true', style: 'left:' + (a.left + a.width / 2) + 'px;top:' + (a.top + a.height / 2) + 'px' }, '✨');
        document.body.append(p);
        const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 3 - (a.top + a.height / 2);
        const anim = p.animate([{ transform: 'translate(-50%, -50%) scale(1.4)' }, { transform: 'translate(calc(' + dx + 'px - 50%), calc(' + dy + 'px - 50%)) scale(0.6)' }], { duration: 750, easing: 'ease-in' });
        anim.onfinish = () => { p.remove(); if (token === S.token) hop(perle, 'gloed'); };
      } catch (e) { hop(perle, 'gloed'); }
    };
    const intro = 'Du klarede det!' + (niveauOp ? ' Du er blevet stærkere!' : '') + ' Tryk på ' + maerke.bestemt + '.';
    S.gentagTale = intro;
    skift(h('div', { class: 'skaerm fejring' },
      h('div', { class: 'fejring-top' },
        h('div', { class: 'fejring-ven danser', 'aria-hidden': 'true' }, fig.e),
        h('div', { class: 'fejring-tekst' }, 'Du klarede det!'),
        perle,
        // Missionens fodspor (alle fyldt) — og en stjerne, der popper frem, når barnet er blevet stærkere
        h('div', { class: 'fejring-stjerner', 'aria-hidden': 'true' }, S.runde.opgaver.map(() => h('span', { class: 'fejring-spor' }, '🐾')),
          niveauOp ? h('span', { class: 'fejring-ny-stjerne' }, '⭐') : null)),
      // Klik på hele fundet (også ringen og hånden) åbner — skyggen er ikke det eneste, et barn rammer
      h('div', { class: 'fejring-midte' }, h('div', { class: 'fund', onclick: aabn }, h('div', { class: 'fund-straaler', 'aria-hidden': 'true' }), ring, dyr, haand, navn)),
      knapper),
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!aabnet) aabn();
        else if (!knapper.classList.contains('skjult')) knapper.firstChild.click();
      } else if (e.key === 'Escape') visKort(false);
    });
    token = S.token;
    Lyd.fejring();
    setTimeout(() => { if (token === S.token && !aabnet) Tale.sig(intro); }, 800);
  }

  // ---------- Historien om Lystårnet (tynd ramme, læses højt — én gang, og når man trykker på tårnet) ----------
  const HISTORIE = 'Hver nat lyser Lystårnet over Tallandet. Men i nat blæste stormen tårnets lysperler væk. ' +
    'Hver gang du hjælper et dyr, finder vi en lysperle. Så lyser tårnet lidt mere.';
  function visHistorie(videre, forTekst) {
    const perler = h('div', { class: 'historie-perler', 'aria-hidden': 'true' },
      Array.from({ length: 7 }, (_, i) => h('i', { style: '--i:' + i })));
    const knap = h('button', {
      class: 'stor-knap spil-knap', type: 'button', 'aria-label': 'Videre',
      onclick: () => { Lyd.init(); Lyd.tryk(); data.historie = true; gem(); videre(); },
    }, '▶');
    skift(h('div', { class: 'skaerm historie' },
      h('div', { class: 'topbar historie-top' }, hoejttaler()), // 🔊 øverst til højre som på de andre skærme
      h('div', { class: 'historie-himmel', style: '--lys:' + lysStyrke() }, fyrtaarn('historie-taarn'), perler),
      h('p', { class: 'historie-tekst' }, HISTORIE),
      knap),
    (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knap.click(); } });
    S.gentagTale = HISTORIE;
    Tale.sig((forTekst ? forTekst + ' ' : '') + HISTORIE);
  }

  // ---------- Bevægelsespause efter hver 3. runde («læg iPad'en ned» først, altid en siddende variant) ----------
  const BEVAEGELSER = {
    staa: [
      { e: '🐸', anim: 'hop', tekst: (n) => 'Hop ' + n + ' gange!' },
      { e: '👏', anim: 'klap', tekst: (n) => 'Klap ' + n + ' gange!' },
      { e: '🦶', anim: 'stamp', tekst: (n) => 'Stamp ' + n + ' gange med fødderne!' },
      { e: '🙌', anim: 'straek', tekst: (n) => 'Stræk armene op mod himlen ' + n + ' gange!' },
      { e: '🦵', anim: 'knae', tekst: (n) => 'Gå ned i knæ ' + n + ' gange!' },
    ],
    sid: [
      { e: '👐', anim: 'klap', tekst: (n) => 'Klap på lårene ' + n + ' gange!' },
      { e: '🙌', anim: 'straek', tekst: (n) => 'Stræk armene op ' + n + ' gange!' },
      { e: '🔄', anim: 'drej', tekst: (n) => 'Rul med skuldrene ' + n + ' gange!' },
      { e: '🦶', anim: 'stamp', tekst: (n) => 'Tramp med fødderne under bordet ' + n + ' gange!' },
      { e: '🙂', anim: 'nik', tekst: (n) => 'Nik med hovedet ' + n + ' gange!' },
    ],
  };

  function visBevaegelse(videre, tal) {
    const n = tal || 5;
    // Pausen er «brugt», så snart den vises — lukkes appen midt i den, kommer den ikke igen efter hver runde
    data.rundeTaeller = 0;
    gem();
    const slut = () => videre();
    // ⏭ springer ét trin over: valget → hele pausen, «læg iPad'en ned» → øvelsen, øvelsen → «godt klaret»
    const spring = (fn, label) => h('button', { class: 'ikon-knap spring-over', type: 'button', 'aria-label': label || 'Spring pausen over', title: 'Spring over', onclick: () => { Lyd.init(); Lyd.tryk(); fn(); } }, '⏭');
    const fig = minFigur();
    const vaelgStil = (stil) => {
      Lyd.init(); Lyd.tryk();
      const liste = BEVAEGELSER[stil];
      const ov = liste[(data.runderIalt / 3 | 0) % liste.length]; // skifter fra pause til pause
      let trin = 1; // 1 = læg ned, 2 = øvelse, 3 = færdig — hvert trin vises kun én gang
      // 3) Færdig: tag iPad'en igen
      const faerdig = () => {
        if (trin >= 3) return;
        trin = 3;
        const knap = h('button', { class: 'stor-knap spil-knap puls', type: 'button', 'aria-label': 'Videre', onclick: () => { Lyd.init(); Lyd.tryk(); slut(); } }, '▶');
        const t3 = skift(h('div', { class: 'skaerm pause' },
          h('div', { class: 'topbar' }, topbarPlads(), h('div', { class: 'topbar-titel' }, 'Godt klaret!'), hoejttaler()),
          h('div', { class: 'pause-midte' }, h('div', { class: 'pause-ven danser', 'aria-hidden': 'true' }, fig.e), knap)),
        (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knap.click(); } });
        Lyd.fejring();
        // Kun hvis barnet stadig står på skærmen — ellers afbryder vi oplæsningen af den nye opgave
        S.gentagTale = 'Godt klaret! Tag iPad\'en igen, og tryk på den store knap.';
        setTimeout(() => { if (t3 === S.token) Tale.sig(S.gentagTale); }, 700);
      };
      // 2) Øvelsen: vennen viser bevægelsen, og vi tæller højt
      const oevelse = async () => {
        if (trin >= 2) return;
        trin = 2;
        const stort = h('div', { class: 'pause-tal' }, '');
        const ven = h('div', { class: 'pause-ven anim-' + ov.anim, 'aria-hidden': 'true' }, fig.e);
        // Bevægelsen selv vises stort ved siden af vennen — barnet kan ikke læse, hvad det skal gøre
        const bev = h('div', { class: 'pause-ven pause-bevaegelse anim-' + ov.anim, 'aria-hidden': 'true' }, ov.e);
        const prikker = h('div', { class: 'pause-prikker', 'aria-hidden': 'true' }, Array.from({ length: n }, () => h('i')));
        const t2 = skift(h('div', { class: 'skaerm pause' },
          h('div', { class: 'topbar' }, spring(faerdig, 'Spring øvelsen over'), h('div', { class: 'topbar-titel' }, ov.e + ' ' + n + ' gange'), hoejttaler()),
          h('div', { class: 'pause-midte' }, h('div', { class: 'pause-par' }, ven, bev), stort, prikker)));
        S.gentagTale = ov.tekst(n);
        Tale.sig(ov.tekst(n));
        await vent(2600);
        for (let k = 1; k <= n; k++) {
          if (t2 !== S.token) return;
          stort.textContent = String(k);
          hop(stort, 'pop');
          hop(ven, 'gentag');
          hop(bev, 'gentag');
          prikker.children[k - 1].classList.add('fuld');
          Lyd.hop();
          Tale.sig(String(k));
          await vent(1500);
        }
        if (t2 !== S.token) return;
        faerdig();
      };
      // 1) Læg iPad'en ned
      const token = skift(h('div', { class: 'skaerm pause' },
        h('div', { class: 'topbar' }, spring(oevelse, 'Videre til øvelsen'), h('div', { class: 'topbar-titel' }, 'Pause'), hoejttaler()),
        h('div', { class: 'pause-midte' },
          h('div', { class: 'laeg-ned', 'aria-hidden': 'true' }, h('span', { class: 'laeg-ned-ipad' }, '📱'), h('span', { class: 'laeg-ned-pil' }, '⬇️')),
          h('div', { class: 'pause-tekst' }, 'Læg iPad\'en ned'))));
      S.gentagTale = 'Læg iPad\'en ned på bordet. ' + (stil === 'sid' ? 'Bliv siddende. ' : 'Rejs dig op. ') + 'Så gør vi det sammen.';
      Tale.sig(S.gentagTale);
      setTimeout(() => { if (token === S.token) oevelse(); }, 4500 * TEMPO + 300);
    };
    // Valget: stå op eller blive siddende (to valg)
    skift(h('div', { class: 'skaerm pause' },
      h('div', { class: 'topbar' }, spring(slut), h('div', { class: 'topbar-titel' }, 'Pause!'), hoejttaler()),
      h('div', { class: 'pause-midte' },
        h('div', { class: 'pause-ven', 'aria-hidden': 'true' }, fig.e),
        h('div', { class: 'pause-valg' },
          h('button', { class: 'pause-knap', type: 'button', 'aria-label': 'Stå op', onclick: () => vaelgStil('staa') }, h('span', { 'aria-hidden': 'true' }, '🧍'), h('b', null, 'Stå')),
          h('button', { class: 'pause-knap', type: 'button', 'aria-label': 'Sid ned', onclick: () => vaelgStil('sid') }, h('span', { 'aria-hidden': 'true' }, '🪑'), h('b', null, 'Sid'))))),
    (e) => { if (e.key === '1') vaelgStil('staa'); else if (e.key === '2') vaelgStil('sid'); else if (e.key === 'Escape') slut(); });
    S.gentagTale = 'Pause! Vil du stå op eller blive siddende?';
    Tale.sig(S.gentagTale);
  }

  // ---------- Samlebog ----------
  function visSamlebog() {
    const pulje = O.MAERKER[T.samling] || O.MAERKER.jungle;
    const antalForskellige = pulje.filter((m) => data.maerker[m.id]).length;
    const naeste = O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e);
    const gitter = h('div', { class: 'samlebog-gitter' }, pulje.map((m) => {
      const antal = data.maerker[m.id] || 0;
      return h('button', {
        class: 'samle-felt' + (antal ? ' har' : ' mangler') + (m.id === naeste.id ? ' naeste' : ''), type: 'button',
        'aria-label': antal ? m.navn : 'Ikke fundet endnu',
        onclick: (e) => {
          Lyd.init();
          if (antal) { Lyd.pling(); hop(e.currentTarget, 'pop'); Tale.sig(m.navn + (antal > 1 ? '. Du har ' + antal + '.' : '.')); }
          else if (m.id === naeste.id) { Lyd.tryk(); Tale.sig(stort(m.bestemt) + ' er den næste, du hjælper.'); }
          else { Lyd.tryk(); Tale.sig('Den har du ikke hjulpet endnu.'); }
        },
      }, h('span', { class: 'samle-emoji', 'aria-hidden': 'true' }, m.e), antal > 1 ? h('span', { class: 'samle-antal' }, '×' + antal) : null);
    }));
    S.gentagTale = 'Din samlebog. ' + (antalForskellige === 1 ? 'Du har fundet den første.' : 'Du har fundet ' + antalForskellige + ' forskellige.');
    skift(h('div', { class: 'skaerm samlebog' },
      h('div', { class: 'topbar' },
        ikonKnap('🗺️', 'Tilbage til kortet', () => visKort(false)),
        h('div', { class: 'topbar-titel' }, '📖 ' + antalForskellige + ' / ' + pulje.length),
        hoejttaler()),
      gitter),
    (e) => { if (e.key === 'Escape' || e.key === 'Enter') visKort(false); });
    Tale.sig(S.gentagTale);
  }

  // =====================================================================
  //  OPSTART
  // =====================================================================
  function boot() {
    // Fysisk tastatur
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat) return; // en tast holdt nede må ikke springe skærme (og belønningen) over
      if (S.taster) S.taster(e);
    });
    // Tryk lige efter et skærmskift (andet tryk i et dobbelttryk) sluges
    document.addEventListener('click', (e) => {
      // kun rigtige tryk (isTrusted) — tastaturets knap.click() skal altid igennem
      if (e.isTrusted && performance.now() < (S.spaertTil || 0)) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    // :active virker på iOS, når der findes en touch-lytter
    document.addEventListener('touchstart', () => {}, { passive: true });
    // Ingen knib-zoom midt i spillet
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Tale.stop();
        if (S.runde) { registrerAktivitet(); gemTid(); }
      } else if (S.runde) {
        S.runde.sidstAktiv = Date.now();
      }
    });
    // En anden side (voksendelens import, en anden fane) har ændret data: læs dem igen, så vores gamle
    // kopi ikke overskriver dem ved næste gem. Voksnes indstillinger (lyd, tidsgrænse) slår også igennem.
    window.addEventListener('storage', (e) => {
      if (T.side === 'barn' && e.key === T.noegle) {
        const res = G.indlaesBarn(lager, T.noegle, T.navn);
        data = res.data;
        skrivebeskyttet = !!res.skrivebeskyttet;
        indlaesAdvarsel = res.advarsel;
        // En igangværende runde fortsætter; ellers tages en gemt mission fra den anden side med
        if (!S.runde) hentMission();
      } else if (e.key === 'mat_voksen_v1' && T.side !== 'voksen') {
        voksenRes = G.indlaesVoksen(lager);
        Object.assign(voksen, voksenRes.data);
      } else if (e.key === 'mat_voksen_v1' && T.side === 'voksen') {
        location.reload(); // en anden voksenfane har gemt: start forfra, så vores gamle kopi ikke overskriver den
      }
    });

    Tale.init();

    if (T.side === 'barn') {
      const res = G.indlaesBarn(lager, T.noegle, T.navn);
      data = res.data;
      skrivebeskyttet = !!res.skrivebeskyttet;
      indlaesAdvarsel = res.advarsel;
      if (res.advarsel && window.console) console.warn(res.advarsel);
      hentMission();
      visStart();
    } else if (T.side === 'voksen' && window.Voksen) {
      window.Voksen.start({ h, G, O, lager, voksen, Lyd, Tale, skift, hop, vent, FIGURER, VERDENER, fyrtaarn, tegnVisning, valgIndhold, gemVoksen, lagerAdvarsel });
    } else {
      visIndex();
    }

    // Offline: service worker (kun over http/https)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline er en bonus */ });
    }
  }

  // Til test og voksendelen. _testRunde viser bestemte opgaver (bruges kun af test/test-e2e.js).
  window.Spil = {
    FIGURER, VERDENER, S, get data() { return data; },
    _testRunde(verdenId, opgaver) {
      const verden = VERDENER.find((v) => v.id === verdenId) || VERDENER.find((v) => v.emne === verdenId); // verdens-id eller emne
      S.runde = { verden: verden, emne: verden.emne, opgaver: opgaver, i: 0, forsoeg: 0, sidstAktiv: Date.now(), aktivMs: 0, niveauOp: false, registreret: -1, test: true, maerke: O.maerkeForRunde(T.samling, data.runderIalt, minFigur().e) };
      visRundeSkaerm();
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
