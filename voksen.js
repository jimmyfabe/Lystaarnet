/* voksen.js — voksendelen: voksenlås, dagens dosis (gymnasiematematik uden hjælpemidler),
   forældreoverblik (ét barn ad gangen — børnene sammenlignes aldrig), indstillinger og familieduel.
   Startes af app.js (window.Voksen.start) med fælles hjælpere. Opgaverne kommer fra voksen-opgaver.js. */
(function () {
  'use strict';

  // Børnene hedder Dino og Enhjørning i spillet (ingen rigtige navne). gave: duellens fælles mål er en gave (ellers et æg).
  const BOERN = [
    { id: 'dino', navn: 'Dino', e: '🦖', noegle: 'mat_dino_v1', side: 'dino.html', figur: 'bobo', bestemt: 'Dinoen', gave: false },
    { id: 'enhjorning', navn: 'Enhjørning', e: '🦄', noegle: 'mat_enhjorning_v1', side: 'enhjorning.html', figur: 'luna', bestemt: 'Enhjørningen', gave: true },
  ];
  const LAAS_NOEGLE = 'mat_voksen_aaben';  // sessionStorage: låst op i denne fane
  const LAAS_MINUTTER = 30;
  const MAX_KOPI_BYTES = 2 * 1024 * 1024; // en kopi fra spillet fylder langt mindre

  function start(ctx) {
    const { h, G, O, lager, voksen, Lyd, Tale, skift, hop, FIGURER, VERDENER, tegnVisning, valgIndhold } = ctx;
    const VO = window.VoksenOpgaver;
    // Gem gennem app.js: den ved, om voksendata er skrivebeskyttede (ulæselige og uden kopi)
    let gemFejlVist = false;
    const gemV = () => {
      const ok = ctx.gemVoksen();
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
          : h('a', { class: 'ikon-knap', href: 'index.html', 'aria-label': 'Til forsiden', onclick: () => { try { sessionStorage.removeItem(LAAS_NOEGLE); } catch (e) { /* intet lager */ } } }, '🏠'), // 🏠 låser igen, så et barn ikke finder voksendelen åben
        h('div', { class: 'topbar-titel' }, titel),
        hoejre || h('span', { class: 'topbar-plads' }));
    }

    // =================================================================
    //  Voksenlås: hold knappen inde i 3 sekunder + et regnestykke
    // =================================================================
    function erAaben() {
      try { return Date.now() - Number(sessionStorage.getItem(LAAS_NOEGLE) || 0) < LAAS_MINUTTER * 60000; } catch (e) { return false; }
    }
    function laasOp() { try { sessionStorage.setItem(LAAS_NOEGLE, String(Date.now())); } catch (e) { /* kun i hukommelsen */ } }

    // Efter et forkert svar skal man vente, før man kan prøve igen (så tilfældige tryk ikke åbner)
    const VENT_NOEGLE = 'mat_voksen_vent';
    const ventTil = () => { try { return Number(sessionStorage.getItem(VENT_NOEGLE) || 0); } catch (e) { return 0; } };
    const saetVent = (ms) => { try { sessionStorage.setItem(VENT_NOEGLE, String(Date.now() + ms)); } catch (e) { /* kun denne gang */ } };

    function visLaas() {
      const rest = ventTil() - Date.now();
      if (rest > 0) { visLaasVent(); return; }
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
          const p = Math.min(1, (Date.now() - startTid) / 3000);
          ring.style.setProperty('--p', p);
          if (p >= 1) { stop(); Lyd.rigtig(); visLaasSpoergsmaal(); }
        }, 50);
      };
      knap.addEventListener('pointerdown', begynd);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => knap.addEventListener(ev, stop));
      knap.addEventListener('contextmenu', (e) => e.preventDefault());
      skift(h('div', { class: 'skaerm voksen laas' },
        topbar('Voksendel'),
        h('div', { class: 'voksen-midte' }, knap, h('p', { class: 'voksen-hjaelp' }, 'Hold knappen inde i 3 sekunder.'))),
      (e) => { if (e.key === 'Enter' || e.key === ' ') { if (e.type === 'keydown' && !e.repeat) begynd(); } });
      document.addEventListener('keyup', stop, { once: true });
    }

    function visLaasVent() {
      const tekst = h('p', { class: 'voksen-hjaelp' }, '');
      const opdater = () => {
        const sek = Math.ceil((ventTil() - Date.now()) / 1000);
        if (!document.body.contains(tekst)) { clearInterval(t); return; } // skærmen er skiftet
        if (sek <= 0) { clearInterval(t); visLaas(); return; }
        tekst.textContent = 'Prøv igen om ' + sek + (sek === 1 ? ' sekund.' : ' sekunder.');
      };
      skift(h('div', { class: 'skaerm voksen laas' },
        topbar('Voksendel'),
        h('div', { class: 'voksen-midte' }, h('span', { class: 'laas-ikon stor-laas', 'aria-hidden': 'true' }, '⏳'), tekst)));
      const t = setInterval(opdater, 500);
      opdater();
    }

    // Et tocifret produkt tastet på eget tastatur: et gæt rammer kun ca. 1 af 100
    function visLaasSpoergsmaal() {
      const r = rng();
      const a = O.heltal(r, 6, 9), b = O.heltal(r, 6, 9);
      const facit = a * b;
      let buffer = '';
      const display = h('div', { class: 'tast-display' }, '');
      const tast = (t) => {
        Lyd.init(); Lyd.tryk();
        if (t === '⌫') buffer = buffer.slice(0, -1);
        else if (t === '✔') {
          if (!buffer) return;
          if (Number(buffer) === facit) { Lyd.rigtig(); laasOp(); visMenu(); }
          else { Lyd.blid(); saetVent(30000); visLaas(); }
          return;
        } else if (buffer.length < 3) buffer += t;
        display.textContent = buffer;
        okKnap.disabled = !buffer;
      };
      const knap = (t, kl, label) => h('button', { class: 'tast ' + (kl || ''), type: 'button', 'aria-label': label || t, onclick: () => tast(t) }, t);
      const okKnap = knap('✔', 'tast-ok', 'OK');
      okKnap.disabled = true;
      skift(h('div', { class: 'skaerm voksen laas' },
        topbar('Voksendel', visLaas),
        h('div', { class: 'voksen-midte' },
          h('p', { class: 'voksen-spoerg stor' }, 'Hvad er ' + a + ' · ' + b + '?'),
          h('div', { class: 'taltastatur voksen-tast' }, display, h('div', { class: 'taster' },
            ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((t) => knap(t)), knap('⌫', 'tast-slet', 'Slet'), knap('0'), okKnap)))),
      (e) => {
        if (e.repeat) return;
        if (/^[0-9]$/.test(e.key)) tast(e.key);
        else if (e.key === 'Backspace') tast('⌫');
        else if (e.key === 'Enter') { e.preventDefault(); tast('✔'); }
      });
    }

    // =================================================================
    //  Menu
    // =================================================================
    function dageTraenet() { return Object.keys(voksen.traening.dage).filter((k) => voksen.traening.dage[k].opgaver > 0).length; }

    function visMenu() {
      const kort = (ikon, titel, under, fn) => h('button', { class: 'menu-kort', type: 'button', onclick: () => { Lyd.init(); Lyd.tryk(); fn(); } },
        h('span', { class: 'menu-ikon', 'aria-hidden': 'true' }, ikon), h('b', null, titel), under ? h('small', null, under) : null);
      const dage = dageTraenet();
      const advarsel = ctx.lagerAdvarsel();
      skift(h('div', { class: 'skaerm voksen menu' },
        topbar('Voksendel'),
        advarsel ? h('p', { class: 'voksen-advarsel' }, '⚠️ ' + advarsel) : null,
        h('div', { class: 'menu-gitter' },
          kort('🧠', 'Dagens dosis', '5 opgaver · ca. 5 min' + (dage ? ' · ' + dage + (dage === 1 ? ' dag' : ' dage') + ' trænet' : ''), () => visVerdensvalg('dosis')),
          kort('⏱️', 'Prøve', '8 opgaver fra én verden', () => visVerdensvalg('proeve')),
          kort('🤝', 'Familieduel', 'Barn og voksen · fælles mål', visDuelValg),
          ...BOERN.map((b) => kort(b.e, b.navn, 'Overblik', () => visOverblik(b))),
          kort('🎙️', 'Indtal', 'Bogstavlyde til dansk', visIndtal),
          kort('⚙️', 'Indstillinger', 'Lyd, stemme, emner, tidsgrænse, kopi', visIndstillinger))));
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
    function visVerdensvalg(tilstand) {
      tilstand = tilstand === 'proeve' ? 'proeve' : 'dosis';
      const T = voksen.traening;
      const knapper = Object.keys(VO.VOKSEN_EMNER).map((k, i) => {
        const E = VO.VOKSEN_EMNER[k];
        const e = T.emner[k];
        const stj = e ? (e.mestret ? 3 : Math.min(2, e.niveau - 1)) : 0;
        return h('button', {
          class: 'verden-kort' + (T.valgt === k ? ' valgt' : ''), type: 'button',
          onclick: () => {
            Lyd.init(); Lyd.tryk(); T.valgt = k; gemV();
            if (tilstand === 'proeve') startProeve(k);
            else if (T.huskekort !== false) visHuskekort(k);
            else startDosis(k);
          },
        }, h('span', { class: 'verden-nr' }, String(i + 1)), h('span', { class: 'menu-ikon', 'aria-hidden': 'true' }, E.e), h('b', null, E.navn),
        h('span', { class: 'station-stjerner statisk', 'aria-label': stj + (stj === 1 ? ' stjerne' : ' stjerner') }, [0, 1, 2].map((n) => h('i', { class: n < stj ? 'fuld' : '' }, '★'))));
      });
      skift(h('div', { class: 'skaerm voksen' },
        topbar(tilstand === 'proeve' ? 'Vælg verden — prøve' : 'Vælg verden — dagens dosis', visMenu),
        h('p', { class: 'voksen-hjaelp' }, tilstand === 'proeve'
          ? 'Otte opgaver fra den verden, du vælger, på dit niveau. Ingen lommeregner.' + (T.proeveUr !== false ? ' Et ur viser tiden (kan slås fra under Indstillinger).' : '')
          : 'Tre opgaver fra den verden, du vælger, og to til repetition. Ingen lommeregner.'),
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

    // Prøve: 8 opgaver fra én verden, evt. med et ur, der tæller op (kun for den voksne)
    function startProeve(valgt) {
      const n = voksen.traening.emner[valgt] ? voksen.traening.emner[valgt].niveau : 1;
      visVoksenOpgave({ opgaver: VO.lavProeve(valgt, n, rng()), i: 0, rigtige: 0, proeve: true, start: Date.now() });
    }
    const minSek = (ms) => { const sek = Math.max(0, Math.round(ms / 1000)); return Math.floor(sek / 60) + ':' + String(sek % 60).padStart(2, '0'); };

    function startDosis(valgt) {
      const T = voksen.traening;
      const dato = G.idag();
      // Repetition: fejlede opgaver fra tidligere dage
      const gentag = T.gentag.filter((o) => o.dato !== dato);
      const opgaver = VO.lavDosis(valgt, traeningNiveauer(), rng(), gentag);
      visVoksenOpgave({ opgaver, i: 0, rigtige: 0 });
    }

    function visVoksenOpgave(d) {
      const T = voksen.traening;
      const o = d.opgaver[d.i];
      let svaret = false;
      const forklaring = h('div', { class: 'voksen-forklaring skjult' });
      const naeste = h('button', {
        class: 'stor-knap naeste-knap skjult', type: 'button', 'aria-label': 'Næste',
        onclick: () => { Lyd.init(); Lyd.tryk(); d.i++; if (d.i < d.opgaver.length) visVoksenOpgave(d); else visDosisSlut(d); },
      }, '▶');
      // Eget taltastatur (slået til under Indstillinger): tal-svar tastes i stedet for at vælges
      const tastes = T.tastatur === true && VO.kanTastes(o);
      const facitVis = o.valg.find((v) => v.id === o.svar).vis;
      const besvar = (rigtig, fejl) => {
        svaret = true;
        Lyd.init();
        if (rigtig) { Lyd.rigtig(); d.rigtige++; } else Lyd.blid();
        registrerTraening(o, rigtig, dato);
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
        topbar([h('span', { class: 'titel-navn' }, E.e + ' ' + E.navn), h('span', { class: 'titel-tal' }, '· ' + (d.i + 1) + ' / ' + d.opgaver.length)], visMenu, ur),
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

    function registrerTraening(o, rigtig, dato) {
      const T = voksen.traening;
      const E = VO.VOKSEN_EMNER[o.emne];
      const ed = G.normaliserEmne(T.emner[o.emne]);
      ed.ialt++;
      if (rigtig) ed.rigtige++;
      T.emner[o.emne] = O.opdaterNiveau(ed, rigtig, E.maxNiveau).data;
      const dg = T.dage[dato] || (T.dage[dato] = { opgaver: 0, rigtige: 0 });
      dg.opgaver++;
      if (rigtig) dg.rigtige++;
      // Spaced repetition: fejlede opgaver kommer igen en anden dag; klarede gentagelser fjernes
      // Samme opgave = samme type og frø (nøglen kan være tom for gentagelser fra før 04-10-2026)
      T.gentag = T.gentag.filter((x) => !(x.type === o.type && x.froe === o.froe) && (!x.noegle || x.noegle !== o.noegle));
      if (!rigtig) T.gentag.push(VO.gentagParametre(o, dato)); // kun parametre — opgaven bygges igen af koden
      T.gentag = T.gentag.slice(-10);
      gemV();
    }

    function visDosisSlut(d) {
      const dage = dageTraenet();
      const tid = d.proeve && voksen.traening.proeveUr !== false ? ' · ' + minSek(Date.now() - d.start) : '';
      skift(h('div', { class: 'skaerm voksen' },
        topbar(d.proeve ? 'Prøve' : 'Dagens dosis', visMenu),
        h('div', { class: 'voksen-midte' },
          h('div', { class: 'dosis-resultat' }, d.rigtige + ' af ' + d.opgaver.length + tid),
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
      const verdener = VERDENER.filter((v) => !v.blandet).map((v) => {
        const e = d.emner[v.emne];
        const pct = e && e.ialt ? Math.round((e.rigtige / e.ialt) * 100) : null;
        const status = !e ? 'Ikke prøvet endnu' : e.mestret ? 'Mestret ✓' : 'Trin ' + e.niveau + ' af 3';
        return h('tr', null, h('td', null, v.e + ' ' + v.navn), h('td', null, O.EMNER[v.emne].navn), h('td', null, status),
          h('td', null, e ? e.runder + (e.runder === 1 ? ' runde' : ' runder') : ''), h('td', null, pct === null ? '' : pct + ' % rigtige i første forsøg'));
      });
      // Det driller (flest fejl, seneste først)
      const driller = [];
      for (const emne in d.fejl) for (const n in d.fejl[emne]) driller.push({ emne, n, antal: d.fejl[emne][n] });
      driller.sort((x, y) => y.antal - x.antal);
      const sidste = d.sidsteVerden && O.EMNER[d.sidsteVerden] ? d.sidsteVerden : 'taelle';
      const antalDyr = Object.keys(d.maerker).length;
      skift(h('div', { class: 'skaerm voksen overblik' },
        topbar(b.e + ' ' + b.navn, visMenu),
        h('div', { class: 'overblik-indhold' },
          h('section', null, h('h2', null, 'Tid'), h('p', null, 'I dag: ' + idag.min + ' min' + (voksen.tidsgraense[b.id] ? ' (grænse ' + voksen.tidsgraense[b.id] + ' min)' : '') + ' · runder i alt: ' + d.runderIalt + ' · dyr i samlebogen: ' + antalDyr), soejler),
          h('section', null, h('h2', null, 'Verdener'), h('table', { class: 'overblik-tabel' }, verdener)),
          h('section', null, h('h2', null, 'Det driller lige nu'),
            driller.length ? h('ul', null, driller.slice(0, 5).map((x) => h('li', null, O.beskrivNoegle(x.n) + ' — ' + x.antal + (x.antal === 1 ? ' gang' : ' gange'))))
              : h('p', null, 'Ingen opgaver, der driller endnu.')),
          h('section', null, h('h2', null, 'Idé til hjemmet'), h('p', null, O.HJEMME_IDEER[sidste])),
          h('p', { class: 'voksen-hjaelp' }, 'Overblikket viser kun ' + b.navn + '. Børnene sammenlignes ikke.'))));
    }

    // =================================================================
    //  Indstillinger
    // =================================================================
    function visIndstillinger() {
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
      const barnBlok = (b) => h('section', null, h('h2', null, b.navn),
        tidsvalg(b),
        skifter('Åbn alle verdener', voksen.aabneAlle[b.id], (v) => { voksen.aabneAlle[b.id] = v; }),
        h('div', { class: 'emne-liste' }, VERDENER.filter((v) => !v.blandet).map((v) =>
          skifter(v.e + ' ' + v.navn, voksen.emner[b.id][v.emne] !== false, (til) => {
            if (til) { delete voksen.emner[b.id][v.emne]; return true; }
            // Mindst ét emne skal være slået til, ellers er der intet at spille
            const tilbage = VERDENER.filter((x) => !x.blandet && x.emne !== v.emne && voksen.emner[b.id][x.emne] !== false);
            if (!tilbage.length) { alert('Mindst én verden skal være slået til.'); return false; }
            voksen.emner[b.id][v.emne] = false;
            return true;
          }))));
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
      const importKopier = G.importKopier(lager);
      const kanFortryde = Object.keys(importKopier).length > 0;
      skift(h('div', { class: 'skaerm voksen indstillinger' },
        topbar('Indstillinger', visMenu),
        h('div', { class: 'overblik-indhold' },
          h('section', null, h('h2', null, 'Lyd'),
            skifter('Lydeffekter', voksen.lyd, (v) => { voksen.lyd = v; }),
            skifter('Oplæsning', voksen.tale, (v) => { voksen.tale = v; })),
          stemmeSektion(),
          h('section', null, h('h2', null, 'Din træning'),
            skifter('Huskekort før dagens dosis', voksen.traening.huskekort !== false, (v) => { voksen.traening.huskekort = v; }),
            skifter('Ur i prøven', voksen.traening.proeveUr !== false, (v) => { voksen.traening.proeveUr = v; }),
            skifter('Skriv tal-svar selv (taltastatur)', voksen.traening.tastatur === true, (v) => { voksen.traening.tastatur = v; })),
          ...BOERN.map(barnBlok),
          h('section', null, h('h2', null, 'Sikkerhedskopi'),
            h('p', null, 'Fremskridtet ligger kun på denne iPad. Gem en kopi engang imellem — fx som mail til dig selv.'),
            ulaeselige.length ? h('div', { class: 'voksen-advarsel' },
              h('p', null, '⚠️ ' + ulaeselige.map(navnPaa).join(' og ') + ' kunne ikke læses, og der var ikke plads til en reservekopi. Spillet gemmer derfor ikke. Tryk først «Gem en kopi» (så kommer de ulæselige data med i filen), og derefter «Ryd ulæselige data», hvor du vælger filen.'),
              rydKnap) : null,
            backups.length ? h('p', { class: 'voksen-advarsel' }, '⚠️ Nogle gemte data kunne ikke læses og ligger som reservekopi (' + backups.join(', ') + '). Tryk «Gem en kopi», så de kommer med i filen (de indlæses ikke igen, men kan reddes af en, der kan læse JSON).') : null,
            h('div', { class: 'voksen-knaprad' },
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: gemKopi }, '💾 Gem en kopi'),
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: indlaesKopi }, '📂 Indlæs en kopi'),
              kanFortryde ? h('button', { class: 'voksen-valg-knap', type: 'button', onclick: fortrydIndlaesning }, '↩️ Fortryd seneste indlæsning') : null)))));
    }

    // Stemme: de danske stemmer på enheden med «Prøv». Valget gemmes som stemmens navn (findes den ikke længere,
    // vælges der automatisk: «Premium/Enhanced/Forbedret» → ikke «compact» → lokal → første danske).
    function stemmeSektion() {
      const LK = window.Lydklip;
      const alle = Tale.findes ? (window.speechSynthesis.getVoices() || []) : [];
      const da = LK ? LK.danskeStemmer(alle) : [];
      const auto = LK ? LK.vaelgStemme(alle, null) : null;
      // iPad henter stemmerne lidt efter sidens start: vis listen igen, når de kommer
      if (!da.length && Tale.findes && window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener('voiceschanged', () => { if (document.querySelector('.indstillinger') && LK && LK.danskeStemmer(window.speechSynthesis.getVoices()).length) visIndstillinger(); }, { once: true });
      }
      const proev = (v) => {
        Lyd.init();
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance('Hej! Jeg hedder ' + (v ? v.name.replace(/\s*\(.*\)\s*/g, '') : 'Lystårnet') + '. Tre og to er fem.');
          u.lang = 'da-DK'; if (v) u.voice = v; u.rate = 0.92;
          window.speechSynthesis.speak(u);
        } catch (e) { /* ingen tale */ }
      };
      const vaelg = (navn) => {
        voksen.stemme = navn;
        gemV();
        if (Tale.opdaterStemmer) Tale.opdaterStemmer();
        visIndstillinger();
      };
      const raekke = (navn, label, v) => h('div', { class: 'stemme-raekke' },
        h('button', { class: 'voksen-valg-knap stemme-valg' + ((voksen.stemme || null) === navn ? ' valgt' : ''), type: 'button', 'aria-pressed': (voksen.stemme || null) === navn ? 'true' : 'false', onclick: () => { Lyd.init(); Lyd.tryk(); vaelg(navn); } }, label),
        h('button', { class: 'voksen-valg-knap stemme-proev', type: 'button', onclick: () => proev(v) }, '🔊 Prøv'));
      return h('section', null, h('h2', null, 'Stemme'),
        da.length
          ? h('div', { class: 'stemme-liste' },
            raekke(null, 'Automatisk' + (auto ? ' (' + auto.name + ')' : ''), auto),
            da.map((v) => raekke(v.name, v.name + (v.localService ? '' : ' (kræver net)'), v)))
          : h('p', null, 'Der er ingen danske stemmer på denne enhed endnu. På iPad: Indstillinger → Tilgængelighed → Talt indhold → Stemmer → Dansk. Hent en stemme, hvor der står «Forbedret» eller «Premium».'),
        h('p', { class: 'voksen-hjaelp' }, 'Bogstavlyde siges aldrig af stemmen — de kommer fra 🎙️ Indtal (ellers siger spillet «lyden i sol»).'));
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
      if (!confirm('Fortryde seneste indlæsning? Data fra før indlæsningen bliver de gældende igen.')) return;
      const rullet = G.fortrydImport(lager);
      alert(rullet.length ? 'Fortrudt.' : 'Der var intet at fortryde.');
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
      const fig = FIGURER[barnData.figur] || FIGURER[b.figur];
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
        do { o = O.lavOpgave(O.vaelg(r, typer), niveau, r, null); f++; } while (!o.valg && f < 20);
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
          h('div', { class: 'duel-hoved' }, h('span', { class: 'duel-figur', 'aria-hidden': 'true' }, fig.e),
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
            h('div', { class: 'duel-klaekket', 'aria-hidden': 'true' }, h('span', { class: 'duel-skal' }, b.gave ? '🎉' : '🐣'), h('span', { class: 'fejring-ven danser' }, fig.e)),
            h('div', { class: 'fejring-tekst' }, 'I klarede det sammen!'),
            h('div', { class: 'voksen-knaprad' },
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: () => startDuel(b) }, 'Spil igen'),
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: visMenu }, 'Til menuen')))));
        Lyd.fejring();
        setTimeout(() => Tale.sig('I klarede det sammen! ' + (b.gave ? 'Gaven er åbnet' : 'Ægget er klækket') + ', og ' + fig.navn + ' kom ud.'), 800);
      }

      nyBarneopgave();
      nyVoksenopgave();
    }

    // =================================================================
    //  🎙️ Indtal — bogstavlyde og ord optages her på enheden (bag voksenlåsen). Intet sendes nogen steder hen.
    // =================================================================
    function visIndtal() {
      const DA = window.Dansk, LK = window.Lydklip, KL = ctx.KlipLager;
      const liste = (DA && DA.LYDLISTE) || [];
      let optagelse = null; // { id, recorder, stream, chunks }
      const status = h('p', { class: 'voksen-hjaelp indtal-status' }, '');
      const kanOptage = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
      const raekker = {};
      const taelIndtalt = () => {
        const n = liste.filter((l) => ctx.Lyd.harLokaltKlip(l.id)).length;
        taeller.textContent = n + ' af ' + liste.length + ' indtalt';
      };
      const taeller = h('b', { class: 'indtal-taeller' }, '');
      const opdaterRaekke = (l) => {
        const r = raekker[l.id];
        const har = ctx.Lyd.harLokaltKlip(l.id);
        r.classList.toggle('har', har);
        r.querySelector('.indtal-lyt').disabled = !har;
        r.querySelector('.indtal-flueben').textContent = har ? '✓' : '';
      };
      async function stop() {
        const o = optagelse;
        if (!o) return;
        optagelse = null;
        o.knap.classList.remove('optager');
        o.knap.textContent = '🔴';
        const faerdig = new Promise((res) => { o.recorder.onstop = res; });
        try { o.recorder.stop(); } catch (e) { /* allerede stoppet */ }
        await faerdig;
        o.stream.getTracks().forEach((t) => t.stop());
        try {
          const blob = new Blob(o.chunks, { type: o.recorder.mimeType || 'audio/webm' });
          const buf = await blob.arrayBuffer();
          Lyd.init();
          const ac = Lyd.ctx || new (window.AudioContext || window.webkitAudioContext)();
          const lyd = await new Promise((res, rej) => { const p = ac.decodeAudioData(buf.slice(0), res, rej); if (p && p.then) p.then(res, rej); });
          const kanaler = [];
          for (let k = 0; k < lyd.numberOfChannels; k++) kanaler.push(lyd.getChannelData(k));
          const r = LK.behandl(kanaler, lyd.sampleRate);
          if (!r) { status.textContent = 'Der var kun stilhed — prøv igen tættere på mikrofonen.'; return; }
          await KL.gem('klip', o.id, r.wav);
          ctx.Lyd.saetLokaltKlip(o.id, r.wav);
          status.textContent = 'Gemt: ' + o.id + ' (' + r.sek.toFixed(1).replace('.', ',') + ' s). Tryk ▶ for at lytte.';
          opdaterRaekke(liste.find((l) => l.id === o.id));
          taelIndtalt();
        } catch (e) {
          status.textContent = 'Optagelsen kunne ikke gemmes (' + (e && e.message ? e.message : 'ukendt fejl') + ').';
        }
      }
      async function optag(l, knap) {
        if (optagelse) { const forrige = optagelse.id; await stop(); if (forrige === l.id) return; }
        if (!kanOptage) { status.textContent = 'Denne browser kan ikke optage lyd.'; return; }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          const chunks = [];
          recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
          recorder.start();
          optagelse = { id: l.id, recorder, stream, chunks, knap };
          knap.classList.add('optager');
          knap.textContent = '⏹';
          status.textContent = 'Optager «' + l.id + '» — sig lyden, og tryk ⏹.';
        } catch (e) {
          status.textContent = 'Mikrofonen kunne ikke bruges. Giv spillet lov til mikrofonen i browserens indstillinger.';
        }
      }
      const rk = liste.map((l) => {
        const optagKnap = h('button', { class: 'ikon-knap indtal-optag', type: 'button', 'aria-label': 'Optag ' + l.id, onclick: (e) => { Lyd.init(); optag(l, e.currentTarget); } }, '🔴');
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
        topbar('🎙️ Indtal', () => { stop(); visMenu(); }),
        h('div', { class: 'overblik-indhold' },
          h('section', null,
            h('p', null, 'Sid et stille sted 10–15 cm fra mikrofonen. Tryk 🔴, sig lyden, og tryk ⏹. Holdelyde (m, s, l …) i ca. 1 sekund; stoplyde (p, t, k …) helt korte uden «ø» bagefter. Tryk ▶ for at lytte, og optag igen, hvis det ikke lød rigtigt.'),
            h('p', null, 'Klippene gemmes kun på denne enhed og virker med det samme her. «Eksportér» laver én fil, som kan lægges i spillet, så alle enheder får dem.'),
            h('div', { class: 'voksen-knaprad' }, taeller,
              h('button', { class: 'voksen-valg-knap', type: 'button', onclick: eksporter }, '💾 Eksportér')),
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

    // Start: låst op i denne fane? Så direkte til menuen.
    if (erAaben()) visMenu(); else visLaas();
  }

  window.Voksen = { start };
})();
