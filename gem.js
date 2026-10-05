/* gem.js — gem og indlæs pigernes fremskridt i localStorage.
   Det er pigernes ENESTE kopi, så:
   - ødelagt JSON overskrives aldrig uden backup,
   - ukendte felter bevares (fx fra en nyere version),
   - ændres strukturen, skal der en migrering i MIGRERINGER + test i test/test-gem.js.
   Rene funktioner uden DOM — «lager» er localStorage eller en falsk udgave i tests. */
(function (root) {
  'use strict';

  const VERSION = 1;          // børnedata
  const VOKSEN_VERSION = 1;   // voksendata
  const MAX_DAGE = 180;       // dagsstatistik gemmes et halvt år tilbage
  const MAX_GENTAG = 6;       // højst så mange «kommer igen»-opgaver pr. emne

  function idag(d) {
    d = d || new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  const erObjekt = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const ikkeNeg = (v, std) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : std);
  const MAX_KOPIER = 3;       // højst så mange «_foer_import_»-kopier pr. nøgle

  // Kopi uden farlige nøgler: «__proto__» fra JSON.parse er en egen nøgle, og Object.assign ville
  // ændre objektets prototype med den. Kun egne nøgler kopieres, og meget dybe strukturer skæres af.
  const FARLIG = (k) => k === '__proto__' || k === 'constructor' || k === 'prototype';
  function rens(v, dybde) {
    dybde = dybde || 0;
    if (dybde > 20) return null;
    if (Array.isArray(v)) return v.map((x) => rens(x, dybde + 1));
    if (v !== null && typeof v === 'object') {
      const ud = {};
      for (const k of Object.keys(v)) if (!FARLIG(k)) ud[k] = rens(v[k], dybde + 1);
      return ud;
    }
    return v;
  }

  // En hel opgave (med visning og hjælpetrappe) — ellers kan runden ikke tegne den
  const erOpgave = (o) => erObjekt(o) && typeof o.type === 'string' && erObjekt(o.vis) && Array.isArray(o.hjaelp) &&
    (Number.isFinite(o.svar) || (typeof o.svar === 'string' && o.svar !== ''));

  function standardBarn(navn) {
    return {
      version: VERSION,
      navn: navn || '',
      figur: null,          // id på den valgte rejseven (fra TEMA.figurer)
      farve: null,          // valgfri egen farve (bruges fra fase 3)
      oprettet: idag(),
      historie: false,      // har hørt historien om Lystårnet
      emner: {},            // emneId → standardEmne()
      gentag: {},           // emneId → [opgave, …] — opgaver der var svære, kommer igen
      fejl: {},             // emneId → { noegle: antal } — «hvad driller» til voksenoverblikket
      maerker: {},          // mærkeId → antal
      runderIalt: 0,
      perler: 0,            // lysperler = runder i eventyret («Vælg selv» giver dyr, men ingen perler)
      rundeTaeller: 0,      // runder siden sidste bevægelsespause
      sidsteVerden: null,
      dage: {},             // 'ÅÅÅÅ-MM-DD' → { sek, runder, opgaver, rigtige }
      pauset: null,         // afbrudt mission { verden, i, opgaver, niveauOp, registreret } — fortsætter næste gang
      lektioner: {},        // verdensId → true, når verdenens lektion er vist (B2)
      dansk: {},            // dansk-emneId → standardEmne() — samme form som emner (B4)
      fag: null,            // 'matematik' | 'dansk' — det sidste valg (null: barnet har ikke valgt endnu)
      historier: {},        // historienr → standardHistorie() — Historiebogen (B5)
    };
  }

  // Én historie i Historiebogen: læst (bobler 0–4 + en voksen har hørt), tegnet, skrevet, færdig (= belønnet)
  function standardHistorie() {
    return { bobler: 0, voksen: false, tegnet: false, skrevet: false, faerdig: false };
  }

  function normaliserHistorie(x) {
    if (!erObjekt(x)) return standardHistorie();
    const ud = Object.assign({}, x);
    ud.bobler = Math.min(4, ikkeNeg(x.bobler, 0));
    ud.voksen = x.voksen === true;
    ud.tegnet = x.tegnet === true;
    ud.skrevet = x.skrevet === true;
    ud.faerdig = x.faerdig === true;
    return ud;
  }

  function standardEmne() {
    return { niveau: 1, seneste: [], ialt: 0, rigtige: 0, runder: 0, mestret: false };
  }

  function standardDag() {
    return { sek: 0, runder: 0, opgaver: 0, rigtige: 0 };
  }

  // ---------- Migreringer ----------
  // MIGRERINGER[v] løfter data fra version v til v+1. Version 0 = data uden versionsfelt.
  const MIGRERINGER = {
    0: function (d) {
      // Ingen rigtige v0-data findes; men skulle et gammelt/håndlavet objekt dukke op,
      // bevares alt, og versionsfeltet sættes. Normaliseringen fylder resten ud.
      const ud = Object.assign({}, d);
      ud.version = 1;
      return ud;
    },
  };

  function migrer(d) {
    let ud = Object.assign({}, d);
    let v = Number.isInteger(ud.version) && ud.version >= 0 ? ud.version : 0;
    while (v < VERSION) {
      if (!MIGRERINGER[v]) throw new Error('Mangler migrering fra version ' + v);
      ud = MIGRERINGER[v](ud);
      v = ud.version;
    }
    return ud;
  }

  // ---------- Normalisering ----------
  // Retter typer og fylder manglende felter ud. Ukendte felter bevares.
  function normaliserEmne(e) {
    const s = standardEmne();
    if (!erObjekt(e)) return s;
    const ud = Object.assign({}, e);
    ud.niveau = Number.isInteger(e.niveau) && e.niveau >= 1 ? e.niveau : 1;
    ud.seneste = Array.isArray(e.seneste) ? e.seneste.map((v) => (v ? 1 : 0)).slice(-10) : [];
    ud.ialt = ikkeNeg(e.ialt, 0);
    ud.rigtige = Math.min(ikkeNeg(e.rigtige, 0), ud.ialt);
    ud.runder = ikkeNeg(e.runder, 0);
    ud.mestret = e.mestret === true;
    return ud;
  }

  function normaliserBarn(d, navn) {
    const s = standardBarn(navn);
    if (!erObjekt(d)) return s;
    d = rens(d);
    const ud = Object.assign({}, s, d);
    ud.version = Number.isInteger(d.version) ? d.version : VERSION;
    // Navnet kommer altid fra skallen (Dino/Enhjørning), så et gammelt navn i data aldrig vises
    ud.navn = navn || (typeof d.navn === 'string' ? d.navn : '');
    ud.figur = typeof d.figur === 'string' ? d.figur : null;
    ud.farve = typeof d.farve === 'string' ? d.farve : null;
    ud.oprettet = typeof d.oprettet === 'string' ? d.oprettet : s.oprettet;
    ud.historie = d.historie === true;
    ud.sidsteVerden = typeof d.sidsteVerden === 'string' ? d.sidsteVerden : null;
    ud.runderIalt = ikkeNeg(d.runderIalt, 0);
    ud.rundeTaeller = ikkeNeg(d.rundeTaeller, 0);
    // Lysperler (B2): data fra før havde ingen «Vælg selv» — alle runder var eventyr-runder
    ud.perler = Math.min(ikkeNeg(d.perler, ud.runderIalt), ud.runderIalt);
    ud.lektioner = {};
    if (erObjekt(d.lektioner)) for (const k in d.lektioner) if (d.lektioner[k] === true) ud.lektioner[k] = true;

    ud.emner = {};
    if (erObjekt(d.emner)) for (const k in d.emner) ud.emner[k] = normaliserEmne(d.emner[k]);
    ud.dansk = {};
    if (erObjekt(d.dansk)) for (const k in d.dansk) ud.dansk[k] = normaliserEmne(d.dansk[k]);
    ud.fag = d.fag === 'dansk' || d.fag === 'matematik' ? d.fag : null;
    ud.historier = {};
    if (erObjekt(d.historier)) for (const k in d.historier) if (/^[1-9]\d{0,2}$/.test(k)) ud.historier[k] = normaliserHistorie(d.historier[k]);

    ud.gentag = {};
    if (erObjekt(d.gentag)) {
      for (const k in d.gentag) {
        // Kun hele opgaver (med visning og hjælpetrappe) — ellers kan runden ikke tegne dem
        const l = Array.isArray(d.gentag[k]) ? d.gentag[k].filter(erOpgave) : [];
        ud.gentag[k] = l.slice(-MAX_GENTAG);
      }
    }

    ud.fejl = {};
    if (erObjekt(d.fejl)) {
      for (const k in d.fejl) {
        if (!erObjekt(d.fejl[k])) continue;
        ud.fejl[k] = {};
        for (const n in d.fejl[k]) { const v = ikkeNeg(d.fejl[k][n], 0); if (v) ud.fejl[k][n] = v; }
      }
    }

    ud.maerker = {};
    if (erObjekt(d.maerker)) for (const k in d.maerker) { const v = ikkeNeg(d.maerker[k], 0); if (v) ud.maerker[k] = v; }

    ud.dage = {};
    if (erObjekt(d.dage)) {
      const datoer = Object.keys(d.dage).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-MAX_DAGE);
      for (const k of datoer) {
        const x = erObjekt(d.dage[k]) ? d.dage[k] : {};
        ud.dage[k] = { sek: ikkeNeg(x.sek, 0), runder: ikkeNeg(x.runder, 0), opgaver: ikkeNeg(x.opgaver, 0), rigtige: ikkeNeg(x.rigtige, 0) };
        for (const f in x) if (!(f in ud.dage[k])) ud.dage[k][f] = x[f];
      }
    }
    ud.pauset = normaliserPauset(d.pauset);
    return ud;
  }

  // Afbrudt mission: kun hvis alle opgaver er hele, og der er en opgave tilbage at lave
  function normaliserPauset(p) {
    if (!erObjekt(p) || typeof p.verden !== 'string' || !Array.isArray(p.opgaver)) return null;
    if (!p.opgaver.length || p.opgaver.length > 10 || !p.opgaver.every(erOpgave)) return null;
    if (!Number.isInteger(p.i) || p.i < 0 || p.i >= p.opgaver.length) return null;
    return {
      verden: p.verden, i: p.i, opgaver: p.opgaver, niveauOp: p.niveauOp === true,
      registreret: Number.isInteger(p.registreret) ? p.registreret : -1,
      maerke: typeof p.maerke === 'string' ? p.maerke : null,
      frit: p.frit === true, // startet fra «Vælg selv»
    };
  }

  // ---------- Læs og skriv ----------
  function laes(lager, noegle) {
    try { return lager.getItem(noegle); } catch (e) { return null; }
  }

  function skriv(lager, noegle, tekst) {
    try { lager.setItem(noegle, tekst); return true; } catch (e) { return false; }
  }

  // ---------- Nye nøgler uden børnenes navne (B1, oktober 2026) ----------
  // Ny nøgle → den gamle nøgle med barnets navn. Den gamle nøgle bliver liggende som backup
  // (slettes i en senere udgave). Kun her og i test/test-gem.js må de gamle navne stå.
  const GAMLE_NOEGLER = { mat_dino_v1: 'mat_alma_v1', mat_enhjorning_v1: 'mat_ella_v1' };
  const GAMLE_ID = { alma: 'dino', ella: 'enhjorning' }; // id'er i voksendata (tidsgrænse, emner, åbn alle, duel)
  const nyNoegle = (gammel) => Object.keys(GAMLE_NOEGLER).find((n) => GAMLE_NOEGLER[n] === gammel) || null;

  // Ved start på alle sider: findes den nye nøgle ikke, men den gamle, kopieres den rå tekst uændret.
  // En eksisterende ny nøgle overskrives aldrig. Returnerer de nye nøgler, der blev skrevet.
  function migrerNoegler(lager) {
    const skrevet = [];
    for (const ny of Object.keys(GAMLE_NOEGLER)) {
      if (laes(lager, ny) !== null) continue;
      const raa = laes(lager, GAMLE_NOEGLER[ny]);
      if (raa === null || raa === undefined) continue;
      if (skriv(lager, ny, raa) && laes(lager, ny) === raa) skrevet.push(ny);
    }
    return skrevet;
  }

  // Gem en kopi af ulæselige data, så de aldrig går tabt. Hver ny fejl får sin egen nøgle
  // (samme dag: _2, _3 …), og vi læser kopien igen for at se, at den faktisk blev skrevet.
  // Returnerer nøglen — eller null, hvis der ikke var plads.
  function backup(lager, noegle, raa) {
    const grund = noegle + '_backup_' + idag();
    for (let n = 1; n < 100; n++) {
      const k = n === 1 ? grund : grund + '_' + n;
      const fundet = laes(lager, k);
      if (fundet === raa) return k;      // præcis de data er allerede gemt
      if (fundet !== null) continue;     // en anden kopi — rør den ikke
      return skriv(lager, k, raa) && laes(lager, k) === raa ? k : null;
    }
    return null;
  }

  // Data kunne ikke bruges: start forfra, men gem aldrig oven i originalen, hvis kopien mislykkedes
  function startForfra(navn, k, grund) {
    if (k) return { data: standardBarn(navn), ny: true, backup: k, skrivebeskyttet: false, advarsel: grund + ' — en kopi ligger i ' + k };
    return {
      data: standardBarn(navn), ny: true, backup: null, skrivebeskyttet: true,
      advarsel: grund + ', og der var ikke plads til en kopi. Spillet gemmer ikke, før en voksen har taget en kopi under Indstillinger.',
    };
  }

  // Indlæs børnedata. Returnerer { data, ny, backup, skrivebeskyttet, advarsel }.
  function indlaesBarn(lager, noegle, navn) {
    let raa = laes(lager, noegle);
    // Kunne den gamle nøgle ikke kopieres (fx fuldt lager), læses den direkte — så data aldrig ser ud til at være væk
    if ((raa === null || raa === undefined) && GAMLE_NOEGLER[noegle]) raa = laes(lager, GAMLE_NOEGLER[noegle]);
    if (raa === null || raa === undefined || raa === '') {
      return { data: standardBarn(navn), ny: true, backup: null, skrivebeskyttet: false, advarsel: null };
    }
    let obj;
    try { obj = JSON.parse(raa); } catch (e) { obj = undefined; }
    if (!erObjekt(obj)) return startForfra(navn, backup(lager, noegle, raa), 'Gemte data kunne ikke læses');
    try {
      const data = normaliserBarn(migrer(rens(obj)), navn);
      return { data: data, ny: false, backup: null, skrivebeskyttet: false, advarsel: null };
    } catch (e) {
      return startForfra(navn, backup(lager, noegle, raa), 'Gemte data kunne ikke opgraderes');
    }
  }

  // Reservekopier, der ligger i lageret (vises i voksendelen, så de ikke bliver glemt)
  function findBackups(lager) {
    const ud = [];
    try {
      for (let i = 0; i < lager.length; i++) {
        const k = lager.key(i);
        if (k && /^mat_.+_(backup|foer_import)_/.test(k)) ud.push(k);
      }
    } catch (e) { /* intet lager */ }
    return ud.sort();
  }

  // Behold kun de nyeste MAX_KOPIER «_foer_import_»-kopier pr. nøgle (de fylder, og lageret er lille).
  // Reservekopier af ulæselige data («_backup_») røres aldrig — de kan være den eneste kopi.
  // «_foer_import_»-kopier pr. hovednøgle, ældste først. Nye kopier har et løbenummer («_foer_import_000004_…»),
  // så rækkefølgen ikke afhænger af iPad'ens ur. Ældre kopier uden løbenummer regnes for de ældste.
  function importKopier(lager) {
    const pr = {};
    for (const k of findBackups(lager)) {
      const m = /^(mat_.+?)_foer_import_(.+)$/.exec(k);
      if (!m) continue;
      const nr = /^(\d{6})_/.exec(m[2]);
      (pr[m[1]] = pr[m[1]] || []).push({ k: k, nr: nr ? Number(nr[1]) : 0 });
    }
    for (const n in pr) pr[n] = pr[n].sort((a, b) => a.nr - b.nr || (a.k < b.k ? -1 : 1)).map((x) => x.k);
    return pr;
  }
  function naesteLoebenr(lager, noegle) {
    const l = importKopier(lager)[noegle] || [];
    let max = 0;
    for (const k of l) { const m = /_foer_import_(\d{6})_/.exec(k); if (m) max = Math.max(max, Number(m[1])); }
    return String(max + 1).padStart(6, '0');
  }

  // Behold kun de nyeste MAX_KOPIER «_foer_import_»-kopier pr. nøgle (de fylder, og lageret er lille).
  // Kopier i «beskyt» (dem, der lige er skrevet) slettes aldrig. Reservekopier af ulæselige data
  // («_backup_») røres aldrig — de kan være den eneste kopi.
  function rydGamleKopier(lager, behold, beskyt) {
    behold = behold || MAX_KOPIER;
    beskyt = beskyt || [];
    const pr = importKopier(lager);
    const slettet = [];
    for (const n in pr) {
      const l = pr[n].filter((k) => beskyt.indexOf(k) < 0);
      let antal = pr[n].length;
      while (antal > behold && l.length) {
        const k = l.shift();
        try { lager.removeItem(k); slettet.push(k); antal--; } catch (e) { /* lad den ligge */ }
      }
    }
    return slettet;
  }

  // Fortryd seneste indlæsning: den nyeste «_foer_import_»-kopi pr. nøgle bliver de gældende data igen.
  // Kun nøgler med en kopi røres. Returnerer de nøgler, der blev rullet tilbage.
  // Kopier under en gammel nøgle (indlæst før B1) rulles tilbage til den nye nøgle — men kun, hvis den nye
  // nøgle ikke selv har en kopi (den er i så fald nyere, for de gamle kopier er lavet før omdøbningen).
  function fortrydImport(lager) {
    const pr = importKopier(lager);
    const rullet = [];
    for (const n in pr) {
      const maal = nyNoegle(n) || n;
      if (maal !== n && pr[maal]) continue;
      const nyeste = pr[n][pr[n].length - 1];
      const v = laes(lager, nyeste);
      if (v === null || !skriv(lager, maal, v) || laes(lager, maal) !== v) continue;
      try { lager.removeItem(nyeste); } catch (e) { /* kopien bliver liggende */ }
      rullet.push(maal);
    }
    return rullet;
  }

  // En sikkerhedskopi til en fil: spillets data under «data» (det, der kan indlæses igen), og reservekopier
  // af ulæselige data for sig under «reservekopier» — de indlæses ikke igen, men kommer med ud af iPad'en.
  const HOVEDNOEGLER = ['mat_dino_v1', 'mat_enhjorning_v1', 'mat_voksen_v1'];
  // De gamle nøgler tjekkes også (ulæselige data kan ligge dér), men de indlæses aldrig igen fra en fil
  const ALLE_NOEGLER = HOVEDNOEGLER.concat(Object.keys(GAMLE_NOEGLER).map((n) => GAMLE_NOEGLER[n]));

  // Hovednøgler, hvis indhold ikke kan læses (ødelagt JSON). Er der ikke plads til en reservekopi,
  // bliver de liggende, og spillet er skrivebeskyttet, indtil en voksen har taget en kopi og ryddet op.
  // Nøgler, hvis rå tekst allerede ligger i en «_backup_», tæller ikke: de er reddet, og spillet gemmer
  // nye data oven i dem ved næste gem.
  function findUlaeselige(lager) {
    const reddet = new Set(findBackups(lager).filter((k) => k.indexOf('_backup_') > 0).map((k) => laes(lager, k)));
    return ALLE_NOEGLER.filter((k) => {
      const v = laes(lager, k);
      if (v === null || v === undefined || v === '' || reddet.has(v)) return false;
      try { return !erObjekt(JSON.parse(v)); } catch (e) { return true; }
    });
  }

  function lavKopi(lager, dato) {
    const data = {};
    const reservekopier = {};
    for (const k of HOVEDNOEGLER) {
      const v = laes(lager, k);
      if (!v) continue;
      let obj;
      try { obj = JSON.parse(v); } catch (e) { obj = undefined; }
      if (erObjekt(obj)) data[k] = obj;
      else reservekopier[k] = v; // ulæselig: med i filen som den er, så intet går tabt
    }
    // De gamle nøgler (før B1) kommer med som reservekopier: med ud af iPad'en, men de indlæses ikke oven i de nye
    for (const ny of Object.keys(GAMLE_NOEGLER)) {
      const v = laes(lager, GAMLE_NOEGLER[ny]);
      if (v) reservekopier[GAMLE_NOEGLER[ny]] = v;
    }
    for (const k of findBackups(lager)) if (k.indexOf('_backup_') > 0) reservekopier[k] = laes(lager, k);
    // Data fra før tidligere indlæsninger kommer også med (så en forkert indlæsning kan redes fra filen)
    const tidligere = {};
    for (const k of findBackups(lager)) {
      if (k.indexOf('_foer_import_') < 0) continue;
      try { tidligere[k] = JSON.parse(laes(lager, k)); } catch (e) { reservekopier[k] = laes(lager, k); }
    }
    return { app: 'Lystårnet', dato: dato || idag(), data: data, reservekopier: reservekopier, tidligereIndlaesninger: tidligere };
  }

  // Kendte emner fra en fil (kendte = { emner: { id: maxNiveau }, voksenEmner: { id: maxNiveau } }): niveauet holdes
  // inden for emnets trin. Ukendte emner og mærker bevares (de kan komme fra en nyere udgave af spillet, og
  // efter rens() og normaliseringen er de harmløse tal).
  function tilKendte(d, kendte, voksen) {
    const klem = (emner, max) => {
      for (const k of Object.keys(emner)) {
        if (Object.prototype.hasOwnProperty.call(max, k)) emner[k].niveau = Math.min(emner[k].niveau, max[k] || 1);
      }
    };
    if (voksen) { if (kendte.voksenEmner) klem(d.traening.emner, kendte.voksenEmner); }
    else if (kendte.emner) { klem(d.emner, kendte.emner); klem(d.dansk || {}, kendte.emner); }
    return d;
  }

  // Indlæs en kopi fra en fil: tjek og normalisér alt først, skriv derefter backups af det nuværende
  // (med tidsstempel, så to indlæsninger samme dag ikke overskriver originalen), og til sidst de nye data.
  // Returnerer { ok, noegler, fejl }.
  function importer(lager, obj, stempel, kendte) {
    const data = erObjekt(obj) && erObjekt(obj.data) ? obj.data : null;
    const nye = {};
    if (data) {
      for (const fra of Object.keys(data)) {
        // En kopi fra før B1 har de gamle nøgler: de lægges i de nye (men en ny nøgle i samme fil vinder)
        const k = nyNoegle(fra) || fra;
        if (k !== fra && Object.prototype.hasOwnProperty.call(data, k)) continue;
        const m = /^mat_(dino|enhjorning|voksen)_v1$/.exec(k);
        if (!m || !erObjekt(data[fra])) continue;
        try {
          const voksen = m[1] === 'voksen';
          nye[k] = voksen ? normaliserVoksen(data[fra]) : normaliserBarn(migrer(rens(data[fra])), m[1] === 'dino' ? 'Dino' : 'Enhjørning');
          // Børnenes gentagelsesopgaver og en afbrudt mission er hele opgaveobjekter. Fra en fil kan de være
          // ufuldstændige (runden kan gå i stå) — de droppes. Man mister kun et par opgaver, der skulle gentages.
          // Voksnes gentagelser er kun parametre (type, niveau, frø) og bygges igen af koden — de må gerne komme med.
          if (!voksen) { nye[k].gentag = {}; nye[k].pauset = null; }
          if (kendte) tilKendte(nye[k], kendte, voksen);
        } catch (e) { /* springes over */ }
      }
    }
    const noegler = Object.keys(nye);
    if (!noegler.length) return { ok: false, noegler: [], fejl: 'Filen indeholder ingen data fra spillet.' };
    stempel = String(stempel || Date.now());
    const nyeKopier = [];
    for (const k of noegler) {
      const nu = laes(lager, k);
      if (nu === null) continue;
      // Er de nuværende data allerede gemt som den nyeste kopi (fx samme fil indlæst to gange), skrives ingen ny
      const tidligere = importKopier(lager)[k] || [];
      if (tidligere.length && laes(lager, tidligere[tidligere.length - 1]) === nu) { nyeKopier.push(tidligere[tidligere.length - 1]); continue; }
      const bk = k + '_foer_import_' + naesteLoebenr(lager, k) + '_' + stempel;
      if (!skriv(lager, bk, nu) || laes(lager, bk) !== nu) return { ok: false, noegler: [], fejl: 'Der var ikke plads til en kopi af de nuværende data. Intet er ændret.' };
      nyeKopier.push(bk);
    }
    const skrevet = [];
    for (const k of noegler) {
      if (!skriv(lager, k, JSON.stringify(nye[k]))) {
        return { ok: false, noegler: skrevet, fejl: 'Kun en del blev indlæst (' + (skrevet.join(', ') || 'intet') + '). De gamle data ligger i ' + (nyeKopier.filter((x) => x.indexOf(k + '_') === 0)[0] || k + '_foer_import_…') + '.' };
      }
      skrevet.push(k);
    }
    rydGamleKopier(lager, MAX_KOPIER, nyeKopier);
    return { ok: true, noegler: skrevet, fejl: null };
  }

  function gemBarn(lager, noegle, data) {
    return skriv(lager, noegle, JSON.stringify(data));
  }

  // Dagens statistik (oprettes ved behov)
  function dag(data, dato) {
    dato = dato || idag();
    if (!erObjekt(data.dage[dato])) data.dage[dato] = standardDag();
    const datoer = Object.keys(data.dage).sort();
    while (datoer.length > MAX_DAGE) delete data.dage[datoer.shift()];
    return data.dage[dato];
  }

  // «Kommer igen senere»: læg en svær opgave i køen (uden dubletter)
  function tilfoejGentag(data, opgave) {
    const k = opgave.emne;
    const l = (data.gentag[k] || []).filter((o) => o.noegle !== opgave.noegle);
    const kopi = Object.assign({}, opgave);
    delete kopi.gentaget;
    l.push(kopi);
    data.gentag[k] = l.slice(-MAX_GENTAG);
  }

  function fjernGentag(data, opgave) {
    const k = opgave.emne;
    if (!data.gentag[k]) return;
    data.gentag[k] = data.gentag[k].filter((o) => o.noegle !== opgave.noegle);
  }

  // ---------- Voksendata ----------
  function standardVoksen() {
    return {
      version: VOKSEN_VERSION,
      lyd: true,                       // lydeffekter
      tale: true,                      // oplæsning
      tidsgraense: { dino: 0, enhjorning: 0 },   // minutter pr. dag, 0 = ingen grænse
      emner: { dino: {}, enhjorning: {} },       // emneId → false, hvis emnet er slået fra
      aabneAlle: { dino: false, enhjorning: false }, // voksen har åbnet alle verdener
      duel: { spil: [] },              // familieduellens resultater
      traening: standardTraening(),    // den voksnes egen træning (gymnasiematematik)
      stemme: null,                    // navnet på den danske stemme, den voksne har valgt (B3); null = automatisk
    };
  }

  function standardTraening() {
    // huskekort: vis reglerne før dagens dosis · proeveUr: vis et ur i prøven (begge kan slås fra)
    // tastatur: tal-svar tastes på eget taltastatur i stedet for at vælges (slået fra som standard)
    return { valgt: 'regnetricks', emner: {}, gentag: [], dage: {}, huskekort: true, proeveUr: true, tastatur: false };
  }

  function normaliserVoksen(d) {
    const s = standardVoksen();
    if (!erObjekt(d)) return s;
    d = migrerVoksenId(rens(d));
    const ud = Object.assign({}, s, d);
    ud.version = Number.isInteger(d.version) ? d.version : VOKSEN_VERSION;
    ud.lyd = d.lyd !== false;
    ud.stemme = typeof d.stemme === 'string' && d.stemme ? d.stemme.slice(0, 200) : null;
    ud.tale = d.tale !== false;
    ud.tidsgraense = Object.assign({}, s.tidsgraense, erObjekt(d.tidsgraense) ? d.tidsgraense : {});
    for (const k in ud.tidsgraense) ud.tidsgraense[k] = ikkeNeg(ud.tidsgraense[k], 0);
    ud.emner = Object.assign({}, s.emner, erObjekt(d.emner) ? d.emner : {});
    for (const k in ud.emner) if (!erObjekt(ud.emner[k])) ud.emner[k] = {};
    ud.aabneAlle = Object.assign({}, s.aabneAlle, erObjekt(d.aabneAlle) ? d.aabneAlle : {});
    for (const k in ud.aabneAlle) ud.aabneAlle[k] = ud.aabneAlle[k] === true;
    ud.duel = erObjekt(d.duel) ? Object.assign({ spil: [] }, d.duel) : s.duel;
    if (!Array.isArray(ud.duel.spil)) ud.duel.spil = [];
    ud.duel.spil = ud.duel.spil.slice(-50);
    // Træning: tilføjet efter version 1 af voksendata — manglende felter fyldes ud (ingen migrering nødvendig)
    const t = erObjekt(d.traening) ? d.traening : {};
    ud.traening = Object.assign(standardTraening(), t);
    ud.traening.valgt = typeof t.valgt === 'string' ? t.valgt : 'regnetricks';
    ud.traening.huskekort = t.huskekort !== false;
    ud.traening.proeveUr = t.proeveUr !== false;
    ud.traening.tastatur = t.tastatur === true;
    ud.traening.emner = {};
    if (erObjekt(t.emner)) for (const k in t.emner) ud.traening.emner[k] = normaliserEmne(t.emner[k]);
    ud.traening.gentag = Array.isArray(t.gentag) ? t.gentag.map(voksenGentag).filter(Boolean).slice(-10) : [];
    ud.traening.dage = {};
    if (erObjekt(t.dage)) {
      Object.keys(t.dage).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-MAX_DAGE).forEach((k) => {
        const x = erObjekt(t.dage[k]) ? t.dage[k] : {};
        ud.traening.dage[k] = { opgaver: ikkeNeg(x.opgaver, 0), rigtige: ikkeNeg(x.rigtige, 0) };
      });
    }
    return ud;
  }

  // B1: tidsgrænse, emner til/fra og «åbn alle» flyttes fra de gamle id'er til de nye, hvis de nye mangler.
  // Duellens resultater får de nye id'er. Arbejder på en kopi (d er allerede renset).
  function migrerVoksenId(d) {
    const ud = Object.assign({}, d);
    for (const felt of ['tidsgraense', 'emner', 'aabneAlle']) {
      if (!erObjekt(ud[felt])) continue;
      const f = Object.assign({}, ud[felt]);
      for (const gl of Object.keys(GAMLE_ID)) {
        if (!Object.prototype.hasOwnProperty.call(f, gl)) continue;
        if (!Object.prototype.hasOwnProperty.call(f, GAMLE_ID[gl])) f[GAMLE_ID[gl]] = f[gl];
        delete f[gl];
      }
      ud[felt] = f;
    }
    if (erObjekt(ud.duel) && Array.isArray(ud.duel.spil)) {
      ud.duel = Object.assign({}, ud.duel, {
        spil: ud.duel.spil.map((x) => (erObjekt(x) && GAMLE_ID[x.barn] ? Object.assign({}, x, { barn: GAMLE_ID[x.barn] }) : x)),
      });
    }
    return ud;
  }

  // Voksnes gentagelser gemmes kun som parametre — opgaven bygges igen af koden (aldrig færdig HTML i lageret).
  // Ældre gentagelser (før 04-10-2026 kl. 10) var hele opgaver med HTML: de bliver til en ny opgave af samme
  // type og niveau (frøet laves af nøglen), så «kommer igen»-køen ikke tabes.
  function voksenGentag(o) {
    if (!erObjekt(o) || typeof o.type !== 'string' || !/^[A-Za-z]+$/.test(o.type)) return null;
    let froe = Number.isInteger(o.froe) && o.froe >= 0 ? o.froe : null;
    const migreret = froe === null;
    if (migreret) {
      const n = typeof o.noegle === 'string' ? o.noegle : o.type;
      froe = 0;
      for (let i = 0; i < n.length; i++) froe = (Math.imul(froe, 31) + n.charCodeAt(i)) >>> 0;
    }
    return {
      type: o.type,
      niveau: Number.isInteger(o.niveau) && o.niveau >= 1 && o.niveau <= 3 ? o.niveau : 1,
      froe: froe >>> 0,
      emne: typeof o.emne === 'string' ? o.emne : '',
      noegle: !migreret && typeof o.noegle === 'string' ? o.noegle : '', // en migreret opgave får en ny nøgle, når den bygges
      dato: typeof o.dato === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.dato) ? o.dato : '',
    };
  }

  // Indlæs voksendata. Ulæselige data kopieres først; mislykkes kopien, er voksendata skrivebeskyttede
  // (ellers ville næste gem overskrive den eneste kopi). Returnerer { data, ny, backup, skrivebeskyttet, advarsel }.
  function indlaesVoksen(lager, noegle) {
    noegle = noegle || 'mat_voksen_v1';
    const raa = laes(lager, noegle);
    if (raa === null || raa === undefined || raa === '') return { data: standardVoksen(), ny: true, backup: null, skrivebeskyttet: false, advarsel: null };
    let obj;
    try { obj = JSON.parse(raa); } catch (e) { obj = undefined; }
    if (!erObjekt(obj)) {
      const k = backup(lager, noegle, raa);
      if (k) return { data: standardVoksen(), ny: true, backup: k, skrivebeskyttet: false, advarsel: 'Voksendelens indstillinger kunne ikke læses — en kopi ligger i ' + k };
      return {
        data: standardVoksen(), ny: true, backup: null, skrivebeskyttet: true,
        advarsel: 'Voksendelens indstillinger kunne ikke læses, og der var ikke plads til en kopi. Ændringer gemmes ikke, før der er taget en kopi under Indstillinger.',
      };
    }
    return { data: normaliserVoksen(obj), ny: false, backup: null, skrivebeskyttet: false, advarsel: null };
  }

  function gemVoksen(lager, data, noegle) {
    return skriv(lager, noegle || 'mat_voksen_v1', JSON.stringify(data));
  }

  // Lager i hukommelsen, hvis localStorage ikke findes (fx privat browsing)
  function hukommelsesLager() {
    const m = {};
    return {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
      setItem: (k, v) => { m[k] = String(v); },
      removeItem: (k) => { delete m[k]; },
      key: (i) => Object.keys(m)[i] || null,
      get length() { return Object.keys(m).length; },
    };
  }

  const Gem = {
    VERSION, VOKSEN_VERSION, MAX_DAGE, MAX_GENTAG, MIGRERINGER,
    idag, standardBarn, standardEmne, standardDag, standardHistorie, normaliserHistorie, standardVoksen, standardTraening,
    GAMLE_NOEGLER, HOVEDNOEGLER, migrerNoegler, nyNoegle,
    migrer, normaliserBarn, normaliserEmne, normaliserVoksen, normaliserPauset, voksenGentag, rens,
    indlaesBarn, gemBarn, indlaesVoksen, gemVoksen, findBackups, findUlaeselige, importer, lavKopi, rydGamleKopier, fortrydImport, importKopier,
    dag, tilfoejGentag, fjernGentag, hukommelsesLager,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Gem;
  else root.Gem = Gem;
})(typeof self !== 'undefined' ? self : this);
