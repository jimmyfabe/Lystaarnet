/* feedback-forloeb.js — én fælles styring af feedback (fase B2): effekt → ro → én ytring → ro → én animation.
   Aldrig oven i hinanden (docs/DESIGN-NOTER.md). Idéen er fra B2 i docs/LYSTAARNET-FORSLAG-D-A-B-C.md (ChatGPT);
   koden er tilpasset spillet:
   - Talen går gennem spillets egen Tale (app.js) via taleFraSpillet(): stemmevalget (Lydklip.vaelgStemme + de voksnes
     valg), rate/pitch, Safari-grebet (60 ms efter cancel), referencen til ytringen og skønnet, når onend udebliver,
     er spillets eksisterende iOS-løsninger og bruges uændret. Forslagets egen talekode bruges ikke.
   - Klip (fx bogstavlyde) går gennem Lyd.klip, som selv venter på ended.
   - Barnets navn (navnKlip + efter, 12-10-2026): tekst → navnet som et klip optaget på enheden → efter. Uden klip siges
     tekst + efter som én ytring — navnet er aldrig tekst (repoet er offentligt, og talen kan være enhedens stemme).
   - Engelsk (en + tekst, 13-10-2026): først det engelske ord med den engelske stemme (Tale.sigEn — kun en Piper-fil, aldrig
     enhedens stemme), så den danske tekst. To ytringer efter hinanden, aldrig to stemmer i samme sætning.
   - Lydeffekter og oplæsning er to indstillinger i spillet: er effekterne slået fra, kommer talen stadig.
   - run() stopper anden tale, før forløbet starter (som svar() gør i dag), men ikke et klip. stop() stopper kun det forløb, der kører —
     ikke et tryk-klik uden for forløbet; ellers ville skærmskiftet (der kalder stop()) skære hvert navigationsklik over.
   Én lås: kører et forløb, springes nye kald over ({ status: 'skipped', reason: 'busy' }) — ingen kø.
   run() giver { status: 'completed' | 'skipped' | 'stopped' | 'unavailable', reason, effekt, tale, animation }.
   'unavailable': talen hang ('fejlstop' efter 20 s), fejlede ('tale-fejl') eller — kun med kunDanskStemme — der er
   ingen dansk stemme ('ingen-stemme'). Uden dansk stemme taler spillet ellers som i dag (Tale.sig med lang = 'da-DK').
   Fejlstoppet erklærer aldrig talen for sagt (og så kommer ingen animation). Ved 'ingen-stemme'/'tale-fejl' kommer
   animationen alligevel. Med prefers-reduced-motion springes bevægelsen helt over — læg derfor kun ren bevægelse i
   `animer`/`element`; alt, der skal ske uanset (perlen, tårnets glød, knapper), laves uden for forløbet.
   I browseren er window.FeedbackForloeb modulet (lav, taleFraSpillet); app.js laver én instans.
   Testes i Node af test/test-lydpalet.js. Kobling ind i spillet: docs/LYD-INTEGRATION.md. */
(function (root) {
  'use strict';

  const PAUSE_EFTER_EFFEKT = 120;  // ms ro mellem effekt og tale (B2)
  const PAUSE_EFTER_TALE = 160;    // ms ro mellem tale og animation (B2)
  const FEJLSTOP_TALE = 20000;     // ms — nødstop for fastlåst tale
  const FEJLSTOP_ANIMATION = 3000; // ms — en animation, der aldrig slutter, må ikke låse feedbacken for altid
  const BEVAEGELSE = [{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }, { transform: 'scale(1)' }];

  // Lille afbrydelsessignal (som AbortController, men uden krav til browseren)
  function lavSignal() {
    const lyttere = new Set();
    const s = {
      aborted: false,
      reason: '',
      ved(fn) {
        if (s.aborted) { fn(); return () => {}; }
        lyttere.add(fn);
        return () => lyttere.delete(fn);
      },
      afbryd(aarsag) {
        if (s.aborted) return;
        s.aborted = true;
        s.reason = aarsag || 'stop';
        for (const fn of Array.from(lyttere)) { try { fn(); } catch (e) { /* oprydning må ikke stoppe de andre */ } }
        lyttere.clear();
      },
    };
    return s;
  }

  // Tale-adapter til spillets Tale og Lyd (app.js). sig(ytring, faerdig) kalder faerdig(status) én gang:
  // 'sagt' | 'fra' (oplæsning slået fra) | 'tom' | 'ingen-stemme' | 'tale-fejl'. Hænger Tale, tager controllerens fejlstop over.
  // Uden dansk stemme taler spillet som i dag: Tale.sig sætter lang = 'da-DK', og browseren vælger selv en stemme.
  // kunDanskStemme: true siger i stedet intet uden en dansk stemme ('ingen-stemme') — en åben B3-beslutning til Jimmy
  // (docs/LYD-INTEGRATION.md, afsnit 9).
  function taleFraSpillet(spil) {
    const Tale = spil.Tale;
    const Lyd = spil.Lyd || null;
    const taleTil = typeof spil.taleTil === 'function' ? spil.taleTil : () => true;
    const kunDansk = spil.kunDanskStemme === true;
    // iOS henter stemmerne sent: er der ingen stemme endnu, læses listen igen (som app.js gør før stemmelisten)
    const harStemme = () => {
      if (!Tale || !Tale.findes) return false;
      if (!Tale.stemme && typeof Tale.opdaterStemmer === 'function') Tale.opdaterStemmer();
      return !!Tale.stemme;
    };
    // Løbenummer: stop() og et nyt sig() afbryder et igangværende «tekst → navn → efter». Tale.sig kalder sit efter også,
    // når sætningen blev afbrudt — uden nummeret ville navnet og resten blive sagt efter et stop.
    let nr = 0;
    // Lyd.navnGen tælles op af hver Tale.sig og Tale.stop (app.js): talte noget andet imens, springes navnet over
    const navnGen = () => (Lyd && typeof Lyd.navnGen === 'number' ? Lyd.navnGen : 0);
    const harNavneklip = (id) => !!id && !!Lyd && typeof Lyd.harLokaltKlip === 'function' && typeof Lyd.klip === 'function' && Lyd.harLokaltKlip(id);
    return {
      sig(y, faerdig) {
        const mit = ++nr;
        if (taleTil() === false) { faerdig('fra'); return; }
        const maaTale = harStemme() || !kunDansk;
        // Indtalt klip (fx en bogstavlyd): Lyd.klip venter selv på ended (og siger reserven, hvis klippet ikke kan afspilles)
        if (y.klip && Lyd && typeof Lyd.harKlip === 'function' && Lyd.harKlip(y.klip)) {
          Promise.resolve(Lyd.klip(y.klip, y.reserve && maaTale ? y.reserve : '')).then(() => faerdig('sagt'), () => faerdig('tale-fejl'));
          return;
        }
        const tekst = y.tekst || y.reserve || '';
        // Engelsk: det engelske ord (Tale.sigEn) → den danske tekst. Talte noget andet imens (navnGen) eller blev forløbet
        // stoppet (nr), kommer den danske tekst ikke.
        if (y.en && typeof Tale.sigEn === 'function') {
          let g = 0;
          Tale.sigEn(y.en, () => {
            if (mit !== nr) return;
            if (navnGen() !== g || !tekst) { faerdig('sagt'); return; }
            if (!maaTale) { faerdig('ingen-stemme'); return; }
            Tale.sig(tekst, () => faerdig('sagt'));
          });
          g = navnGen(); // Tale.sigEn har selv talt navnGen op (Lyd.stopNavn)
          return;
        }
        // Barnets navn: tekst → navneklippet → efter. Kun et klip optaget på ENHEDEN (aldrig tekst, aldrig en reserve).
        if (harNavneklip(y.navnKlip)) {
          if (!maaTale) { faerdig('ingen-stemme'); return; }
          let g = 0;
          // Næste del, hvis intet har afbrudt: stop()/nyt sig (nr) → intet mere; anden tale (navnGen) → slut som sagt
          const videre = (fn) => () => { if (mit !== nr) return; if (navnGen() !== g) { faerdig('sagt'); return; } fn(); };
          const resten = () => {
            if (!y.efter) { faerdig('sagt'); return; }
            Tale.sig(y.efter, () => faerdig('sagt')); // et sent faerdig efter stop gør intet (forløbet er afgjort)
          };
          const navn = () => {
            Promise.resolve(Lyd.klip(y.navnKlip, '')).then(videre(resten), () => faerdig('tale-fejl'));
          };
          if (tekst) { Tale.sig(tekst, videre(navn)); g = navnGen(); } else { g = navnGen(); navn(); }
          return;
        }
        // Uden navneklip: én ytring som i dag (navnet nævnes ikke)
        const hele = [tekst, y.efter || ''].filter(Boolean).join(' ');
        if (!hele) { faerdig('tom'); return; }
        if (!maaTale) { faerdig('ingen-stemme'); return; }
        Tale.sig(hele, () => faerdig('sagt'));
      },
      // Når forløbet afbrydes: tale og klip stoppes
      stop() {
        nr++;
        if (Tale && typeof Tale.stop === 'function') Tale.stop();
        if (Lyd && typeof Lyd.stopKlip === 'function') Lyd.stopKlip(); // findes først efter integrationen
      },
      // Når et nyt forløb starter: kun anden tale stoppes — et klip (fx den sidste bogstavlyd i «byg ordet») spiller færdigt
      stopAnden() {
        if (Tale && typeof Tale.stop === 'function') Tale.stop();
      },
    };
  }

  function lav(valg) {
    valg = valg || {};
    const palet = valg.palet;
    const tale = valg.tale;
    if (!palet || typeof palet.play !== 'function') throw new TypeError('FeedbackForloeb.lav kræver en palet (Lydpalet.lav).');
    if (!tale || typeof tale.sig !== 'function' || typeof tale.stop !== 'function') throw new TypeError('FeedbackForloeb.lav kræver en tale-adapter.');
    const vindue = valg.vindue || root;
    const doc = vindue.document || null;
    const fejlstopTale = valg.fejlstopTale > 0 ? valg.fejlstopTale : FEJLSTOP_TALE;
    let aktiv = null;

    const skjult = () => !!(doc && doc.hidden);
    const stopTale = () => { try { tale.stop(); } catch (e) { /* en fejl i talen må ikke låse forløbet */ } };
    const stopAnden = () => { try { (typeof tale.stopAnden === 'function' ? tale.stopAnden : tale.stop).call(tale); } catch (e) { /* som ovenfor */ } };
    const timer = (fn, ms) => vindue.setTimeout(fn, ms);
    const fjernTimer = (id) => { if (id !== null && id !== undefined) vindue.clearTimeout(id); };
    const roligt = () => {
      try { return !!(vindue.matchMedia && vindue.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
    };

    // Ventepause, der afbrydes med det samme ved stop. true = ventet færdig.
    function vent(ms, signal) {
      return new Promise((resolve) => {
        let id = null;
        const afmeld = signal.ved(() => { fjernTimer(id); resolve(false); });
        if (signal.aborted) return;
        id = timer(() => { afmeld(); resolve(true); }, ms);
      });
    }

    // Én ytring. Afbrydes den, afsluttes løftet med det samme — Safari sender ikke altid end efter cancel().
    function sig(opts, signal) {
      return new Promise((resolve) => {
        let faerdig = false;
        let id = null;
        let afmeld = null;
        const slut = (v) => {
          if (faerdig) return;
          faerdig = true;
          fjernTimer(id);
          if (afmeld) afmeld();
          resolve(v);
        };
        afmeld = signal.ved(() => { stopTale(); slut('afbrudt'); });
        if (faerdig) return;
        id = timer(() => { stopTale(); slut('fejlstop'); }, fejlstopTale); // aldrig «sagt» på et gæt
        try {
          tale.sig({ tekst: opts.tekst || '', klip: opts.klip || '', reserve: opts.reserve || '', navnKlip: opts.navnKlip || '', efter: opts.efter || '', en: opts.en || '' },
            (status) => slut(status || 'sagt'));
        } catch (e) {
          stopTale();
          slut('tale-fejl');
        }
      });
    }

    // Én kort animation: opts.animer(signal) → løfte, ellers en lille skalering af opts.element (Web Animations).
    function animer(opts, signal) {
      if (signal.aborted) return Promise.resolve('afbrudt');
      const egen = typeof opts.animer === 'function';
      const element = opts.element && typeof opts.element.animate === 'function' ? opts.element : null;
      if (!egen && !element) return Promise.resolve('ingen');
      if (roligt()) return Promise.resolve('sprunget-over'); // prefers-reduced-motion: ingen bevægelse
      return new Promise((resolve) => {
        let faerdig = false;
        let id = null;
        let anim = null;
        let afmeld = null;
        const annuller = () => { if (anim) { try { anim.cancel(); } catch (e) { /* allerede slut */ } } };
        const slut = (v) => {
          if (faerdig) return;
          faerdig = true;
          fjernTimer(id);
          if (afmeld) afmeld();
          resolve(v);
        };
        afmeld = signal.ved(() => { annuller(); slut('afbrudt'); });
        if (faerdig) return;
        id = timer(() => { annuller(); slut('fejlstop'); }, FEJLSTOP_ANIMATION);
        try {
          let p;
          if (egen) p = opts.animer(signal);
          else {
            anim = element.animate(BEVAEGELSE, { duration: 260, easing: 'ease-out' });
            p = anim.finished || new Promise((r) => { anim.onfinish = r; anim.oncancel = r; });
          }
          Promise.resolve(p).then(() => slut('vist'), () => slut(signal.aborted ? 'afbrudt' : 'fejl'));
        } catch (e) {
          slut('fejl');
        }
      });
    }

    async function gennemfoer(job, opts, klar) {
      const signal = job.signal;
      const ud = { status: 'completed', reason: '', effekt: '', tale: '', animation: '' };
      const levende = () => aktiv === job && !signal.aborted && !skjult();
      const stoppet = (aarsag) => { ud.status = 'stopped'; ud.reason = aarsag || signal.reason || 'stop'; return ud; };
      try {
        // 1. Effekten — vent på dens ended. Stoppes forløbet imens, stoppes effekten (og et ventende unlock).
        if (opts.lyd) {
          const afmeld = signal.ved(() => palet.stop());
          let e;
          try {
            await klar;
            if (!levende()) return stoppet();
            e = await palet.play(opts.lyd);
          } finally {
            afmeld();
          }
          ud.effekt = e.status + (e.reason ? ':' + e.reason : '');
          if (!levende()) return stoppet();
          // Afbrudt (stop, lydløs, pause, skjult, konteksten gik i stå): ingen tale bagefter. Fejlstop: tonerne er frakoblet og tavse.
          if (e.status === 'stopped' && e.reason !== 'fejlstop') return stoppet(e.reason);
          if (e.status === 'skipped' && (e.reason === 'hidden' || e.reason === 'paused')) { ud.status = 'skipped'; ud.reason = e.reason; return ud; }
          // 'muted', 'locked' og 'busy': ingen effekt — talen kommer alligevel (den bruger ikke Web Audio)
          if (e.status === 'played' || e.reason === 'fejlstop') {
            if (!(await vent(PAUSE_EFTER_EFFEKT, signal)) || !levende()) return stoppet();
          }
        }
        // 2. Én ytring — vent på dens slutning (med barnets navn: tekst → navneklip → efter, se taleFraSpillet)
        if (opts.tekst || opts.klip || opts.navnKlip || opts.efter || opts.en) {
          const t = await sig(opts, signal);
          ud.tale = t;
          if (!levende() || t === 'afbrudt') return stoppet();
          if (t === 'fejlstop') { ud.status = 'unavailable'; ud.reason = t; return ud; } // talen hang: intet mere
          // Ingen stemme eller fejl i talen: 'unavailable', men animationen kommer alligevel
          if (t === 'ingen-stemme' || t === 'tale-fejl') { ud.status = 'unavailable'; ud.reason = t; }
          if (t === 'sagt') {
            if (!(await vent(PAUSE_EFTER_TALE, signal)) || !levende()) return stoppet();
          }
        }
        // 3. Én animation
        const a = await animer(opts, signal);
        ud.animation = a;
        if (!levende() || a === 'afbrudt') return stoppet();
        return ud;
      } catch (e) {
        // run() må aldrig afvise: spillets gang venter på løftet (fx Promise.all i rigtigtSvar)
        ud.status = 'unavailable';
        ud.reason = 'fejl';
        return ud;
      } finally {
        if (aktiv === job) aktiv = null; // et gammelt, afbrudt forløb må ikke låse et nyere op
      }
    }

    // Kald run() DIREKTE i brugerens tryk: låsen tages, og lyden låses op, før der ventes på noget (iOS).
    function run(opts) {
      opts = opts || {};
      if (opts.lyd && palet.NAVNE && palet.NAVNE.indexOf(opts.lyd) < 0) throw new TypeError('Ukendt lydeffekt: ' + opts.lyd);
      if (aktiv) return Promise.resolve({ status: 'skipped', reason: 'busy', effekt: '', tale: '', animation: '' });
      if (skjult()) return Promise.resolve({ status: 'skipped', reason: 'hidden', effekt: '', tale: '', animation: '' });
      const job = { signal: lavSignal() };
      aktiv = job; // låsen tages inden første await: dobbelttryk får intet nyt forløb
      stopAnden(); // anden tale (fx opgavens oplæsning) stoppes, som svar() gør i dag — men et klip spiller færdigt
      const klar = opts.lyd ? palet.unlock() : null; // synkront under trykket
      return gennemfoer(job, opts, klar);
    }

    // Stop det forløb, der kører: lyd, tale, ventepauser og animation. Uden forløb gør stop() intet.
    function stopForloeb(aarsag) {
      const job = aktiv;
      aktiv = null;
      if (job) job.signal.afbryd(aarsag || 'stop');
    }

    if (doc && typeof doc.addEventListener === 'function') doc.addEventListener('visibilitychange', () => { if (doc.hidden) stopForloeb('hidden'); });
    if (typeof vindue.addEventListener === 'function') vindue.addEventListener('pagehide', () => stopForloeb('pagehide'));
    if (typeof palet.onInterrupted === 'function') palet.onInterrupted(() => stopForloeb('lyd-afbrudt'));

    return Object.freeze({
      run: run,
      stop() { stopForloeb('stop'); },
      optaget: () => !!aktiv, // fx så et navigationsklik ikke spilles oven i feedbacken
    });
  }

  const FeedbackForloeb = Object.freeze({
    lav: lav,
    taleFraSpillet: taleFraSpillet,
    PAUSE_EFTER_EFFEKT: PAUSE_EFTER_EFFEKT,
    PAUSE_EFTER_TALE: PAUSE_EFTER_TALE,
    FEJLSTOP_TALE: FEJLSTOP_TALE,
    FEJLSTOP_ANIMATION: FEJLSTOP_ANIMATION,
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = FeedbackForloeb;
  else root.FeedbackForloeb = FeedbackForloeb;
})(typeof self !== 'undefined' ? self : this);
