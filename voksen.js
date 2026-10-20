/* voksen.js — voksendelen i to dele (13-10-2026). Åben (voksen.html): Lær, dagens dosis (gymnasiematematik uden
   hjælpemidler), prøve og familieduel. Låst (voksen.html#indstillinger, hold 3 sekunder): forældreoverblik (ét barn ad
   gangen — børnene sammenlignes aldrig) og indstillinger. 🎙️ Indtal er skjult fra 14-10-2026 (VIS_INDTAL):
   bogstavoptagelser fra enheden bruges ikke, og de kan slettes under Indstillinger → Stemme.
   Startes af app.js (window.Voksen.start) med fælles hjælpere. Opgaverne kommer fra voksen-opgaver.js. */
(function () {
  'use strict';

  // Børnene hedder Dino og Enhjørning i spillet (ingen rigtige navne). gave: duellens fælles mål er en gave (ellers et æg).
  const BOERN = [
    { id: 'dino', navn: 'Dino', e: '🦖', noegle: 'mat_dino_v1', side: 'dino.html', figur: 'bobo', bestemt: 'Dinoen', gave: false },
    { id: 'enhjorning', navn: 'Enhjørning', e: '🦄', noegle: 'mat_enhjorning_v1', side: 'enhjorning.html', figur: 'luna', bestemt: 'Enhjørningen', gave: true },
  ];
  const LAAS_NOEGLE = 'mat_voksen_aaben';  // sessionStorage: indstillingerne er låst op i denne fane
  const LAAS_MINUTTER = 30;
  const LAAST_HASH = '#indstillinger';      // voksen.html#indstillinger = den låste del (forsidens Indstillinger-kort)
  const VOKSEN_NOEGLE = 'mat_voksen_v1';
  const MAX_KOPI_BYTES = 2 * 1024 * 1024; // en kopi fra spillet fylder langt mindre

  function start(ctx) {
    const { h, G, O, lager, voksen, Lyd, Tale, Forloeb, skift, hop, FIGURER, venTegning, VERDENER, tegnVisning, valgIndhold } = ctx;
    const D = ctx.D;
    const DANSK_VERDENER = (ctx.DANSK_VERDENER || []).filter((v) => v.emne && D && D.EMNER[v.emne]); // dansk med opgaver
    const VO = window.VoksenOpgaver;
    // Vækststigen (forslag B, 15-10-2026): trinet regnes af de gemte emner ved hver start — også for data fra før stigen,
    // så den voksne lander på det trin, emnerne allerede giver. Intet andet ændres; det gemmes med den næste ændring.
    voksen.traening.trin = VO.opdaterTrin(voksen.traening);
    const vaekstTegning = ctx.vaekstTegning || (() => null);
    // Voksendata, som lageret havde, da siden sidst læste eller gemte dem — se pageshow nedenfor (bfcache)
    const laesVoksenRaa = () => { try { return lager.getItem(VOKSEN_NOEGLE); } catch (e) { return null; } };
    let kendtVoksen = laesVoksenRaa();
    // Gem gennem app.js: den ved, om voksendata er skrivebeskyttede (ulæselige og uden kopi)
    let gemFejlVist = false;
    const gemV = () => {
      const ok = ctx.gemVoksen();
      if (ok) kendtVoksen = laesVoksenRaa();
      if (!ok && !gemFejlVist) {
        gemFejlVist = true;
        alert(ctx.lagerAdvarsel() || 'Ændringen kunne ikke gemmes. Lageret er måske fuldt — tag en kopi under Indstillinger.');
      }
      return ok;
    };
    const rng = () => O.lavRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    const html = (tag, cls, indhold) => { const n = h(tag, { class: cls }); n.innerHTML = indhold; return n; };

    function topbar(titel, tilbage, hoejre) {
      return h('div', { class: 'topbar' },
        tilbage ? h('button', { class: 'ikon-knap', type: 'button', 'aria-label': 'Tilbage', onclick: () => { Lyd.init(); Lyd.tryk(); tilbage(); } }, '⬅️')
          : h('a', { class: 'ikon-knap', href: 'index.html', 'aria-label': 'Til forsiden', onclick: laasIgen }, '🏠'), // 🏠 låser igen, så et barn ikke finder indstillingerne åbne
        h('div', { class: 'topbar-titel' }, titel),
        hoejre || h('span', { class: 'topbar-plads' }));
    }

    // =================================================================
    //  To dele (Jimmy 13-10-2026): den ÅBNE voksendel (voksen.html: Lær, Dagens dosis, Prøve, Familieduel) og den LÅSTE
    //  (voksen.html#indstillinger: Overblik pr. barn, Indtal, Indstillinger). Den eneste vej ind i den låste del er et helt
    //  hold på låsen — eller en oplåsning i denne fane, der er under 30 minutter gammel, når siden indlæses eller kommer
    //  tilbage fra bfcache. Den åbne menu låser altid igen, så ⚙️, ⬅️, Tilbage/frem og et hash-skift fra den åbne del
    //  møder låsen. Hver låst skærm tjekker selv (vagt), så heller ikke en gammel knap kan åbne den.
    // =================================================================
    let oplaast = false;   // den låste del må vises nu
    let iLaastDel = false; // skærmen, der står nu, hører til den låste del (låsen selv medregnet)
    let fraAaben = false;  // kom fra den åbne menu (⚙️): så går ⬅️ tilbage dertil i stedet for 🏠 til forsiden
    let tilbageSendt = false; // ⬅️ har bedt browseren om Tilbage; popstate kommer bagefter (et dobbelttryk går ét skridt)
    const laastAdresse = () => location.hash === LAAST_HASH;
    const laastPost = () => { try { return !!(history.state && history.state.laast); } catch (e) { return false; } }; // ⚙️'s post
    function laasIgen() {
      oplaast = false;
      try { sessionStorage.removeItem(LAAS_NOEGLE); } catch (e) { /* intet lager */ }
    }
    function vagt() {
      iLaastDel = true;
      if (oplaast) return true;
      visLaas();
      return false;
    }
    // Ind i den låste del: menuen, hvis der er låst op, ellers låsen
    function visLaastDel() { if (vagt()) visLaastMenu(); }
    // ⚙️ i den åbne menu: adressen får #indstillinger (Tilbage går til den åbne menu igen), og låsen kommer altid frem.
    // Posten mærkes, så ⬅️ og Frem kan kende den.
    function tilIndstillinger() {
      laasIgen();
      try { history.pushState({ laast: 1 }, '', LAAST_HASH); } catch (e) { /* uden historik: kun skærmen */ }
      fraAaben = true;
      visLaastDel();
    }
    // ⬅️ fra låsen og den låste menu: ⚙️'s post fjernes med Tilbage (popstate → den åbne menu), så historikken ikke vokser
    // for hver ⚙️/⬅️. Uden den post (fx efter en genindlæsning) som før: den åbne menu på samme post.
    function tilAaben() {
      if (!laastPost()) { visMenu(); return; }
      if (tilbageSendt) return;
      tilbageSendt = true;
      history.back();
    }
    // Tilbage/frem i browseren mellem voksen.html og #indstillinger (og et hash, der skrives i adresselinjen).
    // Ud af den låste del kasseres en halv optagelse (mikrofonen slukker); ind i den møder man låsen.
    function foelgAdressen() {
      tilbageSendt = false;
      if (laastAdresse() && !iLaastDel) { fraAaben = laastPost(); visLaastDel(); } // Frem til ⚙️'s post: ⬅️ igen
      else if (!laastAdresse() && iLaastDel) { stopOptagere(); visMenu(); }
    }
    window.addEventListener('hashchange', foelgAdressen);
    window.addEventListener('popstate', foelgAdressen);

    // =================================================================
    //  Voksenlås: hold knappen inde i 3 sekunder (Jimmy 13-10-2026: intet regnestykke). Et kort tryk åbner ikke;
    //  Enter/mellemrum holdt nede virker også (tastaturcoveret). Åben i 30 minutter i denne fane — 🏠 låser igen.
    // =================================================================
    function erAaben() {
      try { return Date.now() - Number(sessionStorage.getItem(LAAS_NOEGLE) || 0) < LAAS_MINUTTER * 60000; } catch (e) { return false; }
    }
    function laasOp() { oplaast = true; try { sessionStorage.setItem(LAAS_NOEGLE, String(Date.now())); } catch (e) { /* kun i hukommelsen */ } }
    // Tilbage/swipe viser siden fra browserens cache (bfcache) med sin gamle kopi af voksendata. Har en anden side i fanen
    // gemt imens (fx tidsgrænsen i den låste del, dagens dosis i den åbne), starter siden forfra — i begge dele, som
    // storage-lytteren i app.js gør — ellers skrev næste gem de gamle data tilbage.
    // Efter 🏠 (der slettede oplåsningen), eller når de 30 minutter er gået, låses igen, og en igangværende optagelse
    // kasseres, så mikrofonen slukker. Den åbne del har intet at låse.
    window.addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      if (laesVoksenRaa() !== kendtVoksen) { location.reload(); return; }
      if (erAaben()) return;
      oplaast = false;
      if (iLaastDel) { stopOptagere(); visLaas(); }
    });

    function visLaas() {
      iLaastDel = true;
      let timer = null, startTid = 0;
      const ring = h('span', { class: 'laas-ring' });
      const knap = h('button', { class: 'laas-knap', type: 'button', 'aria-label': 'Hold inde i 3 sekunder' }, ring, h('span', { class: 'laas-ikon', 'aria-hidden': 'true' }, '🔐'));
      const stop = () => { clearInterval(timer); timer = null; ring.style.setProperty('--p', 0); };
      const begynd = (e) => {
        if (e) e.preventDefault();
        if (timer) return;
        Lyd.init();
        startTid = Date.now();
        timer = setInterval(() => {
          if (document.hidden) { stop(); return; } // skjult: aldrig et helt hold
          if (!document.body.contains(knap)) { stop(); return; } // låsen er væk (fx Tilbage midt i et hold): intet åbner
          const p = Math.min(1, (Date.now() - startTid) / 3000);
          ring.style.setProperty('--p', p);
          if (p >= 1) { stop(); Lyd.rigtig(); laasOp(); visLaastMenu(); }
        }, 50);
      };
      knap.addEventListener('pointerdown', begynd);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => knap.addEventListener(ev, stop));
      knap.addEventListener('contextmenu', (e) => e.preventDefault());
      skift(h('div', { class: 'skaerm voksen laas' },
        topbar('Indstillinger', fraAaben ? tilAaben : null),
        h('div', { class: 'voksen-midte' }, knap, h('p', { class: 'voksen-hjaelp' }, 'Hold knappen inde i 3 sekunder.'))),
      (e) => { if (e.key === 'Enter' || e.key === ' ') { if (e.type === 'keydown' && !e.repeat) begynd(); } });
      // Hver tast, der slippes, stopper ringen — ikke kun den første (ellers åbnede to korte tryk efter 3 sekunder).
      // Mister siden fokus eller skjules (app-skift), kommer keyup aldrig: så stopper ringen også — et helt hold kræves.
      // Lytterne fjerner sig selv, når låsen ikke står på skærmen længere.
      const slip = (e) => {
        if (!document.body.contains(knap)) {
          document.removeEventListener('keyup', slip);
          document.removeEventListener('visibilitychange', slip);
          window.removeEventListener('blur', slip);
          return;
        }
        if (e && e.type === 'visibilitychange' && !document.hidden) return; // synlig igen: intet at stoppe
        stop();
      };
      document.addEventListener('keyup', slip);
      document.addEventListener('visibilitychange', slip);
      window.addEventListener('blur', slip);
    }

    // =================================================================
    //  Menu
    // =================================================================
    function dageTraenet() { return Object.keys(voksen.traening.dage).filter((k) => voksen.traening.dage[k].opgaver > 0).length; }

    const kort = (ikon, titel, under, fn) => h('button', { class: 'menu-kort', type: 'button', onclick: () => { Lyd.init(); Lyd.tryk(); fn(); } },
      h('span', { class: 'menu-ikon', 'aria-hidden': 'true' }, ikon), h('b', null, titel), under ? h('small', null, under) : null);
    const advarselLinje = () => { const a = ctx.lagerAdvarsel(); return a ? h('p', { class: 'voksen-advarsel' }, '⚠️ ' + a) : null; };

    // Den åbne menu: den voksnes eget spil. ⚙️ fører til låsen — aldrig direkte til indstillingerne.
    function visMenu() {
      laasIgen();
      iLaastDel = false;
      fraAaben = false;
      if (laastAdresse()) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* kun skærmen */ } }
      const dage = dageTraenet();
      const tilLaas = h('button', { class: 'indstillinger-knap', type: 'button', title: 'Indstillinger', onclick: () => { Lyd.init(); Lyd.tryk(); tilIndstillinger(); } },
        h('span', { class: 'indstillinger-ikon', 'aria-hidden': 'true' }, '⚙️'), h('span', { class: 'indstillinger-tekst' }, 'Indstillinger'));
      skift(h('div', { class: 'skaerm voksen menu', 'data-del': 'aaben' },
        topbar('Voksendel', null, tilLaas),
        advarselLinje(),
        vaekstKort(),
        h('div', { class: 'menu-gitter' },
          kort('📘', 'Lær', 'Bogen afsnit for afsnit' + laerStatus(), visLaer),
          kort('🧠', 'Dagens dosis', '5 opgaver · ca. 5 min' + (dage ? ' · ' + dage + (dage === 1 ? ' dag' : ' dage') + ' trænet' : ''), () => visVerdensvalg('dosis')),
          kort('⏱️', 'Prøve', '8 opgaver fra én verden', () => visVerdensvalg('proeve')),
          kort('🤝', 'Familieduel', 'Barn og voksen · fælles mål', visDuelValg))));
    }

    // =================================================================
    //  Vækststigen (forslag B): vennen vokser fra børnehave til voksen, når emnerne går op i niveau (VO.VOKSEN_TRIN)
    // =================================================================
    const trinNu = () => VO.VOKSEN_TRIN[voksen.traening.trin - 1];
    const vaekstFigur = (id) => h('span', { class: 'vaekst-figur', 'aria-hidden': 'true' }, vaekstTegning(id) || '🌱');
    function vaekstKort() {
      const t = trinNu();
      return h('button', { class: 'vaekst-kort', type: 'button', onclick: () => { Lyd.init(); Lyd.tryk(); visStige(); } },
        vaekstFigur(t.id),
        h('span', { class: 'vaekst-tekst' }, h('b', null, t.navn), h('small', null, 'Trin ' + voksen.traening.trin + ' af ' + VO.VOKSEN_TRIN.length)));
    }
    function visStige() {
      const nu = voksen.traening.trin;
      const antalEmner = Object.keys(VO.VOKSEN_EMNER).length;
      skift(h('div', { class: 'skaerm voksen stige' },
        topbar('Vækststigen', visMenu),
        h('p', { class: 'voksen-hjaelp' }, 'Vennen vokser, når emnerne går op i niveau. Alle ' + antalEmner + ' emner mestret: Voksen.'),
        h('ol', { class: 'vaekst-stige' }, VO.VOKSEN_TRIN.map((t, i) => h('li', {
          class: 'vaekst-trin' + (i < nu ? ' naaet' : '') + (i + 1 === nu ? ' nu' : ''), 'aria-current': i + 1 === nu ? 'step' : null,
        }, vaekstFigur(t.id), h('span', { class: 'vaekst-navn' }, t.navn))))));
    }
    // På slutskærmen: er trinet steget i løbet af dosis, prøve eller afsnit (d.trinFoer sættes ved første opgave)?
    const voksetLinje = (d) => (Number.isInteger(d.trinFoer) && voksen.traening.trin > d.trinFoer
      ? h('div', { class: 'vaekst-vokset' }, vaekstFigur(trinNu().id), h('b', null, 'Vennen er vokset: ' + trinNu().navn))
      : null);

    // Den låste menu (efter låsen): overblik pr. barn og Indstillinger. 🎙️ Indtal er skjult (Jimmy 14-10-2026: «man kan
    // ikke høre, hvad jeg siger»): spillet afspiller ikke bogstavoptagelser fra enheden, så ingen skal indtale noget, der
    // ikke bruges. Skærmen (visIndtal) bliver stående til en bedre løsning; «Slet optagelserne» ligger under Stemme.
    // Slås den til igen, er ▶ på skærmen stum: Lyd.harKlip (app.js) er false for enhedens bogstavklip — kun barnets
    // navneklip (egetnavn-*) bruges. Og e2e for optag/gem/eksportér er fjernet (3f852da) — begge dele skal på plads først.
    const VIS_INDTAL = false;
    function visLaastMenu() {
      if (!vagt()) return;
      skift(h('div', { class: 'skaerm voksen menu', 'data-del': 'laast' },
        topbar('Indstillinger', fraAaben ? tilAaben : null),
        advarselLinje(),
        h('div', { class: 'menu-gitter' },
          ...BOERN.map((b) => kort(b.e, b.navn, 'Overblik', () => visOverblik(b))),
          VIS_INDTAL ? kort('🎙️', 'Indtal', 'Bogstavlyde til dansk', visIndtal) : null,
          kort('⚙️', 'Indstillinger', 'Lyd, stemme, emner, tidsgrænse, kopi', visIndstillinger))));
    }

    // =================================================================
    //  📘 Lær (B7) — bogens kapitler og afsnit i præcis bogens rækkefølge (docs/VOKSEN-LAER.md)
    //  Huskekort → et gennemregnet eksempel trin for trin → 3–5 opgaver → ✓.
    //  Forkerte svar viser forklaringen og den typiske fejl og kommer igen i dagens dosis.
    // =================================================================
    const laerData = () => voksen.traening.laer || (voksen.traening.laer = {});
    function laerStatus() {
      if (!VO.AFSNIT) return '';
      const n = VO.AFSNIT.filter((a) => laerData()[a.id] && laerData()[a.id].faerdig).length;
      return n ? ' · ' + n + ' af ' + VO.AFSNIT.length + ' ✓' : '';
    }

    function visLaer() {
      const L = laerData();
      const kapitler = VO.KAPITLER.map((K) => {
        const afsnit = VO.AFSNIT.filter((a) => a.kap === K.id);
        const klaret = afsnit.filter((a) => L[a.id] && L[a.id].faerdig).length;
        return h('button', { class: 'menu-kort laer-kapitel', type: 'button', 'data-kap': K.id, onclick: () => { Lyd.init(); Lyd.tryk(); visLaerKapitel(K.id); } },
          h('span', { class: 'menu-ikon', 'aria-hidden': 'true' }, K.e),
          h('b', null, K.id + '. ' + K.navn),
          h('small', null, klaret + ' af ' + afsnit.length + ' afsnit' + (klaret === afsnit.length ? ' ✓' : '')));
      });
      skift(h('div', { class: 'skaerm voksen laer' },
        topbar('📘 Lær', visMenu),
        h('p', { class: 'voksen-hjaelp' }, 'Bogens kapitler i bogens rækkefølge. Vælg frit. Hvert afsnit: huskekort, et eksempel trin for trin og et par opgaver. Forkerte svar kommer igen i dagens dosis.'),
        h('div', { class: 'menu-gitter' }, kapitler)));
    }

    function visLaerKapitel(kapId) {
      const L = laerData();
      const K = VO.KAPITLER.find((k) => k.id === kapId);
      const afsnit = VO.AFSNIT.filter((a) => a.kap === kapId).map((a) => h('button', {
        class: 'laer-afsnit' + (L[a.id] && L[a.id].faerdig ? ' faerdig' : ''), type: 'button', 'data-afsnit': a.id,
        onclick: () => { Lyd.init(); Lyd.tryk(); visAfsnit(a.id); },
      },
      h('span', { class: 'laer-afsnit-nr' }, a.id),
      h('span', { class: 'laer-afsnit-titel' }, a.titel, a.valgfri ? h('small', null, ' (valgfri)') : null),
      h('span', { class: 'laer-afsnit-ok', 'aria-label': L[a.id] && L[a.id].faerdig ? 'Klaret' : '' }, L[a.id] && L[a.id].faerdig ? '✓' : '')));
      skift(h('div', { class: 'skaerm voksen laer' },
        topbar(K.e + ' ' + K.id + '. ' + K.navn, visLaer),
        h('div', { class: 'laer-liste' }, afsnit)));
    }

    // Et afsnit: huskekort øverst, eksemplet vises ét trin ad gangen («Næste trin»), så opgaverne
    function visAfsnit(id) {
      const A = VO.AFSNIT.find((a) => a.id === id);
      const K = VO.KAPITLER.find((k) => k.id === A.kap);
      let vist = 1;
      const trin = h('ol', { class: 'laer-trin' });
      const naesteTrin = h('button', { class: 'voksen-valg-knap laer-naeste-trin', type: 'button', onclick: () => { Lyd.init(); Lyd.tryk(); vist++; tegn(); } }, 'Næste trin ▸');
      const opgKnap = h('button', { class: 'stor-knap naeste-knap laer-start', type: 'button', 'aria-label': 'Start opgaverne', onclick: () => { Lyd.init(); Lyd.tryk(); startLaer(id); } }, '▶');
      const tegn = () => {
        trin.textContent = '';
        A.eksempel.slice(0, vist).forEach((t) => trin.append(html('li', 'laer-trin-linje', t)));
        const alle = vist >= A.eksempel.length;
        naesteTrin.classList.toggle('skjult', alle);
        opgKnap.classList.toggle('skjult', !alle);
        if (alle) opgKnap.scrollIntoView({ block: 'nearest' });
      };
      skift(h('div', { class: 'skaerm voksen laer afsnit' },
        topbar(A.id + ' ' + A.titel, () => visLaerKapitel(A.kap)),
        h('div', { class: 'voksen-opgave laer-afsnit-side' },
          h('h2', { class: 'huskekort-titel' }, 'Huskekort'),
          h('ul', { class: 'huskekort-liste' }, A.husk.map((r) => html('li', 'huskekort-regel', r))),
          h('h2', { class: 'huskekort-titel' }, 'Eksempel'),
          trin,
          naesteTrin,
          opgKnap,
          h('p', { class: 'voksen-hjaelp' }, K.e + ' Kapitel ' + K.id + (A.valgfri ? ' · valgfrit afsnit (ikke på prøvelisten)' : '')))),
      (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          if (!naesteTrin.classList.contains('skjult')) naesteTrin.click(); else opgKnap.click();
        }
      });
      tegn();
    }

    function startLaer(id) {
      const A = VO.AFSNIT.find((a) => a.id === id);
      // Niveauet følger verdenen (emnet) for afsnittets første opgavetype
      const opgaver = VO.lavLaerOpgaver(id, 1, rng(), 4);
      const e = opgaver.length ? voksen.traening.emner[opgaver[0].emne] : null;
      const n = e ? e.niveau : 1;
      const ud = n > 1 ? VO.lavLaerOpgaver(id, n, rng(), 4) : opgaver;
      visVoksenOpgave({ opgaver: ud, i: 0, rigtige: 0, laer: A.id, tilbage: () => visAfsnit(A.id) });
    }

    function visLaerSlut(d) {
      const L = laerData();
      const A = VO.AFSNIT.find((a) => a.id === d.laer);
      const tidl = L[A.id] || {};
      L[A.id] = Object.assign({}, tidl, { faerdig: true, rigtige: d.rigtige, ialt: d.opgaver.length, dato: G.idag() });
      gemV();
      const i = VO.AFSNIT.indexOf(A);
      const naeste = VO.AFSNIT[i + 1];
      skift(h('div', { class: 'skaerm voksen' },
        topbar('📘 ' + A.id + ' ' + A.titel, () => visLaerKapitel(A.kap)),
        h('div', { class: 'voksen-midte' },
          h('div', { class: 'dosis-resultat' }, '✓ ' + d.rigtige + ' af ' + d.opgaver.length),
          voksetLinje(d),
          h('p', { class: 'voksen-hjaelp' }, d.rigtige === d.opgaver.length ? 'Afsnittet er klaret.' : 'Afsnittet er klaret. Opgaverne, der drillede, kommer igen i dagens dosis.'),
          h('div', { class: 'voksen-knaprad' },
            naeste ? h('button', { class: 'voksen-valg-knap laer-videre', type: 'button', onclick: () => visAfsnit(naeste.id) }, 'Næste afsnit: ' + naeste.id) : null,
            h('button', { class: 'voksen-valg-knap', type: 'button', onclick: () => startLaer(A.id) }, 'Øv igen'),
            h('button', { class: 'voksen-valg-knap', type: 'button', onclick: () => visLaerKapitel(A.kap) }, 'Til afsnittene')))));
      Lyd.fejring();
    }

    // =================================================================
    //  Dagens dosis — gymnasiematematik uden hjælpemidler
    // =================================================================
    function traeningNiveauer() {
      const ud = {};
      for (const k of Object.keys(VO.VOKSEN_EMNER)) ud[k] = voksen.traening.emner[k] ? voksen.traening.emner[k].niveau : 1;
      return ud;
    }

    // tilstand: 'dosis' (dagens dosis, med huskekort først, hvis det er slået til) eller 'proeve' (8 opgaver)
    // Fase 2 (19-10-2026): sværhedsgraden (Auto · Let · Normal · Svær) står kun over dagens dosis og huskes
    // (traening.svaerhed); prøven kører altid på Auto (Fables forslag C, review af fase 2 F2). Stjernerne er stadig emnets
    // egen fremgang; linjen under dem er niveauet for de nye opgaver (på prøven altid emnets eget).
    function visVerdensvalg(tilstand) {
      tilstand = tilstand === 'proeve' ? 'proeve' : 'dosis';
      const T = voksen.traening;
      const dosis = tilstand === 'dosis';
      const niveauer = traeningNiveauer();
      const valgtSvaerhed = () => VO.SVAERHEDER.find((s) => s.id === T.svaerhed) || VO.SVAERHEDER[0];
      const niveauLinje = (k) => {
        const n = VO.dosisNiveau(k, niveauer[k], dosis ? T.svaerhed : 'auto'), eget = VO.dosisNiveau(k, niveauer[k], 'auto');
        return 'Niveau ' + n + (n !== eget ? ' · dit er ' + eget : '');
      };
      const tekstFor = (s) => (s.niveau
        ? 'Nye opgaver på niveau ' + s.niveau + '. Kun opgaver på dit eget niveau kan rykke dig op eller ned.'
        : 'Opgaverne følger dit niveau i hver verden.');
      const svaerhedTekst = () => tekstFor(valgtSvaerhed());
      const linjer = {};
      const forklaring = h('p', { class: 'svaerhed-tekst', 'aria-live': 'polite' }, svaerhedTekst());
      // Den længste forklaring ligger usynligt i samme felt, så feltet altid er lige højt, og kortene ikke hopper, når man
      // skifter mellem Auto (kort tekst) og Let/Normal/Svær — uanset skærmbredde og skrift (review af fase 2, S2)
      const forklaringFelt = h('div', { class: 'svaerhed-felt' }, forklaring,
        h('p', { class: 'svaerhed-plads', 'aria-hidden': 'true' }, VO.SVAERHEDER.map(tekstFor).reduce((a, b) => (b.length > a.length ? b : a))));
      // Opdateres på stedet (ikke en ny skærm), så fokus bliver på knappen, og det næste tryk ikke sluges
      const svaerKnapper = VO.SVAERHEDER.map((s) => h('button', {
        class: 'svaerhed-knap', type: 'button', 'data-svaerhed': s.id, 'aria-pressed': valgtSvaerhed().id === s.id ? 'true' : 'false',
        onclick: () => {
          Lyd.init(); Lyd.tryk();
          T.svaerhed = s.id; gemV();
          svaerKnapper.forEach((k, i) => k.setAttribute('aria-pressed', VO.SVAERHEDER[i].id === s.id ? 'true' : 'false'));
          forklaring.textContent = svaerhedTekst();
          for (const k of Object.keys(linjer)) linjer[k].textContent = niveauLinje(k);
        },
      }, s.navn));
      const knapper = Object.keys(VO.VOKSEN_EMNER).map((k, i) => {
        const E = VO.VOKSEN_EMNER[k];
        const e = T.emner[k];
        const stj = e ? (e.mestret ? 3 : Math.min(2, e.niveau - 1)) : 0;
        linjer[k] = h('small', { class: 'verden-niveau' }, niveauLinje(k));
        return h('button', {
          class: 'verden-kort' + (T.valgt === k ? ' valgt' : ''), type: 'button',
          onclick: () => {
            Lyd.init(); Lyd.tryk(); T.valgt = k; gemV();
            if (tilstand === 'proeve') startProeve(k);
            else if (T.huskekort !== false) visHuskekort(k);
            else startDosis(k);
          },
        }, h('span', { class: 'verden-nr' }, String(i + 1)), h('span', { class: 'menu-ikon', 'aria-hidden': 'true' }, E.e), h('b', null, E.navn),
        h('span', { class: 'station-stjerner statisk', 'aria-label': stj + (stj === 1 ? ' stjerne' : ' stjerner') }, [0, 1, 2].map((n) => h('i', { class: n < stj ? 'fuld' : '' }, '★'))),
        linjer[k]);
      });
      skift(h('div', { class: ['skaerm', 'voksen', 'verdensvalg'].join(' ') }, // join: test-tale læser en streng med mellemrum som tale
        topbar(tilstand === 'proeve' ? 'Vælg verden — prøve' : 'Vælg verden — dagens dosis', visMenu),
        h('p', { class: 'voksen-hjaelp' }, tilstand === 'proeve'
          ? 'Otte opgaver fra den verden, du vælger, på dit niveau. Ingen lommeregner.' + (T.proeveUr !== false ? ' Et ur viser tiden (kan slås fra under Indstillinger).' : '')
          : 'Tre opgaver fra den verden, du vælger, og to til repetition. Ingen lommeregner.'),
        dosis ? h('div', { class: 'svaerhed', role: 'group', 'aria-label': 'Sværhedsgrad' }, svaerKnapper) : null,
        dosis ? forklaringFelt : null,
        h('div', { class: 'menu-gitter verdener' }, knapper)));
    }

    // Huskekort: verdenens vigtigste regler, før dosis begynder (kan slås fra under Indstillinger)
    function visHuskekort(valgt) {
      const E = VO.VOKSEN_EMNER[valgt];
      const regler = (VO.HUSKEKORT[valgt] || []).map((r) => html('li', 'huskekort-regel', r));
      const start = h('button', { class: 'stor-knap naeste-knap', type: 'button', 'aria-label': 'Start dagens dosis', onclick: () => { Lyd.init(); Lyd.tryk(); startDosis(valgt); } }, '▶');
      skift(h('div', { class: 'skaerm voksen huskekort' },
        topbar(E.e + ' ' + E.navn, () => visVerdensvalg('dosis')),
        h('div', { class: 'voksen-opgave' },
          h('h2', { class: 'huskekort-titel' }, 'Huskekort'),
          h('ul', { class: 'huskekort-liste' }, regler),
          start,
          h('p', { class: 'voksen-hjaelp' }, 'Huskekortet kan slås fra under Indstillinger.'))),
      (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start.click(); } });
    }

    // Prøve: 8 opgaver fra én verden, evt. med et ur, der tæller op (kun for den voksne). Altid på Auto — emnets eget
    // niveau — også når dosen har en anden sværhedsgrad (Fables forslag C, review af fase 2 F2)
    function startProeve(valgt) {
      const n = voksen.traening.emner[valgt] ? voksen.traening.emner[valgt].niveau : 1;
      visVoksenOpgave({ opgaver: VO.lavProeve(valgt, n, rng(), voksen.traening.nylige), i: 0, rigtige: 0, proeve: true, start: Date.now() });
    }
    const minSek = (ms) => { const sek = Math.max(0, Math.round(ms / 1000)); return Math.floor(sek / 60) + ':' + String(sek % 60).padStart(2, '0'); };

    function startDosis(valgt) {
      const T = voksen.traening;
      const dato = G.idag();
      // Repetition: fejlede opgaver fra tidligere dage
      const gentag = T.gentag.filter((o) => o.dato !== dato);
      const opgaver = VO.lavDosis(valgt, VO.dosisNiveauer(traeningNiveauer(), T.svaerhed), rng(), gentag, T.nylige);
      visVoksenOpgave({ opgaver, i: 0, rigtige: 0, svaerhed: T.svaerhed });
    }

    function visVoksenOpgave(d) {
      const T = voksen.traening;
      const o = d.opgaver[d.i];
      if (d.trinFoer === undefined) d.trinFoer = T.trin;
      window.Voksen.nu = o; // til test: opgaven på skærmen
      let svaret = false;
      const forklaring = h('div', { class: 'voksen-forklaring skjult' });
      const naeste = h('button', {
        class: 'stor-knap naeste-knap skjult', type: 'button', 'aria-label': 'Næste',
        onclick: () => { Lyd.init(); Lyd.tryk(); d.i++; if (d.i < d.opgaver.length) visVoksenOpgave(d); else if (d.laer) visLaerSlut(d); else visDosisSlut(d); },
      }, '▶');
      // Eget taltastatur (slået til under Indstillinger): tal-svar tastes i stedet for at vælges
      const tastes = T.tastatur === true && VO.kanTastes(o);
      const facitVis = o.valg.find((v) => v.id === o.svar).vis;
      const besvar = (rigtig, fejl) => {
        svaret = true;
        Lyd.init();
        if (rigtig) { Lyd.rigtig(); d.rigtige++; } else Lyd.blid();
        registrerTraening(o, rigtig, dato, d.svaerhed);
        forklaring.innerHTML = (rigtig ? '<b>Rigtigt.</b> ' : (fejl ? '<b>Typisk fejl:</b> ' + fejl + '. ' : '<b>Ikke helt.</b> ')) +
          ((tastes || o.brikker) && !rigtig ? '<b>Facit:</b> ' + facitVis + '. ' : '') + o.forklaring;
        forklaring.classList.remove('skjult');
        naeste.classList.remove('skjult');
        naeste.scrollIntoView({ block: 'nearest' }); // på telefonen kan knappen ligge under folden
      };
      const knapper = tastes || o.brikker ? [] : o.valg.map((v) => {
        const k = html('button', 'voksen-valg-knap', v.vis);
        k.type = 'button';
        k.addEventListener('click', () => {
          if (svaret) return;
          const rigtig = v.id === o.svar;
          k.classList.add(rigtig ? 'rigtig' : 'forkert');
          knapper.forEach((kk, i) => { if (o.valg[i].id === o.svar) kk.classList.add('rigtig'); kk.disabled = true; });
          besvar(rigtig, v.fejl);
        });
        return k;
      });
      // Taltastatur med minus og brøkstreg (intet <input> — iPad-tastaturet ville dække halvdelen)
      let buffer = '';
      const display = h('div', { class: 'tast-display', 'aria-live': 'polite' }, '');
      const tast = (t) => {
        if (svaret) return;
        Lyd.init();
        if (t === '✔') {
          const r = VO.tjekTastet(o, buffer);
          if (!r.gyldig) { Lyd.tryk(); hop(display, 'ryst'); return; }
          display.classList.add(r.rigtig ? 'rigtig' : 'forkert');
          if (tastatur) tastatur.querySelectorAll('.tast').forEach((k) => { k.disabled = true; });
          besvar(r.rigtig, r.fejl);
          return;
        }
        let ny = buffer;
        if (t === '⌫') ny = buffer.slice(0, -1);
        else if (t === '−') ny = buffer.charAt(0) === '−' ? buffer.slice(1) : '−' + buffer; // minus skifter fortegn
        else if (t === '/') { if (/^−?\d+$/.test(buffer)) ny = buffer + '/'; }
        else if (buffer.replace(/\D/g, '').length < 6) ny = buffer + t;
        if (ny === buffer) return; // intet sker — intet klik
        Lyd.tryk();
        buffer = ny;
        display.textContent = buffer;
      };
      // Isolér med brikker: tryk på brikkerne i rækkefølge (tryk på en brik i feltet for at fjerne den)
      let brikOk = null, brikTilbage = null;
      const brikOpgave = o.brikker ? (() => {
        const B = o.brikker;
        const valgt = []; // pladser i B.brikker
        const felt = h('div', { class: 'brik-felt', 'aria-live': 'polite' });
        const pulje = h('div', { class: 'brik-pulje' });
        const tegn = () => {
          felt.textContent = '';
          felt.append(h('span', { class: 'brik-x' }, B.x + ' ='));
          valgt.forEach((idx, pos) => felt.append(h('button', {
            class: 'brik valgt' + (/^[A-Za-zρ]$/.test(B.brikker[idx]) ? ' bogstav' : ''), type: 'button', 'aria-label': 'Fjern ' + B.brikker[idx], disabled: svaret,
            onclick: () => { if (svaret) return; Lyd.init(); Lyd.tryk(); valgt.splice(pos, 1); tegn(); },
          }, B.brikker[idx])));
          if (!valgt.length) felt.append(h('span', { class: 'brik-tom' }, '?'));
          [...pulje.children].forEach((k, idx) => { k.disabled = svaret || valgt.indexOf(idx) >= 0; });
          brikOk.disabled = svaret || !valgt.length;
        };
        B.brikker.forEach((t, idx) => pulje.append(h('button', {
          class: 'brik' + (/^[A-Za-zρ]$/.test(t) ? ' bogstav' : ''), type: 'button', 'aria-label': t,
          onclick: () => { if (svaret) return; Lyd.init(); Lyd.tryk(); valgt.push(idx); tegn(); },
        }, t)));
        brikOk = h('button', {
          class: 'voksen-valg-knap brik-ok', type: 'button',
          onclick: () => {
            if (svaret || !valgt.length) return;
            const r = VO.tjekBrikker(o, valgt.map((i) => B.brikker[i]));
            felt.classList.add(r.rigtig ? 'rigtig' : 'forkert');
            besvar(r.rigtig, r.fejl);
            tegn();
          },
        }, '✔ Tjek');
        brikTilbage = () => { if (!svaret && valgt.length) { valgt.pop(); tegn(); } };
        tegn();
        return h('div', { class: 'brik-opgave' }, h('p', { class: 'voksen-hjaelp' }, 'Byg højresiden: tryk på brikkerne i rækkefølge.'), felt, pulje, brikOk);
      })() : null;
      const tastKnap = (t, kl, label) => h('button', { class: 'tast ' + (kl || ''), type: 'button', 'aria-label': label || t, onclick: () => tast(t) }, t);
      const tastatur = tastes ? h('div', { class: 'taltastatur voksen-tast voksen-svar-tast' }, display, h('div', { class: 'taster' },
        ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((t) => tastKnap(t)), tastKnap('−', 'tast-tegn', 'Minus'), tastKnap('0'), tastKnap('/', 'tast-tegn', 'Brøkstreg'),
        tastKnap('⌫', 'tast-slet', 'Slet'), tastKnap('✔', 'tast-ok svar-ok', 'Svar'))) : null;
      const dato = G.idag();
      const E = VO.VOKSEN_EMNER[o.emne];
      // Prøve med ur: tiden står i højre side af topbaren og tæller op (ingen nedtælling)
      const ur = d.proeve && T.proeveUr !== false ? h('span', { class: 'proeve-ur', 'aria-label': 'Tid' }, minSek(Date.now() - d.start)) : null;
      if (ur) {
        const t = setInterval(() => { if (!document.body.contains(ur)) { clearInterval(t); return; } ur.textContent = minSek(Date.now() - d.start); }, 1000);
      }
      skift(h('div', { class: 'skaerm voksen opgave' },
        topbar([h('span', { class: 'titel-navn' }, d.laer ? '📘 ' + d.laer : E.e + ' ' + E.navn), h('span', { class: 'titel-tal' }, '· ' + (d.i + 1) + ' / ' + d.opgaver.length)], d.tilbage || visMenu, ur),
        h('div', { class: 'voksen-opgave' },
          html('div', 'voksen-spoerg', o.spoerg),
          o.figur ? figurSvg(o.figur) : null,
          tastatur || brikOpgave || h('div', { class: 'voksen-valg antal-' + o.valg.length }, knapper),
          forklaring,
          naeste)),
      (e) => {
        if (tastes && !svaret) {
          if (/^[0-9]$/.test(e.key)) tast(e.key);
          else if (e.key === '-') tast('−');
          else if (e.key === '/') { e.preventDefault(); tast('/'); }
          else if (e.key === 'Backspace') { e.preventDefault(); tast('⌫'); }
          else if (e.key === 'Enter') { e.preventDefault(); tast('✔'); }
          return;
        }
        if (brikOpgave && !svaret) {
          if (e.key === 'Enter') { e.preventDefault(); brikOk.click(); }
          else if (e.key === 'Backspace') { e.preventDefault(); brikTilbage(); }
          else {
            // Tasterne vælger brikker: bogstaver (p/r = ρ), 2, * = ·, / = ÷, - = −, +, ( og )
            const tegn = { '*': '·', '.': '·', '/': '÷', '-': '−', '+': '+', '(': '(', ')': ')' }[e.key] || e.key;
            const ledig = [...brikOpgave.querySelectorAll('.brik-pulje .brik:not(:disabled)')]
              .find((k) => k.textContent === tegn || k.textContent.toLowerCase() === tegn.toLowerCase() || (k.textContent === 'ρ' && /^[pr]$/i.test(tegn)));
            if (ledig) { e.preventDefault(); ledig.click(); }
          }
          return;
        }
        const n = Number(e.key);
        if (n >= 1 && n <= knapper.length) knapper[n - 1].click();
        else if (e.key === 'Enter' && svaret) naeste.click();
      });
    }

    // svaerhed: dosens sværhedsgrad (fase 2); prøven, Lær og Familieduel giver ingen = Auto
    function registrerTraening(o, rigtig, dato, svaerhed) {
      const T = voksen.traening;
      const E = VO.VOKSEN_EMNER[o.emne];
      const ed = G.normaliserEmne(T.emner[o.emne]);
      ed.ialt++;
      if (rigtig) ed.rigtige++;
      // En opgave under eller over emnets eget niveau (Let/Normal/Svær) tæller i ialt, rigtige, dage og «kommer igen»,
      // men rykker ikke emnet op eller ned (og gør det ikke mestret)
      T.emner[o.emne] = VO.taellerINiveau(o, ed.niveau, svaerhed) ? O.opdaterNiveau(ed, rigtig, E.maxNiveau).data : ed;
      T.trin = VO.opdaterTrin(T);
      const dg = T.dage[dato] || (T.dage[dato] = { opgaver: 0, rigtige: 0 });
      dg.opgaver++;
      if (rigtig) dg.rigtige++;
      // Spaced repetition: fejlede opgaver kommer igen en anden dag; klarede gentagelser fjernes
      // Samme opgave = samme type og frø (nøglen kan være tom for gentagelser fra før 04-10-2026)
      T.gentag = T.gentag.filter((x) => !(x.type === o.type && x.froe === o.froe) && (!x.noegle || x.noegle !== o.noegle));
      if (!rigtig) T.gentag.push(VO.gentagParametre(o, dato, svaerhed)); // kun parametre — opgaven bygges igen af koden
      T.gentag = T.gentag.slice(-10);
      // De senest viste opgaver (fase 1, 19-10-2026): dosis og prøve undgår dem de næste dage
      if (typeof o.noegle === 'string' && o.noegle) T.nylige = (Array.isArray(T.nylige) ? T.nylige : []).filter((k) => k !== o.noegle).concat([o.noegle]).slice(-G.MAX_NYLIGE);
      gemV();
    }

    function visDosisSlut(d) {
      const dage = dageTraenet();
      const tid = d.proeve && voksen.traening.proeveUr !== false ? ' · ' + minSek(Date.now() - d.start) : '';
      skift(h('div', { class: 'skaerm voksen' },
        topbar(d.proeve ? 'Prøve' : 'Dagens dosis', visMenu),
        h('div', { class: 'voksen-midte' },
          h('div', { class: 'dosis-resultat' }, d.rigtige + ' af ' + d.opgaver.length + tid),
          voksetLinje(d),
          h('p', { class: 'voksen-hjaelp' }, dage + (dage === 1 ? ' dag' : ' dage') + ' trænet i alt. Opgaver, der drillede, kommer igen en anden dag.'),
          h('div', { class: 'voksen-knaprad' },
            d.proeve
              ? h('button', { class: 'voksen-valg-knap', type: 'button', onclick: () => startProeve(voksen.traening.valgt) }, 'En prøve mere')
              : h('button', { class: 'voksen-valg-knap', type: 'button', onclick: () => startDosis(voksen.traening.valgt) }, 'En dosis mere'),
            h('button', { class: 'voksen-valg-knap', type: 'button', onclick: visMenu }, 'Til menuen')))));
      Lyd.fejring();
    }

    // Grafer og trekanter som SVG (egen tegning)
    function figurSvg(f) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'voksen-figur');
      svg.setAttribute('aria-hidden', 'true');
      const el = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); svg.append(n); return n; };
      if (f.art === 'retvinklet') {
        // Tegnet i rigtigt forhold: katete b vandret, katete a lodret
        svg.setAttribute('viewBox', '0 0 250 172');
        const s = Math.min(180 / f.b, 116 / f.a), W = f.b * s, H = f.a * s, x0 = 40, y0 = 146;
        el('polygon', { points: x0 + ',' + y0 + ' ' + (x0 + W) + ',' + y0 + ' ' + x0 + ',' + (y0 - H), class: 'fig-trekant' });
        el('rect', { x: x0, y: y0 - 14, width: 14, height: 14, class: 'fig-ret' });
        const t = (x, y, tekst, anker) => { const n = el('text', { x, y, class: 'fig-tekst', 'text-anchor': anker || 'middle' }); n.textContent = tekst; };
        t(x0 + W / 2, y0 + 21, f.spoerg === 'b' ? '?' : String(f.b));
        t(x0 - 8, y0 - H / 2 + 6, String(f.a), 'end');
        // Hypotenusen: etiketten lidt ud fra midten, væk fra den rette vinkel
        const L = Math.hypot(W, H);
        t(x0 + W / 2 + (H / L) * 16, y0 - H / 2 - (W / L) * 16 + 6, f.spoerg === 'c' ? '?' : String(f.c), 'start');
        return svg;
      }
      // Koordinatsystem −5 … 5
      svg.setAttribute('viewBox', '-5.5 -5.5 11 11');
      for (let k = -5; k <= 5; k++) {
        el('line', { x1: k, y1: -5, x2: k, y2: 5, class: 'fig-gitter' });
        el('line', { x1: -5, y1: k, x2: 5, y2: k, class: 'fig-gitter' });
      }
      el('line', { x1: -5.3, y1: 0, x2: 5.3, y2: 0, class: 'fig-akse' });
      el('line', { x1: 0, y1: -5.3, x2: 0, y2: 5.3, class: 'fig-akse' });
      const pkt = [];
      for (let x = -5; x <= 5.001; x += 0.1) {
        const y = f.art === 'linje' ? f.a * x + f.b : f.a * (x - f.p) * (x - f.p) + f.q;
        if (y >= -6 && y <= 6) pkt.push(x.toFixed(2) + ',' + (-y).toFixed(2));
      }
      el('polyline', { points: pkt.join(' '), class: 'fig-graf' });
      return svg;
    }

    // =================================================================
    //  Forældreoverblik — ét barn ad gangen, aldrig sammenligning
    // =================================================================
    function visOverblik(b) {
      if (!vagt()) return;
      const d = G.indlaesBarn(lager, b.noegle, b.navn).data;
      // Tid de sidste 7 dage
      const dage = [];
      for (let k = 6; k >= 0; k--) {
        const dt = new Date(); dt.setDate(dt.getDate() - k);
        const id = G.idag(dt);
        dage.push({ id, navn: ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'][dt.getDay()], min: Math.round(((d.dage[id] || {}).sek || 0) / 60) });
      }
      const maks = Math.max(10, ...dage.map((x) => x.min));
      const idag = dage[6];
      const soejler = h('div', { class: 'tid-soejler' }, dage.map((x) => h('div', { class: 'tid-soejle' },
        h('span', { class: 'tid-tal' }, x.min ? x.min + ' min' : ''),
        h('i', { style: 'height:' + Math.round((x.min / maks) * 100) + '%' }),
        h('small', null, x.navn))));
      // Verdener
      const raekke = (v, e, emneNavn) => {
        const pct = e && e.ialt ? Math.round((e.rigtige / e.ialt) * 100) : null;
        const status = !e ? 'Ikke prøvet endnu' : e.mestret ? 'Mestret ✓' : 'Trin ' + e.niveau + ' af 3';
        return h('tr', null, h('td', null, v.e + ' ' + v.navn), h('td', null, emneNavn), h('td', null, status),
          h('td', null, e ? e.runder + (e.runder === 1 ? ' runde' : ' runder') : ''), h('td', null, pct === null ? '' : pct + ' % rigtige i første forsøg'));
      };
      const verdener = VERDENER.filter((v) => !v.blandet).map((v) => raekke(v, d.emner[v.emne], O.EMNER[v.emne].navn));
      // Dansk (B4): samme slags overblik
      const danskRaekker = DANSK_VERDENER.map((v) => raekke(v, d.dansk[v.emne], D.EMNER[v.emne].navn));
      // Historiebogen (B5): hvor mange historier er læst, tegnet og skrevet
      if (D && D.HISTORIER) {
        const hs = Object.keys(d.historier || {}).map((k) => d.historier[k]);
        const faerdige = hs.filter((x) => x.faerdig).length, laest = hs.reduce((a, x) => a + x.bobler, 0), voksenHoert = hs.filter((x) => x.voksen).length;
        danskRaekker.push(h('tr', null, h('td', null, '📖 Historiebogen'), h('td', null, 'Læs, tegn og skriv'),
          h('td', null, faerdige + ' af ' + D.HISTORIER.length + ' færdige'), h('td', null, laest + (laest === 1 ? ' gang læst' : ' gange læst')),
          h('td', null, voksenHoert ? 'En voksen har hørt ' + voksenHoert + (voksenHoert === 1 ? ' historie' : ' historier') : '')));
      }
      // Bogstavjagt (B10): trin, runder og rigtige i første forsøg
      if (D && D.JAGT_TRIN) {
        const j = d.dansk.jagt;
        const pct = j && j.ialt ? Math.round((j.rigtige / j.ialt) * 100) : null;
        danskRaekker.push(h('tr', null, h('td', null, '🫧 Bogstavjagt'), h('td', null, 'Lyde → bogstav'),
          h('td', null, !j ? 'Ikke prøvet endnu' : 'Trin ' + j.niveau + ' af 3'), h('td', null, j ? j.runder + (j.runder === 1 ? ' runde' : ' runder') : ''),
          h('td', null, pct === null ? '' : pct + ' % rigtige i første forsøg')));
      }
      // Natur (natur-opgaver.js indlæses ikke her): «naturLort:raev» → «Gæt en lort: ræv» — id'erne staver æ/å som ae/aa
      // (test-natur tjekker det for hvert dyr)
      const beskrivNatur = (n) => (/^naturLort:[a-z]+$/.test(n) ? 'Gæt en lort: ' + n.slice(10).replace(/ae/g, 'æ').replace(/aa/g, 'å').replace(/oe/g, 'ø') : null);
      const beskriv = (n) => beskrivNatur(n) || (D && D.beskrivNoegle(n)) || O.beskrivNoegle(n);
      // Det driller (flest fejl, seneste først)
      const driller = [];
      for (const emne in d.fejl) for (const n in d.fejl[emne]) driller.push({ emne, n, antal: d.fejl[emne][n] });
      driller.sort((x, y) => y.antal - x.antal);
      const sidste = d.sidsteVerden && O.EMNER[d.sidsteVerden] ? d.sidsteVerden : 'taelle';
      const antalDyr = Object.keys(d.maerker).length;
      skift(h('div', { class: 'skaerm voksen overblik' },
        topbar(b.e + ' ' + b.navn, visLaastMenu),
        h('div', { class: 'overblik-indhold' },
          h('section', null, h('h2', null, 'Tid'), h('p', null, 'I dag: ' + idag.min + ' min' + (voksen.tidsgraense[b.id] ? ' (grænse ' + voksen.tidsgraense[b.id] + ' min)' : '') + ' · runder i alt: ' + d.runderIalt + ' · dyr i samlebogen: ' + antalDyr), soejler),
          h('section', null, h('h2', null, 'Matematik'), h('table', { class: 'overblik-tabel' }, verdener)),
          danskRaekker.length ? h('section', null, h('h2', null, 'Dansk'), h('table', { class: 'overblik-tabel' }, danskRaekker)) : null,
          h('section', null, h('h2', null, 'Det driller lige nu'),
            driller.length ? h('ul', null, driller.slice(0, 5).map((x) => h('li', null, beskriv(x.n) + ' — ' + x.antal + (x.antal === 1 ? ' gang' : ' gange'))))
              : h('p', null, 'Ingen opgaver, der driller endnu.')),
          h('section', null, h('h2', null, 'Idé til hjemmet'), h('p', null, O.HJEMME_IDEER[sidste])),
          h('p', { class: 'voksen-hjaelp' }, 'Overblikket viser kun ' + b.navn + '. Børnene sammenlignes ikke.'))));
    }

    // =================================================================
    //  Indstillinger
    // =================================================================
    // Optagere i Indstillinger (barnets navn): stoppes, når skærmen forlades eller tegnes igen, så mikrofonen slukker
    let navneOptagere = [];
    const stopNavneOptagere = () => { navneOptagere.forEach((o) => o.stop()); navneOptagere = []; };
    // Alle optagere (navnet i Indstillinger, Indtal): KASSERES, når låsen kommer frem igen (bfcache) — en halv optagelse
    // må ikke gemmes som barnets navneklip. ⬅️ i Indstillinger gemmer derimod (stopNavneOptagere → stop).
    let indtalOptager = null;
    const stopOptagere = () => { navneOptagere.forEach((o) => o.afbryd()); navneOptagere = []; if (indtalOptager) indtalOptager.afbryd(); };

    // =================================================================
    //  Barnets eget navn (12-10-2026): skrives af barnet første gang (app.js) og kan rettes her («Mit navn»). Navnet findes
    //  kun på denne enhed (og i «Gem en kopi»). Som tekst står det kun her — spillet viser Dino/Enhjørning (13-10-2026). Det
    //  skrives aldrig i en besked og siges aldrig af stemmen: talt navn er kun en optagelse (navneklip i IndexedDB), som
    //  aldrig forlader enheden. Barnet kan ikke selv omdøbe sig (søskende).
    // =================================================================
    function navnBlok(b) {
      const LK = window.Lydklip, KL = ctx.KlipLager;
      const klipId = LK.navnKlipId(b.id);
      const status = h('p', { class: 'navn-status', role: 'status' }, '');
      const besked = (t) => { status.textContent = t; };
      const FEJL = {
        ulaeselig: 'Barnets gemte data kunne ikke læses, så navnet kan ikke gemmes. Se «Sikkerhedskopi» nedenfor.',
        gammel: 'Navnet kan ikke gemmes, fordi lageret er fuldt. Tag en kopi under «Sikkerhedskopi», og prøv igen.',
        fuldt: 'Navnet kunne ikke gemmes, fordi lageret er fuldt. Tag en kopi under «Sikkerhedskopi», og prøv igen.',
        ukendt: 'Navnet kunne ikke gemmes.',
      };
      // Kun egetNavn og navnSpurgt ændres i barnets gemte data (gem.js retEgetNavn). Barnets side læser dem igen (storage).
      // glem: navnet er ændret eller slettet (eller barnet skal skrive det igen) — så slettes optagelsen, ellers ville
      // spillet sige det gamle navn
      const ret = (fn, ok, glem) => {
        const r = G.retEgetNavn(lager, b.noegle, b.navn, fn);
        besked(r.ok ? ok : FEJL[r.fejl] || FEJL.ukendt);
        opdater();
        if (r.ok && glem && ctx.Lyd.harLokaltKlip(klipId)) {
          KL.slet('klip', klipId).then(() => { ctx.Lyd.fjernLokaltKlip(klipId); besked(ok + ' Optagelsen er slettet.'); opdater(); },
            () => besked(ok + ' Optagelsen kunne ikke slettes her på enheden.'));
        }
        return r.ok;
      };
      // Enter gemmer (også dér, hvor formularens egen Enter ikke sender — fx WebKit på Windows)
      const felt = h('input', {
        class: 'navn-felt', type: 'text', id: 'navn-' + b.id, maxlength: String(G.MAX_NAVN), autocomplete: 'off',
        autocapitalize: 'words', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done', 'aria-describedby': 'navn-hint-' + b.id,
        onkeydown: (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); Lyd.init(); Lyd.tryk(); gemNavn(); } },
      });
      felt.value = G.laesEgetNavn(lager, b.noegle) || '';
      const gemNavn = () => {
        const foer = G.laesEgetNavn(lager, b.noegle);
        const n = G.normaliserEgetNavn(felt.value);
        if (ret((d) => G.saetEgetNavn(d, felt.value), n ? 'Navnet er gemt.' : 'Navnet er slettet.', n !== foer)) felt.value = n || '';
      };
      const form = h('form', { class: 'navn-form', onsubmit: (e) => { e.preventDefault(); Lyd.init(); Lyd.tryk(); gemNavn(); } },
        h('label', { class: 'navn-etiket', for: 'navn-' + b.id }, 'Mit navn'),
        felt,
        h('button', { class: 'voksen-valg-knap navn-gem', type: 'submit' }, 'Gem navnet'),
        h('span', { class: 'navn-hint', id: 'navn-hint-' + b.id }, 'Højst 12 tegn.')); // = G.MAX_NAVN (test-navn)
      const sletNavn = h('button', { class: 'voksen-valg-knap navn-slet', type: 'button', onclick: () => {
        Lyd.init(); Lyd.tryk();
        if (ret((d) => G.saetEgetNavn(d, ''), 'Navnet er slettet.', true)) felt.value = '';
      } }, '🗑️ Slet navnet');
      const igen = h('button', { class: 'voksen-valg-knap navn-igen', type: 'button', onclick: () => {
        Lyd.init(); Lyd.tryk();
        ret((d) => { delete d.navnSpurgt; }, 'Næste gang barnet trykker ▶, spørger spillet om navnet.', true);
      } }, '✏️ Lad barnet skrive navnet igen');
      // Optagelsen: barnet siger selv sit navn (eller du gør). Højst 3 sekunder; kun på denne enhed.
      const optager = lavOptager({
        maxSek: 3,
        stopTekst: '⏹ Stop',
        status: besked,
        startTekst: () => 'Optager i højst 3 sekunder — sig navnet, og tryk ⏹ Stop.',
        gemt: () => { besked('Optagelsen er gemt. Tryk ▶ Lyt for at høre den.'); opdater(); },
      });
      navneOptagere.push(optager);
      const optag = h('button', { class: 'voksen-valg-knap navn-optag', type: 'button', onclick: (e) => { Lyd.init(); optager.optag(klipId, e.currentTarget); } }, '🔴 Optag navnet');
      const lyt = h('button', { class: 'voksen-valg-knap navn-lyt', type: 'button', onclick: () => {
        Lyd.init();
        if (!voksen.tale) { besked('Oplæsning er slået fra under «Lyd» — slå den til for at høre optagelsen.'); return; }
        ctx.Lyd.klip(klipId, '');
      } }, '▶ Lyt');
      const sletKlip = h('button', { class: 'voksen-valg-knap navn-slet-klip', type: 'button', onclick: async () => {
        Lyd.init(); Lyd.tryk();
        try { await KL.slet('klip', klipId); } catch (e) { besked('Optagelsen kunne ikke slettes her på enheden.'); return; }
        ctx.Lyd.fjernLokaltKlip(klipId);
        besked('Optagelsen er slettet.');
        opdater();
      } }, '🗑️ Slet optagelsen');
      // En optagelse uden navn bruges aldrig (harNavneklip i app.js kræver begge) — derfor først navnet, så optagelsen
      const foerst = h('p', { class: 'navn-hjaelp navn-foerst' }, 'Skriv navnet først — så kan du optage det.');
      function opdater() {
        const harNavn = !!G.laesEgetNavn(lager, b.noegle);
        const harKlip = ctx.Lyd.harLokaltKlip(klipId);
        sletNavn.disabled = !harNavn;
        optag.disabled = !harNavn && !optager.optager(); // en igangværende optagelse kan altid stoppes
        foerst.hidden = harNavn;
        lyt.disabled = !harKlip;
        sletKlip.disabled = !harKlip;
      }
      opdater();
      return h('div', { class: 'navn-blok' },
        h('h3', null, 'Navn'),
        h('p', { class: 'navn-hjaelp' }, 'Barnet skriver og indtaler selv sit navn, første gang det trykker ▶. Spillet viser stadig ' + b.navn + ' — navnet står kun her og siges kun fra optagelsen (barnets egen, eller din nedenfor). Det bliver på denne enhed (og i «Gem en kopi»).'),
        form,
        h('div', { class: 'voksen-knaprad navn-knaprad' }, sletNavn, igen),
        h('p', { class: 'navn-hjaelp' }, 'Optag navnet, så spillet kan sige det: «Hej!» ved start og «Du klarede det!» eller «Prøv igen» med navnet, højst én gang hver anden runde. Barnet kan selv sige det, eller du kan. Uden optagelse siges sætningerne uden navn.'),
        optager.kan ? foerst : null,
        h('div', { class: 'voksen-knaprad navn-knaprad' }, optager.kan ? optag : null, lyt, sletKlip),
        optager.kan ? null : h('p', { class: 'navn-hjaelp' }, 'Denne browser kan ikke optage lyd.'),
        status);
    }

    function visIndstillinger() {
      if (!vagt()) return;
      stopNavneOptagere();
      const skifter = (label, til, fn) => {
        const k = h('button', { class: 'skifter' + (til ? ' til' : ''), type: 'button', role: 'switch', 'aria-checked': til ? 'true' : 'false' }, h('span', { class: 'skifter-knop' }));
        // fn kan returnere false for at afvise skiftet (fx det sidste emne, der er slået til)
        k.addEventListener('click', () => { Lyd.init(); const ny = !k.classList.contains('til'); if (fn(ny) === false) { Lyd.blid(); return; } k.classList.toggle('til', ny); k.setAttribute('aria-checked', ny ? 'true' : 'false'); gemV(); });
        return h('label', { class: 'indstilling' }, h('span', null, label), k);
      };
      const tidsvalg = (b) => h('div', { class: 'indstilling' }, h('span', null, 'Tidsgrænse pr. dag'),
        h('div', { class: 'tidsvalg' }, [0, 10, 15, 20, 30].map((m) => h('button', {
          class: 'tidsvalg-knap' + (voksen.tidsgraense[b.id] === m ? ' valgt' : ''), type: 'button',
          onclick: (e) => { Lyd.init(); Lyd.tryk(); voksen.tidsgraense[b.id] = m; gemV(); e.currentTarget.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('valgt', x === e.currentTarget)); },
        }, m ? m + ' min' : 'Ingen'))));
      // B10: et valg blandt få muligheder (samme knapper som tidsgrænsen)
      const valgRaekke = (label, felt, muligheder, tekst, kl) => h('div', { class: 'indstilling ' + (kl || '') }, h('span', null, label),
        h('div', { class: 'tidsvalg' }, muligheder.map((m) => h('button', {
          class: 'tidsvalg-knap' + (voksen[felt] === m ? ' valgt' : ''), type: 'button', 'data-v': m,
          onclick: (e) => { Lyd.init(); Lyd.tryk(); voksen[felt] = m; gemV(); e.currentTarget.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('valgt', x === e.currentTarget)); },
        }, tekst(m)))));
      const barnBlok = (b) => h('section', null, h('h2', null, b.navn),
        navnBlok(b),
        tidsvalg(b),
        skifter('Åbn alle verdener', voksen.aabneAlle[b.id], (v) => { voksen.aabneAlle[b.id] = v; }),
        ...[['Matematik', VERDENER.filter((v) => !v.blandet)], ['Dansk', DANSK_VERDENER]].filter((x) => x[1].length).map(([titel, liste]) =>
          h('div', { class: 'emne-liste' }, h('h3', null, titel), liste.map((v) =>
            skifter(v.e + ' ' + v.navn, voksen.emner[b.id][v.emne] !== false, (til) => {
              if (til) { delete voksen.emner[b.id][v.emne]; return true; }
              // Mindst ét emne pr. fag skal være slået til, ellers er der intet at spille
              const tilbage = liste.filter((x) => x.emne !== v.emne && voksen.emner[b.id][x.emne] !== false);
              if (!tilbage.length) { alert('Mindst én verden skal være slået til.'); return false; }
              voksen.emner[b.id][v.emne] = false;
              return true;
            })))));
      const backups = G.findBackups(lager).filter((k) => k.indexOf('_backup_') > 0);
      // Ulæselige data uden plads til en reservekopi: spillet gemmer ikke, før de er taget med i en kopi og ryddet
      const ulaeselige = G.findUlaeselige(lager);
      const navnPaa = (k) => {
        if (k === 'mat_voksen_v1') return 'voksendelens indstillinger';
        const b = BOERN.find((x) => x.noegle === k || x.noegle === G.nyNoegle(k));
        return b ? b.bestemt + 's ' + (b.noegle === k ? 'data' : 'gamle data') : k;
      };
      // Ryd sletter kun, når den voksne har valgt kopi-filen, og filen indeholder præcis de ulæselige data,
      // der ligger nu (en download kan mislykkes uden besked på iPad — så slettes intet)
      const rydKnap = h('button', {
        class: 'voksen-valg-knap ryd-knap', type: 'button',
        onclick: () => vaelgFil((obj) => {
          const nu = G.findUlaeselige(lager);
          const r = obj && typeof obj.reservekopier === 'object' && obj.reservekopier ? obj.reservekopier : {};
          const ok = nu.filter((k) => r[k] === lager.getItem(k));
          if (!nu.length) { alert('Der er ingen ulæselige data længere.'); location.reload(); return; }
          if (ok.length < nu.length) { alert('Den valgte fil indeholder ikke de ulæselige data, der ligger nu. Tryk «Gem en kopi», og vælg den nye fil.'); return; }
          if (!confirm('Filen indeholder de ulæselige data. Slette ' + ok.map(navnPaa).join(' og ') + ' her på enheden? Spillet starter forfra for dem.')) return;
          ok.forEach((k) => { try { lager.removeItem(k); } catch (e) { /* intet lager */ } });
          location.reload();
        }),
      }, '🧹 Ryd ulæselige data');
      // Kun kopier under de nye nøgler kan fortrydes (en kopi fra før omdøbningen ville overskrive nyere data)
      const kanFortryde = G.kanFortryde(lager);
      skift(h('div', { class: 'skaerm voksen indstillinger' },
        topbar('Indstillinger', () => { stopNavneOptagere(); visLaastMenu(); }),
        h('div', { class: 'overblik-indhold' },
          h('section', null, h('h2', null, 'Lyd'),
            skifter('Lydeffekter', voksen.lyd, (v) => { voksen.lyd = v; }),
            skifter('Oplæsning', voksen.tale, (v) => { voksen.tale = v; })),
          stemmeSektion(),
          h('section', null, h('h2', null, 'Runder og pauser'),
            valgRaekke('Opgaver pr. runde', 'opgaverPrRunde', [5, 8, 10], (m) => String(m), 'opgaver-pr-runde'),
            valgRaekke('Bevægelsespause efter', 'pauseEfter', [2, 3, 4], (m) => m + ' runder', 'pause-efter'),
            h('p', { class: 'voksen-hjaelp' }, 'Gælder både matematik og dansk. En pause er tre rolige øvelser (ca. halvandet minut).')),
          h('section', null, h('h2', null, 'Din træning'),
            skifter('Huskekort før dagens dosis', voksen.traening.huskekort !== false, (v) => { voksen.traening.huskekort = v; }),
            skifter('Ur i prøven', voksen.traening.proeveUr !== false, (v) => { voksen.traening.proeveUr = v; }),
            skifter('Skriv tal-svar selv (taltastatur)', voksen.traening.tastatur === true, (v) => { voksen.traening.tastatur = v; })),
          ...BOERN.map(barnBlok),
          h('section', null, h('h2', null, 'Sikkerhedskopi'),
            h('p', null, 'Fremskridtet ligger kun på denne iPad. Gem en kopi engang imellem — fx som mail til dig selv.'),
            BOERN.some((b) => G.laesEgetNavn(lager, b.noegle)) ? h('p', { class: 'navn-hjaelp' }, 'Kopien indeholder barnets navn — gem den kun et sted, du stoler på.') : null,
            ulaeselige.length ? h('div', { class: 'voksen-advarsel' },
              h('p', null, '⚠️ ' + ulaeselige.map(navnPaa).join(' og ') + ' kunne ikke læses, og der var ikke plads til en reservekopi. Spillet gemmer derfor ikke. Tryk først «Gem en kopi» (så kommer de ulæselige data med i filen), og derefter «Ryd ulæselige data», hvor du vælger filen.'),
              rydKnap) : null,
            backups.length ? h('p', { class: 'voksen-advarsel' }, '⚠️ Nogle gemte data kunne ikke læses og ligger som reservekopi (' + backups.join(', ') + '). Tryk «Gem en kopi», så de kommer med i filen (de indlæses ikke igen, men kan reddes af en, der kan læse JSON).') : null,
            h('div', { class: 'voksen-knaprad' },
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: gemKopi }, '💾 Gem en kopi'),
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: indlaesKopi }, '📂 Indlæs en kopi'),
              kanFortryde ? h('button', { class: 'voksen-valg-knap', type: 'button', onclick: fortrydIndlaesning }, '↩️ Fortryd seneste indlæsning') : null)),
          opstartSektion())));
    }

    // Opstart (13-10-2026): højst de 10 seneste starter af spillet på denne enhed (app.js maalOpstart → G.noterOpstart),
    // nyeste øverst — så en langsom start (sort skærm) kan måles på iPhone uden en Mac. Kun tal; et ukendt tal er «–».
    function opstartSektion() {
      const liste = G.laesOpstart(lager).slice().reverse();
      const SIDER = ['Forside', 'Dino', 'Enhjørning', 'Voksen']; // samme rækkefølge som G.OPSTART_SIDER
      const ms = (v) => (v === null ? '–' : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
      const p2 = (n) => String(n).padStart(2, '0');
      const tid = (t) => { const d = new Date(t); return p2(d.getDate()) + '-' + p2(d.getMonth() + 1) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
      // De vigtigste kolonner først — de står helt fremme ned til 360 px bredde; resten ruller vandret ind (app.css)
      const KOLONNER = ['Tidspunkt', 'Skærm', 'Svar', 'SW', 'Side', 'FCP', 'SW-tid'];
      const TEKST = ['Tidspunkt', 'SW', 'Side']; // venstrestillet (opstart-tekst); tallene står til højre
      const tabel = h('div', { class: 'opstart-rulle', role: 'region', 'aria-labelledby': 'opstart-titel', tabindex: '0' },
        h('table', { class: 'overblik-tabel' },
          h('thead', null, h('tr', null, KOLONNER.map((k) => h('th', { scope: 'col', class: TEKST.includes(k) ? 'opstart-tekst' : null }, k)))),
          h('tbody', null, liste.map((m) => h('tr', null,
            h('td', { class: 'opstart-tekst' }, tid(m.t)),
            h('td', { class: 'opstart-skaerm' }, ms(m.skaerm)),
            h('td', null, ms(m.rs)),
            h('td', { class: 'opstart-tekst' }, m.st === null ? '–' : m.st ? 'ja' : 'nej'),
            h('td', { class: 'opstart-tekst' }, m.s === null ? '–' : SIDER[m.s]),
            h('td', null, ms(m.fcp)),
            h('td', null, ms(m.sw)))))));
      return h('section', { class: 'opstart' }, h('h2', { id: 'opstart-titel' }, 'Opstart'),
        h('p', null, 'De seneste starter af spillet (højst 10) på denne enhed, i millisekunder fra siden blev åbnet.'),
        liste.length ? tabel : h('p', { class: 'opstart-tom' }, 'Ingen målinger endnu.'),
        liste.length ? h('p', { class: 'opstart-hjaelp' },
          '«Skærm» er, når den første skærm var tegnet — før det er skærmen sort. ' +
          '«FCP» er det første, browseren tegnede, og «Svar» er, når siden kom frem. ' +
          '«SW» er ja, når service workeren styrede siden, og «SW-tid» er den del af svaret, den brugte.') : null);
    }

    // Stemme: Lystårnets stemme (Piper-filerne i tale/, når de findes) øverst, derunder de danske stemmer på enheden
    // med «Prøv». Valget gemmes som stemmens navn; tomt = Lystårnets stemme, eller uden filer et automatisk valg
    // (findes den valgte ikke længere, også): «Premium/Enhanced/Forbedret» → ikke «compact» → lokal → første danske.
    function stemmeSektion() {
      const LK = window.Lydklip;
      const P = ctx.Piper;
      const harPiper = !!(P && P.findes && P.findes());
      const alle = Tale.findes ? (window.speechSynthesis.getVoices() || []) : [];
      const da = LK ? LK.danskeStemmer(alle) : [];
      const auto = LK ? LK.vaelgStemme(alle, null) : null;
      // iPad henter stemmerne lidt efter sidens start: vis listen igen, når de kommer
      if (!da.length && Tale.findes && window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener('voiceschanged', () => { if (document.querySelector('.indstillinger') && LK && LK.danskeStemmer(window.speechSynthesis.getVoices()).length) visIndstillinger(); }, { once: true });
      }
      const proev = (v) => {
        Lyd.init();
        if (Tale.stopPiper) Tale.stopPiper(); // en Piper-prøve, der kører, stopper
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance('Hej! Jeg hedder ' + (v ? v.name.replace(/\s*\(.*\)\s*/g, '') : 'Lystårnet') + '. Tre og to er fem.');
          u.lang = 'da-DK'; if (v) u.voice = v; u.rate = 0.92;
          window.speechSynthesis.speak(u);
        } catch (e) { /* ingen tale */ }
      };
      // Lystårnets stemme: den første faste sætning, der findes helt som filer. Spilles direkte fra filerne (ikke
      // Tale.sig), så prøven lyder af Piper, også når en enhedsstemme er valgt, eller Oplæsning er slået fra.
      const PIPER_PROEVER = ['Hej! Jeg læser opgaverne højt.', 'Hej! Tre og to er fem.', 'Hvor mange er der i alt?'];
      const proevPiper = () => {
        Lyd.init();
        const s = PIPER_PROEVER.find((x) => window.Talefiler.enheder(x).every((e) => P.noegle(e)));
        if (!s) { proev(auto); return; }
        Tale.stop();
        Tale.spilPiper(s, () => {}, false);
      };
      // Hvor meget af stemmen er hentet til brug uden net (Piper.hentAlle i app.js tæller op i baggrunden)
      const tal = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const statusTekst = () => (P.status
        ? 'Stemmen er hentet til brug uden net: ' + tal(P.status.hentet) + ' af ' + tal(P.status.iAlt)
        : 'Stemmen hentes, når den bruges.');
      const status = harPiper && P.slaaetTil() ? h('p', { class: 'voksen-hjaelp stemme-status' }, statusTekst()) : null;
      if (status) {
        const t = setInterval(() => { if (!document.body.contains(status)) { clearInterval(t); return; } status.textContent = statusTekst(); }, 2000);
      }
      const vaelg = (navn) => {
        voksen.stemme = navn;
        gemV();
        if (Tale.opdaterStemmer) Tale.opdaterStemmer();
        visIndstillinger();
      };
      const raekke = (navn, label, proevFn) => h('div', { class: 'stemme-raekke' },
        h('button', { class: 'voksen-valg-knap stemme-valg' + ((voksen.stemme || null) === navn ? ' valgt' : ''), type: 'button', 'aria-pressed': (voksen.stemme || null) === navn ? 'true' : 'false', onclick: () => { Lyd.init(); Lyd.tryk(); vaelg(navn); } }, label),
        h('button', { class: 'voksen-valg-knap stemme-proev', type: 'button', onclick: proevFn }, '🔊 Prøv'));
      const foerste = harPiper ? raekke(null, 'Lystårnets stemme (anbefalet)', proevPiper)
        : da.length ? raekke(null, 'Automatisk' + (auto ? ' (' + auto.name + ')' : ''), () => proev(auto)) : null;
      return h('section', null, h('h2', null, 'Stemme'),
        foerste ? h('div', { class: 'stemme-liste' },
          foerste,
          da.map((v) => raekke(v.name, v.name + (v.localService ? '' : ' (kræver net)'), () => proev(v)))) : null,
        status,
        da.length ? null : h('p', null, 'Der er ingen danske stemmer på denne enhed endnu. På iPad: Indstillinger → Tilgængelighed → Talt indhold → Stemmer → Dansk. Hent en stemme, hvor der står «Forbedret» eller «Premium».'),
        h('p', { class: 'voksen-hjaelp' }, 'Bogstavlyde siges aldrig af stemmen — spillet siger fx «lyden i sol».'),
        bogstavOptagelser());
    }

    // Bogstavoptagelser fra 🎙️ Indtal på denne enhed (skjult 14-10-2026): de spilles ikke, men kan slettes her
    function bogstavOptagelser() {
      const status = h('p', { class: ['voksen-hjaelp', 'bogstav-status'].join(' '), role: 'status' }, '');
      const forklaring = h('p', { class: ['voksen-hjaelp', 'bogstav-optagelser'].join(' ') }, 'Dine bogstavoptagelser bruges ikke i spillet lige nu, men de ligger stadig på denne enhed.');
      const slet = sletBogstavKnap({ status: (t) => { status.textContent = t; forklaring.hidden = slet.knap.hidden; } });
      forklaring.hidden = slet.knap.hidden;
      return h('div', null, forklaring, h('div', { class: 'voksen-knaprad' }, slet.knap), status);
    }

    // 🗑️ Bogstavoptagelserne på denne enhed (IndexedDB): de slettes kun på den voksnes tryk — efter en bekræftelse. Kun
    // id'er fra LYDLISTE: barnets navn (egetnavn-*) og tegningerne røres aldrig. Knappen står kun der, når der findes en
    // bogstavoptagelse. valg.foer() kører lige før sletningen (fx stop en optagelse), valg.status(tekst) bagefter.
    function sletBogstavKnap(valg) {
      const LK = window.Lydklip;
      const liste = (window.Dansk && window.Dansk.LYDLISTE) || [];
      const ids = () => liste.map((l) => l.id).filter((id) => !LK.erNavnKlip(id) && ctx.Lyd.harLokaltKlip(id));
      const knap = h('button', { class: 'voksen-valg-knap indtal-slet-alle', type: 'button', onclick: () => slet() }, '🗑️ Slet optagelserne på denne enhed');
      const opdater = () => { knap.hidden = ids().length === 0; };
      async function slet() {
        const alle = ids();
        if (!alle.length) return;
        if (!confirm('Slette alle bogstavoptagelser på denne enhed? De bruges ikke i spillet. Barnets navn og tegningerne bliver.')) return;
        if (valg.foer) valg.foer();
        let fejl = 0;
        for (const id of alle) {
          try { await ctx.KlipLager.slet('klip', id); ctx.Lyd.fjernLokaltKlip(id); } catch (e) { fejl++; }
        }
        opdater();
        valg.status(fejl ? 'Nogle optagelser kunne ikke slettes. Prøv igen.' : 'Optagelserne er slettet.');
      }
      opdater();
      return { knap, opdater };
    }

    function gemKopi() {
      // Spillets data + reservekopier af ulæselige data for sig (de kommer med ud af iPad'en, men indlæses ikke igen)
      const tekst = JSON.stringify(G.lavKopi(lager), null, 1);
      try {
        const blob = new Blob([tekst], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: 'lystaarnet-kopi-' + G.idag() + '.json' });
        document.body.append(a); a.click(); a.remove();
      } catch (e) {
        if (navigator.clipboard) navigator.clipboard.writeText(tekst).then(() => alert('Kopien er lagt i udklipsholderen.'));
      }
    }

    // Emner, mærker og voksenverdener, som spillet kender — alt andet i en fil droppes ved indlæsning
    function kendteNoegler() {
      const emner = { taarn: 1 };
      for (const k of Object.keys(O.EMNER)) emner[k] = O.EMNER[k].maxNiveau;
      if (D) for (const k of Object.keys(D.EMNER)) emner[k] = D.EMNER[k].maxNiveau;
      const maerker = [];
      for (const k of Object.keys(O.MAERKER)) O.MAERKER[k].forEach((m) => maerker.push(m.id));
      const voksenEmner = {};
      for (const k of Object.keys(VO.VOKSEN_EMNER)) voksenEmner[k] = VO.VOKSEN_EMNER[k].maxNiveau;
      return { emner, maerker, voksenEmner };
    }

    // Vælg en kopi-fil og læs den som JSON (højst MAX_KOPI_BYTES)
    function vaelgFil(naar) {
      const fil = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
      fil.addEventListener('change', () => {
        const f = fil.files && fil.files[0];
        if (!f) return;
        // En rigtig kopi fylder højst nogle hundrede kB — en stor fil er ikke fra spillet (og kunne fylde lageret)
        if (f.size > MAX_KOPI_BYTES) { alert('Filen er for stor til at være en kopi fra spillet.'); return; }
        const r = new FileReader();
        r.onload = () => {
          let obj;
          try { obj = JSON.parse(r.result); } catch (e) { alert('Filen kunne ikke læses.'); return; }
          naar(obj);
        };
        r.readAsText(f);
      });
      document.body.append(fil);
      fil.click();
      setTimeout(() => fil.remove(), 60000);
    }

    function indlaesKopi() {
      vaelgFil((obj) => {
        if (!obj || typeof obj !== 'object' || !obj.data || typeof obj.data !== 'object') { alert('Filen indeholder ingen data fra spillet.'); return; }
        if (!confirm('Indlæse kopien fra ' + (obj.dato || 'ukendt dato') + '? Det nuværende gemmes som backup først (kan fortrydes).')) return;
        // gem.js tjekker og normaliserer alt, gemmer backups med løbenummer og skriver først derefter
        const res = G.importer(lager, obj, new Date().toISOString().replace(/[:.]/g, '-'), kendteNoegler());
        if (!res.ok) { alert(res.fejl); if (!res.noegler.length) return; }
        else alert('Kopien er indlæst.');
        location.reload();
      });
    }

    // Fortryd: data fra før seneste indlæsning bliver de gældende igen
    function fortrydIndlaesning() {
      if (!confirm('Fortryde seneste indlæsning? Data fra før indlæsningen bliver de gældende igen. Det, der er spillet siden, gemmes som en kopi og kommer med i «Gem en kopi».')) return;
      const navn = (k) => ({ mat_dino_v1: 'Dino', mat_enhjorning_v1: 'Enhjørning', mat_voksen_v1: 'voksendelen' }[k] || k);
      const kunne = Object.keys(G.importKopier(lager)).filter((k) => !G.nyNoegle(k));
      const rullet = G.fortrydImport(lager);
      if (!rullet.length) alert('Intet blev fortrudt — lageret er måske fuldt. Tag en kopi med «Gem en kopi», og prøv igen.');
      else if (rullet.length < kunne.length) alert('Kun ' + rullet.map(navn).join(' og ') + ' blev fortrudt — lageret er måske fuldt.');
      else alert('Fortrudt.');
      location.reload();
    }

    // =================================================================
    //  Familieduel — barn og voksen på samme skærm, hver sit niveau, fælles mål, ingen hastighedspoint
    // =================================================================
    function visDuelValg() {
      skift(h('div', { class: 'skaerm voksen' },
        topbar('Familieduel', visMenu),
        h('p', { class: 'voksen-hjaelp' }, 'Barnet får en opgave fra sin egen verden, den voksne en gymnasieopgave med samme idé. Hvert rigtigt svar giver en stjerne til det fælles mål: at klække Dinoens æg eller åbne Enhjørningens gave. Ingen ur. Tip: Sig dit svar højt, og lad barnet trykke på din knap.'),
        h('div', { class: 'menu-gitter' }, BOERN.map((b) => h('button', { class: 'menu-kort', type: 'button', onclick: () => { Lyd.init(); Lyd.tryk(); startDuel(b); } },
          h('span', { class: 'menu-ikon', 'aria-hidden': 'true' }, b.e), h('b', null, b.navn + ' og en voksen'))))));
    }

    function startDuel(b) {
      const barnData = G.indlaesBarn(lager, b.noegle, b.navn).data;
      // Barnets ven som i børnedelen (minFigur): en ven, perlerne ikke har låst op, falder tilbage til temaets første ven
      const figId = O.valgtVen(barnData.figur, barnData.perler, Object.keys(FIGURER), b.figur);
      const fig = FIGURER[figId];
      // Barnets emne: den verden, barnet sidst spillede (ikke Lystårnet), ellers plus til 10
      const sidste = VERDENER.find((v) => v.id === barnData.sidsteVerden); // verdens-id → emne (Klokketorvet: «maaling»)
      const emne = sidste && O.EMNER[sidste.emne] ? sidste.emne : 'plus10';
      const niveau = barnData.emner[emne] ? barnData.emner[emne].niveau : 1;
      const MAAL = 10;
      const tilstand = { stjerner: 0 };
      const maaler = h('div', { class: 'duel-maaler', 'aria-label': 'Fælles stjerner' }, Array.from({ length: MAAL }, () => h('i', null, '★')));
      // Det fælles mål: Dinoens æg eller Enhjørningens gave vokser og vipper for hver stjerne — og klækkes ved 10
      const aeg = h('span', { class: 'duel-aeg', 'aria-hidden': 'true' }, b.gave ? '🎁' : '🥚');
      const barnFelt = h('div', { class: 'duel-felt barn' });
      const voksenFelt = h('div', { class: 'duel-felt voksen-side' });
      skift(h('div', { class: 'skaerm voksen duel' },
        topbar('Familieduel', () => { gemDuel(); visMenu(); }),
        h('div', { class: 'duel-baand' }, maaler, aeg), // det fælles mål — stort og midt på, så barnet kan se det
        h('div', { class: 'duel-krop' }, barnFelt, voksenFelt)));

      function stjerne() {
        tilstand.stjerner++;
        const i = maaler.children[tilstand.stjerner - 1];
        if (i) { i.classList.add('fuld'); hop(i, 'pop'); }
        aeg.style.setProperty('--vokset', Math.min(1, tilstand.stjerner / MAAL));
        hop(aeg, 'vip');
        if (tilstand.stjerner >= MAAL) setTimeout(() => { if (aktiv()) faelledsMaal(); }, 900);
      }
      const aktiv = () => document.body.contains(maaler); // stop gamle timere, når skærmen er skiftet

      function nyBarneopgave() {
        if (!aktiv()) return;
        const r = rng();
        const typer = O.EMNER[emne].niveauer[niveau];
        let o;
        let f = 0;
        do { o = O.puljeOpgave(O.vaelg(r, typer), niveau, r, null); f++; } while (!o.valg && f < 20); // fast pulje (Piper)
        barnFelt.textContent = '';
        const vis = h('div', { class: 'visning duel-visning' });
        vis.append(tegnVisning(o));
        const knapper = o.valg.map((x) => {
          const k = h('button', { class: 'valg-knap', type: 'button', 'data-v': x }, valgIndhold(o, x));
          k.addEventListener('click', () => {
            Lyd.init();
            if (x === o.svar) {
              k.classList.remove('vis-svar'); k.classList.add('rigtig'); Lyd.rigtig();
              knapper.forEach((kk) => { kk.disabled = true; });
              stjerne();
              setTimeout(nyBarneopgave, 1100);
            } else {
              // Hjælp i duellen: det rigtige svar lyser, og barnet trykker på det
              Lyd.blid();
              knapper.forEach((kk) => {
                if (kk.getAttribute('data-v') === String(o.svar)) { kk.classList.add('vis-svar'); kk.disabled = false; }
                else { kk.classList.add('forkert'); kk.disabled = true; }
              });
              Tale.sig(typeof o.svar === 'number' ? 'Det er ' + o.svar + '. Tryk på ' + o.svar + '.' : 'Tryk på den, der lyser.');
            }
          });
          return k;
        });
        barnFelt.append(
          h('div', { class: 'duel-hoved' }, h('span', { class: 'duel-figur', 'aria-hidden': 'true' }, venTegning(figId)),
            h('span', { class: 'duel-opgave' }, h('span', { class: 'opgave-ikon', 'aria-hidden': 'true' }, o.ikon || ''), ' ' + (o.tekst || '')),
            h('button', { class: 'ikon-knap', type: 'button', 'aria-label': 'Læs op', onclick: () => Tale.sig(o.tale) }, '🔊')),
          vis,
          h('div', { class: 'valg duel-valg antal-' + knapper.length + (o.valgArt ? ' valg-' + o.valgArt : '') }, knapper));
        Tale.sig(o.tale);
      }

      function nyVoksenopgave() {
        if (!aktiv()) return;
        const T = voksen.traening;
        // Tvillingeopgave: samme idé som barnets verden (det gemte tal ↔ ligninger osv.), ellers den valgte verden
        let o = VO.lavTvilling(emne, traeningNiveauer(), rng());
        if (!o) {
          const valgt = T.valgt;
          const n = T.emner[valgt] ? T.emner[valgt].niveau : 1;
          o = VO.lavVoksenOpgave(O.vaelg(rng(), VO.VOKSEN_EMNER[valgt].typer[n]), n, rng());
        }
        const E = VO.VOKSEN_EMNER[o.emne];
        voksenFelt.textContent = '';
        const forkl = h('div', { class: 'voksen-forklaring skjult' });
        const knapper = o.valg.map((v) => {
          const k = html('button', 'voksen-valg-knap', v.vis);
          k.type = 'button';
          k.addEventListener('click', () => {
            Lyd.init();
            knapper.forEach((kk, i) => { kk.disabled = true; if (o.valg[i].id === o.svar) kk.classList.add('rigtig'); });
            const rigtig = v.id === o.svar;
            if (rigtig) { Lyd.rigtig(); stjerne(); } else { k.classList.add('forkert'); Lyd.blid(); }
            // Bevidst uden «Vennen er vokset» (review af B 17-10-2026, fund 6): duellen og fejringen af det fælles mål er
            // barnets. Et nyt trin for den voksne gemmes her (registrerTraening → opdaterTrin) og ses i menuen bagefter.
            registrerTraening(o, rigtig, G.idag());
            forkl.innerHTML = (rigtig ? '' : (v.fejl ? '<b>Typisk fejl:</b> ' + v.fejl + '. ' : '')) + o.forklaring;
            forkl.classList.remove('skjult');
            setTimeout(nyVoksenopgave, rigtig ? 1600 : 4200);
          });
          return k;
        });
        voksenFelt.append(...[
          h('div', { class: 'duel-hoved' }, h('b', null, E.e + ' ' + E.navn), o.tvilling ? h('span', { class: 'duel-tvilling' }, '🔗 Samme idé: ' + o.tvilling) : null),
          html('div', 'voksen-spoerg', o.spoerg),
          o.figur ? figurSvg(o.figur) : null,
          h('div', { class: 'voksen-valg antal-' + knapper.length }, knapper),
          forkl].filter(Boolean)); // native append ville skrive «null» som tekst
      }

      function gemDuel() {
        if (!tilstand.stjerner) return;
        voksen.duel.spil.push({ dato: G.idag(), barn: b.id, stjerner: tilstand.stjerner });
        voksen.duel.spil = voksen.duel.spil.slice(-50);
        gemV();
      }

      function faelledsMaal() {
        gemDuel();
        tilstand.stjerner = 0;
        skift(h('div', { class: 'skaerm voksen' },
          topbar('Familieduel', visMenu),
          h('div', { class: 'voksen-midte' },
            h('div', { class: 'duel-klaekket', 'aria-hidden': 'true' }, h('span', { class: 'duel-skal' }, b.gave ? '🎉' : '🐣'), h('span', { class: 'fejring-ven danser' }, venTegning(figId, 'jubler'))),
            h('div', { class: 'fejring-tekst' }, 'I klarede det sammen!'),
            h('div', { class: 'voksen-knaprad' },
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: () => startDuel(b) }, 'Spil igen'),
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: visMenu }, 'Til menuen')))));
        // Fejringen (1,6 s) og så sætningen — ikke oven i hinanden (feedback-forloeb.js)
        Forloeb.run({ lyd: 'fejring', tekst: 'I klarede det sammen! ' + (b.gave ? 'Gaven er åbnet' : 'Ægget er klækket') + ', og ' + fig.navn + ' kom ud.' });
      }

      nyBarneopgave();
      nyVoksenopgave();
    }

    // Optageren ligger i app.js (lavOptager) og kommer med ctx — barnets «Sig dit navn» bruger den også (13-10-2026)
    const lavOptager = ctx.lavOptager;

    // =================================================================
    //  🎙️ Indtal — bogstavlyde og ord optages her på enheden (bag voksenlåsen). Intet sendes nogen steder hen.
    // =================================================================
    function visIndtal() {
      if (!vagt()) return;
      const DA = window.Dansk, LK = window.Lydklip;
      const liste = (DA && DA.LYDLISTE) || [];
      const status = h('p', { class: 'voksen-hjaelp indtal-status' }, '');
      const raekker = {};
      const taelIndtalt = () => {
        const n = liste.filter((l) => ctx.Lyd.harLokaltKlip(l.id)).length;
        taeller.textContent = n + ' af ' + liste.length + ' indtalt';
        sletAlle.opdater();
      };
      const sletAlle = sletBogstavKnap({
        foer: () => stop(),
        status: (t) => { liste.forEach(opdaterRaekke); taelIndtalt(); status.textContent = t; },
      });
      const taeller = h('b', { class: 'indtal-taeller' }, '');
      const opdaterRaekke = (l) => {
        const r = raekker[l.id];
        const har = ctx.Lyd.harLokaltKlip(l.id);
        r.classList.toggle('har', har);
        r.querySelector('.indtal-lyt').disabled = !har;
        r.querySelector('.indtal-flueben').textContent = har ? '✓' : '';
      };
      const optager = lavOptager({
        status: (t) => { status.textContent = t; },
        startTekst: (id) => 'Optager «' + id + '» — sig lyden, og tryk ⏹.',
        gemt: (id, r) => {
          status.textContent = 'Gemt: ' + id + ' (' + r.sek.toFixed(1).replace('.', ',') + ' s). Tryk ▶ for at lytte.';
          opdaterRaekke(liste.find((l) => l.id === id));
          taelIndtalt();
        },
      });
      indtalOptager = optager;
      const kanOptage = optager.kan;
      const stop = optager.stop;
      const rk = liste.map((l) => {
        const optagKnap = h('button', { class: 'ikon-knap indtal-optag', type: 'button', 'aria-label': 'Optag ' + l.id, onclick: (e) => { Lyd.init(); optager.optag(l.id, e.currentTarget); } }, '🔴');
        const lytKnap = h('button', { class: 'ikon-knap indtal-lyt', type: 'button', 'aria-label': 'Lyt til ' + l.id, onclick: () => { Lyd.init(); ctx.Lyd.klip(l.id, ''); } }, '▶');
        const r = h('div', { class: 'indtal-raekke' },
          h('span', { class: 'indtal-bogstav' }, l.bogstav),
          h('div', { class: 'indtal-tekst' }, h('b', null, l.id + (l.eksempel ? ' · ' + l.eksempel : '')), h('span', null, l.instruktion)),
          h('span', { class: 'indtal-flueben', 'aria-hidden': 'true' }, ''),
          optagKnap, lytKnap);
        raekker[l.id] = r;
        return r;
      });
      skift(h('div', { class: 'skaerm voksen indtal' },
        topbar('🎙️ Indtal', () => { stop(); visLaastMenu(); }),
        h('div', { class: 'overblik-indhold' },
          h('section', null,
            h('p', null, 'Sid et stille sted 10–15 cm fra mikrofonen. Tryk 🔴, sig lyden, og tryk ⏹. Holdelyde (m, s, l …) i ca. 1 sekund; stoplyde (p, t, k …) helt korte uden «ø» bagefter. Tryk ▶ for at lytte, og optag igen, hvis det ikke lød rigtigt.'),
            h('p', null, 'Klippene gemmes kun på denne enhed og virker med det samme her. «Eksportér» laver én fil, som kan lægges i spillet, så alle enheder får dem.'),
            h('div', { class: 'voksen-knaprad' }, taeller,
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: eksporter }, '💾 Eksportér'),
              sletAlle.knap),
            status),
          h('section', { class: 'indtal-liste' }, rk))));
      liste.forEach(opdaterRaekke);
      taelIndtalt();
      if (!kanOptage) status.textContent = 'Denne browser kan ikke optage lyd (mangler MediaRecorder).';

      async function eksporter() {
        const klip = {};
        for (const l of liste) if (ctx.Lyd.harLokaltKlip(l.id)) klip[l.id] = ctx.Lyd.lokaltKlip(l.id);
        if (!Object.keys(klip).length) { status.textContent = 'Der er ingen indtalte klip endnu.'; return; }
        const tekst = JSON.stringify(LK.lavEksport(klip));
        try {
          const blob = new Blob([tekst], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: 'lystaarn-lyde-' + G.idag() + '.json' });
          document.body.append(a); a.click(); a.remove();
          status.textContent = 'Filen er gemt (' + Object.keys(klip).length + ' klip).';
        } catch (e) {
          status.textContent = 'Filen kunne ikke gemmes.';
        }
      }
    }

    // Start: voksen.html → den åbne menu (også gamle hjemmeskærm-ikoner og bogmærker). #indstillinger → låsen, eller
    // menuen, hvis indstillingerne er låst op i denne fane inden for 30 minutter (fx efter «Indlæs en kopi»).
    window.Voksen._visAfsnit = visAfsnit; // til test
    if (laastAdresse()) { oplaast = erAaben(); visLaastDel(); } else visMenu();
  }

  window.Voksen = { start };
})();
