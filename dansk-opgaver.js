/* dansk-opgaver.js — den danske del af Lystårnet: ordlister, lydliste, rim, små ord, historier og
   opgavegeneratorer. Rene funktioner uden DOM, så alt kan testes i Node (test/test-dansk.js).
   Alle ord, rim og historier er egne (docs/DANSK-ANALYSE.md) — intet fra læsehæfter eller skolebøger.
   Bruger Opgaver (opgaver.js) til tilfældighed og sværhedsgrad. */
(function (root) {
  'use strict';

  const O = (typeof module !== 'undefined' && module.exports) ? require('./opgaver.js') : root.Opgaver;
  const { lavRng, heltal, vaelg, bland, puljeFroe, puljeNr } = O;

  const ALFABET = 'abcdefghijklmnopqrstuvwxyzæøå'.split('');
  const VOKALER = 'aeiouyæøå';
  const erVokal = (b) => VOKALER.indexOf(b) >= 0;

  // ---------- Ordlister (DANSK-ANALYSE afsnit 7). Kun ord med en entydig emoji. ----------
  // Gruppe A: to bogstaver · B: tre bogstaver · C: konsonantklynger · D: to–tre stavelser · E: ikke-lydrette
  // ny: emojien findes ikke på ældre iPads (iOS < 16.4) — ordet bruges ikke i opgaverne
  const ORDLISTE = {
    A: 'is🍦 ø🏝️ æg🥚 ur⌚ ko🐄 bi🐝 fe🧚 to2️⃣ ti🔟 ni9️⃣',
    B: 'sol☀️ mus🐭 hus🏠 bus🚌 bil🚗 kat🐈 hat🎩 lam🐑 ris🍚 gul🟡 bøf🥩 pen🖊️ sok🧦 lys💡 lyn⚡ fem5️⃣ jul🎄 sæl🦭 mål🥅 nål🪡 hul🕳️ kys💋 gås🪿 kål🥬 kok🧑‍🍳 dør🚪',
    C: 'ost🧀 ske🥄 sne❄️ tre3️⃣ seks6️⃣ hest🐎 telt⛺ fly✈️ frø🐸 træ🌳 mælk🥛 blå🔵 svamp🍄 flag🇩🇰 dans💃 stol🪑 bro🌉 sko👟 ski🎿 slot🏰 kost🧹 gris🐷 blomst🌸 post📮 vest🦺 sky☁️ skæg🧔 smør🧈',
    D: 'abe🐒 hane🐓 due🕊️ rose🌹 løve🦁 gave🎁 vase🏺 næse👃 måne🌙 kano🛶 sofa🛋️ banan🍌 tomat🍅 kamel🐫 kanin🐰 robot🤖 dino🦕 delfin🐬 palme🌴 æble🍎 krone👑 plante🪴 yoyo🪀 kokos🥥 ananas🍍 tulipan🌷 elefant🐘 dåse🥫 svane🦢 bamse🧸 pose🛍️ bue🏹 flue🪰 kjole👗 øre👂 fire4️⃣',
    E: 'bog📖 tog🚂 hund🐕 mund👄 and🦆 mand👨 tand🦷 vand💧 hånd✋ bånd🎀 rød🔴 brød🍞 båd⛵ tråd🧵 ged🐐 fod🦶 mad🍽️ hav🌊 sav🪚 ræv🦊 syv7️⃣ fisk🐟 fugl🐦 ugle🦉 hjul🛞 hjerte❤️ hval🐋 kage🍰 pige👧 dreng👦 seng🛏️ ring💍 regn🌧️ kniv🔪 tøj👕 øje👁️ otte8️⃣ nisse🎅 jakke🧥 rotte🐀 tromme🥁 vaffel🧇 gaffel🍴 bold⚽ citron🍋 cykel🚲',
  };
  const NYE_EMOJI = ['gås', 'hjul'];
  const ORD = {};
  for (const g of Object.keys(ORDLISTE)) {
    for (const del of ORDLISTE[g].split(' ')) {
      const m = /^([a-zæøå]+)(.+)$/.exec(del);
      ORD[m[1]] = { ord: m[1], e: m[2], gruppe: g, lydret: g !== 'E', ny: NYE_EMOJI.indexOf(m[1]) >= 0 };
    }
  }
  const ordIGruppe = (grupper) => Object.keys(ORD).filter((o) => grupper.indexOf(ORD[o].gruppe) >= 0 && !ORD[o].ny);

  // ---------- Rimgrupper (afsnit 8). Rim er lyd — derfor en liste, ikke endelsesbogstaver. ----------
  const RIM = [
    ['mus', 'hus', 'bus'], ['kat', 'hat'], ['sol', 'stol'], ['is', 'ris', 'gris'], ['ko', 'sko', 'bro', 'to'],
    ['lys', 'kys'], ['gul', 'hul', 'jul', 'hjul'], ['mål', 'nål', 'kål'], ['sok', 'kok'], ['hest', 'vest'],
    ['dør', 'smør'], ['frø', 'ø'], ['bi', 'ti', 'ni', 'ski'], ['fe', 'ske', 'sne', 'tre'], ['ost', 'kost', 'post'],
    ['æg', 'skæg'], ['fly', 'sky'], ['due', 'flue', 'bue'], ['hane', 'svane'], ['rose', 'pose'],
    ['tand', 'mand', 'and', 'vand'], ['hund', 'mund'], ['bog', 'tog'], ['rød', 'brød'], ['båd', 'tråd'],
    ['hånd', 'bånd'], ['seng', 'dreng'],
  ].map((g) => g.filter((o) => ORD[o] && !ORD[o].ny)).filter((g) => g.length >= 2);
  const rimGruppe = (ord) => RIM.find((g) => g.indexOf(ord) >= 0) || null;

  // Rimdelen (fra den betonede vokal til enden) — bruges kun til at holde «næsten-rim» UDE af de forkerte valg.
  // Ender ordet på et tryksvagt e (hane, rose), tæller vokalen før med.
  function rimdel(ord) {
    let i = ord.length - 1;
    while (i >= 0 && !erVokal(ord[i])) i--;
    while (i > 0 && erVokal(ord[i - 1])) i--;
    if (ord[ord.length - 1] === 'e' && i === ord.length - 1 && i > 0) {
      let j = i - 1;
      while (j >= 0 && !erVokal(ord[j])) j--;
      while (j > 0 && erVokal(ord[j - 1])) j--;
      if (j >= 0) i = j;
    }
    return ord.slice(Math.max(0, i));
  }
  const rimerPaa = (a, b) => a !== b && ((rimGruppe(a) && rimGruppe(a) === rimGruppe(b)) || rimdel(a) === rimdel(b));

  // ---------- Bogstaverne i den rækkefølge, de kommer (afsnit 5) ----------
  const RAEKKEFOELGE = 'solimuaktenrbåhfgødypævjcqwxz'.split('');
  const HOLDELYDE = 'mslfnvr'.split('');
  const STOPLYDE = 'ptkbdg'.split('');
  const KUN_NAVN = 'qwxz'.split('');
  // Bogstavets id i lydlisten (æ, ø, å skrives ae, oe, aa i filnavne)
  const lydId = (b) => 'lyd-' + ({ æ: 'ae', ø: 'oe', å: 'aa' }[b] || b);
  const navnId = (b) => 'navn-' + ({ æ: 'ae', ø: 'oe', å: 'aa' }[b] || b);
  // Navnet, som talesyntesen siger (det store bogstav læses som navnet)
  const NAVNE = { a: 'a', b: 'be', c: 'se', d: 'de', e: 'e', f: 'æf', g: 'ge', h: 'hå', i: 'i', j: 'jåd', k: 'kå', l: 'æl', m: 'æm', n: 'æn', o: 'o', p: 'pe', q: 'ku', r: 'ær', s: 'æs', t: 'te', u: 'u', v: 've', w: 'dobbelt-ve', x: 'æks', y: 'y', z: 'sæt', æ: 'æ', ø: 'ø', å: 'å' };

  // ---------- Lydliste til indtaling (afsnit 6) — 🎙️ Indtal i voksendelen bruger den ----------
  const LYDLISTE = [
    ['a', 'Langt, lyst «aaa» som i abe — ikke det mørke a i far.', 'abe'],
    ['b', 'Kort «b»: luk læberne, slip, stop. Intet «ø» bagefter.', 'bi'],
    ['c', 'Kun navnet «se».', ''],
    ['d', 'Kort «d» med tungespidsen bag fortænderne. Stop straks.', 'due'],
    ['e', 'Langt «eee» som i se og fe (ikke «æ»).', 'fe'],
    ['f', 'Hold «fff» — kun luft mellem tænder og underlæbe.', 'fem'],
    ['g', 'Kort, hårdt «g» som i gul. Aldrig «gø» eller «j».', 'gul'],
    ['h', 'Et kort pust «hhh» uden stemme.', 'hus'],
    ['i', 'Langt «iii» som i is.', 'is'],
    ['j', '«jjj» som starten af ja, holdt kort.', 'jul'],
    ['k', 'Kort «k» bagest i munden. Stop straks.', 'ko'],
    ['l', 'Hold «lll» med tungespidsen oppe.', 'lam'],
    ['m', 'Hold «mmm» med lukkede læber.', 'mus'],
    ['n', 'Hold «nnn».', 'ni'],
    ['o', 'Langt, rundt «ooo» som i ko og sol.', 'ko'],
    ['p', 'Kort «p»: læberne, et lille pust, stop.', 'pen'],
    ['q', 'Kun navnet «ku».', ''],
    ['r', '«rrr» bagest i halsen, blødt (dansk r).', 'ris'],
    ['s', 'Hold «sss».', 'sol'],
    ['t', 'Kort «t» med tungespidsen. Stop straks.', 'ti'],
    ['u', 'Langt «uuu» som i hus og mus.', 'mus'],
    ['v', 'Hold «vvv» med stemme (ikke «f»).', 'vase'],
    ['w', 'Kun navnet «dobbelt-ve».', ''],
    ['x', 'Kun navnet «æks».', ''],
    ['y', 'Langt «yyy» som i lys — rundede læber.', 'lys'],
    ['z', 'Kun navnet «sæt».', ''],
    ['æ', 'Langt «æææ» som i æble.', 'æble'],
    ['ø', 'Langt «øøø» som i ø og sø.', 'ø'],
    ['å', 'Langt «ååå» som i mål.', 'mål'],
  ].map(([b, instruktion, eks]) => ({ id: lydId(b), bogstav: b, instruktion: instruktion, eksempel: eks }))
    .concat([
      { id: 'lyd-c-s', bogstav: 'c', instruktion: 'c siger tit s: hold «sss».', eksempel: 'cykel' },
      { id: 'lyd-a-kort', bogstav: 'a', instruktion: 'Kort, fladt «a» som i kat.', eksempel: 'kat' },
      { id: 'lyd-o-aaben', bogstav: 'o', instruktion: 'Kort, åbent o som i ost og sok.', eksempel: 'ost' },
      { id: 'lyd-e-tryksvag', bogstav: 'e', instruktion: 'Svagt e som sidst i abe.', eksempel: 'abe' },
      { id: 'lyd-d-bloed', bogstav: 'd', instruktion: 'Blødt d som i rød (tungen bred mod undertænderne).', eksempel: 'rød' },
    ]);
  // Reserve, når et klip mangler: aldrig bogstavets navn — men «lyden i sol»
  function lydReserve(b) {
    const l = LYDLISTE.find((x) => x.id === lydId(b));
    return l && l.eksempel ? 'lyden i ' + l.eksempel : 'bogstavet ' + b;
  }

  // ---------- Små ord i den rækkefølge, de kommer (afsnit 9). † = ikke-lydret, lyderes aldrig ----------
  const SMAAORD_LISTE = {
    1: 'se en er† det† min her nej og† to de† et der† i på mig† dig† vi får† jeg† du ser den lille†',
    2: 'ja stor vil op kan ikke† har† må få siger† sød† kom til så med† om nu skal',
    3: 'have† glad† god† hun han ud var† hvad† af† at† ned ind fra hen som ham kunne† sagde†',
  };
  const SMAAORD = {};
  for (const t of Object.keys(SMAAORD_LISTE)) {
    for (const del of SMAAORD_LISTE[t].split(' ')) SMAAORD[del.replace('†', '')] = { ord: del.replace('†', ''), trin: Number(t), lydret: del.indexOf('†') < 0 };
  }

  // ---------- Egne historier (afsnit 10) — Historiebogen (B5) ----------
  // * efter et ord = undtagelse (ikke på listerne; læses op og lyderes ikke)
  const HISTORIER = [
    { nr: 1, titel: 'Is', e: '🍦', linjer: ['Se en is.', 'Det er min is.', 'Her er en mus.', 'Nej, mus! Min is.'], tegn: 'en mus, der kigger på en is', skriv: ['is'] },
    { nr: 2, titel: 'Ko og kat', e: '🐄', linjer: ['Se en ko.', 'Se en kat.', 'Ko og kat.', 'De er to.'], tegn: 'en ko og en kat', skriv: ['ko', 'kat'] },
    { nr: 3, titel: 'Hus', e: '🏠', linjer: ['Her er et hus.', 'Der er en mus.', 'Mus er i hus.', 'Se! En kat!'], tegn: 'huset med musen og katten', skriv: ['hus', 'mus'] },
    { nr: 4, titel: 'Sol', e: '☀️', linjer: ['Se, en sol!', 'Sol på mig.', 'Sol på dig.', 'Vi får is.'], tegn: 'solen og to børn med is', skriv: ['sol'] },
    { nr: 5, titel: 'Bus', e: '🚌', linjer: ['Her er en bus.', 'Jeg er i bus.', 'Du er i bus.', 'Vi ser en ko.'], tegn: 'bussen og koen i vinduet', skriv: ['bus'] },
    { nr: 6, titel: 'Bi', e: '🐝', linjer: ['Se en bi.', 'Den er lille.', 'Bi på min hat.', 'Nej, bi! Nej!'], tegn: 'en bi på en hat', skriv: ['bi', 'hat'] },
    { nr: 7, titel: 'Hest', e: '🐎', linjer: ['Her er en hest.', 'Den er stor.', 'Jeg vil op.', 'Op på hest!'], tegn: 'barnet oppe på hesten', skriv: ['hest', 'op'] },
    { nr: 8, titel: 'Sne', e: '❄️', linjer: ['Se! Det er sne.', 'Sne på hus.', 'Sne på træ.', 'Sne på min hat.'], tegn: 'hus, træ og hat med sne', skriv: ['sne'] },
    { nr: 9, titel: 'Gris', e: '🐷', linjer: ['Her er en gris.', 'Den er lille og sød.', 'Gris, kom til mig!', 'Så får gris et kys.'], tegn: 'grisen får et kys', skriv: ['gris'] },
    { nr: 10, titel: 'Abe', e: '🐒', linjer: ['En abe er i et træ.', 'Den har en banan.', 'Må jeg få en?', 'Nej! siger abe.'], tegn: 'aben i træet med bananer', skriv: ['abe', 'banan'] },
    { nr: 11, titel: 'Fly', e: '✈️', linjer: ['Se et fly!', 'Jeg vil med.', 'Du må ikke.', 'Så ser jeg på det.'], tegn: 'flyet og barnet, der kigger op', skriv: ['fly'] },
    { nr: 12, titel: 'Mælk', e: '🥛', linjer: ['Jeg har et glas*.', 'Der er mælk i.', 'Kat ser mælk.', 'Nej, kat! Min mælk!'], tegn: 'katten og glasset med mælk', skriv: ['mælk'] },
    { nr: 13, titel: 'Hund og mund', e: '🐕', linjer: ['Her er min hund.', 'Den har en stor mund.', 'Den vil have mad.', 'Så er den glad.'], tegn: 'hunden med sin mad', skriv: ['hund', 'mund'] },
    { nr: 14, titel: 'Rød', e: '🔴', linjer: ['Jeg har en rød bil.', 'Du har en rød båd.', 'Her er et rødt* brød.', 'Rød, rød, rød!'], tegn: 'bilen, båden og brødet', skriv: ['rød'] },
    { nr: 15, titel: 'Fisk', e: '🐟', linjer: ['Her er en fisk.', 'Den er i et glas*.', 'Kat ser på fisk.', 'Fisk ser på kat.'], tegn: 'fisken i glasset og katten', skriv: ['fisk'] },
    { nr: 16, titel: 'Bog og tog', e: '📖', linjer: ['Jeg har en bog.', 'Den er om et tog.', 'Se! Her er et tog!', 'Tog og bog, bog og tog.'], tegn: 'bogen og toget', skriv: ['bog', 'tog'] },
    { nr: 17, titel: 'Tand', e: '🦷', linjer: ['Jeg har en tand, se!', 'Den er løs*.', 'Og så — pop*!', 'Nu har jeg et hul.'], tegn: 'barnet med hul i tandrækken', skriv: ['tand', 'hul'] },
    { nr: 18, titel: 'Måne', e: '🌙', linjer: ['Se, en måne!', 'Den er stor og gul.', 'Jeg ser på den.', 'Så må jeg i seng.'], tegn: 'månen og barnet ved vinduet', skriv: ['jeg', 'ser', 'en', 'måne'] },
  ];
  // Ordene i en linje (uden tegn og *), som de står — «Nej, mus! Min is.» → ['Nej', 'mus', 'Min', 'is']
  const ordILinje = (linje) => linje.split(/\s+/).map((w) => w.replace(/[^A-Za-zÆØÅæøå]/g, '')).filter(Boolean);
  const undtagelser = (h) => h.linjer.join(' ').split(/\s+/).filter((w) => w.indexOf('*') >= 0).map((w) => w.replace(/[^a-zæøå]/gi, '').toLowerCase());

  // ---------- Håndskrift: prikkede forlæg til små bogstaver (afsnit 11) ----------
  // Kasse 100 × 100: overlinje y = 15, x-linje 40, grundlinje 75, underlinje 95. Hvert strøg er en liste af
  // punkter i skriveretningen; første punkt er startprikken. Runde former mod uret (som c), streger oppefra og ned.
  // Vinkler i grader med y nedad: 0 = kl. 3, −90 = kl. 12, −60 = kl. 2, 30 = kl. 4. Mod uret = faldende vinkel.
  function bue(cx, cy, rx, ry, fra, til) {
    const ud = [];
    const n = Math.max(2, Math.ceil(Math.abs(til - fra) / 15));
    for (let i = 0; i <= n; i++) {
      const v = (fra + (til - fra) * i / n) * Math.PI / 180;
      ud.push([Math.round((cx + rx * Math.cos(v)) * 10) / 10, Math.round((cy + ry * Math.sin(v)) * 10) / 10]);
    }
    return ud;
  }
  const BY = 57.5, BR = 17.5; // midten og den lodrette radius af de runde små bogstaver
  const SKRIFT = {
    a: [bue(48, BY, 14, BR, -60, -420).concat([[62, 40], [62, 75]])],
    b: [[[36, 15], [36, 75], [36, 48]].concat(bue(50, BY, 14, BR, -150, 150))],
    c: [bue(52, BY, 15, BR, -60, -330)],
    d: [bue(46, BY, 14, BR, -60, -420).concat([[60, 40], [60, 15], [60, 75]])],
    e: [[[36, BY], [65, BY]].concat(bue(50, BY, 15, BR, 0, -330))],
    f: [[[62, 19], [56, 15], [49, 17], [47, 24], [47, 75]], [[38, 40], [60, 40]]],
    g: [bue(48, BY, 14, BR, -60, -420).concat([[62, 40], [62, 90], [57, 96], [47, 97], [39, 93]])],
    h: [[[36, 15], [36, 75], [36, 50], [41, 43], [50, 40], [59, 43], [63, 51], [63, 75]]],
    i: [[[50, 40], [50, 75]], [[50, 27], [50, 30]]],
    j: [[[55, 40], [55, 90], [50, 96], [42, 96], [37, 91]], [[55, 27], [55, 30]]],
    k: [[[36, 15], [36, 75]], [[62, 40], [37, 60], [63, 75]]],
    l: [[[50, 15], [50, 75]]],
    m: [[[28, 40], [28, 75], [28, 48], [33, 41], [41, 40], [47, 45], [48, 52], [48, 75], [48, 48], [53, 41], [61, 40], [67, 45], [68, 52], [68, 75]]],
    n: [[[36, 40], [36, 75], [36, 49], [42, 41], [51, 40], [59, 44], [62, 52], [62, 75]]],
    o: [bue(50, BY, 15, BR, -90, -450)],
    p: [[[36, 40], [36, 95], [36, 48]].concat(bue(50, BY, 14, BR, -150, 150))],
    q: [bue(48, BY, 14, BR, -60, -420).concat([[62, 40], [62, 95], [68, 91]])],
    r: [[[40, 40], [40, 75], [40, 51], [46, 43], [54, 40], [62, 43]]],
    s: [[[63, 45], [57, 40], [46, 40], [38, 45], [40, 53], [50, 57], [60, 61], [64, 68], [58, 75], [46, 75], [37, 70]]],
    t: [[[50, 25], [50, 69], [53, 75], [61, 75]], [[40, 40], [62, 40]]],
    u: [[[36, 40], [36, 66], [42, 74], [51, 75], [59, 70], [62, 61], [62, 40], [62, 75]]],
    v: [[[35, 40], [50, 75], [65, 40]]],
    w: [[[27, 40], [36, 75], [46, 47], [56, 75], [65, 40]]],
    x: [[[36, 40], [64, 75]], [[64, 40], [36, 75]]],
    y: [[[36, 40], [50, 75]], [[64, 40], [50, 75], [40, 95]]],
    z: [[[36, 40], [64, 40], [36, 75], [64, 75]]],
    æ: [bue(37, BY, 11, BR, -60, -420).concat([[48, 40], [48, 75]]), [[48, BY], [74, BY]].concat(bue(63, BY, 11, BR, 0, -330))],
    ø: [bue(50, BY, 15, BR, -90, -450), [[35, 79], [65, 36]]],
    å: [bue(48, BY, 14, BR, -60, -420).concat([[62, 40], [62, 75]]), bue(50, 24, 6, 6, -90, -450)],
  };
  // Hvad den voksne/oplæsningen siger om skrivevejen
  const SKRIVEVEJ = {
    a: 'rundt — og ned', b: 'ned — op — rundt', c: 'rundt', d: 'rundt — op — ned', e: 'hen — og rundt', f: 'krog — ned. Streg på tværs',
    g: 'rundt — ned — krog', h: 'ned — op — over og ned', i: 'ned. Prik', j: 'ned — krog. Prik', k: 'ned. Ind — og ud', l: 'ned', m: 'ned — op — over — over',
    n: 'ned — op — over', o: 'rundt', p: 'ned — op — rundt', q: 'rundt — ned', r: 'ned — op — lille bue', s: 'bue — og bue', t: 'ned — krog. Streg på tværs',
    u: 'ned — rundt — op — ned', v: 'ned — op', w: 'ned — op — ned — op', x: 'skråt. Skråt', y: 'skråt. Skråt og ned', z: 'hen — skråt — hen',
    æ: 'rundt og ned. Hen og rundt', ø: 'rundt. Streg på skrå', å: 'rundt og ned. Lille ring',
  };
  const BOGSTAV_BREDDE = 56; // afstand mellem bogstaverne i et ord (forlæggene fylder ca. x = 27–74)

  // Forlægget til et helt ord: strøgene for hvert bogstav, forskudt mod højre. Kun små bogstaver a–å.
  function forlaegOrd(ord) {
    const ud = { bredde: 0, strøg: [], bogstaver: [] };
    String(ord).toLowerCase().split('').forEach((b, i) => {
      const dx = i * BOGSTAV_BREDDE;
      if (!SKRIFT[b]) return;
      const fra = ud.strøg.length;
      SKRIFT[b].forEach((s) => ud.strøg.push(s.map(([x, y]) => [x + dx, y])));
      ud.bogstaver.push({ b: b, dx: dx, strøg: [fra, ud.strøg.length] });
    });
    ud.bredde = String(ord).length * BOGSTAV_BREDDE + 44;
    return ud;
  }

  // Punkter langs et strøg med fast afstand (så lange og korte stykker vægtes ens)
  function langs(strøg, afstand) {
    const ud = [strøg[0]];
    for (let i = 1; i < strøg.length; i++) {
      const [x0, y0] = strøg[i - 1], [x1, y1] = strøg[i];
      const l = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(l / afstand));
      for (let k = 1; k <= n; k++) ud.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
    }
    return ud;
  }
  const afst = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // Vurdér et spor mod forlægget (begge i forlæggets koordinater). Ingen skønhedskrav — kun:
  //  start: hvert strøg er begyndt ved (eller nær) startprikken,
  //  retning: punkterne nær strøget er tegnet i strøgets retning (mest fremad),
  //  dækning: mindst 70 % af forlægget har et tegnet punkt inden for tolerancen,
  //  og sporet ligger mest på forlægget (ikke kruseduller over det hele).
  function vurderSpor(forlaeg, spor, tol) {
    tol = tol || 11;
    const brugerStrøg = (spor || []).filter((s) => Array.isArray(s) && s.length);
    const alle = [];
    brugerStrøg.forEach((s, si) => langs(s, 3).forEach((p) => alle.push({ p: p, si: si })));
    const res = { ok: false, start: true, retning: true, daekning: 0, paaForlaeg: 0, strøg: [] };
    if (!alle.length) return res.start = false, res;
    const proever = forlaeg.map((f) => langs(f, 2));
    // Hvert tegnet punkt hører til det strøg i forlægget, det ligger nærmest
    for (const a of alle) {
      let bedst = -1, bd = Infinity;
      proever.forEach((pr, fi) => pr.forEach((q) => { const dd = afst(a.p, q); if (dd < bd) { bd = dd; bedst = fi; } }));
      a.fi = bedst;
    }
    let daekket = 0, ialt = 0;
    for (let fi = 0; fi < forlaeg.length; fi++) {
      const f = forlaeg[fi];
      const pr = proever[fi];
      const kort = afst(f[0], f[f.length - 1]) < 6 && pr.length < 4; // en prik (i, j)
      let d = 0;
      for (const q of pr) if (alle.some((a) => afst(a.p, q) <= tol)) d++;
      daekket += d; ialt += pr.length;
      const start = brugerStrøg.some((s) => afst(s[0], f[0]) <= tol * 1.4);
      // Retning: sporets punkter nær strøget i tegnerækkefølge → plads langs strøget; flest skridt fremad
      let frem = 0, tilbage = 0, forrige = null;
      if (!kort) {
        for (const a of alle) {
          let bedst = -1, bd = tol;
          if (a.fi === fi) pr.forEach((q, i) => { const dd = afst(a.p, q); if (dd <= bd) { bd = dd; bedst = i; } });
          if (bedst < 0) { forrige = null; continue; }
          // Kun små skridt tæller (et hop fra enden af en cirkel til starten er ikke «baglæns»)
          if (forrige !== null && forrige.si === a.si && Math.abs(bedst - forrige.i) < pr.length / 3) {
            if (bedst > forrige.i + 1) frem++; else if (bedst < forrige.i - 1) tilbage++;
          }
          forrige = { i: bedst, si: a.si };
        }
      }
      const retning = kort || frem >= tilbage;
      res.strøg.push({ daekning: d / pr.length, start: start || kort, retning: retning });
      if (!start && !kort) res.start = false;
      if (!retning) res.retning = false;
    }
    res.daekning = ialt ? daekket / ialt : 0;
    const alleForlaeg = [];
    forlaeg.forEach((f) => langs(f, 3).forEach((q) => alleForlaeg.push(q)));
    res.paaForlaeg = alle.filter((a) => alleForlaeg.some((q) => afst(a.p, q) <= tol * 2)).length / alle.length;
    res.ok = res.start && res.retning && res.daekning >= 0.7 && res.paaForlaeg >= 0.6;
    return res;
  }

  // ---------- Hjælpere til opgaver ----------
  const antalValg = (niveau) => (niveau <= 1 ? 2 : 3);
  const stort = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  function opgave(o) {
    // Fælles felter, så rundemotoren i app.js kan vise opgaven som de matematiske
    return Object.assign({ fag: 'dansk' }, o);
  }
  // Hjælpetrappen: hør igen langsomt → vis bogstavet (eller ordet) med et billede → svaret lyser
  const hjaelpBogstav = (b, ord) => ({ art: 'visBogstav', bogstav: b, ord: ord || '', e: ord && ORD[ord] ? ORD[ord].e : '' });
  // Et eksempelord, der starter med bogstavet (og ikke er et af valgene)
  function eksempelOrd(rng, b, undgaa) {
    const l = ordIGruppe(['A', 'B', 'C', 'D']).filter((o) => o[0] === b && (undgaa || []).indexOf(o) < 0);
    return l.length ? vaelg(rng, l) : '';
  }

  // =====================================================================
  //  Generatorer — emne, type, niveau → opgave (samme form som opgaver.js)
  // =====================================================================
  const GEN = {
    // ===== Rim =====
    // Trin 1: to valg, tydeligt forskellige · trin 2: tre valg, én med samme forlyd · trin 3: «hvilket passer ikke?»
    rim(niveau, rng) {
      const gruppe = vaelg(rng, RIM);
      const [stik, rigtig] = bland(rng, gruppe);
      const alle = Object.keys(ORD).filter((o) => !ORD[o].ny);
      const ikkeRim = alle.filter((o) => o !== stik && !rimerPaa(stik, o) && gruppe.indexOf(o) < 0 && ORD[o].e !== ORD[stik].e);
      let forkerte;
      if (niveau >= 2) {
        const sammeForlyd = bland(rng, ikkeRim.filter((o) => o[0] === stik[0]));
        const andre = bland(rng, ikkeRim.filter((o) => o[0] !== stik[0] && o[0] !== rigtig[0]));
        forkerte = sammeForlyd.slice(0, 1).concat(andre).slice(0, antalValg(niveau) - 1);
      } else {
        forkerte = bland(rng, ikkeRim.filter((o) => o[0] !== stik[0] && o[0] !== rigtig[0])).slice(0, 1);
      }
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'rim', type: 'rim', niveau, noegle: 'rim:' + stik + '-' + rigtig, ikon: '🎵',
        tale: 'Hvad rimer på ' + stik + '? ' + valg.map(stort).join(', eller ') + '?',
        tekst: 'Hvad rimer på ' + stik + '?',
        vis: { art: 'ordBillede', ord: stik, e: ORD[stik].e },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'rimLyt', stik: stik, valg: valg }],
      });
    },
    passerIkke(niveau, rng) {
      const gruppe = vaelg(rng, RIM.filter((g) => g.length >= 3));
      const rimord = bland(rng, gruppe).slice(0, 3);
      const ikkeRim = Object.keys(ORD).filter((o) => !ORD[o].ny && rimord.every((r) => !rimerPaa(r, o) && r !== o) && gruppe.indexOf(o) < 0);
      const svar = vaelg(rng, ikkeRim);
      const valg = bland(rng, rimord.concat([svar]));
      return opgave({
        emne: 'rim', type: 'passerIkke', niveau, noegle: 'passerIkke:' + rimord[0] + '-' + svar, ikon: '🎵',
        tale: 'Tre af dem rimer. Hvilket ord passer ikke? ' + valg.map(stort).join(', ') + '.',
        tekst: 'Hvilket passer ikke?',
        vis: { art: 'lyt' },
        svar: svar, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'rimLyt', stik: rimord[0], valg: valg }],
      });
    },

    // ===== Lyde =====
    // Trin 1: hør lyden → find bogstavet (først holdelyde) · 2: hvad starter med lyden · 3: hvad slutter med lyden
    lydBogstav(niveau, rng) {
      const pulje = niveau <= 1 ? HOLDELYDE.concat(['a', 'i', 'o', 'u']) : RAEKKEFOELGE.filter((b) => KUN_NAVN.indexOf(b) < 0 && b !== 'c');
      const b = vaelg(rng, pulje);
      const andre = ulige(rng, pulje, b, antalValg(niveau) - 1);
      const valg = bland(rng, andre.concat([b]));
      return opgave({
        emne: 'lyde', type: 'lydBogstav', niveau, noegle: 'lydBogstav:' + b, ikon: '👂',
        tale: 'Hvilket bogstav siger',
        lyd: [{ klip: lydId(b), reserve: lydReserve(b) }],
        tekst: 'Hvilket bogstav hører du?',
        vis: { art: 'lytLyd' },
        svar: b, valg: valg, valgArt: 'bogstav',
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, eksempelOrd(rng, b))],
      });
    },
    forlyd(niveau, rng) {
      const pulje = RAEKKEFOELGE.slice(0, 18).filter((b) => ordIGruppe(['A', 'B', 'C', 'D']).some((o) => o[0] === b));
      const b = vaelg(rng, pulje);
      const ord = ordIGruppe(['A', 'B', 'C', 'D']);
      const rigtig = vaelg(rng, ord.filter((o) => o[0] === b));
      const forkerte = bland(rng, ord.filter((o) => o[0] !== b)).filter((o, i, l) => l.findIndex((x) => x[0] === o[0]) === i).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([rigtig]));
      const eks = eksempelOrd(rng, b, valg);
      return opgave({
        emne: 'lyde', type: 'forlyd', niveau, noegle: 'forlyd:' + b, ikon: '👂',
        tale: 'Hvad starter med',
        lyd: [{ klip: lydId(b), reserve: eks ? 'samme lyd som ' + eks : lydReserve(b) }],
        efterTale: valg.map(stort).join(', eller ') + '?',
        tekst: 'Hvad starter med lyden?',
        vis: { art: 'bogstav', bogstav: b },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, eks)],
      });
    },
    udlyd(niveau, rng) {
      const slut = 'slmntkp';
      const ord = ordIGruppe(['A', 'B', 'C', 'D']).filter((o) => slut.indexOf(o[o.length - 1]) >= 0);
      const b = vaelg(rng, slut.split('').filter((x) => ord.some((o) => o[o.length - 1] === x)));
      const rigtig = vaelg(rng, ord.filter((o) => o[o.length - 1] === b));
      const forkerte = bland(rng, ordIGruppe(['A', 'B', 'C', 'D']).filter((o) => o[o.length - 1] !== b && o[0] !== b))
        .filter((o, i, l) => l.findIndex((x) => x[x.length - 1] === o[o.length - 1]) === i).slice(0, 2);
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'lyde', type: 'udlyd', niveau, noegle: 'udlyd:' + b, ikon: '👂',
        tale: 'Hvad slutter med',
        lyd: [{ klip: lydId(b), reserve: lydReserve(b) }],
        efterTale: valg.map(stort).join(', eller ') + '?',
        tekst: 'Hvad slutter med lyden?',
        vis: { art: 'bogstav', bogstav: b },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, rigtig)],
      });
    },

    // ===== Alfabetet =====
    findBogstav(niveau, rng) {
      const pulje = ALFABET.filter((b) => KUN_NAVN.indexOf(b) < 0);
      const b = vaelg(rng, pulje);
      const andre = ulige(rng, pulje, b, antalValg(niveau) - 1);
      const valg = bland(rng, andre.concat([b]));
      return opgave({
        emne: 'alfabet', type: 'findBogstav', niveau, noegle: 'findBogstav:' + b, ikon: '🔤',
        tale: 'Find bogstavet',
        lyd: [{ klip: navnId(b), reserve: NAVNE[b], navn: true }],
        tekst: 'Find bogstavet',
        vis: { art: 'lytLyd' },
        svar: b, valg: valg, valgArt: 'bogstav',
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, eksempelOrd(rng, b))],
      });
    },
    storLille(niveau, rng) {
      const pulje = ALFABET.filter((b) => KUN_NAVN.indexOf(b) < 0);
      const b = vaelg(rng, pulje);
      const andre = bland(rng, pulje.filter((x) => x !== b)).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, andre.concat([b]));
      return opgave({
        emne: 'alfabet', type: 'storLille', niveau, noegle: 'storLille:' + b, ikon: '🔤',
        tale: 'Her er et stort bogstav. Find det lille bogstav, der passer.',
        tekst: 'Find det lille bogstav',
        vis: { art: 'stortBogstav', bogstav: b },
        svar: b, valg: valg, valgArt: 'bogstav', kunLille: true,
        hjaelp: [{ art: 'hoerIgen' }, hjaelpBogstav(b, eksempelOrd(rng, b))],
      });
    },
    efterBogstav(niveau, rng) { return alfabetNabo(niveau, rng, 1); },
    foerBogstav(niveau, rng) { return alfabetNabo(niveau, rng, -1); },

    // ===== Lydering =====
    // Trin 1: hør lydene → find billedet · 2: ordet står skrevet → find billedet · 3: byg ordet af bogstaver
    lydering(niveau, rng) {
      const ord = ordIGruppe(['A', 'B']);
      const rigtig = vaelg(rng, ord);
      const forkerte = bland(rng, ord.filter((o) => o[0] !== rigtig[0] && ORD[o].e !== ORD[rigtig].e)).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'lydering', type: 'lydering', niveau, noegle: 'lydering:' + rigtig, ikon: '👂',
        tale: 'Lyt. Hvad siger det?',
        lyd: rigtig.split('').map((b) => ({ klip: lydId(b), reserve: '', pause: 500 })),
        efterTale: '',
        tekst: 'Hvad siger det?',
        vis: { art: 'lydering', ord: rigtig },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, hjaelpBogstav(rigtig[0], rigtig)],
      });
    },
    laesOrd(niveau, rng) {
      const ord = ordIGruppe(['B', 'C']);
      const rigtig = vaelg(rng, ord);
      // Forkerte deler forlyd eller rimdel (mus/hus/bus), så billedet ikke kan gættes af første bogstav alene
      const naer = ord.filter((o) => o !== rigtig && ORD[o].e !== ORD[rigtig].e && (o[0] === rigtig[0] || rimdel(o) === rimdel(rigtig)));
      const fjern = ord.filter((o) => o !== rigtig && ORD[o].e !== ORD[rigtig].e && naer.indexOf(o) < 0);
      const forkerte = bland(rng, naer).concat(bland(rng, fjern)).slice(0, 2);
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'lydering', type: 'laesOrd', niveau, noegle: 'laesOrd:' + rigtig, ikon: '📖',
        tale: 'Hvad står der? Tryk på bogstaverne, så hører du dem.',
        tekst: 'Hvad står der?',
        vis: { art: 'skrevetOrd', ord: rigtig },
        svar: rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, hjaelpBogstav(rigtig[0], rigtig)],
      });
    },
    bygOrd(niveau, rng) {
      const ord = ordIGruppe(['B', 'C', 'D']).filter((o) => o.length >= 3 && o.length <= 5);
      const rigtig = vaelg(rng, ord);
      const ekstra = bland(rng, RAEKKEFOELGE.slice(0, 22).filter((b) => rigtig.indexOf(b) < 0)).slice(0, rigtig.length >= 5 ? 1 : 2);
      return opgave({
        emne: 'lydering', type: 'bygOrd', niveau, noegle: 'bygOrd:' + rigtig, ikon: '✏️',
        tale: 'Byg ordet ' + rigtig + '. Tryk på bogstaverne i den rigtige rækkefølge.',
        tekst: 'Byg ordet',
        vis: { art: 'bygOrd', ord: rigtig, e: ORD[rigtig].e },
        svar: rigtig, byg: { brikker: bland(rng, rigtig.split('').concat(ekstra)), dele: rigtig.length, adskil: '' },
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, hjaelpBogstav(rigtig[0], rigtig)],
      });
    },

    // ===== Små ord =====
    findOrd(niveau, rng) {
      const pulje = Object.keys(SMAAORD).filter((o) => SMAAORD[o].trin <= Math.max(1, niveau));
      const rigtig = vaelg(rng, pulje);
      // Visuelt forskellige: ikke samme første bogstav og ikke samme længde, hvis det kan undgås
      const forskellige = pulje.filter((o) => o !== rigtig && o[0] !== rigtig[0]);
      const forkerte = bland(rng, forskellige).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'smaaord', type: 'findOrd', niveau, noegle: 'findOrd:' + rigtig, ikon: '👀',
        tale: 'Find ordet ' + rigtig + '.',
        tekst: 'Find ordet',
        vis: { art: 'lyt' },
        svar: rigtig, valg: valg, valgArt: 'skrevet',
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'visOrd', ord: rigtig }],
      });
    },
    ordISaetning(niveau, rng) {
      // En linje fra historierne med 3–4 forskellige ord, hvoraf mindst ét er et småord
      const linjer = [];
      HISTORIER.forEach((h) => h.linjer.forEach((l) => {
        const ord = ordILinje(l);
        if (l.indexOf('*') < 0 && ord.length >= 3 && ord.length <= 4 && new Set(ord.map((w) => w.toLowerCase())).size === ord.length &&
          ord.some((w) => SMAAORD[w.toLowerCase()])) linjer.push(l);
      }));
      const linje = vaelg(rng, linjer);
      const ord = ordILinje(linje);
      const svar = vaelg(rng, ord.filter((w) => SMAAORD[w.toLowerCase()]));
      return opgave({
        emne: 'smaaord', type: 'ordISaetning', niveau, noegle: 'ordISaetning:' + svar.toLowerCase(), ikon: '👀',
        tale: 'Tryk på ordet ' + svar.toLowerCase() + '.',
        tekst: 'Tryk på ordet',
        vis: { art: 'saetning', linje: linje },
        svar: svar, valg: ord, valgArt: 'skrevet', fastRaekkefoelge: true,
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'visOrd', ord: svar }],
      });
    },
    bygSaetning(niveau, rng) {
      const linjer = [];
      HISTORIER.slice(0, 12).forEach((h) => h.linjer.forEach((l) => {
        const ord = ordILinje(l);
        if (l.indexOf('*') < 0 && ord.length === 3 && new Set(ord.map((w) => w.toLowerCase())).size === 3) linjer.push(l);
      }));
      const linje = vaelg(rng, linjer);
      const ord = ordILinje(linje);
      return opgave({
        emne: 'smaaord', type: 'bygSaetning', niveau, noegle: 'bygSaetning:' + ord.join(' ').toLowerCase(), ikon: '✏️',
        tale: 'Byg sætningen: ' + linje + ' Tryk på ordene i den rigtige rækkefølge.',
        tekst: 'Byg sætningen',
        vis: { art: 'bygSaetning', linje: linje },
        svar: ord.join(' '), byg: { brikker: bland(rng, ord), dele: ord.length, adskil: ' ' },
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'visOrd', ord: ord.join(' ') }],
      });
    },

    // =====================================================================
    //  D1 · trin 1 (forslaget 09-10). Dansk indhold kommer fra håndskrevne banker — aldrig blind bogstavudskiftning.
    // =====================================================================

    // Rim: kortene vises og navngives, så vendes de. Hvilket skjult kort rimer på billedet?
    huskRim(niveau, rng) {
      const gruppe = vaelg(rng, RIM);
      const [stik, rigtig] = bland(rng, gruppe);
      const alle = Object.keys(ORD).filter((o) => !ORD[o].ny && o !== stik && gruppe.indexOf(o) < 0 && !rimerPaa(stik, o) && ORD[o].e !== ORD[stik].e);
      // Samme forlyd som billedordet (rimer ikke — «hus/hat») · et ord, der hverken rimer eller deler forlyd
      const sammeForlyd = bland(rng, alle.filter((o) => o[0] === stik[0]));
      const andre = bland(rng, alle.filter((o) => o[0] !== stik[0] && o[0] !== rigtig[0]));
      const forkerte = sammeForlyd.slice(0, 1).concat(andre).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([rigtig]));
      return opgave({
        emne: 'rim', type: 'huskRim', niveau, noegle: 'huskRim:' + stik + '-' + rigtig, ikon: '🃏',
        tale: stort(stik) + '. Husk kortene: ' + valg.join(' … ') + '. Hvilket skjult kort rimer på ' + stik + '?',
        tekst: 'Hvad rimer på ' + stik + '?',
        vis: { art: 'ordBillede', ord: stik, e: ORD[stik].e },
        svar: rigtig, valg: valg, valgArt: 'skjult',
        // Trin 1: kortene vendes op igen (og bliver liggende) · trin 2: hør billedordet med hvert kort
        hjaelp: [{ art: 'vendOp' }, { art: 'rimLyt', stik: stik, valg: valg }],
      });
    },

    // Lyde: byt den første lyd — «mus», byt /m/ ud med /h/ → hus. Ingen bogstaver, kun billeder og lyd
    bytLyd(niveau, rng) {
      const [fra, til, alt] = vaelg(rng, BYT_LYD);
      const ny = til[0];
      // Beholder den oprindelige lyd (fra) · en anden ny lyd (alt) — kun ord med billede
      const forkerte = [fra, alt].filter((o) => o && ORD[o]).slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([til]));
      // Reserven («samme lyd som …») må ikke være svaret selv
      const eks = eksempelOrd(rng, ny, [fra, til, alt]);
      return opgave({
        emne: 'lyde', type: 'bytLyd', niveau, noegle: 'bytLyd:' + fra + '-' + til, ikon: '🔄',
        tale: stort(fra) + '. Byt den første lyd ud med',
        lyd: [{ klip: lydId(ny), reserve: eks ? 'samme lyd som i ' + eks : lydReserve(ny) }],
        efterTale: 'Hvilket ord får vi? ' + valg.map(stort).join(', eller ') + '?',
        tekst: 'Byt den første lyd',
        vis: { art: 'ordBillede', ord: fra, e: ORD[fra].e },
        svar: til, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'rimLyt', stik: fra, valg: valg }],
      });
    },

    // Alfabetet: det trykte bogstav og det håndskrevne er det samme bogstav. Bogstavets NAVN bruges med vilje
    haandskrift(niveau, rng) {
      const pulje = Object.keys(HAANDSKRIFT_LIGNER);
      const b = vaelg(rng, pulje);
      const forkerte = HAANDSKRIFT_LIGNER[b].slice(0, antalValg(niveau) - 1);
      const valg = bland(rng, forkerte.concat([b]));
      return opgave({
        emne: 'alfabet', type: 'haandskrift', niveau, noegle: 'haandskrift:' + b, ikon: '✍️',
        tale: 'Det samme bogstav kan se lidt forskelligt ud. Find det håndskrevne',
        lyd: [{ klip: navnId(b), reserve: NAVNE[b], navn: true }],
        tekst: 'Find det håndskrevne',
        vis: { art: 'tryktBogstav', bogstav: b },
        svar: b, valg: valg, valgArt: 'haandskrift',
        // Trin 1: hør igen · trin 2: det håndskrevne bogstav skrives langsomt ved siden af det trykte
        hjaelp: [{ art: 'hoerIgen' }, { art: 'skrivBogstav', bogstav: b }],
      });
    },

    // Lydering: ret det midterste bogstav, så der står det, billedet viser («mis» → mus). Stavning med mundtligt mål
    retVokal(niveau, rng) {
      const ord = ordIGruppe(['B']).filter((o) => o.length === 3 && !erVokal(o[0]) && erVokal(o[1]) && !erVokal(o[2]));
      const rigtig = vaelg(rng, ord);
      const v = rigtig[1];
      const vokaler = 'aeiou'.split('').filter((x) => x !== v);
      const forkert = vaelg(rng, vokaler);                        // vokalen, der står i det forkerte ord
      const anden = vaelg(rng, vokaler.filter((x) => x !== forkert));
      // Beholder det forkerte bogstav · en anden vokal uden at lytte til målordet
      const valg = bland(rng, [forkert, anden].slice(0, antalValg(niveau) - 1).concat([v]));
      const vist = rigtig[0] + forkert + rigtig[2];
      return opgave({
        emne: 'lydering', type: 'retVokal', niveau, noegle: 'retVokal:' + rigtig + '-' + vist, ikon: '🩹',
        tale: stort(rigtig) + '. Ret det midterste bogstav, så der står ' + rigtig + '.',
        tekst: 'Ret bogstavet',
        vis: { art: 'retOrd', ord: rigtig, e: ORD[rigtig].e, vist: vist, plads: 1 },
        svar: v, valg: valg, valgArt: 'bogstav', kunLille: true,
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, Object.assign(hjaelpBogstav(v, rigtig), { midt: true })],
      });
    },

    // Små ord: er tingen I eller PÅ kassen? Billedet gør placeringen utvetydig; ordene læses ikke op
    hvorErTingen(niveau, rng) {
      const ting = vaelg(rng, PLACERING_TING);
      const beholder = vaelg(rng, PLACERING_BEHOLDER);
      const rel = vaelg(rng, ['i', 'på']);
      const valg = bland(rng, ['i', 'på']);
      return opgave({
        emne: 'smaaord', type: 'hvorErTingen', niveau, noegle: 'hvorErTingen:' + ting.id + '-' + rel, ikon: '📦',
        tale: 'Vælg det lille ord, der passer til, hvor ' + ting.bestemt + ' er.',
        tekst: 'Hvor er ' + ting.bestemt + '?',
        vis: { art: 'scene', fakta: { rel: rel }, dele: [{ t: 'placering', id: 'placering', ting: ting.e, beholder: beholder.id, rel: rel }] },
        svar: rel, valg: valg, valgArt: 'skrevet',
        hjaelp: [{ art: 'lys', trin: [{ tale: 'Se på ' + beholder.bestemt + '. Er ' + ting.bestemt + ' inde i den eller oven på den?', lys: ['beholder'] }] }],
      });
    },

    // =====================================================================
    //  D2 · trin 2 (forslaget 09-10)
    // =====================================================================

    // Rim: en lille remse slutter med et hul — vælg det ord, der rimer (fejlene passer til remsen, men rimer ikke)
    rimRemse(niveau, rng) {
      const R = vaelg(rng, RIM_REMSER);
      const valg = bland(rng, R.fejl.slice(0, antalValg(niveau) - 1).concat([R.rigtig]));
      return opgave({
        emne: 'rim', type: 'rimRemse', niveau, noegle: 'rimRemse:' + R.stik + '-' + R.rigtig, ikon: '🎶',
        tale: R.remse + ' Vælg det sidste ord, så det rimer på ' + R.stik + '.',
        efterTale: valg.map(stort).join(', eller ') + '?',
        tekst: 'Hvad rimer på ' + R.stik + '?',
        vis: { art: 'ordBillede', ord: R.stik, e: ORD[R.stik].e },
        svar: R.rigtig, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'rimLyt', stik: R.stik, valg: valg }],
      });
    },

    // Lyde: hvor mange lyde er der i ordet? Svarene er lydprikker (ingen bogstaver). Bank kontrolleret i hånden
    taelLyde(niveau, rng) {
      const pulje = Object.keys(LYD_ANTAL).filter((o) => ORD[o] && (niveau >= 3 || LYD_ANTAL[o] <= 3));
      const ord = vaelg(rng, pulje);
      const n = LYD_ANTAL[ord];
      const kortAf = (k) => ({ dele: [{ t: 'prikker', n: k }], navn: k + (k === 1 ? ' lyd' : ' lyde'), fakta: { n: k } });
      // Tæller ordet som én · glemmer en lyd · deler en lang vokal i to (én eller to for mange). Facit er lige ofte det
      // mindste, det midterste og det største antal prikker (code-review #3: før var det altid det midterste)
      const under = [...new Set([n - 1, 1])].filter((x) => x >= 1 && x < n), over = [n + 1, n + 2];
      const muligt = [over, under.length ? [vaelg(rng, under), vaelg(rng, over)] : null, under.length === 2 ? under : null].filter(Boolean);
      const k = O.lavKort(rng, kortAf(n), vaelg(rng, muligt).map(kortAf), antalValg(niveau));
      return opgave({
        emne: 'lyde', type: 'taelLyde', niveau, noegle: 'taelLyde:' + ord, ikon: '🔵',
        tale: 'Lyt til ordet ' + ord + '. Hvor mange lyde kan du høre?',
        tekst: 'Hvor mange lyde?',
        vis: { art: 'ordBillede', ord: ord, e: ORD[ord].e },
        svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
        hjaelp: [{ art: 'hoerIgen', langsomt: true }],
      });
    },

    // Alfabetet: læg tre bogstaver i alfabetisk rækkefølge (tryk på dem ét ad gangen, fra venstre)
    alfabetOrden(niveau, rng) {
      const pulje = ALFABET.filter((b) => KUN_NAVN.indexOf(b) < 0);
      let tre;
      // Ikke naboer i alfabetet (så rækkefølgen kræver opslag) og ikke allerede i rigtig rækkefølge
      do { tre = bland(rng, pulje).slice(0, 3); } while (tre.some((b, i) => tre.some((c, j) => i !== j && Math.abs(ALFABET.indexOf(b) - ALFABET.indexOf(c)) < 2)));
      const sorteret = tre.slice().sort((a, b) => ALFABET.indexOf(a) - ALFABET.indexOf(b));
      let brikker;
      do { brikker = bland(rng, tre); } while (brikker.join('') === sorteret.join(''));
      return opgave({
        emne: 'alfabet', type: 'alfabetOrden', niveau, noegle: 'alfabetOrden:' + sorteret.join(''), ikon: '🔠',
        tale: 'Læg de tre bogstaver i rækkefølge, som i alfabetet. Begynd fra venstre.',
        tekst: 'Som i alfabetet',
        vis: { art: 'bygAlfabet', dele: 3 },
        svar: sorteret.join(''), byg: { brikker: brikker, dele: 3, adskil: '', navn: true },
        // Trin 1: alfabetet vises (de tre bogstaver markeret) · trin 2: det første lyser
        hjaelp: [{ art: 'alfabetVis', bogstaver: sorteret }, { art: 'foersteBrik', brik: sorteret[0], tale: 'Først ' + NAVNE[sorteret[0]] + '.' }],
      });
    },

    // Lydering: skift ét bogstav, så ordet bliver til billedet (sol → sæl). Pladsen vises først i hjælpen
    skiftBogstav(niveau, rng) {
      const par = vaelg(rng, SKIFT_PAR);
      const [fra, til] = rng() < 0.5 ? par : [par[1], par[0]];
      const plads = fra.split('').findIndex((b, i) => b !== til[i]);
      const ny = til[plads], gammel = fra[plads];
      const klasse = erVokal(ny) ? 'aeiouyæøå' : 'bdfghjklmnprstv';
      const anden = vaelg(rng, klasse.split('').filter((b) => b !== ny && b !== gammel && (fra.slice(0, plads) + b + fra.slice(plads + 1)) !== til));
      // Beholder bogstavet (ingen ændring) · et andet bogstav af samme slags
      const valg = bland(rng, [gammel, anden].slice(0, antalValg(niveau) - 1).concat([ny]));
      return opgave({
        emne: 'lydering', type: 'skiftBogstav', niveau, noegle: 'skiftBogstav:' + fra + '-' + til, ikon: '🔀',
        tale: 'Her står ' + fra + '. Lav ordet om til ' + til + ' ved at skifte ét bogstav.',
        tekst: fra + ' → ' + til,
        vis: { art: 'retOrd', ord: til, e: ORD[til].e, vist: fra, plads: plads, skjulPlads: true },
        svar: ny, valg: valg, valgArt: 'bogstav', kunLille: true,
        hjaelp: [{ art: 'visPlads' }, Object.assign(hjaelpBogstav(ny, til), { midt: plads > 0 && plads < til.length - 1, slut: plads === til.length - 1 })],
      });
    },

    // Små ord: læs ordet (i eller på) — vælg billedet, der passer. Ordet siges ikke
    laesPlacering(niveau, rng) {
      const ting = vaelg(rng, PLACERING_TING);
      const beholder = vaelg(rng, PLACERING_BEHOLDER);
      const ord = vaelg(rng, ['i', 'på']);
      const kortAf = (rel) => ({ dele: [{ t: 'placering', ting: ting.e, beholder: beholder.id, rel: rel }], navn: { i: 'inde i', 'på': 'oven på', bag: 'bagved' }[rel], fakta: { rel: rel } });
      // Det andet lille ord · en anden placering (bagved)
      const k = O.lavKort(rng, kortAf(ord), [kortAf(ord === 'i' ? 'på' : 'i'), kortAf('bag')], antalValg(niveau));
      return opgave({
        emne: 'smaaord', type: 'laesPlacering', niveau, noegle: 'laesPlacering:' + ord + '-' + ting.id, ikon: '👀',
        tale: 'Læs det lille ord. Vælg billedet, der passer.',
        tekst: 'Læs ordet',
        vis: { art: 'skrevetOrd', ord: ord },
        svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
        hjaelp: [{ art: 'visBogstav', bogstav: ord[0], ord: '', e: '' }],
      });
    },
  };

  // =====================================================================
  //  D3 · trin 3 (forslaget 09-10) — opgaverne her bruges via GEN (verdenerne) og HISTORIE_QUIZ
  // =====================================================================
  Object.assign(GEN, {
    // Rim: ét stort billede — find ordparret med billedet, hvor de to ord rimer. To kort har billedet (det ene rimer,
    // det andet ikke), så billederne alene afgør det ikke — rimet skal høres (code-review #4). Før stod begge
    // ord som store billeder, og facit var det eneste kort med dem begge.
    rimPar(niveau, rng) {
      const par = vaelg(rng, RIM_PAR);
      const [x, y] = rng() < 0.5 ? par : [par[1], par[0]];
      const andetPar = vaelg(rng, RIM_PAR.filter((p) => p.indexOf(x) < 0 && p.indexOf(y) < 0));
      const ikkeRim = vaelg(rng, Object.keys(ORD).filter((o) => !ORD[o].ny && o !== x && o !== y && !rimerPaa(x, o) && ORD[o].e !== ORD[x].e && andetPar.indexOf(o) < 0));
      const kortAf = (a, b) => ({ dele: [{ t: 'ting', e: ORD[a].e, n: 1, taelbar: false }, { t: 'ting', e: ORD[b].e, n: 1, taelbar: false }], navn: a + ' og ' + b, fakta: { par: [a, b] } });
      // Billedet er med, men ordene rimer ikke · ordene rimer, men billedet er ikke med
      const k = O.lavKort(rng, kortAf(x, y), [kortAf(x, ikkeRim), kortAf(andetPar[0], andetPar[1])], antalValg(niveau));
      return opgave({
        emne: 'rim', type: 'rimPar', niveau, noegle: 'rimPar:' + x + '-' + y, ikon: '🎭',
        tale: stort(x) + '. Find ordparret med ' + x + ', hvor de to ord rimer.',
        tekst: 'Passer og rimer',
        vis: { art: 'scene', fakta: { ord: x }, dele: [{ t: 'ting', id: 'x', e: ORD[x].e, n: 1, taelbar: false }] },
        svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
        // Trin 1: hvert par læses op · trin 2: billedet lyser, og rimet siges
        hjaelp: [{ art: 'laesKort' }, { art: 'lys', trin: [{ tale: stort(x) + ' og ' + y + '. De rimer.', lys: ['x'] }] }],
      });
    },

    // Lyde: tag den allerførste lyd væk — gris → ris. Kun få naturlige par (forslaget: «kræv ikke 16»)
    fjernLyd(niveau, rng) {
      const [fra, til, anden] = vaelg(rng, FJERN_LYD);
      // Fjerner intet · fjerner for meget / tager et ord, der bare rimer
      const valg = bland(rng, [fra, anden].slice(0, antalValg(niveau) - 1).concat([til]));
      return opgave({
        emne: 'lyde', type: 'fjernLyd', niveau, noegle: 'fjernLyd:' + fra, ikon: '✂️',
        tale: stort(fra) + '. Tag den allerførste lyd væk. Hvilket ord bliver tilbage? ' + valg.map(stort).join(', ') + '?',
        tekst: 'Tag den første lyd væk',
        vis: { art: 'ordBillede', ord: fra, e: ORD[fra].e },
        svar: til, valg: valg, valgArt: 'emoji',
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'rimLyt', stik: fra, valg: valg }],
      });
    },

    // Alfabetet: på hvilken hylde hører bogstavet hjemme? (A–G, H–P, Q–Å)
    alfabetHylde(niveau, rng) {
      const b = vaelg(rng, ALFABET);
      const i = ALFABET.indexOf(b);
      const hylde = HYLDER.find((h) => i >= ALFABET.indexOf(h[0]) && i <= ALFABET.indexOf(h[1]));
      const kortAf = (h) => ({ dele: [{ t: 'tal', s: h[0].toUpperCase() + '–' + h[1].toUpperCase() }], navn: 'fra ' + NAVNE[h[0]] + ' til ' + NAVNE[h[1]], fakta: { fra: h[0], til: h[1] } });
      // Vælger den første hylde uden opslag · forveksler «et stykke henne» med den sidste
      const fejl = HYLDER.filter((h) => h !== hylde).map(kortAf);
      const k = O.lavKort(rng, kortAf(hylde), fejl, antalValg(niveau));
      return opgave({
        emne: 'alfabet', type: 'alfabetHylde', niveau, noegle: 'alfabetHylde:' + b, ikon: '📚',
        tale: 'På hvilken hylde hører bogstavet',
        lyd: [{ klip: navnId(b), reserve: NAVNE[b], navn: true }],
        efterTale: 'hjemme? Brug alfabetet.',
        tekst: 'Hvilken hylde?',
        vis: { art: 'stortBogstav', bogstav: b },
        svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
        hjaelp: [{ art: 'alfabetVis', bogstaver: [b] }],
      });
    },

    // Lydering: to billedord skrevet uden mellemrum — sæt skillemærket mellem dem
    delOrd(niveau, rng) {
      const [a, b] = vaelg(rng, DEL_ORD);
      const ord = a + b, rigtig = a.length;
      const kortAf = (p) => ({ dele: [{ t: 'strimmel', ord: ord, skille: p }], navn: ord.slice(0, p) + ' og ' + ord.slice(p), fakta: { skille: p } });
      // Deler en eller to lyde for tidligt · lader en eller to lyde af det andet ord følge med. Facits streg er lige
      // ofte den første, den midterste og den sidste af de tre (code-review #2); ordparrene har forskellige længder
      const inde = (p) => p >= 1 && p < ord.length;
      const foer = [rigtig - 1, rigtig - 2].filter(inde), efter = [rigtig + 1, rigtig + 2].filter(inde);
      const muligt = [efter.length === 2 ? efter : null, foer.length && efter.length ? [vaelg(rng, foer), vaelg(rng, efter)] : null, foer.length === 2 ? foer : null].filter(Boolean);
      const k = O.lavKort(rng, kortAf(rigtig), vaelg(rng, muligt).map(kortAf), antalValg(niveau));
      return opgave({
        emne: 'lydering', type: 'delOrd', niveau, noegle: 'delOrd:' + a + '-' + b, ikon: '✂️',
        tale: 'Her er to billedord skrevet uden mellemrum. Sæt skillemærket mellem dem.',
        tekst: 'To ord',
        vis: { art: 'scene', fakta: { ord: [a, b] }, dele: [{ t: 'ting', id: 'a', e: ORD[a].e, n: 1, taelbar: false }, { t: 'ting', id: 'b', e: ORD[b].e, n: 1, taelbar: false }, { t: 'strimmel', id: 'strimmel', ord: ord }] },
        svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
        // Trin 1: lydene i det første ord (uden at sige hele svaret) · trin 2: det første billede lyser
        hjaelp: [{ art: 'lydFoerste', bogstaver: a.split('') }, { art: 'lys', trin: [{ tale: 'Det første billede er ' + a + '.', lys: ['a'] }] }],
      });
    },

    // Små ord: «Her er ikke en kat.» — ordet IKKE skal læses; præcis ét billede passer.
    // Halvdelen af gangene står der «Her er nu en kat.» i stedet (code-review #5: før stod «ikke» der hver gang, så det
    // kunne springes over). Skiltet har altid fire ord, og det tredje lyser — kun ordet selv afslører udgaven.
    ikkeOrd(niveau, rng) {
      const [X, Y, Z] = bland(rng, IKKE_DYR).slice(0, 3);
      const ikke = rng() < 0.5;
      const kortAf = (dyr, navn) => ({ dele: dyr.map((d) => ({ t: 'ting', e: d.e, n: 1, taelbar: false })), navn: navn, fakta: { dyr: dyr.map((d) => d.ord) } });
      const kun = (d) => kortAf([d], 'kun en ' + d.ord), to = (a, b) => kortAf([a, b], 'en ' + a.ord + ' og en ' + b.ord);
      // «ikke»: overser «ikke» · ser en anden figur, men tjekker ikke, at den første stadig er med.
      // «nu»: læser «ikke», selv om det ikke står der · vælger kortet med flest dyr
      const k = ikke
        ? O.lavKort(rng, kun(Y), [kun(X), to(X, Y)], antalValg(niveau))
        : O.lavKort(rng, kun(X), [kun(Y), to(Y, Z)], antalValg(niveau));
      const ord = ikke ? 'ikke' : 'nu';
      return opgave({
        emne: 'smaaord', type: 'ikkeOrd', niveau, noegle: 'ikkeOrd:' + X.ord + '-' + Y.ord + (ikke ? '' : '-nu'), ikon: '👀', // ikke 🚫 — det afslører «ikke»
        tale: 'Læs det ord, der lyser. Vælg billedet, der passer til skiltet. Her er … en ' + X.ord + '.',
        tekst: 'Læs skiltet',
        vis: { art: 'ikkeSkilt', ord: ['Her', 'er', ord, 'en'], fremhaev: 2, e: X.e, dyr: X.ord },
        svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
        hjaelp: [{ art: 'visOrd', ord: ord }, { art: 'laesKort' }],
      });
    },
  });
  const HYLDER = [['a', 'g'], ['h', 'p'], ['q', 'å']];

  // Hvilken slutning passer? (Historiebogen, trin 3)
  function historieSlutning(niveau, rng) {
    const H = vaelg(rng, SLUTNING);
    const kortAf = ([e, tekst]) => ({ dele: [{ t: 'ting', e: e, n: 1, taelbar: false }], navn: tekst, fakta: { e: e } });
    const k = O.lavKort(rng, kortAf(H.rigtig), H.fejl.map(kortAf), 3);
    return opgave({
      emne: 'historie', type: 'historieSlutning', niveau, noegle: 'historieSlutning:' + H.id, ikon: '🏁',
      tale: H.s.join(' ') + ' Hvilken slutning passer til det hele?',
      tekst: 'Hvordan ender det?',
      vis: { art: 'scene', fakta: { id: H.id }, dele: H.billeder.map((e, i) => ({ t: 'ting', id: 's' + i, e: e, n: 1, taelbar: false })) },
      svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
      hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'laesKort' }],
    });
  }

  // «Hvorfor?» (Historiebogen, trin 2): tre oplysninger og et spørgsmål; svarene er billeder med en kort oplæsning
  function historieHvorfor(niveau, rng) {
    const H = vaelg(rng, HVORFOR);
    const kortAf = ([e, tekst]) => ({ dele: [{ t: 'ting', e: e, n: 1, taelbar: false }], navn: tekst, fakta: { e: e } });
    const k = O.lavKort(rng, kortAf(H.rigtig), H.fejl.map(kortAf), 3);
    return opgave({
      emne: 'historie', type: 'historieHvorfor', niveau, noegle: 'historieHvorfor:' + H.id, ikon: '❓',
      tale: H.s.join(' ') + ' ' + H.spm,
      tekst: 'Hvorfor?',
      vis: { art: 'scene', fakta: { id: H.id }, dele: H.billeder.map((e, i) => ({ t: 'ting', id: 's' + i, e: e, n: 1, taelbar: false })) },
      svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
      // Trin 1: hør igen langsomt · trin 2: hvert svar læses op ét ad gangen
      hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'laesKort' }],
    });
  }

  // ---------- D1: Historiebogen «🤔 Hvad skete der?» — små egne historier (ikke de 18 læsehistorier) ----------
  // Tre hændelser i en rækkefølge, der kun kan gå én vej (tid eller årsag). Hver hændelse har ét billede.
  // Ingen gemt statistik: opgaverne spilles fra historiesiden og gemmer intet (gemte data må ikke ændres).
  const SMAA_HISTORIER = [
    { id: 'mus', h: [['Musen finder et æble.', '🍎'], ['Den lægger æblet i tasken.', '👜'], ['Så går den hjem.', '🏠']] },
    { id: 'froe', h: [['Pigen planter et frø.', '🌱'], ['Det regner.', '🌧️'], ['En blomst vokser op.', '🌷']] },
    { id: 'aeg', h: [['Der ligger et æg.', '🥚'], ['Ægget går i stykker.', '🐣'], ['En lille kylling kommer ud.', '🐥']] },
    { id: 'sne', h: [['Det sner.', '❄️'], ['Vi laver en snemand.', '⛄'], ['Solen kommer, og snemanden smelter.', '☀️']] },
    { id: 'ballon', h: [['Pigen får en ballon.', '🎈'], ['Det blæser.', '🌬️'], ['Ballonen flyver op i himlen.', '☁️']] },
    { id: 'larve', h: [['En larve spiser et blad.', '🐛'], ['Den sover længe.', '💤'], ['Den bliver til en sommerfugl.', '🦋']] },
    { id: 'tand', h: [['Drengen spiser slik.', '🍬'], ['Han børster tænder.', '🪥'], ['Han går i seng.', '🛏️']] },
    { id: 'brev', h: [['Pigen skriver et brev.', '✏️'], ['Hun putter det i postkassen.', '📮'], ['Mormor læser brevet.', '👵']] },
    { id: 'fisk', h: [['Far fisker.', '🎣'], ['Han fanger en fisk.', '🐟'], ['De spiser fisken.', '🍽️']] },
    { id: 'taarn', h: [['Vi bygger et tårn.', '🧱'], ['Katten hopper op.', '🐈'], ['Tårnet vælter.', '💥']] },
    { id: 'sko', h: [['Drengen tager sokker på.', '🧦'], ['Han tager sko på.', '👟'], ['Han løber ud.', '🏃']] },
    { id: 'regn', h: [['Det regner.', '🌧️'], ['Solen kommer frem.', '☀️'], ['Der kommer en regnbue.', '🌈']] },
    { id: 'hoene', h: [['Hønen lægger et æg.', '🐔'], ['Mor steger ægget.', '🍳'], ['Barnet spiser ægget.', '😋']] },
    { id: 'gave', h: [['Pigen får en pakke.', '🎁'], ['Hun åbner pakken.', '🎀'], ['Der er en bamse i.', '🧸']] },
    { id: 'kage', h: [['Vi rører dejen.', '🥣'], ['Kagen bager i ovnen.', '🔥'], ['Vi spiser kagen.', '🍰']] },
    { id: 'baal', h: [['Vi samler grene.', '🪵'], ['Vi tænder et bål.', '🔥'], ['Vi spiser pølser ved bålet.', '🌭']] },
    { id: 'bad', h: [['Hunden er beskidt.', '🐕'], ['Den kommer i bad.', '🛁'], ['Nu er hunden ren.', '✨']] },
    { id: 'tog', h: [['Vi venter på toget.', '⏰'], ['Toget kommer.', '🚂'], ['Vi kører med toget.', '🧳']] },
  ];

  // Trin 1: hør historien, og læg de tre billeder i samme rækkefølge (tryk på dem ét ad gangen)
  function historieRaekke(niveau, rng) {
    const H = vaelg(rng, SMAA_HISTORIER);
    const billeder = H.h.map((x) => x[1]);
    const blandet = (() => { let b; do { b = bland(rng, billeder); } while (b.join() === billeder.join()); return b; })();
    return opgave({
      emne: 'historie', type: 'historieRaekke', niveau, noegle: 'historieRaekke:' + H.id, ikon: '🤔',
      tale: H.h.map((x) => x[0]).join(' ') + ' Læg billederne i samme rækkefølge.',
      tekst: 'Hvad skete der først?',
      vis: { art: 'bygHistorie', dele: 3 },
      svar: billeder.join(' '),
      // Brikkerne er billeder; et tryk siger hændelsens sætning (ikke emojiens navn)
      byg: { brikker: blandet, dele: 3, adskil: ' ', tale: blandet.map((b) => H.h.find((x) => x[1] === b)[0]) },
      // Trin 1: hør historien igen langsomt · trin 2: den første hændelse lyser (sætning og billede)
      hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'foersteBrik', brik: billeder[0], tale: H.h[0][0] }],
    });
  }
  // C · Fortællebroen står som nr. 2 på hvert trin (lægges på nedenfor, når GEN.fortaelleBro findes)
  const HISTORIE_QUIZ = { 1: [historieRaekke], 2: [historieHvorfor], 3: [historieSlutning] };
  // Tre opgaver til «🤔 Hvad skete der?» fra de trin, barnet er nået (forskellige historier). De gamle typer (den første
  // pr. trin) står i den gamle rækkefølge. Fortællebroen på barnets trin står sidst i stedet for en type, der ellers
  // kom to gange — på trin 3, hvor de tre gamle er forskellige, halvdelen af gangene i stedet for historieSlutning
  // (så de to «hvad sker så?»-opgaver ikke kommer i samme runde).
  function lavHistorieQuiz(trin, rng, antal) {
    antal = antal || 3;
    const T = Math.max(1, Math.min(3, trin));
    const gamle = [];
    for (let t = 1; t <= T; t++) if (HISTORIE_QUIZ[t] && HISTORIE_QUIZ[t][0]) gamle.push([HISTORIE_QUIZ[t][0], t]);
    const plan = Array.from({ length: antal }, (_, i) => gamle[i % gamle.length]);
    const ny = (HISTORIE_QUIZ[T] || [])[1];
    if (ny && antal > 1 && (antal > gamle.length || rng() < 0.5)) plan[antal - 1] = [ny, T];
    const ud = [], brugt = {};
    for (let i = 0; ud.length < antal && i < 200; i++) {
      const [g, t] = plan[ud.length];
      const o = g(t, lavRng(puljeFroe('quiz:' + (g.name || 'historie'), t, puljeNr(rng)))); // fast pulje (Piper)
      const hist = o.noegle.split(':')[1]; // samme id i to slags opgaver er også en gentagelse (review, fund 3) — strengt,
      // for nogle id'er (kage, regn, tog) er forskellige historier i hver bank; harmløst: der er altid nok
      if (brugt[hist]) continue;
      brugt[hist] = true;
      ud.push(o);
    }
    return ud;
  }

  // ---------- D2: håndskrevne banker ----------
  // Rimremser: remsen slutter med et hul; facit rimer på billedordet, fejlene passer til remsen, men rimer ikke
  const RIM_REMSER = [
    { stik: 'kat', remse: 'Se den lille kat. Den har fået en …', rigtig: 'hat', fejl: ['fisk', 'bold'] },
    { stik: 'mus', remse: 'Den lille mus bor i et …', rigtig: 'hus', fejl: ['ost', 'seng'] },
    { stik: 'sol', remse: 'Solen skinner på en …', rigtig: 'stol', fejl: ['træ', 'blomst'] },
    { stik: 'gris', remse: 'Se den søde gris. Den spiser en …', rigtig: 'is', fejl: ['kage', 'æble'] },
    { stik: 'ko', remse: 'Den store ko har fået en …', rigtig: 'sko', fejl: ['mælk', 'bold'] },
    { stik: 'hest', remse: 'Min fine hest har en ny …', rigtig: 'vest', fejl: ['hat', 'sko'] },
    { stik: 'mand', remse: 'Se den glade mand. Han har en løs …', rigtig: 'tand', fejl: ['næse', 'hat'] },
    { stik: 'bog', remse: 'Jeg læser en bog om et …', rigtig: 'tog', fejl: ['bil', 'fly'] },
    { stik: 'ost', remse: 'Musen gemmer sin ost bag en …', rigtig: 'kost', fejl: ['dør', 'stol'] },
    { stik: 'due', remse: 'Se den hvide due. Den jager en …', rigtig: 'flue', fejl: ['bi', 'æble'] },
    { stik: 'hane', remse: 'Den røde hane hilser på en …', rigtig: 'svane', fejl: ['and', 'gris'] },
    { stik: 'rose', remse: 'Pigen har en rose i en …', rigtig: 'pose', fejl: ['vase', 'kjole'] },
    { stik: 'dreng', remse: 'Den lille dreng hopper i sin …', rigtig: 'seng', fejl: ['sofa', 'stol'] },
    { stik: 'båd', remse: 'Jeg har en lille båd med en rød …', rigtig: 'tråd', fejl: ['flag', 'ring'] },
    { stik: 'bi', remse: 'Se, den lille bi står på …', rigtig: 'ski', fejl: ['sne', 'blomst'] },
    { stik: 'bånd', remse: 'Pigen har et bånd om sin …', rigtig: 'hånd', fejl: ['fod', 'øre'] },
    { stik: 'lys', remse: 'Mor slukker lyset og giver et …', rigtig: 'kys', fejl: ['bamse', 'seng'] },
  ];
  // Lyde i et ord — kontrolleret i hånden (antal bogstaver er IKKE facit: «ø» er én lyd, lange vokaler én lyd)
  const LYD_ANTAL = {
    ø: 1, is: 2, ko: 2, bi: 2, fe: 2, ti: 2, ni: 2, to: 2,
    sol: 3, mus: 3, hus: 3, bus: 3, bil: 3, kat: 3, lam: 3, ris: 3, pen: 3, fem: 3, sok: 3, lys: 3, mål: 3, kål: 3,
    gul: 3, jul: 3, kys: 3, kok: 3, sæl: 3, fly: 3, sne: 3, ske: 3, tre: 3, frø: 3, sko: 3, ski: 3, bro: 3, ost: 3,
    hest: 4, telt: 4, kost: 4, post: 4, vest: 4, slot: 4, stol: 4, gris: 4, mælk: 4,
  };
  // Skift ét bogstav (ikke det første — det øver «byt lyd»): par af billedord, hvor kun ét bogstav og én lyd er forskellig
  const SKIFT_PAR = [['sol', 'sæl'], ['sok', 'sol'], ['lyn', 'lys'], ['hul', 'hus'], ['ske', 'sne'], ['ske', 'sko'], ['ske', 'ski'],
    ['ske', 'sky'], ['sko', 'sky'], ['ski', 'sko'], ['ski', 'sky'], ['tre', 'træ'], ['ti', 'to']];
  // «Hvorfor?»: tre oplysninger, ét spørgsmål. Facit er den oplyste årsag; fejlene er en nævnt, men ligegyldig
  // oplysning og noget, historien ikke siger. Hvert svar har ét billede og en kort oplæsning.
  const HVORFOR = [
    { id: 'raev', s: ['Ræven har en tung taske.', 'Det regner.', 'Den tager gummistøvler på.'], spm: 'Hvorfor tager ræven støvler på?', billeder: ['🎒', '🌧️', '🥾'], rigtig: ['🌧️', 'Fordi det regner.'], fejl: [['🎒', 'Fordi tasken er tung.'], ['🍽️', 'Fordi den er sulten.']] },
    { id: 'seng', s: ['Pigen er træt.', 'Solen skinner.', 'Hun går i seng.'], spm: 'Hvorfor går pigen i seng?', billeder: ['👧', '☀️', '🛏️'], rigtig: ['😴', 'Fordi hun er træt.'], fejl: [['☀️', 'Fordi solen skinner.'], ['🍽️', 'Fordi hun er sulten.']] },
    { id: 'aeble', s: ['Drengen er sulten.', 'Det blæser.', 'Han spiser et æble.'], spm: 'Hvorfor spiser drengen et æble?', billeder: ['👦', '🌬️', '🍎'], rigtig: ['🍽️', 'Fordi han er sulten.'], fejl: [['🌬️', 'Fordi det blæser.'], ['😴', 'Fordi han er træt.']] },
    { id: 'hue', s: ['Det er koldt.', 'Katten er glad.', 'Musen tager en hue på.'], spm: 'Hvorfor tager musen en hue på?', billeder: ['🥶', '🐈', '🐭'], rigtig: ['🥶', 'Fordi det er koldt.'], fejl: [['🐈', 'Fordi katten er glad.'], ['🌧️', 'Fordi det regner.']] },
    { id: 'bjoern', s: ['Bjørnen er tørstig.', 'Fuglene synger.', 'Bjørnen drikker vand.'], spm: 'Hvorfor drikker bjørnen vand?', billeder: ['🐻', '🐦', '💧'], rigtig: ['💧', 'Fordi den er tørstig.'], fejl: [['🐦', 'Fordi fuglene synger.'], ['🥶', 'Fordi det er koldt.']] },
    { id: 'lys', s: ['Det er mørkt.', 'Uglen sidder i træet.', 'Drengen tænder lyset.'], spm: 'Hvorfor tænder drengen lyset?', billeder: ['🌙', '🦉', '💡'], rigtig: ['🌙', 'Fordi det er mørkt.'], fejl: [['🦉', 'Fordi uglen sidder i træet.'], ['🌧️', 'Fordi det regner.']] },
    { id: 'kage', s: ['Pigen har fødselsdag.', 'Hunden gør.', 'Hun får en kage.'], spm: 'Hvorfor får pigen en kage?', billeder: ['👧', '🐕', '🎂'], rigtig: ['🎉', 'Fordi hun har fødselsdag.'], fejl: [['🐕', 'Fordi hunden gør.'], ['🍽️', 'Fordi hun er sulten.']] },
    { id: 'vanter', s: ['Det sner.', 'Katten sover.', 'Drengen tager vanter på.'], spm: 'Hvorfor tager drengen vanter på?', billeder: ['❄️', '🐈', '🧤'], rigtig: ['❄️', 'Fordi det sner.'], fejl: [['🐈', 'Fordi katten sover.'], ['☀️', 'Fordi solen skinner.']] },
    { id: 'hul', s: ['Musen hører katten.', 'Osten ligger på bordet.', 'Musen løber ind i sit hul.'], spm: 'Hvorfor løber musen ind i sit hul?', billeder: ['🐭', '🧀', '🕳️'], rigtig: ['🐈', 'Fordi den hører katten.'], fejl: [['🧀', 'Fordi osten ligger på bordet.'], ['🌧️', 'Fordi det regner.']] },
    { id: 'plaster', s: ['Pigen falder og slår knæet.', 'Mor er i køkkenet.', 'Pigen får et plaster.'], spm: 'Hvorfor får pigen et plaster?', billeder: ['👧', '👩', '🩹'], rigtig: ['🤕', 'Fordi hun slog knæet.'], fejl: [['👩', 'Fordi mor er i køkkenet.'], ['🎉', 'Fordi hun har fødselsdag.']] },
    { id: 'is', s: ['Solen er varm.', 'En fugl flyver forbi.', 'Drengens is smelter.'], spm: 'Hvorfor smelter isen?', billeder: ['☀️', '🐦', '🍦'], rigtig: ['☀️', 'Fordi solen er varm.'], fejl: [['🐦', 'Fordi en fugl flyver forbi.'], ['❄️', 'Fordi det sner.']] },
    { id: 'bamse', s: ['Det regnede i går.', 'Hunden leger.', 'Bamsen i haven er våd.'], spm: 'Hvorfor er bamsen våd?', billeder: ['🌧️', '🐕', '🧸'], rigtig: ['🌧️', 'Fordi det regnede.'], fejl: [['🐕', 'Fordi hunden leger.'], ['☀️', 'Fordi solen skinner.']] },
    { id: 'drage', s: ['Det blæser meget.', 'Pigen har en drage.', 'Dragen flyver højt.'], spm: 'Hvorfor flyver dragen højt?', billeder: ['🌬️', '👧', '🪁'], rigtig: ['🌬️', 'Fordi det blæser.'], fejl: [['👧', 'Fordi pigen har en drage.'], ['🌧️', 'Fordi det regner.']] },
    { id: 'bold', s: ['Hundens bold er væk.', 'Katten sover.', 'Hunden er ked af det.'], spm: 'Hvorfor er hunden ked af det?', billeder: ['⚽', '🐈', '🐕'], rigtig: ['⚽', 'Fordi bolden er væk.'], fejl: [['🐈', 'Fordi katten sover.'], ['🍽️', 'Fordi den er sulten.']] },
    { id: 'gab', s: ['Det er sent.', 'En fugl synger.', 'Barnet gaber.'], spm: 'Hvorfor gaber barnet?', billeder: ['🌙', '🐦', '🥱'], rigtig: ['🌙', 'Fordi det er sent.'], fejl: [['🐦', 'Fordi en fugl synger.'], ['🍽️', 'Fordi barnet er sulten.']] },
    { id: 'ost', s: ['Musen har fundet en ost.', 'Det regner.', 'Musen er glad.'], spm: 'Hvorfor er musen glad?', billeder: ['🧀', '🌧️', '🐭'], rigtig: ['🧀', 'Fordi den har fundet en ost.'], fejl: [['🌧️', 'Fordi det regner.'], ['🐈', 'Fordi katten kommer.']] },
    { id: 'baby', s: ['Babyen er sulten.', 'Hunden sover.', 'Babyen græder.'], spm: 'Hvorfor græder babyen?', billeder: ['👶', '🐕', '😢'], rigtig: ['🍼', 'Fordi den er sulten.'], fejl: [['🐕', 'Fordi hunden sover.'], ['❄️', 'Fordi det sner.']] },
  ];

  // ---------- D3: håndskrevne banker ----------
  // Rim og billede: to store billeder; find ordparret, der BÅDE passer til billederne OG rimer
  const RIM_PAR = [['kat', 'hat'], ['mus', 'hus'], ['sol', 'stol'], ['ko', 'sko'], ['hest', 'vest'], ['bog', 'tog'], ['due', 'flue'],
    ['hane', 'svane'], ['rose', 'pose'], ['dreng', 'seng'], ['båd', 'tråd'], ['hånd', 'bånd'], ['lys', 'kys'], ['mand', 'tand'], ['gris', 'is'], ['rød', 'brød']];
  // Fjern den første lyd: kun få naturlige par med billeder (forslaget: «kræv ikke 16»). [ord, facit, fejl «fjerner begge»/«bytter»]
  const FJERN_LYD = [['gris', 'ris', 'is'], ['ris', 'is', 'gris'], ['sko', 'ko', 'to']];
  // To billedord skrevet uden mellemrum — ikke et almindeligt sammensat ord. Forskellige længder (2–4 bogstaver),
  // så skillestregen ikke altid står midt i strimlen (code-review #2)
  const DEL_ORD = [['sol', 'mus'], ['kat', 'bil'], ['bus', 'lam'], ['ris', 'sok'], ['lys', 'kat'], ['pen', 'mus'], ['sok', 'hat'],
    ['bil', 'sæl'], ['hat', 'sol'], ['lam', 'kys'], ['nål', 'bus'], ['jul', 'kat'],
    ['is', 'kat'], ['ko', 'bil'], ['bi', 'sok'], ['æg', 'mus'], ['sol', 'is'], ['hus', 'ko'], ['kat', 'bi'], ['pen', 'ur'],
    ['hest', 'bil'], ['stol', 'kat'], ['gris', 'hat'], ['telt', 'sol'], ['kat', 'hest'], ['bus', 'telt'], ['sol', 'gris'],
    ['ko', 'hest'], ['is', 'telt'], ['hest', 'ko'], ['gris', 'is']];
  // «Ikke»: «Her er ikke en kat.» — præcis ét billede passer (kun det andet dyr)
  const IKKE_DYR = [{ ord: 'kat', e: '🐈' }, { ord: 'hund', e: '🐕' }, { ord: 'mus', e: '🐭' }, { ord: 'ko', e: '🐄' }, { ord: 'gris', e: '🐷' }, { ord: 'fisk', e: '🐟' }];
  // Hvilken slutning passer? To oplysninger udelukker de to forkerte slutninger
  const SLUTNING = [
    { id: 'kat', s: ['Katten vil over åen.', 'Broen er væk.', 'Katten kan ikke svømme.', 'Der ligger en robåd.'], billeder: ['🐈', '🌉', '🚣'], rigtig: ['🚣', 'Katten ror over i båden.'], fejl: [['🌉', 'Katten går over broen.'], ['🏊', 'Katten svømmer over.']] },
    { id: 'is', s: ['Drengen vil have en is.', 'Isboden er lukket.', 'Der er is i fryseren derhjemme.'], billeder: ['👦', '🏪', '🧊'], rigtig: ['🧊', 'Han får en is fra fryseren.'], fejl: [['🏪', 'Han køber en is i isboden.'], ['🚫', 'Der er ingen is nogen steder.']] },
    { id: 'drage', s: ['Det blæser slet ikke.', 'Pigens drage ligger stille.', 'Hun har en ballon.'], billeder: ['🪁', '👧', '🎈'], rigtig: ['🎈', 'Hun leger med ballonen.'], fejl: [['🌬️', 'Dragen flyver højt i blæsten.'], ['🚫', 'Hun har intet at lege med.']] },
    { id: 'mus', s: ['Musen er sulten.', 'Osten står højt oppe.', 'Musen har en stige.'], billeder: ['🐭', '🧀', '🪜'], rigtig: ['🪜', 'Musen klatrer op ad stigen.'], fejl: [['⬇️', 'Musen spiser osten nede på gulvet.'], ['🛌', 'Musen er ikke sulten og sover.']] },
    { id: 'regn', s: ['Det regner.', 'Drengen vil gå en tur.', 'Han har en paraply.'], billeder: ['🌧️', '👦', '☂️'], rigtig: ['☂️', 'Han går en tur med paraplyen.'], fejl: [['☀️', 'Han går en tur i solskin.'], ['💦', 'Han har ingen paraply og bliver våd.']] },
    { id: 'baal', s: ['Vi vil grille pølser.', 'Bålet er gået ud.', 'Far har tændstikker.'], billeder: ['🌭', '🪵', '🔥'], rigtig: ['🔥', 'Far tænder bålet igen.'], fejl: [['🌭', 'Vi griller pølserne på det slukkede bål.'], ['🚫', 'Far har ingen tændstikker.']] },
    { id: 'bus', s: ['Pigen skal i skole.', 'Bussen er kørt.', 'Hun har en cykel.'], billeder: ['👧', '🚌', '🚲'], rigtig: ['🚲', 'Hun cykler i skole.'], fejl: [['🚌', 'Hun kører med bussen.'], ['🏠', 'Hun har ingen cykel og bliver hjemme.']] },
    { id: 'hund', s: ['Hunden vil ud.', 'Døren er lukket.', 'Drengen kan åbne døren.'], billeder: ['🐕', '🚪', '👦'], rigtig: ['👦', 'Drengen lukker hunden ud.'], fejl: [['🚪', 'Hunden går gennem den lukkede dør.'], ['🚫', 'Ingen kan åbne døren.']] },
    { id: 'bamse', s: ['Bamsen ligger på et højt skab.', 'Pigen er for lille.', 'Far er høj.'], billeder: ['🧸', '👧', '👨'], rigtig: ['👨', 'Far tager bamsen ned.'], fejl: [['👧', 'Pigen når selv bamsen.'], ['🤏', 'Far er for lille til at nå den.']] },
    { id: 'kage', s: ['Vi vil bage en kage.', 'Der er ingen æg.', 'Naboen har æg.'], billeder: ['🍰', '🥚', '🏠'], rigtig: ['🏠', 'Vi låner æg hos naboen.'], fejl: [['🥚', 'Vi tager æg fra køleskabet.'], ['🚫', 'Naboen har ingen æg.']] },
    { id: 'sne', s: ['Børnene vil kælke.', 'Der er ingen sne.', 'Der er en stor bunke blade.'], billeder: ['🛷', '🌤️', '🍂'], rigtig: ['🍂', 'De hopper i bladene.'], fejl: [['🛷', 'De kælker i sneen.'], ['🚫', 'Der er ingen blade at hoppe i.']] },
    { id: 'bold', s: ['Bolden sidder i træet.', 'Drengen kan ikke nå den.', 'Han har en lang pind.'], billeder: ['⚽', '🌳', '🪵'], rigtig: ['🪵', 'Han skubber bolden ned med pinden.'], fejl: [['✋', 'Han når bolden med hånden.'], ['🚫', 'Han har ingen pind.']] },
    { id: 'lampe', s: ['Det er mørkt.', 'Lampen virker ikke.', 'Mor har en lommelygte.'], billeder: ['🌙', '💡', '🔦'], rigtig: ['🔦', 'Mor tænder lommelygten.'], fejl: [['💡', 'De tænder lampen, og den lyser.'], ['🚫', 'Mor har ingen lommelygte.']] },
    { id: 'fugl', s: ['Fuglen er sulten.', 'Der er ingen orme.', 'Pigen har frø i hånden.'], billeder: ['🐦', '🪱', '🌻'], rigtig: ['🌻', 'Fuglen spiser frø fra pigens hånd.'], fejl: [['🪱', 'Fuglen spiser en orm.'], ['🚫', 'Pigen har ingen frø.']] },
    { id: 'sko', s: ['Drengen vil løbe ud.', 'Hans sko er våde.', 'Han har et par støvler.'], billeder: ['👦', '👟', '🥾'], rigtig: ['🥾', 'Han tager støvlerne på.'], fejl: [['👟', 'Han tager de tørre sko på.'], ['🚫', 'Han har ingen støvler.']] },
    { id: 'tog', s: ['Mormor skal hjem.', 'Toget kører ikke i dag.', 'Morfar har en bil.'], billeder: ['👵', '🚂', '🚗'], rigtig: ['🚗', 'Morfar kører mormor hjem.'], fejl: [['🚂', 'Mormor tager toget.'], ['🚫', 'Morfar har ingen bil.']] },
  ];


  // ---------- D1: håndskrevne banker ----------
  // Byt den første lyd: [fra, til, et andet ord i samme familie med en anden første lyd]. Kun ord, hvor resten
  // lyder ens (kontrolleret: hund/mund er udeladt — vokalen er ikke den samme).
  const BYT_LYD = [
    ['mus', 'hus', 'bus'], ['mus', 'bus', 'hus'], ['hus', 'mus', 'bus'], ['hus', 'bus', 'mus'], ['bus', 'mus', 'hus'], ['bus', 'hus', 'mus'],
    ['kat', 'hat', 'hus'], ['hat', 'kat', 'ko'],
    ['tand', 'mand', 'vand'], ['mand', 'tand', 'vand'], ['vand', 'mand', 'tand'], ['mand', 'vand', 'tand'],
    ['bi', 'ti', 'ni'], ['ni', 'ti', 'bi'], ['ti', 'ni', 'bi'], ['ti', 'bi', 'ni'],
    ['mål', 'nål', 'kål'], ['nål', 'kål', 'mål'], ['kål', 'mål', 'nål'],
    ['gul', 'hul', 'jul'], ['hul', 'gul', 'jul'], ['jul', 'hul', 'gul'],
    ['sok', 'kok', 'ko'], ['kok', 'sok', 'sol'], ['hest', 'vest', 'vase'], ['lys', 'kys', 'ko'],
    ['bog', 'tog', 'ti'], ['tog', 'bog', 'bi'], ['hånd', 'bånd', 'bus'], ['rose', 'pose', 'pen'],
    ['ko', 'to', 'ti'], ['due', 'bue', 'bus'], ['kost', 'post', 'pen'],
  ];
  // Håndskrevne bogstaver, der ligner (efter forlæggene i SKRIFT): den mest typiske forveksling først
  const HAANDSKRIFT_LIGNER = {
    a: ['o', 'd'], o: ['a', 'c'], l: ['i', 't'], i: ['l', 'j'], m: ['n', 'w'], u: ['n', 'v'], s: ['e', 'c'],
    k: ['h', 'x'], t: ['f', 'l'], e: ['c', 'o'], n: ['m', 'h'], r: ['n', 'v'], b: ['d', 'h'], h: ['n', 'b'],
    f: ['t', 'l'], g: ['q', 'a'], d: ['b', 'a'], y: ['v', 'g'], p: ['b', 'q'], v: ['u', 'y'], j: ['i', 'g'],
    æ: ['a', 'e'], ø: ['o', 'a'], å: ['a', 'o'],
  };
  // Små ord: ting og beholdere (bestemt form til oplæsningen)
  const PLACERING_TING = [
    { id: 'bold', e: '⚽', bestemt: 'bolden' }, { id: 'mus', e: '🐭', bestemt: 'musen' }, { id: 'aeble', e: '🍎', bestemt: 'æblet' },
    { id: 'kat', e: '🐈', bestemt: 'katten' }, { id: 'bamse', e: '🧸', bestemt: 'bamsen' }, { id: 'fisk', e: '🐟', bestemt: 'fisken' },
  ];
  const PLACERING_BEHOLDER = [
    { id: 'kasse', bestemt: 'kassen' }, { id: 'kurv', bestemt: 'kurven' }, { id: 'skaal', bestemt: 'skålen' },
  ];

  // Bogstaver, der ligner hinanden i form eller lyd, står ikke sammen på de første trin (b/d, p/q, n/u, f/v …)
  const LIGNER = ['bd', 'pq', 'nu', 'mn', 'fv', 'bp', 'gk', 'ij', 'oø', 'aæ', 'aå', 'ey', 'iy', 'dt'];
  const ligner = (a, b) => LIGNER.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
  // n andre bogstaver end b, der hverken ligner b eller hinanden
  function ulige(rng, pulje, b, n) {
    const valgt = [];
    for (const x of bland(rng, pulje)) {
      if (valgt.length >= n) break;
      if (x !== b && !ligner(x, b) && valgt.every((y) => !ligner(x, y))) valgt.push(x);
    }
    return valgt;
  }

  function alfabetNabo(niveau, rng, retning) {
    const i = retning > 0 ? heltal(rng, 0, ALFABET.length - 2) : heltal(rng, 1, ALFABET.length - 1);
    const b = ALFABET[i], svar = ALFABET[i + retning];
    const naboer = [ALFABET[i - retning], ALFABET[i + 2 * retning], ALFABET[i + retning + retning * 3]].filter((x) => x && x !== svar && x !== b);
    const valg = bland(rng, bland(rng, naboer).slice(0, antalValg(niveau) - 1).concat([svar]));
    // Et vindue af alfabetet omkring hullet (hele striben er for bred til en telefon)
    const fra = Math.max(0, Math.min(ALFABET.length - 7, Math.min(i, i + retning) - 3));
    return opgave({
      emne: 'alfabet', type: retning > 0 ? 'efterBogstav' : 'foerBogstav', niveau, noegle: (retning > 0 ? 'efterBogstav:' : 'foerBogstav:') + b, ikon: retning > 0 ? '➡️' : '⬅️',
      tale: 'Hvilket bogstav kommer ' + (retning > 0 ? 'efter ' : 'før ') + NAVNE[b] + '?',
      tekst: 'Hvad kommer ' + (retning > 0 ? 'efter ' : 'før ') + b + '?',
      vis: { art: 'alfabet', fra: fra, til: fra + 6, skjult: i + retning },
      svar: svar, valg: valg, valgArt: 'bogstav',
      hjaelp: [{ art: 'alfabetSang' }, hjaelpBogstav(svar, eksempelOrd(rng, svar))],
    });
  }

  // ---------- Emner (verdener) og niveauer ----------
  // typer[0] er den letteste — en runde starter altid med den
  const EMNER = {
    rim: { navn: 'Rim', maxNiveau: 3, niveauer: { 1: ['rim', 'huskRim', 'rimHave'], 2: ['rim', 'huskRim', 'rimRemse', 'rimHave'], 3: ['rim', 'passerIkke', 'rimPar', 'rimHave'] } },
    lyde: { navn: 'Lyde', maxNiveau: 3, niveauer: { 1: ['lydBogstav', 'bytLyd'], 2: ['lydBogstav', 'forlyd', 'bytLyd', 'taelLyde'], 3: ['forlyd', 'udlyd', 'lydBogstav', 'fjernLyd'] } },
    // C · Spor i sandet står aldrig først (den bedømmes ikke og kan derfor aldrig alene åbne et højere trin)
    alfabet: { navn: 'Alfabetet', maxNiveau: 3, niveauer: { 1: ['findBogstav', 'storLille', 'haandskrift', 'sporISandet'], 2: ['storLille', 'findBogstav', 'efterBogstav', 'haandskrift', 'alfabetOrden', 'sporISandet'], 3: ['efterBogstav', 'foerBogstav', 'findBogstav', 'alfabetHylde', 'sporISandet'] } },
    lydering: { navn: 'Lydering', maxNiveau: 3, niveauer: { 1: ['lydering', 'retVokal', 'lydTog'], 2: ['laesOrd', 'lydering', 'retVokal', 'skiftBogstav', 'lydTog'], 3: ['laesOrd', 'bygOrd', 'delOrd', 'lydTog'] } },
    smaaord: { navn: 'Små ord', maxNiveau: 3, niveauer: { 1: ['findOrd', 'hvorErTingen'], 2: ['findOrd', 'ordISaetning', 'hvorErTingen', 'laesPlacering'], 3: ['ordISaetning', 'bygSaetning', 'findOrd', 'ikkeOrd'] } },
  };
  // Typer, der kun kan løses ved at høre (springes over uden dansk stemme — medmindre der er indtalte klip).
  // D2/D3: rimremsen, lydene i et ord, «tag den første lyd væk» og rimparret høres også (code-review #1).
  // C: minispillene, der kun kan løses ved at høre (Opgaver.MINISPIL lyt: true)
  const LYT_TYPER = ['lydBogstav', 'forlyd', 'udlyd', 'findBogstav', 'lydering', 'findOrd', 'ordISaetning', 'rim', 'passerIkke', 'huskRim', 'bytLyd',
    'rimRemse', 'taelLyde', 'fjernLyd', 'rimPar', 'lydTog', 'rimHave', 'fortaelleBro'];

  function lavOpgave(type, niveau, rng) { return GEN[type](niveau, rng); }
  // Fast pulje som i opgaver.js (Piper-stemmen): rng vælger nummeret, opgaven laves med sit eget frø
  function puljeOpgave(type, niveau, rng) { return lavOpgave(type, niveau, lavRng(puljeFroe('dansk:' + type, niveau, puljeNr(rng)))); }

  function lavRunde(emneId, niveau, rng, opts) {
    opts = opts || {};
    const antal = opts.antal || 5;
    niveau = Math.min(EMNER[emneId].maxNiveau, Math.max(1, Math.round(Number(niveau)) || 1));
    let typer = EMNER[emneId].niveauer[niveau];
    if (opts.udenLyt) { const u = typer.filter((t) => LYT_TYPER.indexOf(t) < 0); if (u.length) typer = u; }
    const runde = [];
    const brugte = {};
    let koe = [typer[0]];
    let forsoeg = 0;
    while (runde.length < antal && forsoeg < 500) {
      forsoeg++;
      if (!koe.length) koe = bland(rng, typer);
      const type = koe.shift();
      const o = puljeOpgave(type, niveau, rng);
      if (brugte[o.noegle] && forsoeg < 400) continue;
      brugte[o.noegle] = true;
      runde.push(o);
    }
    const gentag = (opts.gentag || []).filter((o) => o && o.emne === emneId && GEN[o.type] && Array.isArray(o.hjaelp) && !brugte[o.noegle]).slice(0, 2);
    gentag.forEach((o, i) => { runde[Math.min(runde.length - 1, 2 + i)] = Object.assign({}, o, { gentaget: true }); });
    return runde;
  }

  // «Hvad driller» til voksenoverblikket
  function beskrivNoegle(noegle) {
    const [art, r] = String(noegle).split(/:(.*)/s);
    const t = {
      rim: () => 'Rim: ' + (r || '').replace('-', ' – '),
      passerIkke: () => 'Hvilket ord rimer ikke (' + (r || '').split('-')[0] + ')',
      lydBogstav: () => 'Lyden ' + r + ' → bogstavet',
      forlyd: () => 'Ord, der starter med lyden ' + r,
      udlyd: () => 'Ord, der slutter med lyden ' + r,
      findBogstav: () => 'Finde bogstavet ' + r,
      storLille: () => 'Stort og lille ' + r,
      efterBogstav: () => 'Bogstavet efter ' + r,
      foerBogstav: () => 'Bogstavet før ' + r,
      lydering: () => 'Lydere «' + r + '»',
      laesOrd: () => 'Læse «' + r + '»',
      bygOrd: () => 'Stave «' + r + '»',
      findOrd: () => 'Genkende ordet «' + r + '»',
      ordISaetning: () => 'Finde «' + r + '» i en sætning',
      bygSaetning: () => 'Bygge sætningen «' + r + '»',
      huskRim: () => 'Huske et skjult rimkort: ' + (r || '').replace('-', ' – '),
      bytLyd: () => 'Bytte første lyd: ' + (r || '').replace('-', ' → '),
      haandskrift: () => 'Trykt og håndskrevet ' + r,
      retVokal: () => 'Rette vokalen: ' + (r || '').split('-')[1] + ' → ' + (r || '').split('-')[0],
      hvorErTingen: () => 'Små ord i/på: ' + (r || '').split('-')[1],
      // D2/D3
      rimRemse: () => 'Rimremse: ' + (r || '').replace('-', ' – '),
      taelLyde: () => 'Tælle lydene i «' + r + '»',
      alfabetOrden: () => 'Alfabetets rækkefølge: ' + (r || '').split('').join(', '),
      skiftBogstav: () => 'Skifte ét bogstav: ' + (r || '').replace('-', ' → '),
      laesPlacering: () => 'Læse det lille ord «' + (r || '').split('-')[0] + '»',
      rimPar: () => 'Ordpar, der rimer: ' + (r || '').replace('-', ' – '),
      fjernLyd: () => 'Tage den første lyd væk: ' + r,
      alfabetHylde: () => 'Hvor i alfabetet står ' + r,
      delOrd: () => 'Dele ' + (r || '').replace('-', '') + ' i to ord',
      ikkeOrd: () => ((r || '').split('-')[2] === 'nu' ? 'Læse et skilt uden «ikke» (en ' : 'Læse «ikke» (ikke en ') + (r || '').split('-')[0] + ')',
      // C · minispil
      lydTog: () => 'Lydtoget: ' + (r || '').replace('-', ' → '),
      rimHave: () => 'Rimhaven: ' + (r || '').replace('+', ' – ').replace('-', ' ≠ '),
      sporISandet: () => 'Tegne ' + r + ' i sandet (bedømmes ikke)',
      fortaelleBro: () => 'Fortællebroen: historien «' + r + '»',
    };
    return t[art] ? t[art]() : null;
  }

  // =====================================================================
  //  BOGSTAVJAGT (B10): bobler med bogstaver flyver op i buer; barnet stryger gennem det, det hører
  //  Rene funktioner (testes i test-dansk.js): hvilke bogstaver, runden, banen og «ramte strøget boblen?»
  // =====================================================================
  // Tempo pr. trin: bobler ad gangen, lyde pr. runde og en flyvetur (op og ned igen) i sekunder
  const JAGT_TRIN = {
    1: { samtidig: 2, lyde: 8, flyvetid: 6.5 },
    2: { samtidig: 3, lyde: 9, flyvetid: 5.2 },
    3: { samtidig: 4, lyde: 10, flyvetid: 4.0 },
  };
  // Bogstaver nået i Lyde-verdenen (rækkefølgen i DANSK-ANALYSE): flere jo længere barnet er nået.
  // Kun bogstaver med en lyd (ikke q, w, x, z og c).
  function jagtBogstaver(lyde) {
    const n = !lyde || !lyde.runder ? 8 : lyde.mestret ? 99 : ({ 1: 10, 2: 15, 3: 22 }[lyde.niveau] || 10);
    return RAEKKEFOELGE.filter((b) => KUN_NAVN.indexOf(b) < 0 && b !== 'c').slice(0, n);
  }
  // En runde: for hver lyd det rigtige bogstav og 1–3 andre (2–4 bobler ad gangen); samme bogstav aldrig to gange i træk
  // D1–D3: hver tredje lyd er en STILLE bølge (forslaget 09-10, «boblerne venter på barnet»): tre bobler, der står stille.
  // Trin 1 · 'alle': to af boblerne har lyden — find begge. Den tredje er et bogstav, der ligner (m/n), hvis muligt.
  // Trin 2 · 'raekke': to lyde efter hinanden (m … s) — ram dem i den rækkefølge.
  // Trin 3 · 'midt': et kendt ord på tre bogstaver står stille øverst — ram bogstavet i midten (ordet siges ikke).
  // Hvilken stille bølge hvert trin får. Kun de slags, app.js kan vise (review #3) — fra D2/D3 alle tre.
  // arter kan gives med (testene prøver dem alle).
  const JAGT_STILLE = { 1: 'alle', 2: 'raekke', 3: 'midt' };
  // Ord til «bogstavet i midten»: kendte ord på tre forskellige bogstaver med en vokal i midten. Barnet skal kende
  // midterbogstavet og mindst ét af de andre (de står i boblerne); ordets sidste bogstav må være et, barnet ikke har
  // nået endnu — det står kun i ordet øverst (code-review #7: med kun 8–10 bogstaver var der 4–5 ord)
  function jagtMidtOrd(pulje) {
    const vokaler = pulje.filter((x) => VOKALER.indexOf(x) >= 0);
    return ordIGruppe(['B']).filter((o) => o.length === 3 && new Set(o).size === 3 && VOKALER.indexOf(o[1]) >= 0 && pulje.indexOf(o[1]) >= 0 &&
      (pulje.indexOf(o[0]) >= 0 || pulje.indexOf(o[2]) >= 0) && vokaler.some((v) => v !== o[1]));
  }
  function lavJagtRunde(bogstaver, trin, rng, arter) {
    const T = JAGT_TRIN[trin] || JAGT_TRIN[1];
    const art = (arter || JAGT_STILLE)[trin] || 'alle';
    const pulje = bogstaver.length >= T.samtidig ? bogstaver : RAEKKEFOELGE.slice(0, 8);
    const ud = [];
    let forrige = null;
    for (let i = 0; i < T.lyde; i++) {
      const sidst = forrige; // lyden, barnet hørte sidst
      let b;
      do { b = vaelg(rng, pulje); } while (b === forrige && pulje.length > 1);
      forrige = b;
      if (i % 3 === 2) {
        const midtOrd = art === 'midt' ? jagtMidtOrd(pulje) : [];
        if (midtOrd.length) {
          // Først midterbogstavet (lige ofte hver vokal — mange ord har u), så et ord med det
          const kand = midtOrd.filter((o) => o[1] !== sidst).length ? midtOrd.filter((o) => o[1] !== sidst) : midtOrd;
          const midt = vaelg(rng, [...new Set(kand.map((o) => o[1]))]);
          const ord = vaelg(rng, kand.filter((o) => o[1] === midt));
          forrige = ord[1];
          // Boblerne: midterbogstavet, et af ordets andre bogstaver og en ANDEN vokal — så «tag vokalen» ikke er nok
          // (code-review #7: før var boblerne ordets tre bogstaver, og svaret altid den eneste vokal)
          const andet = vaelg(rng, [ord[0], ord[2]].filter((x) => pulje.indexOf(x) >= 0));
          const vokal = vaelg(rng, pulje.filter((x) => VOKALER.indexOf(x) >= 0 && x !== ord[1]));
          ud.push({ bogstav: ord[1], ord: ord, bobler: bland(rng, [ord[1], andet, vokal]), stille: 'midt' });
        } else if (art === 'raekke' || art === 'midt') {
          const b2 = vaelg(rng, pulje.filter((x) => x !== b));
          const lignende = pulje.filter((x) => x !== b && x !== b2 && (ligner(x, b2) || ligner(x, b)));
          const tredje = vaelg(rng, lignende.length ? lignende : pulje.filter((x) => x !== b && x !== b2));
          forrige = b2;
          ud.push({ bogstav: b, raekke: [b, b2], bobler: bland(rng, [b, b2, tredje]), stille: 'raekke' });
        } else {
          const lignende = pulje.filter((x) => x !== b && ligner(x, b));
          const anden = vaelg(rng, lignende.length ? lignende : pulje.filter((x) => x !== b));
          ud.push({ bogstav: b, bobler: bland(rng, [b, b, anden]), stille: 'alle' });
        }
        continue;
      }
      // Bogstaver, der ligner hinanden (b/d/p, m/n …), kommer gerne med — det er dem, der skal øves
      const andre = bland(rng, pulje.filter((x) => x !== b)).slice(0, T.samtidig - 1);
      ud.push({ bogstav: b, bobler: bland(rng, [b].concat(andre)) });
    }
    return ud;
  }
  // En bane: boblen starter under feltets bund, flyver op i en bue og falder ned igen.
  // Koordinater i px med y nedad; g er tyngden. hoejde = toppunktet (andel af feltets højde fra bunden).
  function lavBane(rng, trin, w, h, langsom) {
    const T = (JAGT_TRIN[trin] || JAGT_TRIN[1]).flyvetid * (langsom ? 1.5 : 1);
    const x0 = w * (0.15 + rng() * 0.7);
    const x1 = Math.min(w * 0.88, Math.max(w * 0.12, x0 + (rng() - 0.5) * w * 0.5));
    const top = h * (0.55 + rng() * 0.3);   // så højt op kommer boblen (fra bunden)
    const g = 8 * top / (T * T);            // så den er i toppen efter T/2 og tilbage ved bunden efter T
    return { x0: x0, y0: h, vx: (x1 - x0) / T, vy: g * T / 2, g: g, T: T };
  }
  const banePunkt = (b, t) => ({ x: b.x0 + b.vx * t, y: b.y0 - b.vy * t + b.g * t * t / 2 });
  // Rammer et strøg (linjestykket p → q) en cirkel (midte c, radius r)? Et tryk (p = q) tæller også.
  function strygRammer(p, q, c, r) {
    const dx = q.x - p.x, dy = q.y - p.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((c.x - p.x) * dx + (c.y - p.y) * dy) / l2)) : 0;
    const nx = p.x + t * dx - c.x, ny = p.y + t * dy - c.y;
    return nx * nx + ny * ny <= r * r;
  }

  // =====================================================================
  //  C · minispil (forslaget 09-10, afsnit C) — Lydtoget, Rimhaven, Spor i sandet og Fortællebroen.
  //  Visningen er specificeret i docs/MINISPIL.md. Koblet på EMNER og HISTORIE_QUIZ, som Opgaver.MINISPIL siger
  //  (trin = niveau). Et minispil er én af rundens opgaver. Indholdet er håndskrevet — egne ord og historier.
  // =====================================================================

  // Tegningerne fra docs/LYSTAARNET-GRAFIK-C.md (Grafik.minispil) til billedordene. Mangler en, bruges emojien fra ORD.
  const BILLEDE = {
    is: 'soundWordIceCream', ko: 'soundWordCow', sol: 'soundWordSun', lam: 'soundWordLamb', hus: 'soundWordHouse',
    bil: 'soundWordCar', mus: 'seedPostMouse', hat: 'rhymeHat', kat: 'rhymeCat',
  };

  // Lydtoget: lydrette billedord med én lyd pr. bogstav. Trin 1: to vogne · trin 2: tre vogne
  const LYDTOG_ORD = {
    1: ['is', 'ko', 'bi', 'fe', 'ti', 'ni'],
    2: ['sol', 'mus', 'lam', 'hus', 'bil', 'kat', 'hat', 'bus', 'ris', 'sok', 'lys', 'mål', 'gul'],
  };
  // Indtalte klip med en anden lyd end bogstavets almindelige (lydlisten): kort a i kat, åbent o i sok
  const LYDTOG_KLIP = { kat: { 1: 'lyd-a-kort' }, hat: { 1: 'lyd-a-kort' }, lam: { 1: 'lyd-a-kort' }, sok: { 1: 'lyd-o-aaben' }, kok: { 1: 'lyd-o-aaben' } };
  // Trin 3: byt den første lyd (BYT_LYD) — kun korte, lydrette ord med billede. Kun den første vogn er aktiv.
  const LYDTOG_BYT = BYT_LYD.filter((t) => t.slice(0, 2).every((o) => ORD[o] && !ORD[o].ny && ORD[o].lydret && o.length <= 3));
  // Den aktive vogns lyd: det indtalte klip. Reserven (uden klip) siger aldrig bogstavets navn og aldrig ordet selv:
  // lydlistens eksempel («lyden i sol») · et andet ord med samme særlige klip · «samme lyd som i starten af …»
  function vognLyd(rng, ord, i) {
    const b = ord[i];
    const klip = (LYDTOG_KLIP[ord] && LYDTOG_KLIP[ord][i]) || lydId(b);
    const l = LYDLISTE.find((x) => x.id === klip);
    if (l && l.eksempel && l.eksempel !== ord) return { klip: klip, reserve: 'lyden i ' + l.eksempel };
    const andet = Object.keys(LYDTOG_KLIP).find((o) => o !== ord && LYDTOG_KLIP[o][i] === klip);
    if (andet) return { klip: klip, reserve: 'lyden i ' + andet };
    const eks = eksempelOrd(rng, b, [ord]);
    if (eks) return { klip: klip, reserve: 'samme lyd som i starten af ' + eks };
    const med = ordIGruppe(['A', 'B']).find((o) => o !== ord && o.indexOf(b) >= 0); // «is»: lyden i bi
    return { klip: klip, reserve: med ? 'lyden i ' + med : lydReserve(b) };
  }
  // Kortene til én vogn: bogstavet · en anden lyd fra samme ord (rækkefølgen byttet) · et tidligt bogstav, der
  // hverken er i ordet eller ligner de andre kort
  function vognKort(rng, ord, i, antal) {
    const b = ord[i];
    const kort = [b];
    const iOrdet = [ord[i + 1], ord[i - 1]].find((x) => x && x !== b && !ligner(x, b));
    if (iOrdet && antal > 1) kort.push(iOrdet);
    for (const x of bland(rng, RAEKKEFOELGE.slice(0, 16))) {
      if (kort.length >= antal) break;
      if (ord.indexOf(x) < 0 && kort.every((y) => y !== x && !ligner(x, y))) kort.push(x);
    }
    return bland(rng, kort);
  }
  // Trinvis byg (Lydtoget, Fortællebroen): passer brikken på pladsen? Facit er svaret delt ved byg.adskil.
  function trinvisPasser(opg, plads, brik) {
    const dele = opg.byg.adskil ? opg.svar.split(opg.byg.adskil) : opg.svar.split('');
    return Number.isInteger(plads) && plads >= 0 && plads < dele.length && dele[plads] === brik;
  }

  // Spor i sandet: modellerne pr. trin (forslagets tabel). Bogstaverne står i SKRIFT; tallene her i samme kasse
  // (100 × 100, grundlinje 75, overlinje 15). Første punkt er startprikken. Tegningen bedømmes ALDRIG.
  const SPOR_TEGN = { 1: ['l', 'o', '1'], 2: ['s', 'm', '3'], 3: ['2', 's'] };
  const SPOR_MODEL = { 1: 'bane', 2: 'ved', 3: 'husk' }; // bred bane at følge · model ved siden af · tegn efter hukommelsen
  const TAL_SKRIFT = {
    1: [[[40, 27], [54, 15], [54, 75]]],
    2: [bue(50, 30, 14, 14, -160, 25).concat([[36, 75], [65, 75]])],
    3: [bue(49, 30, 13, 13, -150, 90).concat(bue(49, 59.5, 15, 15.5, -90, 150).slice(1))],
  };
  const TAL_NAVN = { 1: 'ét', 2: 'to', 3: 'tre' };
  // Tastaturvejen (find tegnet blandt kort): tegn, der ligner — bogstaverne fra HAANDSKRIFT_LIGNER
  const TAL_LIGNER = { 1: ['7', '4'], 2: ['5', '3'], 3: ['8', '5'] };
  const sporModel = (tegn) => SKRIFT[tegn] || TAL_SKRIFT[tegn] || null;

  // Fortællebroen. [sætning, emoji, tegning i Grafik.minispil]. Rækkefølgen kan kun gå én vej (tid eller årsag).
  const FORTAELLE_TO = [
    { id: 'stoevler', h: [['Nora tager støvler på.', '🥾', 'storyNoraBoots'], ['Så går hun ud i regnen.', '🌧️', 'storyNoraRain']] },
    { id: 'snemand', h: [['Det sner.', '❄️'], ['Så bygger Nora en snemand.', '⛄']] },
    { id: 'kylling', h: [['Der ligger et æg i reden.', '🥚'], ['Så kommer der en lille kylling ud.', '🐥']] },
    { id: 'seng', h: [['Rex lægger sig i sengen.', '🛏️'], ['Så falder han i søvn.', '😴']] },
    { id: 'pakke', h: [['Bobo får en pakke.', '🎁'], ['Han pakker en bamse ud.', '🧸']] },
    { id: 'sommerfugl', h: [['En larve spiser et blad.', '🐛'], ['Så bliver den til en sommerfugl.', '🦋']] },
    { id: 'ballonOp', h: [['Nora puster en ballon op.', '🎈'], ['Så flyver ballonen op i himlen.', '☁️']] },
    { id: 'is', h: [['Rex får en is.', '🍦'], ['Så spiser han den.', '😋']] },
  ];
  // Trin 2: Noras frø (med tegninger) og de små historier fra 🤔 (undtagen frøet, som ligner Noras). Kun historier
  // med præcis tre hændelser og tre forskellige billeder — ellers kan blandingen nedenfor ikke slutte (review).
  // Id'erne må ikke gå igen på tværs af de tre trin (nøglen er 'fortaelleBro:' + id).
  const FORTAELLE_TRE = [{ id: 'noraFroe', h: [['Nora lægger et frø i jorden.', '🌱', 'storyPlantSeed'], ['Hun vander det.', '💧', 'storyWaterSeed'], ['Senere vokser der en blomst frem.', '🌷', 'storyFlowerGrown']] }]
    .concat(SMAA_HISTORIER.filter((H) => H.id !== 'froe' && H.h.length === 3 && new Set(H.h.map((x) => x[1])).size === 3));
  // Trin 3: handling og virkning. Én slutning hjælper; de to andre gør det værre eller er ligegyldige.
  const FORTAELLE_VIRKNING = [
    { id: 'boboFryser', s: ['Bobo fryser.'], spm: 'Hvad gør Bobo, så han bliver varm?', start: ['🥶', 'storyBoboCold'],
      rigtig: ['🧣', 'Bobo tager et tæppe om sig.', 'storyBoboBlanket'], fejl: [['🍦', 'Bobo spiser en is.', 'storyBoboIceCream'], ['🌊', 'Bobo sætter sig i vandet.', 'storyBoboWater']] },
    { id: 'rexSulten', s: ['Rex er sulten.'], spm: 'Hvad gør Rex, så han ikke er sulten mere?', start: ['🦖'],
      rigtig: ['🍎', 'Rex spiser et æble.'], fejl: [['🛁', 'Rex går i bad.'], ['⚽', 'Rex sparker til en bold.']] },
    { id: 'noraVarm', s: ['Nora har det alt for varmt.'], spm: 'Hvad gør Nora, så hun bliver kølig?', start: ['🥵'],
      rigtig: ['🏊', 'Nora hopper i vandet.'], fejl: [['🧥', 'Nora tager en tyk jakke på.'], ['🔥', 'Nora sætter sig ved bålet.']] },
    { id: 'boboTraet', s: ['Bobo er meget træt.'], spm: 'Hvad gør Bobo, så han ikke er træt mere?', start: ['🥱'],
      rigtig: ['😴', 'Bobo sover.'], fejl: [['🏃', 'Bobo løber en tur.'], ['🥁', 'Bobo spiller på tromme.']] },
    { id: 'moerkt', s: ['Det er mørkt i stuen.'], spm: 'Hvad gør Rex, så han kan se?', start: ['🌑'],
      rigtig: ['💡', 'Rex tænder lampen.'], fejl: [['🕶️', 'Rex tager solbriller på.'], ['🙈', 'Rex holder sig for øjnene.']] },
    { id: 'beskidt', s: ['Noras hænder er beskidte.'], spm: 'Hvad gør Nora, så de bliver rene?', start: ['🤲'],
      rigtig: ['🧼', 'Nora vasker hænder.'], fejl: [['🪱', 'Nora graver efter regnorme.'], ['🍫', 'Nora spiser chokolade.']] },
    { id: 'toerstig', s: ['Rex er tørstig.'], spm: 'Hvad gør Rex, så han ikke er tørstig mere?', start: ['🦖'],
      rigtig: ['🥛', 'Rex drikker et glas mælk.'], fejl: [['🍞', 'Rex spiser tørt brød.'], ['☀️', 'Rex ligger i solen.']] },
  ];
  // Et billede (emoji) med tegningen fra Grafik.minispil, når der er en
  const medBillede = (del, billede) => (billede ? Object.assign(del, { billede: billede }) : del);

  Object.assign(GEN, {
    // Lydtoget (Lydering): én vogn pr. lyd; kun én vogn er aktiv. Den aktive vogns lyd afspilles (indtalt klip), og
    // barnet vælger bogstavet blandt 2–3 kort. Hver vogn tjekkes for sig (byg.trinvis): en fejl standser kun den
    // aktive vogn, tidligere vogne bliver stående. Trin 1: is, ko … (to vogne) · trin 2: sol, mus, lam … (tre) ·
    // trin 3: ordet står i vognene — byt den første lyd (mus → hus).
    lydTog(niveau, rng) {
      const antal = antalValg(niveau);
      let ord, fra = null, vogne;
      if (niveau >= 3) {
        const [f, til, alt] = vaelg(rng, LYDTOG_BYT);
        fra = f; ord = til;
        // Den nye lyd · den gamle (byttede ikke) · den første lyd i et tredje ord fra samme familie
        const kort = [til[0], f[0]];
        if (alt && kort.indexOf(alt[0]) < 0 && kort.every((y) => !ligner(alt[0], y))) kort.push(alt[0]);
        for (const x of bland(rng, RAEKKEFOELGE.slice(0, 16))) {
          if (kort.length >= antal) break;
          if (til.indexOf(x) < 0 && f.indexOf(x) < 0 && kort.every((y) => y !== x && !ligner(x, y))) kort.push(x);
        }
        vogne = til.split('').map((b, i) => (i === 0 ? { bogstav: b, kort: bland(rng, kort.slice(0, antal)), lyd: vognLyd(rng, til, 0) } : { bogstav: b, fast: true }));
      } else {
        ord = vaelg(rng, LYDTOG_ORD[niveau]);
        vogne = ord.split('').map((b, i) => ({ bogstav: b, kort: vognKort(rng, ord, i, antal), lyd: vognLyd(rng, ord, i) }));
      }
      const vis = { art: 'lydTog', ord: ord, e: ORD[ord].e };
      if (BILLEDE[ord]) vis.billede = BILLEDE[ord];
      if (fra) {
        vis.fra = fra; vis.fraE = ORD[fra].e;
        if (BILLEDE[fra]) vis.fraBillede = BILLEDE[fra];
      }
      return opgave({
        emne: 'lydering', type: 'lydTog', niveau, noegle: 'lydTog:' + (fra ? fra + '-' : '') + ord, ikon: '🚂',
        // Tale → den første aktive vogns lyd → efterTale (som bytLyd). De næste vogne: se docs/MINISPIL.md
        tale: fra ? stort(fra) + '. Byt den første lyd ud med' : 'Vi bygger ordet ' + ord + '. Lyt til den første lyd.',
        lyd: [vogne[0].lyd],
        efterTale: fra ? 'Hvilket bogstav skal i den første vogn?' : '',
        tekst: 'Byg ordet',
        vis: vis,
        svar: ord,
        byg: { brikker: ord.split(''), dele: ord.length, adskil: '', trinvis: true, vogne: vogne },
        // Trin 1: den aktive vogns lyd igen, langsomt · trin 2: hele ordet vises (særskilt hjælp)
        hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'visOrd', ord: ord }],
        slut: { art: 'tog', tale: stort(ord) + '.' },
      });
    },

    // Rimhaven (Rim): find billedet, der rimer, og plant parret. Kortene præsenteres ét ad gangen med deres ord
    // (enAdGangen), før de kan vælges. Trin 1: to kort, tydeligt forskellige · trin 2: tre kort — et med samme første
    // lyd som billedordet og et med samme første lyd som rimordet (rim er slutningen) · trin 3: tre ord, to rimer —
    // find det, der ikke rimer (det deler første lyd med et af rimordene).
    rimHave(niveau, rng) {
      const alle = Object.keys(ORD).filter((o) => !ORD[o].ny);
      const faelles = { emne: 'rim', type: 'rimHave', niveau, ikon: '🌼', valgArt: 'emoji', enAdGangen: true, slut: { art: 'lysblomst' } };
      if (niveau >= 3) {
        for (let forsoeg = 0; ; forsoeg++) {
          const gruppe = vaelg(rng, RIM);
          const [a, b] = bland(rng, gruppe);
          const ude = alle.filter((o) => gruppe.indexOf(o) < 0 && !rimerPaa(a, o) && !rimerPaa(b, o) && ORD[o].e !== ORD[a].e && ORD[o].e !== ORD[b].e);
          const naer = ude.filter((o) => o[0] === a[0] || o[0] === b[0]);
          if (!naer.length && forsoeg < 50) continue;
          const svar = vaelg(rng, naer.length ? naer : ude);
          const valg = bland(rng, [a, b, svar]);
          return opgave(Object.assign(faelles, {
            noegle: 'rimHave:' + [a, b].sort().join('+') + '-' + svar, // «hat+kat-hus»
            tale: 'To af ordene rimer. Hvilket ord rimer ikke?',
            tekst: 'Hvilket rimer ikke?',
            vis: { art: 'lyt' },
            svar: svar, valg: valg,
            hjaelp: [{ art: 'rimLyt', stik: a, valg: valg }],
          }));
        }
      }
      for (let forsoeg = 0; ; forsoeg++) {
        const gruppe = vaelg(rng, RIM);
        const [stik, rigtig] = bland(rng, gruppe);
        const ikkeRim = alle.filter((o) => o !== stik && gruppe.indexOf(o) < 0 && !rimerPaa(stik, o) && !rimerPaa(rigtig, o) && ORD[o].e !== ORD[stik].e && ORD[o].e !== ORD[rigtig].e);
        let forkerte;
        if (niveau <= 1) {
          forkerte = bland(rng, ikkeRim.filter((o) => o[0] !== stik[0] && o[0] !== rigtig[0])).slice(0, 1);
        } else {
          const a = bland(rng, ikkeRim.filter((o) => o[0] === stik[0]))[0];
          const b = bland(rng, ikkeRim.filter((o) => o[0] === rigtig[0] && o !== a))[0];
          if ((!a || !b) && forsoeg < 50) continue;
          forkerte = [a, b].filter(Boolean);
          for (const o of bland(rng, ikkeRim)) if (forkerte.length < 2 && forkerte.indexOf(o) < 0) forkerte.push(o);
        }
        const valg = bland(rng, forkerte.concat([rigtig]));
        return opgave(Object.assign(faelles, {
          noegle: 'rimHave:' + stik + '+' + rigtig, // «hus+mus»
          tale: stort(stik) + '. Hvilket ord rimer på ' + stik + '?',
          tekst: 'Hvad rimer på ' + stik + '?',
          vis: { art: 'ordBillede', ord: stik, e: ORD[stik].e },
          svar: rigtig, valg: valg,
          hjaelp: [{ art: 'rimLyt', stik: stik, valg: valg }],
        }));
      }
    },

    // Spor i sandet (Alfabetet): tegn et lille bogstav (som i ✍️ Spor) eller et tal, stort, i sandfeltet.
    // BEDØMMES ALDRIG (bedoemmes: false): «Færdig» giver «Tak for din tegning», og opgaven tæller ikke i statistik eller sværhedsgrad (Opgaver.taellerMed).
    // Ingen genkendelse, intet vurderSpor. Trin 1: bred bane (l, o, 1) · trin 2: model ved siden af (s, m, 3) ·
    // trin 3: modellen skjules efter barnets tryk (2, s). Uden pen/finger: tastatur — find tegnet blandt kort.
    sporISandet(niveau, rng) {
      const trin = Math.min(3, Math.max(1, niveau));
      const t = vaelg(rng, SPOR_TEGN[trin]);
      const tal = /^\d$/.test(t);
      const ligner = tal ? TAL_LIGNER[t] : HAANDSKRIFT_LIGNER[t];
      const tvalg = bland(rng, ligner.slice(0, antalValg(niveau) - 1).concat([t]));
      const o = {
        emne: 'alfabet', type: 'sporISandet', niveau, noegle: 'sporISandet:' + t, ikon: '🏖️',
        tale: tal ? 'Tegn tallet ' + TAL_NAVN[t] + '. Start ved prikken.' : 'Tegn bogstavet',
        tekst: 'Tegn ' + t,
        vis: { art: 'sand', tegn: t, model: SPOR_MODEL[trin], start: sporModel(t)[0][0].slice() },
        svar: 'ok', interaktiv: 'sand', bedoemmes: false,
        tastatur: { valg: tvalg, svar: t, valgArt: 'skrevet', tale: tal ? 'Find tallet ' + TAL_NAVN[t] + '.' : 'Find bogstavet' },
        // «Vis mig»: modellen tegnes langsomt, strøg for strøg (tallene fra TAL_SKRIFT — se sporModel)
        hjaelp: [{ art: 'skrivBogstav', bogstav: t }],
        slut: { art: 'tak', tale: 'Tak for din tegning.' },
      };
      if (!tal) {
        // Bogstavets NAVN bruges med vilje (som haandskrift): «Tegn bogstavet æs. Start ved prikken.»
        o.lyd = [{ klip: navnId(t), reserve: NAVNE[t], navn: true }];
        o.efterTale = 'Start ved prikken.';
      }
      return opgave(o);
    },

    // Fortællebroen (Historiebogens 🤔-runde): en kort, egen billedhistorie. Trin 1–2: læg billederne i rækkefølge,
    // én plads ad gangen (byg.trinvis) — trin 1 to billeder, trin 2 tre · trin 3: vælg den slutning, der passer
    // (handling og virkning). Kun den lukkede billedopgave bedømmes; en fri fortsættelse (slut 'tegnSelv') gør ikke.
    fortaelleBro(niveau, rng) {
      if (niveau >= 3) {
        const H = vaelg(rng, FORTAELLE_VIRKNING);
        const kortAf = ([e, tekst, billede]) => ({ dele: [medBillede({ t: 'ting', e: e, n: 1, taelbar: false }, billede)], navn: tekst, fakta: { e: e } });
        const k = O.lavKort(rng, kortAf(H.rigtig), H.fejl.map(kortAf), antalValg(niveau));
        return opgave({
          emne: 'historie', type: 'fortaelleBro', niveau, noegle: 'fortaelleBro:' + H.id, ikon: '🌉',
          tale: H.s.join(' ') + ' ' + H.spm,
          tekst: 'Hvad sker så?',
          vis: { art: 'scene', fakta: { id: H.id }, dele: [medBillede({ t: 'ting', id: 's0', e: H.start[0], n: 1, taelbar: false }, H.start[1])] },
          svar: k.svar, valg: k.valg, kort: k.kort, valgArt: 'scene',
          hjaelp: [{ art: 'hoerIgen', langsomt: true }, { art: 'laesKort' }],
          slut: { art: 'tegnSelv', tale: 'Vil du tegne, hvad der sker bagefter? Du kan også fortælle det til en voksen.' },
        });
      }
      const H = vaelg(rng, niveau <= 1 ? FORTAELLE_TO : FORTAELLE_TRE);
      const billeder = H.h.map((x) => x[1]);
      const blandet = (() => { let b; do { b = bland(rng, billeder); } while (b.join() === billeder.join()); return b; })();
      const byg = { brikker: blandet, dele: billeder.length, adskil: ' ', tale: blandet.map((b) => H.h.find((x) => x[1] === b)[0]), trinvis: true };
      const tegninger = {};
      for (const x of H.h) if (x[2]) tegninger[x[1]] = x[2];
      if (Object.keys(tegninger).length) byg.billeder = tegninger;
      return opgave({
        emne: 'historie', type: 'fortaelleBro', niveau, noegle: 'fortaelleBro:' + H.id, ikon: '🌉',
        tale: H.h.map((x) => x[0]).join(' ') + ' Hvad sker først?',
        tekst: 'Hvad sker først?',
        vis: { art: 'bygHistorie', dele: billeder.length, historie: H.h.map((x) => x[0]) },
        svar: billeder.join(' '),
        byg: byg,
        // Trin 1: historien genfortælles kun frem til den aktive plads · trin 2: billedet til den aktive plads lyser
        hjaelp: [{ art: 'fortaelTil' }, { art: 'naesteBrik' }],
      });
    },
  });

  // C · Fortællebroen i Historiebogens 🤔-runde: trin 1–3 (Opgaver.MINISPIL kobling ['historie', trin])
  [1, 2, 3].forEach((t) => HISTORIE_QUIZ[t].push(GEN.fortaelleBro));

  const Dansk = {
    ALFABET, VOKALER, ORD, ORDLISTE, RIM, RAEKKEFOELGE, HOLDELYDE, STOPLYDE, KUN_NAVN, NAVNE, LYDLISTE, SMAAORD, HISTORIER,
    SMAA_HISTORIER, historieRaekke, historieHvorfor, historieSlutning, lavHistorieQuiz, RIM_PAR, FJERN_LYD, DEL_ORD, IKKE_DYR, SLUTNING, HYLDER, RIM_REMSER, LYD_ANTAL, SKIFT_PAR, HVORFOR,
    EMNER, GEN, LYT_TYPER, BYT_LYD, HAANDSKRIFT_LIGNER, PLACERING_TING, PLACERING_BEHOLDER, SKRIFT, SKRIVEVEJ, BOGSTAV_BREDDE, forlaegOrd, vurderSpor, langs,
    lydId, navnId, lydReserve, rimdel, rimerPaa, rimGruppe, ordIGruppe, ordILinje, undtagelser, ligner,
    lavOpgave, puljeOpgave, lavRunde, beskrivNoegle, lavRng,
    JAGT_TRIN, JAGT_STILLE, jagtBogstaver, jagtMidtOrd, lavJagtRunde, lavBane, banePunkt, strygRammer,
    // C · minispil
    BILLEDE, LYDTOG_ORD, LYDTOG_KLIP, LYDTOG_BYT, vognKort, trinvisPasser, SPOR_TEGN, SPOR_MODEL, TAL_SKRIFT, TAL_LIGNER, sporModel,
    FORTAELLE_TO, FORTAELLE_TRE, FORTAELLE_VIRKNING,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Dansk;
  else root.Dansk = Dansk;
})(typeof self !== 'undefined' ? self : this);
