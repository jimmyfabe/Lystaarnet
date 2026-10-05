/* voksen-opgaver.js — gymnasiematematik B/A uden hjælpemidler («dagens dosis» til den voksne).
   Rene funktioner uden DOM, testbare i Node (test/test-voksen.js).
   Alle opgaver laves af koden med tilfældige tal — intet er kopieret fra bøger.
   Forkerte svarmuligheder bygger på typiske fejl (se docs/VOKSEN-ANALYSE.md).
   Matematik skrives som MathML (ingen eksterne biblioteker). */
(function (root) {
  'use strict';

  const O = (typeof module !== 'undefined' && module.exports) ? require('./opgaver.js') : root.Opgaver;
  const { lavRng, heltal, vaelg, bland } = O;

  // ---------- Små MathML-hjælpere ----------
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Negativt tal: minus som fortegn (i sin egen mrow, så det ikke får luft som regnetegnet «minus»)
  const mn = (n) => (n < 0 ? '<mrow><mo>−</mo><mn>' + Math.abs(n) + '</mn></mrow>' : '<mn>' + n + '</mn>');
  const mi = (x) => '<mi>' + esc(x) + '</mi>';
  const mo = (o) => '<mo>' + esc(o) + '</mo>';
  const row = (...d) => '<mrow>' + d.join('') + '</mrow>';
  const frac = (a, b) => '<mfrac>' + row(a) + row(b) + '</mfrac>';
  const sup = (a, b) => '<msup>' + row(a) + row(b) + '</msup>';
  const sqrt = (a) => '<msqrt>' + a + '</msqrt>';
  const par = (a) => mo('(') + a + mo(')');
  const math = (indhold) => '<math display="inline">' + indhold + '</math>';
  // Tal i et led: 3 → «3», −3 → «(−3)» når det står efter et regnetegn
  const led = (n) => (n < 0 ? par(mn(n)) : mn(n));
  // «+ 3» eller «− 3» (fortegn som regnetegn)
  const plusLed = (n) => (n < 0 ? mo('−') + '<mn>' + Math.abs(n) + '</mn>' : mo('+') + '<mn>' + n + '</mn>');
  function broek(t, n) {
    // forkortet brøk som MathML; heltal vises uden brøkstreg
    const g = gcd(Math.abs(t), Math.abs(n)) || 1;
    t /= g; n /= g;
    if (n < 0) { t = -t; n = -n; }
    if (n === 1) return mn(t);
    return t < 0 ? row(mo('−') + frac(mn(Math.abs(t)), mn(n))) : frac(mn(t), mn(n));
  }
  function gcd(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }
  const kvadratTal = (n) => n * n;

  // «+ 3x», «− x», «» (ved 0) — et led med fortegn foran
  function plusMonom(a, n, x) {
    if (a === 0) return '';
    return (a < 0 ? mo('−') : mo('+')) + monom(Math.abs(a), n, x);
  }

  // Polynomium a·x^n som MathML (a ≠ 0)
  function monom(a, n, x) {
    x = x || 'x';
    const tal = Math.abs(a) === 1 && n !== 0 ? (a < 0 ? mo('−') : '') : mn(a);
    if (n === 0) return mn(a);
    if (n === 1) return tal + mi(x);
    return tal + sup(mi(x), mn(n));
  }

  // ---------- Svarmuligheder ----------
  // valg = [{ id, vis (MathML/tekst), v (tal eller nøgle til test), fejl (typisk fejl) }]
  function lavValgListe(rng, rigtig, forkerte, antal) {
    antal = antal || 4;
    const set = [rigtig];
    for (const f of forkerte) {
      if (set.length >= antal) break;
      if (f && !set.some((x) => x.nøgle === f.nøgle)) set.push(f);
    }
    const blandet = bland(rng, set);
    return blandet.map((x, i) => ({ id: 'v' + i, vis: x.vis, nøgle: x.nøgle, fejl: x.fejl || null }));
  }
  const tal = (n, fejl) => ({ vis: math(mn(n)), nøgle: 'n:' + n, fejl: fejl });
  const ja = { vis: 'Ja', nøgle: 'ja' };
  const nej = { vis: 'Nej', nøgle: 'nej' };

  // Færdig opgave: svar er id'et på den rigtige mulighed
  function opgave(o, rng, rigtig, forkerte, antal) {
    antal = antal || 4;
    // Talsvar: hvis fejlsvarene falder sammen med facit eller hinanden, fyldes op med nabotal
    if (/^n:/.test(rigtig.nøgle)) {
      const facitTal = Number(rigtig.nøgle.slice(2));
      const unikke = new Set([rigtig.nøgle].concat(forkerte.filter(Boolean).map((f) => f.nøgle)));
      for (const d of [1, -1, 2, -2, 3, -3, 5, -5]) {
        if (unikke.size >= antal) break;
        const k = 'n:' + (facitTal + d);
        if (!unikke.has(k)) { unikke.add(k); forkerte = forkerte.concat([tal(facitTal + d)]); }
      }
    }
    const valg = lavValgListe(rng, rigtig, forkerte, antal);
    o.valg = valg;
    o.svar = valg.find((x) => x.nøgle === rigtig.nøgle).id;
    o.rigtigNøgle = rigtig.nøgle;
    return o;
  }

  // Unikke tal-forvekslere omkring et facit
  function naboer(rng, facit, liste) {
    const ud = [];
    for (const v of liste.concat([facit + 1, facit - 1, facit + 2, facit - 2, facit + 10, facit - 10])) {
      if (Number.isFinite(v) && v !== facit && ud.indexOf(v) < 0) ud.push(v);
    }
    return ud;
  }

  // ---------- Generatorer ----------
  // Hver: (niveau, rng) → { emne, type, niveau, noegle, spoerg (MathML/HTML), p (parametre), valg, svar, forklaring }
  const V = {
    // ===== 1. Regnetricks =====
    // 49² = (50 − 1)² = 2500 − 100 + 1
    kvadratTrick(niveau, rng) {
      const runde = vaelg(rng, niveau >= 2 ? [30, 40, 50, 60, 70, 80, 90, 100] : [20, 30, 40, 50]);
      const d = vaelg(rng, niveau >= 3 ? [-2, -1, 1, 2] : [-1, 1]);
      const n = runde + d;
      const facit = n * n;
      const glemt = runde * runde + d * d;               // (a+b)² = a² + b²  (glemt dobbelt produkt)
      const fortegn = runde * runde - 2 * runde * d + d * d; // forkert fortegn på 2ab
      const o = {
        emne: 'regnetricks', type: 'kvadratTrick', niveau, noegle: 'kvadrat:' + n, p: { n },
        spoerg: 'Regn i hovedet: ' + math(sup(mn(n), mn(2))),
        forklaring: math(sup(mn(n), mn(2)) + mo('=') + sup(par(mn(runde) + (d < 0 ? mo('−') : mo('+')) + mn(Math.abs(d))), mn(2)) + mo('=') + mn(runde * runde) + (d < 0 ? mo('−') : mo('+')) + mn(Math.abs(2 * runde * d)) + mo('+') + mn(d * d) + mo('=') + mn(facit)),
      };
      return opgave(o, rng, tal(facit), [tal(glemt, 'Glemt det dobbelte produkt: (a+b)² ≠ a² + b²'), tal(fortegn, 'Forkert fortegn på 2ab'), ...naboer(rng, facit, [facit + 100]).map((v) => tal(v))]);
    },

    // Regningsarternes hierarki: a − b·c + d
    hierarki(niveau, rng) {
      const a = heltal(rng, 5, 20), b = heltal(rng, 2, 6), c = heltal(rng, 2, 6), d = heltal(rng, 1, 9);
      const facit = a - b * c + d;
      const venstre = (a - b) * c + d;          // regnet fra venstre mod højre
      const minusFejl = a - (b * c + d);        // minus foran «resten»
      const o = {
        emne: 'regnetricks', type: 'hierarki', niveau, noegle: 'hierarki:' + [a, b, c, d].join(','), p: { a, b, c, d },
        spoerg: 'Udregn ' + math(mn(a) + mo('−') + mn(b) + mo('·') + mn(c) + mo('+') + mn(d)),
        forklaring: 'Gange før plus og minus: ' + math(mn(a) + mo('−') + mn(b * c) + mo('+') + mn(d) + mo('=') + mn(facit)),
      };
      return opgave(o, rng, tal(facit), [tal(venstre, 'Regnet fra venstre mod højre'), tal(minusFejl, 'Minus ganget ind på det hele'), ...naboer(rng, facit, []).map((v) => tal(v))]);
    },

    // Fortegn: −3² og (−3)²
    fortegn(niveau, rng) {
      const a = heltal(rng, 2, 9);
      const medParentes = rng() < 0.5;
      const eks = niveau >= 2 && rng() < 0.5 ? 3 : 2;
      const facit = medParentes ? Math.pow(-a, eks) : -Math.pow(a, eks);
      const modsat = medParentes ? -Math.pow(-a, eks) : Math.pow(a, eks);
      const udtryk = medParentes ? sup(par(mn(-a)), mn(eks)) : mo('−') + sup(mn(a), mn(eks));
      const o = {
        emne: 'regnetricks', type: 'fortegn', niveau, noegle: 'fortegn:' + (medParentes ? '(' : '') + a + '^' + eks, p: { a, eks, medParentes },
        spoerg: 'Udregn ' + math(udtryk),
        forklaring: medParentes ? 'Parentesen betyder, at minus også opløftes.' : 'Potens før minus: kun ' + a + ' opløftes.',
      };
      return opgave(o, rng, tal(facit), [tal(modsat, 'Fortegnet blandet sammen'), tal(a * eks, 'Ganget med eksponenten i stedet for at opløfte'), tal(-a * eks)]);
    },

    // ===== 2. Brøker og potenser =====
    broekPlus(niveau, rng) {
      const nv = niveau >= 2 ? [2, 3, 4, 5, 6] : [2, 3, 4];
      let b, d;
      do { b = vaelg(rng, nv); d = vaelg(rng, nv); } while (b === d && niveau >= 2);
      const a = heltal(rng, 1, b - 1 || 1), c = heltal(rng, 1, d - 1 || 1);
      const t = a * d + c * b, n = b * d;
      const forkert = { vis: math(broek(a + c, b + d)), nøgle: 'b:' + (a + c) / gcd(a + c, b + d) + '/' + (b + d) / gcd(a + c, b + d), fejl: 'Lagt tællere og nævnere sammen hver for sig' };
      const g = gcd(t, n);
      const rigtig = { vis: math(broek(t, n)), nøgle: 'b:' + t / g + '/' + n / g };
      const tf = a * d + c, gt = gcd(tf, n);
      const o = {
        emne: 'broeker', type: 'broekPlus', niveau, noegle: 'broekPlus:' + [a, b, c, d].join(','), p: { a, b, c, d },
        spoerg: 'Udregn ' + math(frac(mn(a), mn(b)) + mo('+') + frac(mn(c), mn(d))),
        forklaring: 'Fællesnævner ' + n + ': ' + math(frac(mn(a * d), mn(n)) + mo('+') + frac(mn(c * b), mn(n)) + mo('=') + broek(t, n)),
      };
      return opgave(o, rng, rigtig, [forkert, { vis: math(broek(tf, n)), nøgle: 'b:' + tf / gt + '/' + n / gt, fejl: 'Kun den ene tæller forlænget' },
        { vis: math(broek(a * c, b * d)), nøgle: 'b:' + (a * c) / gcd(a * c, b * d) + '/' + (b * d) / gcd(a * c, b * d), fejl: 'Ganget i stedet for at lægge sammen' }]);
    },

    // aᵐ · aⁿ = aᵐ⁺ⁿ
    potensGange(niveau, rng) {
      const a = vaelg(rng, [2, 3, 5, 10]);
      const m = heltal(rng, 2, 6), n = heltal(rng, 2, 6);
      const dele = rng() < 0.5 && niveau >= 2;
      const e = dele ? m + n : m + n;
      const spoerg = dele
        ? frac(sup(mn(a), mn(m + n)), sup(mn(a), mn(n)))
        : sup(mn(a), mn(m)) + mo('·') + sup(mn(a), mn(n));
      const facitEks = dele ? m : e;
      const pot = (b, x) => ({ vis: math(sup(mn(b), mn(x))), nøgle: 'p:' + b + '^' + x });
      const o = {
        emne: 'broeker', type: 'potensGange', niveau, noegle: 'potens:' + a + ':' + m + ':' + n + (dele ? ':/' : ''), p: { a, m, n, dele },
        spoerg: 'Skriv som én potens: ' + math(spoerg),
        forklaring: dele ? 'Ved division trækkes eksponenterne fra hinanden.' : 'Ved multiplikation lægges eksponenterne sammen.',
      };
      const forkerte = dele
        ? [(m + n) % n === 0 ? Object.assign(pot(a, (m + n) / n), { fejl: 'Divideret eksponenterne' }) : Object.assign(pot(a, (m + n) * n), { fejl: 'Ganget eksponenterne' }), Object.assign(pot(a, m + 2 * n), { fejl: 'Lagt eksponenterne sammen' }), Object.assign(pot(1, m), { fejl: 'Divideret grundtallene' })]
        : [Object.assign(pot(a, m * n), { fejl: 'Ganget eksponenterne' }), Object.assign(pot(a * a, m + n), { fejl: 'Ganget grundtallene' }), Object.assign(pot(a * a, m * n), { fejl: 'Ganget både grundtal og eksponenter' })];
      // Reserve, hvis to fejl giver det samme (fx 2+2 = 2·2)
      forkerte.push(Object.assign(pot(a, facitEks + 1), { fejl: null }), Object.assign(pot(a, facitEks - 1), { fejl: null }));
      return opgave(o, rng, pot(a, facitEks), forkerte.filter((f) => f.nøgle !== 'p:' + a + '^' + facitEks));
    },

    // x⁰ = 1 og 10-tals-notation
    nulPotens(niveau, rng) {
      if (niveau >= 2 && rng() < 0.6) {
        const a = heltal(rng, 2, 4), b = heltal(rng, 2, 4), m = heltal(rng, 2, 6), n = -heltal(rng, 1, 3);
        const t = a * b, e = m + n;
        const vis = (k, x) => ({ vis: math(mn(k) + mo('·') + sup(mn(10), mn(x))), nøgle: 't:' + k + 'e' + x });
        const o = {
          emne: 'broeker', type: 'nulPotens', niveau, noegle: 'tipot:' + [a, b, m, n].join(','), p: { a, b, m, n, ti: true },
          spoerg: 'Udregn ' + math(row(mn(a) + mo('·') + sup(mn(10), mn(m))) + mo('·') + row(mn(b) + mo('·') + sup(mn(10), mn(n)))),
          forklaring: 'Gang tallene for sig og læg eksponenterne sammen: ' + math(mn(t) + mo('·') + sup(mn(10), mn(e))),
        };
        return opgave(o, rng, vis(t, e), [Object.assign(vis(t, m * n), { fejl: 'Ganget eksponenterne' }), Object.assign(vis(a + b, e), { fejl: 'Lagt tallene sammen' }), Object.assign(vis(t, m - n), { fejl: 'Fortegnsfejl i eksponenten' })]);
      }
      const x = vaelg(rng, ['x', 'a', '7', '123']);
      const o = {
        emne: 'broeker', type: 'nulPotens', niveau, noegle: 'nul:' + x, p: { x },
        spoerg: 'Hvad er ' + math(sup(/\d/.test(x) ? mn(x) : mi(x), mn(0))) + (/\d/.test(x) ? '' : ' (for ' + math(mi(x) + mo('≠') + mn(0)) + ')') + '?',
        forklaring: 'Alt (undtagen 0) opløftet i 0 er 1.',
      };
      return opgave(o, rng, tal(1), [tal(0, 'x⁰ er 1, ikke 0'), { vis: math(/\d/.test(x) ? mn(x) : mi(x)), nøgle: 'x', fejl: 'Troet, at eksponenten 0 ikke ændrer noget' }, tal(-1)]);
    },

    // Forkort faktorer, ikke led: (6 + 4x)/2 = 3 + 2x
    forkort(niveau, rng) {
      const k = vaelg(rng, [2, 3, 5]);
      const a = k * heltal(rng, 1, 5), b = k * heltal(rng, 1, 5);
      const udtryk = (p, q) => ({ vis: math(mn(p) + mo('+') + (q === 1 ? '' : mn(q)) + mi('x')), nøgle: 'u:' + p + '+' + q + 'x' });
      const o = {
        emne: 'broeker', type: 'forkort', niveau, noegle: 'forkort:' + [a, b, k].join(','), p: { a, b, k },
        spoerg: 'Forkort ' + math(frac(mn(a) + mo('+') + mn(b) + mi('x'), mn(k))),
        forklaring: 'Begge led skal deles med ' + k + ' — man forkorter faktorer, ikke enkelte led.',
      };
      const forkerte = [Object.assign(udtryk(a / k, b), { fejl: 'Kun det første led er delt' }), Object.assign(udtryk(a, b / k), { fejl: 'Kun det andet led er delt' })];
      if (a - k > 0 && b - k > 0) forkerte.push(Object.assign(udtryk(a - k, b - k), { fejl: 'Trukket fra i stedet for at dele' }));
      else forkerte.push(Object.assign(udtryk(a / k, b / k + 1), { fejl: null }));
      return opgave(o, rng, udtryk(a / k, b / k), forkerte);
    },

    // ===== 3. Ligninger =====
    lineaer(niveau, rng) {
      const a = vaelg(rng, [2, 3, 4, 5]) * (niveau >= 3 && rng() < 0.4 ? -1 : 1);
      const x = heltal(rng, -6, 9);
      const b = heltal(rng, -9, 9) || 4;
      const c = a * x + b;
      const o = {
        emne: 'ligninger', type: 'lineaer', niveau, noegle: 'lin:' + [a, b, c].join(','), p: { a, b, c },
        spoerg: 'Løs ligningen ' + math(monom(a, 1) + plusLed(b) + mo('=') + mn(c)),
        forklaring: (b < 0 ? 'Læg ' + (-b) + ' til' : 'Træk ' + b + ' fra') + ' og del med ' + a + ': ' + math(mi('x') + mo('=') + frac(mn(c) + plusLed(-b), mn(a)) + mo('=') + mn(x)),
      };
      const fx = (v, f) => ({ vis: math(mi('x') + mo('=') + (Number.isInteger(v) ? mn(v) : broek(Math.round(v * a), a))), nøgle: 'x:' + (Math.round(v * 1000) / 1000), fejl: f });
      return opgave(o, rng, fx(x), [fx((c + b) / a, 'Lagt til i stedet for at trække fra'), fx(c / a - b, 'Delt før der blev trukket fra'), fx(-x, 'Fortegnsfejl'), fx(x + 1)]);
    },

    // Nulreglen: (x − p)(x + q) = 0
    nulreglen(niveau, rng) {
      let p, q;
      do { p = heltal(rng, -7, 7); q = heltal(rng, -7, 7); } while (p === 0 || q === 0 || p === -q || p === q);
      // faktorerne (x − p) og (x − q)
      const faktor = (r) => par(mi('x') + plusLed(-r));
      const loes = (r1, r2, f) => {
        const [s1, s2] = [r1, r2].sort((u, v) => u - v);
        return { vis: math(mi('x') + mo('=') + mn(s1) + mo('∨') + mi('x') + mo('=') + mn(s2)), nøgle: 'l:' + s1 + ',' + s2, fejl: f };
      };
      const o = {
        emne: 'ligninger', type: 'nulreglen', niveau, noegle: 'nul:' + Math.min(p, q) + ',' + Math.max(p, q), p: { p, q },
        spoerg: 'Løs ' + math(faktor(p) + faktor(q) + mo('=') + mn(0)),
        forklaring: 'Et produkt er 0, når en af faktorerne er 0: ' + math(mi('x') + plusLed(-p) + mo('=') + mn(0)) + ' eller ' + math(mi('x') + plusLed(-q) + mo('=') + mn(0)) + '.',
      };
      return opgave(o, rng, loes(p, q), [loes(-p, -q, 'Forkert fortegn i nulreglen'), loes(-p, q, 'Forkert fortegn i den ene'), loes(p, -q, 'Forkert fortegn i den anden')]);
    },

    // x² − (p+q)x + pq = 0
    andengrad(niveau, rng) {
      let p, q;
      do { p = heltal(rng, -6, 7); q = heltal(rng, -6, 7); } while (p === q || p === 0 || q === 0 || p === -q);
      const s = p + q, pr = p * q;
      const loes = (r1, r2, f) => {
        const [s1, s2] = [r1, r2].sort((u, v) => u - v);
        return { vis: math(mi('x') + mo('=') + mn(s1) + mo('∨') + mi('x') + mo('=') + mn(s2)), nøgle: 'l:' + s1 + ',' + s2, fejl: f };
      };
      const o = {
        emne: 'ligninger', type: 'andengrad', niveau, noegle: 'andengrad:' + Math.min(p, q) + ',' + Math.max(p, q), p: { p, q },
        spoerg: 'Løs ' + math(sup(mi('x'), mn(2)) + plusMonom(-s, 1) + plusLed(pr) + mo('=') + mn(0)),
        forklaring: 'Find to tal, der ganget giver ' + pr + ' og lagt sammen giver ' + s + ': ' + math(par(mi('x') + plusLed(-p)) + par(mi('x') + plusLed(-q)) + mo('=') + mn(0)),
      };
      return opgave(o, rng, loes(p, q), [loes(-p, -q, 'Fortegnsfejl i rødderne'), loes(p, -q, 'Fortegnsfejl i den ene rod'), loes(pr, 1, 'Produkt og sum blandet sammen')]);
    },

    // Isolér en variabel i en formel
    isoler(niveau, rng) {
      const formler = [
        { navn: 'Ohms lov', f: math(mi('U') + mo('=') + mi('R') + mo('·') + mi('I')), x: 'I', rigtig: frac(mi('U'), mi('R')), forkert: [[frac(mi('R'), mi('U')), 'Brøken vendt om'], [mi('U') + mo('·') + mi('R'), 'Ganget i stedet for at dele'], [mi('U') + mo('−') + mi('R'), 'Trukket fra i stedet for at dele']] },
        { navn: 'Effekt', f: math(mi('P') + mo('=') + mi('U') + mo('·') + mi('I')), x: 'U', rigtig: frac(mi('P'), mi('I')), forkert: [[frac(mi('I'), mi('P')), 'Brøken vendt om'], [mi('P') + mo('·') + mi('I'), 'Ganget i stedet for at dele'], [mi('P') + mo('−') + mi('I'), 'Trukket fra']] },
        { navn: 'Fart', f: math(mi('v') + mo('=') + frac(mi('s'), mi('t'))), x: 's', rigtig: mi('v') + mo('·') + mi('t'), forkert: [[frac(mi('v'), mi('t')), 'Delt i stedet for at gange'], [frac(mi('t'), mi('v')), 'Brøken vendt om'], [mi('v') + mo('+') + mi('t'), 'Lagt til']] },
        { navn: 'Trekantens areal', f: math(mi('A') + mo('=') + frac(mn(1), mn(2)) + mo('·') + mi('g') + mo('·') + mi('h')), x: 'h', rigtig: frac(mn(2) + mi('A'), mi('g')), forkert: [[frac(mi('A'), mn(2) + mi('g')), 'Halvdelen havnet forkert'], [frac(mi('A'), mi('g')), 'Glemt ½'], [mn(2) + mi('A') + mo('·') + mi('g'), 'Ganget med g']] },
        { navn: 'Lineær funktion', f: math(mi('y') + mo('=') + mi('a') + mi('x') + mo('+') + mi('b')), x: 'x', rigtig: frac(mi('y') + mo('−') + mi('b'), mi('a')), forkert: [[frac(mi('y'), mi('a')) + mo('−') + mi('b'), 'Delt før der blev trukket fra'], [frac(mi('y') + mo('+') + mi('b'), mi('a')), 'Fortegnsfejl'], [mi('a') + mo('·') + par(mi('y') + mo('−') + mi('b')), 'Ganget i stedet for at dele']] },
      ];
      const nr = heltal(rng, 0, niveau >= 2 ? formler.length - 1 : 2);
      const F = formler[nr];
      const vis = (udtryk) => math(mi(F.x) + mo('=') + udtryk);
      // Nøglen er fælles med isolerBrik (samme formel og variabel), så de to aldrig står i samme dosis/prøve
      const id = ['ohm-I', 'effekt-U', 'fart-s', 'trekant-h', 'lin-x'][nr];
      const o = {
        emne: 'ligninger', type: 'isoler', niveau, noegle: 'isoler:' + id, p: { nr },
        spoerg: F.navn + ': ' + F.f + '. Isolér ' + math(mi(F.x)) + '.',
        forklaring: 'Gør det samme på begge sider, til ' + F.x + ' står alene: ' + vis(F.rigtig),
      };
      return opgave(o, rng, { vis: vis(F.rigtig), nøgle: 'f:rigtig' }, F.forkert.map((f, i) => ({ vis: vis(f[0]), nøgle: 'f:' + i, fejl: f[1] })));
    },

    // Er x = r en løsning?
    erLoesning(niveau, rng) {
      let p, q;
      do { p = heltal(rng, -5, 6); q = heltal(rng, -5, 6); } while (p === q || p === 0 || q === 0);
      const s = p + q, pr = p * q;
      const r = rng() < 0.5 ? vaelg(rng, [p, q]) : vaelg(rng, [-p, -q, p + 1].filter((v) => v !== p && v !== q));
      const er = r === p || r === q;
      const o = {
        emne: 'ligninger', type: 'erLoesning', niveau, noegle: 'erLoesning:' + [p, q, r].join(','), p: { p, q, r },
        spoerg: 'Er ' + math(mi('x') + mo('=') + mn(r)) + ' en løsning til ' + math(sup(mi('x'), mn(2)) + plusMonom(-s, 1) + plusLed(pr) + mo('=') + mn(0)) + '?',
        forklaring: 'Sæt ind: ' + math(sup(led(r), mn(2)) + (s === 0 ? '' : plusLed(-s) + mo('·') + led(r)) + plusLed(pr) + mo('=') + mn(r * r - s * r + pr)) + (er ? ' — ja.' : ' — ikke 0, så nej.'),
      };
      return opgave(o, rng, er ? ja : nej, [er ? nej : ja], 2);
    },

    // ===== 4. Trekanter =====
    pythagoras(niveau, rng) {
      const tripler = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25]];
      const [a, b, c] = vaelg(rng, niveau >= 2 ? tripler : tripler.slice(0, 3));
      const katete = niveau >= 2 && rng() < 0.5;
      const o = {
        emne: 'trekanter', type: 'pythagoras', niveau, noegle: 'pyth:' + [a, b, c].join(',') + (katete ? 'k' : ''), p: { a, b, c, katete },
        spoerg: katete
          ? 'En retvinklet trekant har hypotenusen ' + math(mn(c)) + ' og en katete ' + math(mn(a)) + '. Hvor lang er den anden katete?'
          : 'En retvinklet trekant har kateterne ' + math(mn(a)) + ' og ' + math(mn(b)) + '. Hvor lang er hypotenusen?',
        figur: { art: 'retvinklet', a, b, c, spoerg: katete ? 'b' : 'c' },
        forklaring: katete
          ? math(mi('b') + mo('=') + sqrt(sup(mn(c), mn(2)) + mo('−') + sup(mn(a), mn(2))) + mo('=') + sqrt(mn(c * c - a * a)) + mo('=') + mn(b))
          : math(mi('c') + mo('=') + sqrt(sup(mn(a), mn(2)) + mo('+') + sup(mn(b), mn(2))) + mo('=') + sqrt(mn(a * a + b * b)) + mo('=') + mn(c)),
      };
      const facit = katete ? b : c;
      const forkerte = katete
        ? [tal(c - a, 'Trukket siderne fra hinanden uden kvadrater'), tal(c * c - a * a, 'Glemt kvadratroden'), tal(c + a)]
        : [tal(a + b, 'Lagt kateterne sammen'), tal(a * a + b * b, 'Glemt kvadratroden'), tal(c + 1)];
      return opgave(o, rng, tal(facit), forkerte);
    },

    // Ensvinklede trekanter: skalafaktor
    ensvinklede(niveau, rng) {
      const [a, b, c] = vaelg(rng, [[3, 4, 5], [2, 3, 4], [4, 5, 6], [5, 6, 8]]);
      const k = vaelg(rng, niveau >= 2 ? [2, 3, 4, 5] : [2, 3]);
      const o = {
        emne: 'trekanter', type: 'ensvinklede', niveau, noegle: 'ens:' + [a, b, c, k].join(','), p: { a, b, c, k },
        spoerg: 'To trekanter er ensvinklede. Den lille har siderne ' + math(mn(a)) + ', ' + math(mn(b)) + ' og ' + math(mn(c)) + '. I den store svarer ' + math(mn(a)) + ' til ' + math(mn(a * k)) + '. Hvad svarer ' + math(mn(b)) + ' til?',
        forklaring: 'Skalafaktoren er ' + math(frac(mn(a * k), mn(a)) + mo('=') + mn(k)) + ', så ' + math(mn(b) + mo('·') + mn(k) + mo('=') + mn(b * k)) + '.',
      };
      return opgave(o, rng, tal(b * k), [tal(b + (a * k - a), 'Lagt forskellen til i stedet for at gange'), tal(c * k, 'Brugt den forkerte side'), tal(b * k + 1)]);
    },

    // ===== 5. Funktioner og modeller =====
    // Hældning ud fra to punkter
    haeldning(niveau, rng) {
      const a = vaelg(rng, niveau >= 2 ? [-3, -2, -1, 1, 2, 3, 4] : [1, 2, 3]);
      const b = heltal(rng, -5, 5);
      const x1 = heltal(rng, -2, 2), x2 = x1 + heltal(rng, 1, 4);
      const y1 = a * x1 + b, y2 = a * x2 + b;
      const dy = y2 - y1, dx = x2 - x1;
      const o = {
        emne: 'funktioner', type: 'haeldning', niveau, noegle: 'haeld:' + [x1, y1, x2, y2].join(','), p: { x1, y1, x2, y2 },
        spoerg: 'En ret linje går gennem ' + math(par(mn(x1) + mo(',') + mn(y1))) + ' og ' + math(par(mn(x2) + mo(',') + mn(y2))) + '. Hvad er hældningen?',
        forklaring: math(mi('a') + mo('=') + frac(mn(y2) + plusLed(-y1), mn(x2) + plusLed(-x1)) + mo('=') + frac(mn(dy), mn(dx)) + mo('=') + mn(a)),
      };
      const forkert = (t, n, f) => ({ vis: math(broek(t, n)), nøgle: 'a:' + Math.round(t / n * 1000) / 1000, fejl: f });
      return opgave(o, rng, forkert(dy, dx), [dy !== 0 ? forkert(dx, dy, 'Brøken vendt om (Δx/Δy)') : null, dy !== 0 ? forkert(-dy, dx, 'Fortegnsfejl') : null, x2 + x1 !== 0 ? forkert(y2 + y1, x2 + x1, 'Lagt sammen i stedet for at trække fra') : null, forkert(dy + dx, 1), forkert(dy - dx, 1)].filter(Boolean));
    },

    // Procentvis vækst: f(x) = b·aˣ
    vaekst(niveau, rng) {
      const pct = vaelg(rng, [2, 3, 4, 5, 8, 10, 12, 20, 25]);
      const fald = niveau >= 2 && rng() < 0.4;
      const a = fald ? (100 - pct) / 100 : (100 + pct) / 100;
      const b = vaelg(rng, [50, 100, 200, 500]);
      const pctTekst = (n, f) => ({ vis: String(n).replace('.', ',') + ' %', nøgle: 'pct:' + n, fejl: f });
      const o = {
        emne: 'funktioner', type: 'vaekst', niveau, noegle: 'vaekst:' + (fald ? '-' : '') + pct, p: { pct, fald, b },
        spoerg: math(mi('f') + par(mi('x')) + mo('=') + mn(b) + mo('·') + sup(mn(String(a).replace('.', ',')), mi('x'))) + '. Med hvor mange procent ' + (fald ? 'falder' : 'vokser') + ' f, når x vokser med 1?',
        forklaring: 'Fremskrivningsfaktoren er ' + String(a).replace('.', ',') + ' = ' + (fald ? '1 − ' : '1 + ') + String(pct / 100).replace('.', ',') + ', altså ' + pct + ' %.',
      };
      return opgave(o, rng, pctTekst(pct), [pctTekst(fald ? 100 - pct : 100 + pct, 'Fremskrivningsfaktoren læst som procent'), pctTekst(pct / 100, 'Glemt at gange med 100'), pctTekst(b, 'Brugt startværdien')]);
    },

    // Match graf og forskrift (ret linje)
    matchGraf(niveau, rng) {
      const a = vaelg(rng, niveau >= 2 ? [-2, -1, 1, 2, 3] : [-2, 2, 1, -1]);
      const b = vaelg(rng, [-3, -2, -1, 1, 2, 3]);
      const forskrift = (aa, bb, f) => ({ vis: math(mi('y') + mo('=') + monom(aa, 1) + plusLed(bb)), nøgle: 'lin:' + aa + ',' + bb, fejl: f });
      const o = {
        emne: 'funktioner', type: 'matchGraf', niveau, noegle: 'graf:' + a + ',' + b, p: { a, b },
        spoerg: 'Hvilken forskrift passer til grafen?',
        figur: { art: 'linje', a, b },
        forklaring: 'Linjen skærer y-aksen i ' + b + ' og ' + (a > 0 ? 'stiger' : 'falder') + ' ' + Math.abs(a) + ' pr. skridt til højre.',
      };
      return opgave(o, rng, forskrift(a, b), [forskrift(-a, b, 'Fortegn på hældningen'), forskrift(a, -b, 'Fortegn på skæringen'), forskrift(b, a, 'a og b byttet om')].filter((f) => f.nøgle !== 'lin:' + a + ',' + b));
    },

    // Parablens fortegn for a ud fra grafen
    parabel(niveau, rng) {
      const a = vaelg(rng, [-1, 1]);
      const p = heltal(rng, -2, 2), q = heltal(rng, -2, 2);
      const o = {
        emne: 'funktioner', type: 'parabel', niveau, noegle: 'parabel:' + a + ':' + p + ':' + q, p: { a, p, q },
        spoerg: 'Grafen er en parabel ' + math(mi('y') + mo('=') + mi('a') + sup(mi('x'), mn(2)) + mo('+') + mi('b') + mi('x') + mo('+') + mi('c')) + '. Hvad er fortegnet for a?',
        figur: { art: 'parabel', a, p, q },
        forklaring: a > 0 ? 'Grenene vender opad, så a er positiv.' : 'Grenene vender nedad, så a er negativ.',
      };
      return opgave(o, rng, { vis: a > 0 ? 'a > 0' : 'a < 0', nøgle: a > 0 ? 'pos' : 'neg' }, [{ vis: a > 0 ? 'a < 0' : 'a > 0', nøgle: a > 0 ? 'neg' : 'pos', fejl: 'Vendt om' }, { vis: 'a = 0', nøgle: 'nul', fejl: 'Så var det ikke en parabel' }], 3);
    },

    // ln-regler: ln 1 = 0 (den typiske fejl er 1), ln(eᵏ) = k, ln(a·b) = ln a + ln b, ln(aᵏ) = k·ln a
    lnRegler(niveau, rng) {
      const ln = (x) => mi('ln') + par(x);
      const t = vaelg(rng, niveau >= 3 ? ['ln1', 'lne', 'lnab', 'lnpot'] : ['ln1', 'lne', 'lnab']);
      if (t === 'ln1') {
        const o = { emne: 'funktioner', type: 'lnRegler', niveau, noegle: 'ln:1', p: { t }, spoerg: 'Hvad er ' + math(ln(mn(1))) + '?', forklaring: math(sup(mi('e'), mn(0)) + mo('=') + mn(1)) + ', så ' + math(ln(mn(1)) + mo('=') + mn(0)) + '.' };
        return opgave(o, rng, tal(0), [tal(1, 'ln 1 er 0, ikke 1'), { vis: math(mi('e')), nøgle: 'e', fejl: 'Forvekslet med e¹' }, tal(-1)]);
      }
      if (t === 'lne') {
        const k = heltal(rng, 2, 9);
        const o = { emne: 'funktioner', type: 'lnRegler', niveau, noegle: 'ln:e' + k, p: { t, k }, spoerg: 'Hvad er ' + math(ln(sup(mi('e'), mn(k)))) + '?', forklaring: 'ln og e ophæver hinanden: ' + math(ln(sup(mi('e'), mi('k'))) + mo('=') + mi('k')) + '.' };
        return opgave(o, rng, tal(k), [{ vis: math(sup(mi('e'), mn(k))), nøgle: 'ek', fejl: 'ln ikke brugt' }, { vis: math(mn(k) + mi('e')), nøgle: 'ke', fejl: 'Ganget i stedet for' }, tal(k + 1)]);
      }
      const a = heltal(rng, 2, 7);
      let b = heltal(rng, 2, 7);
      if (t === 'lnab') {
        if (a === 2 && b === 2) b = 3; // ellers er ln(2+2) = ln 2 + ln 2, og «lagt sammen inde i ln» er også rigtig
        const v = (x, n, f) => ({ vis: math(x), nøgle: n, fejl: f });
        const o = { emne: 'funktioner', type: 'lnRegler', niveau, noegle: 'ln:' + a + '·' + b, p: { t, a, b }, spoerg: 'Skriv ' + math(ln(mn(a) + mo('·') + mn(b))) + ' på en anden måde.', forklaring: 'Logaritmen af et produkt er summen af logaritmerne.' };
        return opgave(o, rng, v(ln(mn(a)) + mo('+') + ln(mn(b)), 'sum'), [v(ln(mn(a)) + mo('·') + ln(mn(b)), 'prod', 'ln af et produkt er ikke produktet af ln'), v(ln(mn(a + b)), 'lnsum', 'Lagt tallene sammen inde i ln'), v(mn(a * b) + mo('·') + ln(mn(1)), 'skrald', null)]);
      }
      let k = heltal(rng, 2, 5);
      if (k === a) k = a === 2 ? 3 : 2; // ellers er «byttet om» det samme som facit
      if (Math.pow(a, k) === Math.pow(k, a)) k = 3; // {2, 4}: 4·ln 2 = 2·ln 4, så «byttet om» er også rigtig
      const v = (x, n, f) => ({ vis: math(x), nøgle: n, fejl: f });
      const o = { emne: 'funktioner', type: 'lnRegler', niveau, noegle: 'ln:' + a + '^' + k, p: { t, a, k }, spoerg: 'Skriv ' + math(ln(sup(mn(a), mn(k)))) + ' på en anden måde.', forklaring: 'Eksponenten kan flyttes ned foran: ' + math(ln(sup(mi('a'), mi('k'))) + mo('=') + mi('k') + mo('·') + ln(mi('a'))) + '.' };
      return opgave(o, rng, v(mn(k) + mo('·') + ln(mn(a)), 'kln'), [v(sup(par(ln(mn(a))), mn(k)), 'lnk', 'Opløftet logaritmen i stedet'), v(ln(mn(k * a)), 'lnka', 'Ganget inde i ln'), v(mn(a) + mo('·') + ln(mn(k)), 'byttet', 'Tal og eksponent byttet om')]);
    },

    // Find fejlen: tre linjer, én er forkert (typiske fejl fra hæftets ⚠-bokse)
    findFejlen(niveau, rng) {
      const a = heltal(rng, 2, 6), m = heltal(rng, 2, 5);
      let n = heltal(rng, 2, 5);
      const b = heltal(rng, 2, 9);
      if (m === 2 && n === 2) n = 3; // ellers er den «forkerte» linje x²·x² = x⁴ rigtig
      const x = mi('x');
      const regler = [
        { id: 'kvad', rigtig: sup(par(x + mo('+') + mn(a)), mn(2)) + mo('=') + sup(x, mn(2)) + mo('+') + mn(2 * a) + x + mo('+') + mn(a * a), forkert: sup(par(x + mo('+') + mn(a)), mn(2)) + mo('=') + sup(x, mn(2)) + mo('+') + mn(a * a), fejl: '(a + b)² er ikke a² + b²' },
        { id: 'minus', rigtig: mo('−') + par(x + mo('−') + mn(b)) + mo('=') + mo('−') + x + mo('+') + mn(b), forkert: mo('−') + par(x + mo('−') + mn(b)) + mo('=') + mo('−') + x + mo('−') + mn(b), fejl: 'Minus foran en parentes skifter fortegn på alle led' },
        { id: 'pot', rigtig: sup(x, mn(m)) + mo('·') + sup(x, mn(n)) + mo('=') + sup(x, mn(m + n)), forkert: sup(x, mn(m)) + mo('·') + sup(x, mn(n)) + mo('=') + sup(x, mn(m * n)), fejl: 'Eksponenterne skal lægges sammen' },
        { id: 'nul', rigtig: sup(mn(a + 5), mn(0)) + mo('=') + mn(1), forkert: sup(mn(a + 5), mn(0)) + mo('=') + mn(0), fejl: 'Alt (undtagen 0) i nulte er 1' },
        { id: 'ln', rigtig: mi('ln') + par(mn(1)) + mo('=') + mn(0), forkert: mi('ln') + par(mn(1)) + mo('=') + mn(1), fejl: 'ln 1 er 0' },
        { id: 'fork', rigtig: frac(mn(a) + x + mo('+') + mn(a * b), mn(a)) + mo('=') + x + mo('+') + mn(b), forkert: frac(mn(a) + x + mo('+') + mn(b), mn(a)) + mo('=') + x + mo('+') + mn(b), fejl: 'Man kan kun forkorte faktorer, ikke enkelte led' },
      ];
      const tre = bland(rng, regler).slice(0, 3);
      const fejlNr = heltal(rng, 0, 2);
      const linjer = tre.map((r, i) => '<div class="ff-linje"><b>' + (i + 1) + '.</b> ' + math(i === fejlNr ? r.forkert : r.rigtig) + '</div>');
      const linje = (i, f) => ({ vis: 'Linje ' + (i + 1), nøgle: 'l' + i, fejl: f });
      const o = {
        emne: 'regnetricks', type: 'findFejlen', niveau, noegle: 'ff:' + tre.map((r) => r.id).join(',') + ':' + fejlNr, p: { fejlNr, ids: tre.map((r) => r.id) },
        spoerg: 'Find fejlen. Hvilken linje er forkert?' + linjer.join(''),
        forklaring: 'Linje ' + (fejlNr + 1) + ' er forkert: ' + tre[fejlNr].fejl + '. Rigtigt: ' + math(tre[fejlNr].rigtig),
      };
      return opgave(o, rng, linje(fejlNr), [0, 1, 2].filter((i) => i !== fejlNr).map((i) => linje(i, 'Den linje er rigtig')), 3);
    },

    // ===== 6. Differentialregning =====
    afledt(niveau, rng) {
      const typer = niveau >= 2 ? ['potens', 'potens', 'eksp', 'ln'] : ['potens'];
      const t = vaelg(rng, typer);
      if (t === 'eksp') {
        const k = heltal(rng, 2, 5);
        const e = (kk, f) => ({ vis: math(mi("f′") + par(mi('x')) + mo('=') + (kk === 1 ? '' : mn(kk)) + sup(mi('e'), mn(k) + mi('x'))), nøgle: 'e:' + kk, fejl: f });
        const o = {
          emne: 'differential', type: 'afledt', niveau, noegle: 'afledt:e' + k, p: { t, k },
          spoerg: 'Find ' + math(mi("f′") + par(mi('x'))) + ' når ' + math(mi('f') + par(mi('x')) + mo('=') + sup(mi('e'), mn(k) + mi('x'))),
          forklaring: math(sup(par(sup(mi('e'), mi('k') + mi('x'))), mo('′')) + mo('=') + mi('k') + mo('·') + sup(mi('e'), mi('k') + mi('x'))),
        };
        return opgave(o, rng, e(k), [e(1, 'Glemt den indre afledte'), { vis: math(mi("f′") + par(mi('x')) + mo('=') + mn(k) + mi('x') + mo('·') + sup(mi('e'), monom(k - 1, 1))), nøgle: 'e:pot', fejl: 'Behandlet som en potens' }, { vis: math(mi("f′") + par(mi('x')) + mo('=') + frac(mn(1), mn(k)) + sup(mi('e'), mn(k) + mi('x'))), nøgle: 'e:1/k', fejl: 'Stamfunktion i stedet for afledt' }]);
      }
      if (t === 'ln') {
        const k = heltal(rng, 2, 6);
        const o = {
          emne: 'differential', type: 'afledt', niveau, noegle: 'afledt:ln' + k, p: { t, k },
          spoerg: 'Find ' + math(mi("f′") + par(mi('x'))) + ' når ' + math(mi('f') + par(mi('x')) + mo('=') + mn(k) + mo('·') + mi('ln') + par(mi('x'))),
          forklaring: math(sup(par(mi('ln') + par(mi('x'))), mo('′')) + mo('=') + frac(mn(1), mi('x'))) + ', så konstanten ' + k + ' bliver stående.',
        };
        const v = (udtryk, nøgle, f) => ({ vis: math(mi("f′") + par(mi('x')) + mo('=') + udtryk), nøgle, fejl: f });
        return opgave(o, rng, v(frac(mn(k), mi('x')), 'ln:k/x'), [v(frac(mn(1), mi('x')), 'ln:1/x', 'Konstanten forsvundet'), v(mn(k) + mi('x'), 'ln:kx', 'Forvekslet med x'), v(mn(k) + mo('·') + mi('ln') + par(mi('x')), 'ln:same', 'Ingen ændring')]);
      }
      const a = heltal(rng, 1, 6) * (niveau >= 2 && rng() < 0.3 ? -1 : 1);
      const n = heltal(rng, 2, niveau >= 2 ? 6 : 4);
      const fp = (ka, kn, f) => ({ vis: math(mi("f′") + par(mi('x')) + mo('=') + monom(ka, kn)), nøgle: 'p:' + ka + 'x^' + kn, fejl: f });
      const o = {
        emne: 'differential', type: 'afledt', niveau, noegle: 'afledt:' + a + 'x' + n, p: { t, a, n },
        spoerg: 'Find ' + math(mi("f′") + par(mi('x'))) + ' når ' + math(mi('f') + par(mi('x')) + mo('=') + monom(a, n)),
        forklaring: 'Eksponenten ganges ned, og den tælles én ned: ' + math(mn(a) + mo('·') + mn(n) + mo('·') + sup(mi('x'), mn(n - 1))),
      };
      return opgave(o, rng, fp(a * n, n - 1), [fp(a, n - 1, 'Glemt at gange eksponenten ned'), fp(a * n, n, 'Glemt at tælle eksponenten ned'), fp(a * (n + 1), n + 1, 'Talt eksponenten op i stedet for ned')]);
    },

    // Tangentens hældning: f(x) = x², f′(x₀)
    tangent(niveau, rng) {
      const a = heltal(rng, 1, 3), x0 = heltal(rng, -3, 4);
      const facit = 2 * a * x0;
      const o = {
        emne: 'differential', type: 'tangent', niveau, noegle: 'tangent:' + a + ':' + x0, p: { a, x0 },
        spoerg: 'Hvad er hældningen for tangenten til ' + math(mi('f') + par(mi('x')) + mo('=') + monom(a, 2)) + ' i punktet med ' + math(mi('x') + mo('=') + mn(x0)) + '?',
        forklaring: math(mi("f′") + par(mi('x')) + mo('=') + monom(2 * a, 1)) + ', så ' + math(mi("f′") + par(mn(x0)) + mo('=') + mn(facit)) + '.',
      };
      return opgave(o, rng, tal(facit), [tal(a * x0 * x0, 'Funktionsværdien i stedet for hældningen'), tal(a * x0, 'Glemt at gange med 2'), tal(facit + 2 * a)]);
    },

    // Tangentens ligning: f(x) = a·x² i x₀ → y = 2a·x₀·x − a·x₀²
    tangentLigning(niveau, rng) {
      const a = heltal(rng, 1, 3);
      let x0 = heltal(rng, -3, 3);
      if (x0 === 0) x0 = 1;
      const hk = 2 * a * x0, q = -a * x0 * x0;
      const lin = (mm, qq, f) => ({ vis: math(mi('y') + mo('=') + monom(mm, 1) + plusLed(qq)), nøgle: 'y:' + mm + ',' + qq, fejl: f });
      const o = {
        emne: 'differential', type: 'tangentLigning', niveau, noegle: 'tangentLign:' + a + ':' + x0, p: { a, x0 },
        spoerg: 'Find en ligning for tangenten til ' + math(mi('f') + par(mi('x')) + mo('=') + monom(a, 2)) + ' i punktet med ' + math(mi('x') + mo('=') + mn(x0)) + '.',
        forklaring: math(mi('y') + mo('=') + mi("f′") + par(mn(x0)) + par(mi('x') + plusLed(-x0)) + mo('+') + mi('f') + par(mn(x0)) + mo('=') + mn(hk) + par(mi('x') + plusLed(-x0)) + plusLed(a * x0 * x0)) + ', altså ' + math(mi('y') + mo('=') + monom(hk, 1) + plusLed(q)) + '.',
      };
      return opgave(o, rng, lin(hk, q), [lin(hk, a * x0 * x0, 'Glemt at gange x₀ ind i parentesen'), lin(a * x0 * x0, hk, 'Hældning og funktionsværdi byttet om'), lin(a * x0, q, 'Glemt at gange med 2 i f′')]);
    },

    // Monotoni: f′(x) = kx − m
    monotoni(niveau, rng) {
      const k = vaelg(rng, [1, 2, 3]);
      let r = heltal(rng, -4, 4);
      if (r === 0) r = 2;
      const m = k * r;
      const vis = (tekst, nøgle, f) => ({ vis: math(tekst), nøgle, fejl: f });
      const o = {
        emne: 'differential', type: 'monotoni', niveau, noegle: 'monotoni:' + k + ':' + r, p: { k, r },
        spoerg: 'Det oplyses, at ' + math(mi("f′") + par(mi('x')) + mo('=') + monom(k, 1) + plusLed(-m)) + '. Hvor er f voksende?',
        forklaring: math(mi("f′") + par(mi('x')) + mo('>') + mn(0)) + ' når ' + math(mi('x') + mo('>') + mn(r)) + '.',
      };
      return opgave(o, rng, vis(mi('x') + mo('>') + mn(r), 'gt:' + r), [vis(mi('x') + mo('<') + mn(r), 'lt:' + r, 'Ulighedstegnet vendt'), vis(mi('x') + mo('>') + mn(-r), 'gt:' + (-r), 'Fortegnsfejl'), vis(mi('x') + mo('>') + mn(m), 'gt:' + m, 'Glemt at dele med ' + k), vis(mi('x') + mo('<') + mn(-r), 'lt:' + (-r), 'Begge fejl')]);
    },

    // ===== 7. Integralregning =====
    stamfunktion(niveau, rng) {
      const n = heltal(rng, 1, niveau >= 2 ? 5 : 3);
      const a = (n + 1) * heltal(rng, 1, 3);
      const F = (ka, kn, f) => ({ vis: math(monom(ka, kn) + mo('+') + mi('k')), nøgle: 'F:' + ka + 'x^' + kn, fejl: f });
      const o = {
        emne: 'integral', type: 'stamfunktion', niveau, noegle: 'stam:' + a + 'x' + n, p: { a, n },
        spoerg: 'Find en stamfunktion: ' + math('<mo>∫</mo>' + monom(a, n) + '<mo>d</mo>' + mi('x')),
        forklaring: 'Eksponenten tælles op, og der deles med den nye eksponent: ' + math(frac(mn(a), mn(n + 1)) + sup(mi('x'), mn(n + 1)) + mo('=') + monom(a / (n + 1), n + 1)),
      };
      return opgave(o, rng, F(a / (n + 1), n + 1), [F(a, n + 1, 'Glemt at dele med den nye eksponent'), F(a * n, n - 1 || 0, 'Differentieret i stedet'), F(a * (n + 1), n + 1, 'Ganget i stedet for at dele')].filter((f) => f.nøgle !== 'F:' + (a / (n + 1)) + 'x^' + (n + 1)));
    },

    // Bestemt integral med heltalligt facit
    bestemt(niveau, rng) {
      const t = vaelg(rng, niveau >= 2 ? ['konst', 'lin', 'kvad'] : ['konst', 'lin']);
      const b = heltal(rng, 1, 4);
      let udtryk, facit, forkerte, forkl, c;
      if (t === 'konst') {
        c = heltal(rng, 2, 9);
        udtryk = mn(c); facit = c * b; forkl = 'Arealet af et rektangel: ' + c + ' · ' + b;
        forkerte = [tal(c, 'Glemt grænserne'), tal(c + b, 'Lagt sammen'), tal(c * b + c)];
      } else if (t === 'lin') {
        c = 2 * heltal(rng, 1, 3);
        udtryk = monom(c, 1); facit = (c / 2) * b * b; forkl = math(frac(mn(c), mn(2)) + sup(mi('x'), mn(2))) + ' fra 0 til ' + b;
        forkerte = [tal(c * b, 'Integranden i stedet for stamfunktionen'), tal(c * b * b, 'Glemt at dele med 2'), tal(facit + 1)];
      } else {
        c = 3 * heltal(rng, 1, 2);
        udtryk = monom(c, 2); facit = (c / 3) * b * b * b; forkl = math(frac(mn(c), mn(3)) + sup(mi('x'), mn(3))) + ' fra 0 til ' + b;
        forkerte = [tal(c * b * b, 'Integranden i stedet for stamfunktionen'), tal(c * b * b * b, 'Glemt at dele med 3'), tal(facit + 1)];
      }
      const o = {
        emne: 'integral', type: 'bestemt', niveau, noegle: 'bestemt:' + t + ':' + c + ':' + b, p: { t, b, c },
        spoerg: 'Udregn ' + math('<msubsup><mo>∫</mo><mn>0</mn>' + row(mn(b)) + '</msubsup>' + udtryk + '<mo>d</mo>' + mi('x')),
        forklaring: forkl + ' giver ' + facit + '.',
      };
      return opgave(o, rng, tal(facit), forkerte.filter((f) => f.nøgle !== 'n:' + facit));
    },

    // ===== 8. A-bonus =====
    prikprodukt(niveau, rng) {
      const a1 = heltal(rng, -4, 5), a2 = heltal(rng, -4, 5), b1 = heltal(rng, -4, 5), b2 = heltal(rng, -4, 5);
      const vektor = (x, y) => par('<mtable><mtr><mtd>' + mn(x) + '</mtd></mtr><mtr><mtd>' + mn(y) + '</mtd></mtr></mtable>');
      const facit = a1 * b1 + a2 * b2;
      const o = {
        emne: 'abonus', type: 'prikprodukt', niveau, noegle: 'prik:' + [a1, a2, b1, b2].join(','), p: { a1, a2, b1, b2 },
        spoerg: 'Udregn prikproduktet ' + math(vektor(a1, a2) + mo('·') + vektor(b1, b2)),
        forklaring: math(led(a1) + mo('·') + led(b1) + mo('+') + led(a2) + mo('·') + led(b2) + mo('=') + mn(facit)),
      };
      const kryds = a1 * b2 + a2 * b1;
      return opgave(o, rng, tal(facit), naboer(rng, facit, [kryds, a1 * b1 - a2 * b2, a1 * b2 - a2 * b1]).slice(0, 3).map((v) => tal(v, v === kryds ? 'Ganget på kryds i stedet for parvis' : null)));
    },

    ortogonal(niveau, rng) {
      const a1 = heltal(rng, -4, 4) || 2, a2 = heltal(rng, -4, 4) || 3;
      const ortho = rng() < 0.5;
      const k = vaelg(rng, [1, 2, -1]);
      const b1 = ortho ? -a2 * k : heltal(rng, -4, 4), b2 = ortho ? a1 * k : heltal(rng, -4, 4);
      const prik = a1 * b1 + a2 * b2;
      const vektor = (x, y) => par('<mtable><mtr><mtd>' + mn(x) + '</mtd></mtr><mtr><mtd>' + mn(y) + '</mtd></mtr></mtable>');
      const o = {
        emne: 'abonus', type: 'ortogonal', niveau, noegle: 'ortho:' + [a1, a2, b1, b2].join(','), p: { a1, a2, b1, b2 },
        spoerg: 'Er ' + math(vektor(a1, a2)) + ' og ' + math(vektor(b1, b2)) + ' ortogonale?',
        forklaring: 'Prikproduktet er ' + prik + (prik === 0 ? ', så ja.' : ', ikke 0, så nej.'),
      };
      return opgave(o, rng, prik === 0 ? ja : nej, [prik === 0 ? nej : ja], 2);
    },

    cirkel(niveau, rng) {
      const a = heltal(rng, -5, 5), b = heltal(rng, -5, 5), r = heltal(rng, 2, 6);
      const led2 = (v, x) => (v === 0 ? sup(mi(x), mn(2)) : sup(par(mi(x) + plusLed(-v)), mn(2)));
      const svar = (ca, cb, rr, f) => ({ vis: 'centrum ' + math(par(mn(ca) + mo(',') + mn(cb))) + ', radius ' + math(mn(rr)), nøgle: 'c:' + ca + ',' + cb + ',' + rr, fejl: f });
      const o = {
        emne: 'abonus', type: 'cirkel', niveau, noegle: 'cirkel:' + [a, b, r].join(','), p: { a, b, r },
        spoerg: 'Find centrum og radius: ' + math(led2(a, 'x') + mo('+') + led2(b, 'y') + mo('=') + mn(r * r)),
        forklaring: math(sup(par(mi('x') + mo('−') + mi('a')), mn(2)) + mo('+') + sup(par(mi('y') + mo('−') + mi('b')), mn(2)) + mo('=') + sup(mi('r'), mn(2))) + ' har centrum (a, b) og radius r.',
      };
      return opgave(o, rng, svar(a, b, r), [svar(-a, -b, r, 'Fortegnsfejl i centrum'), svar(a, b, r * r, 'r² læst som radius'), svar(-a, -b, r * r, 'Begge fejl'), svar(b, a, r, 'x og y byttet om'), svar(a, b, r + 1, null)].filter((x) => x.nøgle !== 'c:' + a + ',' + b + ',' + r));
    },

    // ---------- Nye typer fra VOKSEN-ANALYSE.md (04-10-2026) ----------
    // Fordoblings- og halveringskonstant (funktioner og modeller)
    fordobling(niveau, rng) {
      const t = niveau >= 3 ? vaelg(rng, ['T', 'gange', 'halv']) : vaelg(rng, ['T', 'gange']);
      if (t === 'T') {
        const T = vaelg(rng, [2, 3, 4, 5, 6, 8, 10]), b = vaelg(rng, [3, 5, 7, 12, 20, 50].filter((x) => x !== T));
        const o = {
          emne: 'funktioner', type: 'fordobling', niveau, noegle: 'fordobT:' + T + ',' + b, p: { t, T, b },
          spoerg: math(mi('f') + par(mi('x')) + mo('=') + mn(b) + mo('·') + sup(mn(2), frac(mi('x'), mn(T)))) + '. Hvad er fordoblingskonstanten?',
          forklaring: 'Når x vokser med ' + T + ', vokser eksponenten med 1, så f ganges med 2. Fordoblingskonstanten er ' + T + '.',
        };
        return opgave(o, rng, tal(T), [tal(b, 'Startværdien læst som fordoblingskonstant'), tal(2, 'Grundtallet læst som fordoblingskonstant'), tal(2 * T, 'Ganget med 2')]);
      }
      const k = heltal(rng, 3, 5), T = vaelg(rng, [2, 3, 4, 5, 6]);
      if (t === 'gange') {
        const o = {
          emne: 'funktioner', type: 'fordobling', niveau, noegle: 'fordobG:' + k + ',' + T, p: { t, k, T },
          spoerg: 'En bakteriekultur fordobles hver ' + T + '. time. Hvor mange gange større er den efter ' + (k * T) + ' timer?',
          forklaring: (k * T) + ' timer er ' + k + ' fordoblinger: ' + math(sup(mn(2), mn(k)) + mo('=') + mn(Math.pow(2, k))) + '.',
        };
        return opgave(o, rng, tal(Math.pow(2, k)), [tal(2 * k, 'Ganget 2 med antallet af fordoblinger'), tal(k * T, 'Brugt antal timer'), tal(Math.pow(2, k - 1), 'Talt en fordobling for lidt')]);
      }
      const brk = (n, f) => ({ vis: math(frac(mn(1), mn(n))), nøgle: 'b:1/' + n, fejl: f });
      const o = {
        emne: 'funktioner', type: 'fordobling', niveau, noegle: 'fordobH:' + k + ',' + T, p: { t, k, T },
        spoerg: 'Et stof har halveringskonstanten ' + T + ' døgn. Hvor stor en del er tilbage efter ' + (k * T) + ' døgn?',
        forklaring: (k * T) + ' døgn er ' + k + ' halveringer: ' + math(sup(par(frac(mn(1), mn(2))), mn(k)) + mo('=') + frac(mn(1), mn(Math.pow(2, k)))) + '.',
      };
      return opgave(o, rng, brk(Math.pow(2, k)), [brk(2 * k, 'Ganget 2 med antallet af halveringer'), brk(k * T, 'Brugt antal døgn'), brk(Math.pow(2, k - 1), 'Talt en halvering for lidt'), brk(k, 'Brugt antallet af halveringer som nævner'), brk(Math.pow(2, k + 1), 'Talt en halvering for meget')]);
    },

    // Omvendt opgave: lav andengradsligningen ud fra rødderne
    omvendtAndengrad(niveau, rng) {
      let p, q;
      do { p = heltal(rng, -6, 6); q = heltal(rng, -6, 6); } while (p === q || p === 0 || q === 0 || p === -q);
      const lign = (b, c, f) => ({ vis: math(sup(mi('x'), mn(2)) + plusMonom(b, 1) + plusLed(c) + mo('=') + mn(0)), nøgle: 'poly:' + b + ',' + c, fejl: f });
      const s = p + q, pr = p * q;
      const o = {
        emne: 'ligninger', type: 'omvendtAndengrad', niveau, noegle: 'omvendt:' + Math.min(p, q) + ',' + Math.max(p, q), p: { p, q },
        spoerg: 'Hvilken ligning har løsningerne ' + math(mi('x') + mo('=') + mn(Math.min(p, q))) + ' og ' + math(mi('x') + mo('=') + mn(Math.max(p, q))) + '?',
        forklaring: math(par(mi('x') + plusLed(-p)) + par(mi('x') + plusLed(-q)) + mo('=') + mn(0)) + ' — gang ud: ' + math(sup(mi('x'), mn(2)) + plusMonom(-s, 1) + plusLed(pr) + mo('=') + mn(0)) + '.',
      };
      return opgave(o, rng, lign(-s, pr), [lign(s, pr, 'Fortegnsfejl: brugt (x + rod)'), lign(-s, -pr, 'Fortegnsfejl i konstantleddet'), lign(-pr, s, 'Sum og produkt byttet om')]);
    },

    // Intervalnotation (dansk: ]a; b] er åben i a og lukket i b)
    interval(niveau, rng) {
      const a = heltal(rng, -6, 3), b = a + heltal(rng, 2, 7);
      const uendelig = niveau >= 2 && rng() < 0.35;
      const vl = rng() < 0.5, hl = uendelig ? false : rng() < 0.5;
      const iv = (l, h, f) => ({
        vis: math(mo(l ? '[' : ']') + mn(a) + mo(';') + (uendelig ? mi('∞') : mn(b)) + mo(h ? ']' : '[')),
        nøgle: 'iv:' + (l ? '[' : ']') + a + ';' + (uendelig ? '∞' : b) + (h ? ']' : '['), fejl: f,
      });
      const ulighed = uendelig ? mi('x') + mo(vl ? '≥' : '>') + mn(a) : mn(a) + mo(vl ? '≤' : '<') + mi('x') + mo(hl ? '≤' : '<') + mn(b);
      const o = {
        emne: 'funktioner', type: 'interval', niveau, noegle: 'interval:' + [a, uendelig ? 'u' : b, vl ? 1 : 0, hl ? 1 : 0].join(','), p: { a, b, vl, hl, uendelig },
        spoerg: 'Hvilket interval svarer til ' + math(ulighed) + '?',
        forklaring: '«≤» og «≥» giver en lukket ende (klammen vender ind mod tallet), «<» og «>» en åben ende (klammen vender væk).' + (uendelig ? ' Ved ∞ er enden altid åben.' : ''),
      };
      const forkerte = uendelig
        ? [iv(!vl, false, 'Åben og lukket byttet om'), iv(vl, true, 'Lukket ved ∞'), iv(!vl, true, 'Begge ender forkert')]
        : [iv(!vl, hl, 'Venstre ende forkert'), iv(vl, !hl, 'Højre ende forkert'), iv(!vl, !hl, 'Åben og lukket byttet om')];
      return opgave(o, rng, iv(vl, hl), forkerte);
    },

    // Determinant af to vektorer i planen
    determinant(niveau, rng) {
      let a1, a2, b1, b2;
      do { a1 = heltal(rng, -4, 5); a2 = heltal(rng, -4, 5); b1 = heltal(rng, -4, 5); b2 = heltal(rng, -4, 5); } while (a1 * b2 + a2 * b1 === a1 * b2 - a2 * b1);
      const vektor = (x, y) => par('<mtable><mtr><mtd>' + mn(x) + '</mtd></mtr><mtr><mtd>' + mn(y) + '</mtd></mtr></mtable>');
      const facit = a1 * b2 - a2 * b1;
      const plus = a1 * b2 + a2 * b1, prik = a1 * b1 + a2 * b2, omvendt = a2 * b1 - a1 * b2;
      const o = {
        emne: 'abonus', type: 'determinant', niveau, noegle: 'det:' + [a1, a2, b1, b2].join(','), p: { a1, a2, b1, b2 },
        spoerg: 'Udregn determinanten ' + math(mi('det') + par(vektor(a1, a2) + mo(',') + vektor(b1, b2))),
        forklaring: math(led(a1) + mo('·') + led(b2) + mo('−') + led(a2) + mo('·') + led(b1) + mo('=') + mn(facit)) + ' (på kryds, minus).',
      };
      const fejlTekst = (v) => (v === plus ? 'Plus i stedet for minus' : v === prik ? 'Prikproduktet i stedet for determinanten' : v === omvendt ? 'Rækkefølgen byttet om' : null);
      return opgave(o, rng, tal(facit), naboer(rng, facit, [plus, prik, omvendt]).slice(0, 3).map((v) => tal(v, fejlTekst(v))));
    },

    // Er to vektorer parallelle? (determinanten er 0)
    parallel(niveau, rng) {
      let a1, a2, b1, b2;
      do { a1 = heltal(rng, -4, 5); a2 = heltal(rng, -4, 5); } while (a1 === 0 && a2 === 0);
      if (rng() < 0.5) {
        const k = vaelg(rng, [-3, -2, 2, 3]);
        b1 = (k * a1) || 0; b2 = (k * a2) || 0; // «|| 0»: ingen −0 (bliver 0 i JSON)
      } else {
        do { b1 = heltal(rng, -6, 6); b2 = heltal(rng, -6, 6); } while (a1 * b2 - a2 * b1 === 0);
      }
      const vektor = (x, y) => par('<mtable><mtr><mtd>' + mn(x) + '</mtd></mtr><mtr><mtd>' + mn(y) + '</mtd></mtr></mtable>');
      const det = a1 * b2 - a2 * b1;
      const o = {
        emne: 'abonus', type: 'parallel', niveau, noegle: 'parallel:' + [a1, a2, b1, b2].join(','), p: { a1, a2, b1, b2 },
        spoerg: 'Er ' + math(vektor(a1, a2)) + ' og ' + math(vektor(b1, b2)) + ' parallelle?',
        forklaring: 'Determinanten er ' + math(led(a1) + mo('·') + led(b2) + mo('−') + led(a2) + mo('·') + led(b1) + mo('=') + mn(det)) + (det === 0 ? ', så ja.' : ', ikke 0, så nej.'),
      };
      return opgave(o, rng, det === 0 ? ja : nej, [det === 0 ? nej : ja], 2);
    },

    // Er f en løsning til differentialligningen y′ = m·y?
    difflign(niveau, rng) {
      const c = vaelg(rng, [2, 3, 4, 5, 7]);
      const k = vaelg(rng, [-3, -2, -1, 2, 3, 4]);
      const m = rng() < 0.5 ? k : vaelg(rng, [-k, k + 1, c].filter((x) => x !== k && x !== 0));
      const o = {
        emne: 'abonus', type: 'difflign', niveau, noegle: 'difflign:' + [c, k, m].join(','), p: { c, k, m },
        spoerg: 'Er ' + math(mi('f') + par(mi('x')) + mo('=') + mn(c) + sup(mi('e'), monom(k, 1))) + ' en løsning til ' + math(mi("y′") + mo('=') + monom(m, 1, 'y')) + '?',
        forklaring: math(mi("f′") + par(mi('x')) + mo('=') + mn(c * k) + sup(mi('e'), monom(k, 1)) + mo('=') + mn(k) + mo('·') + mi('f') + par(mi('x'))) + (k === m ? ' — ja.' : ' — det er ikke ' + math(monom(m, 1, 'f') + par(mi('x'))) + ', så nej.'),
      };
      return opgave(o, rng, k === m ? ja : nej, [k === m ? nej : ja], 2);
    },

    // Isolér ved at bygge med brikker (tryk-tryk i stedet for at trække). Har også svarknapper (bruges i duellen).
    isolerBrik(niveau, rng) {
      const formler = [
        { navn: 'Ohms lov', f: math(mi('U') + mo('=') + mi('R') + mo('·') + mi('I')), x: 'I', svar: [['U', '÷', 'R']], fejl: [[['R', '÷', 'U'], 'Brøken vendt om'], [['U', '·', 'R'], 'Ganget i stedet for at dele']], ekstra: ['·', '−'] },
        { navn: 'Ohms lov', f: math(mi('U') + mo('=') + mi('R') + mo('·') + mi('I')), x: 'R', svar: [['U', '÷', 'I']], fejl: [[['I', '÷', 'U'], 'Brøken vendt om'], [['U', '·', 'I'], 'Ganget i stedet for at dele']], ekstra: ['·', '+'] },
        { navn: 'Effekt', f: math(mi('P') + mo('=') + mi('U') + mo('·') + mi('I')), x: 'U', svar: [['P', '÷', 'I']], fejl: [[['I', '÷', 'P'], 'Brøken vendt om'], [['P', '·', 'I'], 'Ganget i stedet for at dele']], ekstra: ['·', '−'] },
        { navn: 'Fart', f: math(mi('v') + mo('=') + frac(mi('s'), mi('t'))), x: 's', svar: [['v', '·', 't'], ['t', '·', 'v']], fejl: [[['v', '÷', 't'], 'Delt i stedet for at gange'], [['t', '÷', 'v'], 'Delt i stedet for at gange']], ekstra: ['÷', '+'] },
        { navn: 'Fart', f: math(mi('v') + mo('=') + frac(mi('s'), mi('t'))), x: 't', svar: [['s', '÷', 'v']], fejl: [[['v', '÷', 's'], 'Brøken vendt om'], [['s', '·', 'v'], 'Ganget i stedet for at dele']], ekstra: ['·', '−'] },
        { navn: 'Massefylde', f: math(mi('ρ') + mo('=') + frac(mi('m'), mi('V'))), x: 'm', svar: [['ρ', '·', 'V'], ['V', '·', 'ρ']], fejl: [[['ρ', '÷', 'V'], 'Delt i stedet for at gange'], [['V', '÷', 'ρ'], 'Delt i stedet for at gange']], ekstra: ['÷', '+'] },
        { navn: 'Lineær funktion', f: math(mi('y') + mo('=') + mi('a') + mi('x') + mo('+') + mi('b')), x: 'x', svar: [['(', 'y', '−', 'b', ')', '÷', 'a']], fejl: [[['y', '÷', 'a', '−', 'b'], 'Delt før der blev trukket fra'], [['(', 'y', '+', 'b', ')', '÷', 'a'], 'Fortegnsfejl'], [['y', '−', 'b', '÷', 'a'], 'Glemt parentesen: kun b bliver delt med a']], ekstra: ['+', '·'] },
        { navn: 'Trekantens areal', f: math(mi('A') + mo('=') + frac(mn(1), mn(2)) + mo('·') + mi('g') + mo('·') + mi('h')), x: 'h', svar: [['2', '·', 'A', '÷', 'g'], ['(', '2', '·', 'A', ')', '÷', 'g']], fejl: [[['A', '÷', 'g'], 'Glemt ½'], [['A', '÷', '(', '2', '·', 'g', ')'], 'Halvdelen havnet forkert']], ekstra: ['(', ')'] },
      ];
      const nr = heltal(rng, 0, niveau >= 3 ? formler.length - 1 : 5);
      const F = formler[nr];
      const id = ['ohm-I', 'ohm-R', 'effekt-U', 'fart-s', 'fart-t', 'rho-m', 'lin-x', 'trekant-h'][nr];
      // Brikkerne: dem i det rigtige svar + et par forkerte regnetegn, blandet
      const brikker = bland(rng, F.svar[0].concat(F.ekstra));
      // Svarknapperne (til duellen): det rigtige udtryk og de typiske fejl, skrevet som MathML
      const tilMath = (seq) => seq.map((t) => (/^[A-Za-zρ]$/.test(t) ? mi(t) : /^\d$/.test(t) ? mn(Number(t)) : mo(t === '÷' ? '÷' : t))).join('');
      const vis = (seq) => math(mi(F.x) + mo('=') + tilMath(seq));
      const o = {
        emne: 'ligninger', type: 'isolerBrik', niveau, noegle: 'isoler:' + id, p: { nr },
        spoerg: F.navn + ': ' + F.f + '. Isolér ' + math(mi(F.x)) + '.',
        forklaring: 'Gør det samme på begge sider, til ' + F.x + ' står alene: ' + vis(F.svar[0]),
        brikker: { x: F.x, brikker: brikker, svar: F.svar, fejl: F.fejl.map((f) => ({ seq: f[0], fejl: f[1] })) },
      };
      return opgave(o, rng, { vis: vis(F.svar[0]), nøgle: 'f:rigtig' }, F.fejl.slice(0, 3).map((f, i) => ({ vis: vis(f[0]), nøgle: 'f:' + i, fejl: f[1] })));
    },

    // ---------- Tekstopgaver med hverdagskontekster (VOKSEN-ANALYSE.md) ----------
    // Ohms lov og effekt: U = R·I og P = U·I
    ohm(niveau, rng) {
      const t = niveau >= 3 ? vaelg(rng, ['I', 'U', 'P']) : vaelg(rng, ['I', 'U']);
      const R = vaelg(rng, [2, 3, 4, 5, 6, 10, 12, 20]), I = heltal(rng, 2, 6), U = R * I;
      // Unikke, positive heltal ≠ facit — de første tre bliver svarmuligheder
      const unikke = (facit, liste) => {
        const ud = [];
        for (const [v, f] of liste) if (Number.isInteger(v) && v > 0 && v !== facit && !ud.some((x) => x[0] === v)) ud.push([v, f]);
        return ud.slice(0, 3).map(([v, f]) => tal(v, f));
      };
      if (t === 'I') {
        const o = {
          emne: 'ligninger', type: 'ohm', niveau, noegle: 'ohmI:' + R + ',' + U, p: { t, U, R },
          spoerg: 'En modstand på ' + R + ' Ω får spændingen ' + U + ' V. Hvor stor er strømmen i ampere? ' + math(mi('U') + mo('=') + mi('R') + mo('·') + mi('I')),
          forklaring: math(mi('I') + mo('=') + frac(mi('U'), mi('R')) + mo('=') + frac(mn(U), mn(R)) + mo('=') + mn(I)) + ' A.',
        };
        const vendt = { vis: math(frac(mn(1), mn(I))), nøgle: 'b:1/' + I, fejl: 'Brøken vendt om (R/U)' };
        return opgave(o, rng, tal(I), [vendt].concat(unikke(I, [[U * R, 'Ganget i stedet for at dele'], [U - R, 'Trukket fra i stedet for at dele'], [U + R, 'Lagt sammen']]).slice(0, 2)));
      }
      if (t === 'U') {
        const o = {
          emne: 'ligninger', type: 'ohm', niveau, noegle: 'ohmU:' + R + ',' + I, p: { t, R, I },
          spoerg: 'Strømmen gennem en modstand på ' + R + ' Ω er ' + I + ' A. Hvor stor er spændingen i volt? ' + math(mi('U') + mo('=') + mi('R') + mo('·') + mi('I')),
          forklaring: math(mi('U') + mo('=') + mn(R) + mo('·') + mn(I) + mo('=') + mn(U)) + ' V.',
        };
        return opgave(o, rng, tal(U), unikke(U, [[R + I, 'Lagt sammen i stedet for at gange'], [R / I, 'Delt i stedet for at gange'], [I / R, 'Delt i stedet for at gange'], [R * (I + 1), null], [U + 10, null]]));
      }
      const Us = vaelg(rng, [6, 12, 24, 230]), Is = Us === 230 ? vaelg(rng, [2, 4, 10]) : heltal(rng, 2, 5), P = Us * Is;
      const o = {
        emne: 'ligninger', type: 'ohm', niveau, noegle: 'ohmP:' + Us + ',' + Is, p: { t, U: Us, I: Is },
        spoerg: 'Et apparat bruger ' + Is + ' A ved ' + Us + ' V. Hvor stor er effekten i watt? ' + math(mi('P') + mo('=') + mi('U') + mo('·') + mi('I')),
        forklaring: math(mi('P') + mo('=') + mn(Us) + mo('·') + mn(Is) + mo('=') + mn(P)) + ' W.',
      };
      return opgave(o, rng, tal(P), unikke(P, [[Us + Is, 'Lagt sammen i stedet for at gange'], [Us / Is, 'Delt i stedet for at gange'], [P * 10, 'Et nul for meget'], [P / 10, 'Et nul for lidt'], [P + Us, null]]));
    },

    // Rente: et beløb vokser med r % om året i to år (rentes rente)
    rente(niveau, rng) {
      const [K, r] = vaelg(rng, [[1000, 10], [2000, 10], [5000, 10], [1000, 20], [2000, 20], [2000, 5], [4000, 5], [10000, 5], [5000, 2], [10000, 2]]);
      const aar1 = K * (100 + r) / 100, aar2 = K * (100 + r) * (100 + r) / 10000, simpel = K + 2 * K * r / 100, aar3 = K * Math.pow(100 + r, 3) / 1000000;
      const o = {
        emne: 'funktioner', type: 'rente', niveau, noegle: 'rente:' + K + ',' + r, p: { K, r },
        spoerg: 'Du sætter ' + K + ' kr. ind til ' + r + ' % i rente om året. Hvor meget står der efter 2 år (rentes rente)?',
        forklaring: math(mn(K) + mo('·') + sup(mn(String(1 + r / 100).replace('.', ',')), mn(2)) + mo('=') + mn(aar2)) + ' kr. Renten det andet år regnes også af renten fra det første år.',
      };
      return opgave(o, rng, tal(aar2), [tal(simpel, 'Simpel rente: renten af startbeløbet to gange'), tal(aar1, 'Kun ét år'), Number.isInteger(aar3) ? tal(aar3, 'Tre år') : tal(aar2 + 10)]);
    },

    // Lineær model: startgebyr + pris pr. km
    linModel(niveau, rng) {
      const a = vaelg(rng, [30, 40, 50, 60]), b = vaelg(rng, [8, 10, 12, 15]), x = heltal(rng, 3, 12);
      const T = a + b * x;
      if (niveau >= 2 && rng() < 0.5) {
        const o = {
          emne: 'funktioner', type: 'linModel', niveau, noegle: 'linKm:' + [a, b, x].join(','), p: { t: 'km', a, b, x },
          spoerg: 'En taxa koster ' + a + ' kr. i startgebyr og ' + b + ' kr. pr. km. En tur kostede ' + T + ' kr. Hvor mange km var turen?',
          forklaring: math(mn(a) + mo('+') + mn(b) + mo('·') + mi('x') + mo('=') + mn(T)) + ' giver ' + math(mi('x') + mo('=') + frac(mn(T) + mo('−') + mn(a), mn(b)) + mo('=') + mn(x)) + ' km.',
        };
        const forkerte = [];
        if (Number.isInteger(T / b)) forkerte.push(tal(T / b, 'Glemt startgebyret'));
        if (Number.isInteger((T + a) / b)) forkerte.push(tal((T + a) / b, 'Lagt startgebyret til i stedet for at trække fra'));
        return opgave(o, rng, tal(x), forkerte.concat([tal(x + 1), tal(x - 1)]));
      }
      const o = {
        emne: 'funktioner', type: 'linModel', niveau, noegle: 'linPris:' + [a, b, x].join(','), p: { t: 'pris', a, b, x },
        spoerg: 'En taxa koster ' + a + ' kr. i startgebyr og ' + b + ' kr. pr. km. Hvad koster en tur på ' + x + ' km?',
        forklaring: math(mi('f') + par(mi('x')) + mo('=') + mn(b) + mi('x') + mo('+') + mn(a)) + ', så ' + math(mi('f') + par(mn(x)) + mo('=') + mn(b) + mo('·') + mn(x) + mo('+') + mn(a) + mo('=') + mn(T)) + ' kr.',
      };
      return opgave(o, rng, tal(T), [tal(b * x, 'Glemt startgebyret'), tal((a + b) * x, 'Startgebyret ganget med antal km'), tal(a * x + b, 'Startgebyr og km-pris byttet om')]);
    },
  };

  // ---------- Verdener for den voksne (bogens rækkefølge) ----------
  // =====================================================================
  //  «📘 Lær» (B7): nye generatorer i bogens rækkefølge (docs/VOKSEN-LAER.md, markeret NY).
  //  Samme mønster som V: (niveau, rng) → opgave(o, rng, rigtig, forkerte). Facit regnes her af koden og
  //  uafhængigt i test/test-voksen.js. Nøgler: «n:» heltal, «b:t/n» brøk (kan tastes), ellers egne nøgler.
  // =====================================================================
  const mroot = (radikand, indeks) => '<mroot>' + row(radikand) + row(mn(indeks)) + '</mroot>';
  const vektor = (x, y) => par('<mtable><mtr><mtd>' + mn(x) + '</mtd></mtr><mtr><mtd>' + mn(y) + '</mtd></mtr></mtable>');
  // Brøk som svarmulighed: forkortet; heltal får «n:», så de kan sammenlignes med tal()
  function brNoegle(t, n) {
    if (n < 0) { t = -t; n = -n; }
    const g = gcd(Math.abs(t), Math.abs(n)) || 1;
    t /= g; n /= g;
    return n === 1 ? 'n:' + t : 'b:' + t + '/' + n;
  }
  const bv = (t, n, fejl) => ({ vis: math(broek(t, n)), nøgle: brNoegle(t, n), fejl: fejl });
  const udv = (ml, nøgle, fejl) => ({ vis: math(ml), nøgle: nøgle, fejl: fejl });
  // Polynomium ud fra koefficienter (højeste grad først): [3, −2, 1] → 3x² − 2x + 1
  function poly(cs, x) {
    let ud = '';
    cs.forEach((c, i) => {
      const n = cs.length - 1 - i;
      if (c === 0) return;
      ud += ud ? plusMonom(c, n, x) : monom(c, n, x);
    });
    return ud || mn(0);
  }
  const polyN = (cs) => 'poly:' + cs.join(',');
  const lign = (venstre, hoejre) => venstre + mo('=') + hoejre;
  const loesning = (l, f) => {
    const s = l.slice().sort((u, v) => u - v);
    return { vis: math(s.map((r) => mi('x') + mo('=') + mn(r)).join(mo('∨'))), nøgle: 'l:' + s.join(','), fejl: f };
  };
  const dec = (v) => String(v).replace('.', ','); // decimaltal med komma
  // Rationalt tal som MathML (t/n forkortet; heltal uden brøkstreg)
  const rat = (t, n) => broek(t, n);
  const frStr = (t, n) => { const k = brNoegle(t, n); return k.slice(2); };
  // «a·x» med rationalt a (a = t/n): koefficient foran x
  function ratMonom(t, n, x) {
    const g = gcd(Math.abs(t), Math.abs(n)) || 1;
    t /= g; n /= g;
    if (n < 0) { t = -t; n = -n; }
    if (n === 1) return monom(t, 1, x);
    return (t < 0 ? mo('−') : '') + frac(mn(Math.abs(t)), mn(n)) + mi(x || 'x');
  }
  function plusRat(t, n) {
    if (t === 0) return '';
    const neg = (t < 0) !== (n < 0);
    return (neg ? mo('−') : mo('+')) + broek(Math.abs(t), Math.abs(n));
  }

  const L = {
    // ===== I.1 Regningsarternes hierarki =====
    regneord(niveau, rng) {
      const q = heltal(rng, 2, 9), p = q * heltal(rng, 2, 9);
      const arter = [
        { navn: 'summen', v: p + q, fejl: 'Forvekslet med summen (plus)' },
        { navn: 'differensen', v: p - q, fejl: 'Forvekslet med differensen (minus)' },
        { navn: 'produktet', v: p * q, fejl: 'Forvekslet med produktet (gange)' },
        { navn: 'kvotienten', v: p / q, fejl: 'Forvekslet med kvotienten (dele)' },
      ];
      const nr = heltal(rng, 0, 3);
      const A = arter[nr];
      const o = {
        emne: 'regnetricks', type: 'regneord', niveau, noegle: 'regneord:' + nr + ':' + p + ',' + q, p: { nr, p, q },
        spoerg: 'Hvad er ' + A.navn + ' af ' + math(mn(p)) + ' og ' + math(mn(q)) + '?',
        forklaring: 'Sum = plus, differens = minus, produkt = gange, kvotient = dele. Her: ' + math(mn(A.v)) + '.',
      };
      return opgave(o, rng, tal(A.v), arter.filter((x, i) => i !== nr && x.v !== A.v).map((x) => tal(x.v, x.fejl)));
    },
    reducer(niveau, rng) {
      const x = vaelg(rng, ['x', 'y', 'a']);
      const a = heltal(rng, 2, 6) * (niveau >= 3 && rng() < 0.5 ? -1 : 1);
      const b = heltal(rng, 2, 4), c = heltal(rng, 2, 4);
      const d = heltal(rng, 1, 5) * (niveau >= 3 && rng() < 0.3 ? -1 : 1);
      const facit = a + b * c - d;
      const u = (k, f) => udv(k === 0 ? mn(0) : monom(k, 1, x), 'u:' + k, f);
      const o = {
        emne: 'regnetricks', type: 'reducer', niveau, noegle: 'reducer:' + [a, b, c, d].join(',') + x, p: { a, b, c, d },
        spoerg: 'Reducér ' + math(monom(a, 1, x) + mo('+') + mn(b) + mo('·') + mn(c) + mi(x) + (d < 0 ? mo('+') : mo('−')) + monom(Math.abs(d), 1, x)),
        forklaring: 'Gange før plus og minus: ' + math(mn(b) + mo('·') + mn(c) + mi(x) + mo('=') + mn(b * c) + mi(x)) + ', så ' + math(par(mn(a) + mo('+') + mn(b * c) + plusLed(-d)) + mi(x) + mo('=') + (facit === 0 ? mn(0) : monom(facit, 1, x))),
      };
      return opgave(o, rng, u(facit), [u((a + b) * c - d, 'Regnet fra venstre mod højre'), u(a + b + c - d, 'Det underforståede gangetegn overset'), u(a + b * c + d, 'Fortegnet på sidste led'), u(facit + 1), u(facit - 1)]);
    },

    // ===== I.2 Parenteser =====
    parentes(niveau, rng) {
      const x = mi('x');
      const ikke0 = () => { let v; do { v = heltal(rng, -6, 6); } while (v === 0); return v; };
      if (niveau === 1) {
        const k = heltal(rng, 2, 6), a = heltal(rng, 1, 6), b = heltal(rng, 2, 6);
        if (rng() < 0.5) {
          const o = { emne: 'regnetricks', type: 'parentes', niveau, noegle: 'parentes:k' + k + ',' + a, p: { v: 'k', k, a },
            spoerg: 'Gang ud: ' + math(mn(k) + par(x + mo('−') + mn(a))),
            forklaring: 'Hvert led ganges med ' + k + ': ' + math(mn(k) + x + mo('−') + mn(k * a)) };
          return opgave(o, rng, udv(poly([k, -k * a]), polyN([k, -k * a])), [udv(poly([k, -a]), polyN([k, -a]), 'Kun første led ganget'), udv(poly([k, k * a]), polyN([k, k * a]), 'Fortegnsfejl'), udv(poly([1, -k * a]), polyN([1, -k * a]), 'Kun andet led ganget')]);
        }
        const o = { emne: 'regnetricks', type: 'parentes', niveau, noegle: 'parentes:m' + a + ',' + b, p: { v: 'm', a: b, b: a },
          spoerg: 'Hæv parentesen: ' + math(mo('−') + par(monom(b, 1) + mo('−') + mn(a))),
          forklaring: 'Minus foran en parentes skifter fortegn på hvert led: ' + math(poly([-b, a])) };
        return opgave(o, rng, udv(poly([-b, a]), polyN([-b, a])), [udv(poly([-b, -a]), polyN([-b, -a]), 'Kun første fortegn skiftet'), udv(poly([b, -a]), polyN([b, -a]), 'Minus glemt'), udv(poly([b, a]), polyN([b, a]), 'Kun andet fortegn skiftet')]);
      }
      if (niveau === 2) {
        const a = ikke0(), b = ikke0();
        const o = { emne: 'regnetricks', type: 'parentes', niveau, noegle: 'parentes:2:' + a + ',' + b, p: { v: '2', a, b },
          spoerg: 'Gang ud: ' + math(par(x + plusLed(a)) + par(x + plusLed(b))),
          forklaring: 'Hvert led med hvert led: ' + math(sup(x, mn(2)) + plusMonom(b, 1) + plusMonom(a, 1) + plusLed(a * b) + mo('=') + poly([1, a + b, a * b])) };
        return opgave(o, rng, udv(poly([1, a + b, a * b]), polyN([1, a + b, a * b])), [udv(poly([1, 0, a * b]), polyN([1, 0, a * b]), 'Glemt midterleddet'), udv(poly([1, a + b, -a * b]), polyN([1, a + b, -a * b]), 'Fortegnsfejl på det sidste led'), udv(poly([1, a * b, a + b]), polyN([1, a * b, a + b]), 'Produkt og sum byttet om'), udv(poly([1, a + b + 1, a * b]), polyN([1, a + b + 1, a * b]))]);
      }
      const k = heltal(rng, 2, 6), m = ikke0();
      const fak = (kk, mm, f) => udv(mn(kk) + par(x + plusLed(mm)), 'fak:' + kk + ',' + mm, f);
      const o = { emne: 'regnetricks', type: 'parentes', niveau, noegle: 'parentes:3:' + k + ',' + m, p: { v: '3', k, m },
        spoerg: 'Sæt uden for parentes: ' + math(poly([k, k * m])),
        forklaring: 'Begge led kan deles med ' + k + ': ' + math(mn(k) + par(x + plusLed(m))) };
      return opgave(o, rng, fak(k, m), [fak(k, k * m, 'Glemt at dele andet led'), fak(k, -m, 'Fortegnsfejl'), udv(mn(k) + x + par(mn(1) + plusLed(m)), 'fak:x', 'x sat uden for, selv om det ikke står i begge led')]);
    },

    // ===== I.3 Kvadratsætninger =====
    kvadratsaetning(niveau, rng) {
      const x = mi('x');
      const a = heltal(rng, 1, 9);
      if (niveau === 1) {
        const t = vaelg(rng, ['+', '−', '±']);
        if (t === '±') {
          const o = { emne: 'regnetricks', type: 'kvadratsaetning', niveau, noegle: 'kvs:pm' + a, p: { t, a, k: 1 },
            spoerg: 'Gang ud: ' + math(par(x + mo('+') + mn(a)) + par(x + mo('−') + mn(a))),
            forklaring: 'Tredje kvadratsætning: ' + math(sup(x, mn(2)) + mo('−') + sup(mn(a), mn(2)) + mo('=') + poly([1, 0, -a * a])) };
          return opgave(o, rng, udv(poly([1, 0, -a * a]), polyN([1, 0, -a * a])), [udv(poly([1, 0, a * a]), polyN([1, 0, a * a]), 'Fortegnsfejl: det er minus'), udv(poly([1, -2 * a, a * a]), polyN([1, -2 * a, a * a]), 'Forvekslet med anden kvadratsætning'), udv(poly([1, 0, -a]), polyN([1, 0, -a]), 'Glemt at kvadrere ' + a)]);
        }
        const s = t === '+' ? 1 : -1;
        const o = { emne: 'regnetricks', type: 'kvadratsaetning', niveau, noegle: 'kvs:' + t + a, p: { t, a, k: 1 },
          spoerg: 'Gang ud: ' + math(sup(par(x + mo(t) + mn(a)), mn(2))),
          forklaring: 'Kvadrat på første led + kvadrat på andet led ' + (s > 0 ? '+' : '−') + ' det dobbelte produkt: ' + math(poly([1, 2 * s * a, a * a])) };
        const f = [udv(poly([1, 0, a * a]), polyN([1, 0, a * a]), 'Glemt det dobbelte produkt'), udv(poly([1, -2 * s * a, a * a]), polyN([1, -2 * s * a, a * a]), 'Forkert fortegn på 2ab')];
        if (a !== 2) f.push(udv(poly([1, s * a, a * a]), polyN([1, s * a, a * a]), 'Produktet er ikke fordoblet'));
        f.push(udv(poly([1, 2 * s * a, -a * a]), polyN([1, 2 * s * a, -a * a]), 'Kvadratet har altid plus'));
        return opgave(o, rng, udv(poly([1, 2 * s * a, a * a]), polyN([1, 2 * s * a, a * a])), f);
      }
      const k = heltal(rng, 2, 5);
      if (niveau === 2) {
        const o = { emne: 'regnetricks', type: 'kvadratsaetning', niveau, noegle: 'kvs:k' + k + ',' + a, p: { t: 'k', a, k },
          spoerg: 'Gang ud: ' + math(sup(par(mn(k) + x + mo('−') + mn(a)), mn(2))),
          forklaring: math(sup(par(mn(k) + x), mn(2)) + mo('+') + sup(mn(a), mn(2)) + mo('−') + mn(2) + mo('·') + mn(k) + x + mo('·') + mn(a) + mo('=') + poly([k * k, -2 * k * a, a * a])) };
        return opgave(o, rng, udv(poly([k * k, -2 * k * a, a * a]), polyN([k * k, -2 * k * a, a * a])), [udv(poly([k * k, 0, a * a]), polyN([k * k, 0, a * a]), 'Glemt det dobbelte produkt'), udv(poly([k, -2 * k * a, a * a]), polyN([k, -2 * k * a, a * a]), 'Glemt at kvadrere ' + k), udv(poly([k * k, 2 * k * a, a * a]), polyN([k * k, 2 * k * a, a * a]), 'Forkert fortegn på 2ab')]);
      }
      // Niveau 3: baglæns — faktorisér
      if (rng() < 0.5) {
        const s = rng() < 0.5 ? 1 : -1;
        const kv = (ss, aa, f) => udv(sup(par(x + (ss > 0 ? mo('+') : mo('−')) + mn(aa)), mn(2)), 'kv:' + ss + ',' + aa, f);
        const o = { emne: 'regnetricks', type: 'kvadratsaetning', niveau, noegle: 'kvs:b' + s + ',' + a, p: { t: 'b', a, s },
          spoerg: 'Skriv som et kvadrat: ' + math(poly([1, 2 * s * a, a * a])),
          forklaring: math(mn(a * a) + mo('=') + sup(mn(a), mn(2))) + ' og ' + math(mn(2 * a) + x + mo('=') + mn(2) + mo('·') + x + mo('·') + mn(a)) + ', så det er ' + math(sup(par(x + (s > 0 ? mo('+') : mo('−')) + mn(a)), mn(2))) };
        return opgave(o, rng, kv(s, a), [kv(-s, a, 'Fortegnsfejl'), kv(s, 2 * a, 'Glemt at halvere det dobbelte produkt'), udv(par(x + mo('+') + mn(a)) + par(x + mo('−') + mn(a)), 'kv:3', 'Forvekslet med tredje kvadratsætning')]);
      }
      const o = { emne: 'regnetricks', type: 'kvadratsaetning', niveau, noegle: 'kvs:d' + k + ',' + a, p: { t: 'd', a, k },
        spoerg: 'Faktorisér: ' + math(poly([k * k, 0, -a * a])),
        forklaring: math(sup(par(mn(k) + x), mn(2)) + mo('−') + sup(mn(a), mn(2)) + mo('=') + par(mn(k) + x + mo('+') + mn(a)) + par(mn(k) + x + mo('−') + mn(a))) };
      return opgave(o, rng, udv(par(mn(k) + x + mo('+') + mn(a)) + par(mn(k) + x + mo('−') + mn(a)), 'fd:' + k + ',' + a),
        [udv(sup(par(mn(k) + x + mo('−') + mn(a)), mn(2)), 'fd:kv-', 'Det er ikke et kvadrat på en toleddet størrelse'), udv(sup(par(mn(k) + x + mo('+') + mn(a)), mn(2)), 'fd:kv+', 'Det er ikke et kvadrat på en toleddet størrelse'), udv(par(mn(k * k) + x + mo('+') + mn(a)) + par(x + mo('−') + mn(a)), 'fd:kk', 'Glemt at tage roden af ' + k * k)]);
    },

    // ===== I.4a Forkorte og forlænge =====
    forkortBroek(niveau, rng) {
      if (niveau === 1) {
        let p, q;
        do { q = heltal(rng, 2, 9); p = heltal(rng, 1, q - 1); } while (gcd(p, q) !== 1);
        const k = heltal(rng, 2, 6);
        const o = { emne: 'broeker', type: 'forkortBroek', niveau, noegle: 'forkortB:' + p + '/' + q + ':' + k, p: { t: 'tal', p, q, k },
          spoerg: 'Forkort så meget som muligt: ' + math(frac(mn(k * p), mn(k * q))),
          forklaring: 'Både tæller og nævner kan deles med ' + k + ': ' + math(frac(mn(p), mn(q))) };
        return opgave(o, rng, bv(p, q), [bv(p, k * q, 'Kun tælleren er delt'), bv(q, p, 'Brøken er vendt om'), bv(k * p, q, 'Kun nævneren er delt'), bv(p + 1, q)]);
      }
      const x = mi('x');
      const a = heltal(rng, 1, 9);
      const lin = (s, f) => udv(x + plusLed(s), 'lin:1,' + s, f);
      const andre = [lin(-a, 'Fortegnsfejl'), udv(sup(x, mn(2)) + plusLed(-a), 'x2:' + -a, 'Forkortet med et led i stedet for en faktor'), udv(frac(mn(1), x + mo('+') + mn(a)), 'inv:' + a, 'Brøken er vendt om')];
      if (rng() < 0.5) {
        const o = { emne: 'broeker', type: 'forkortBroek', niveau, noegle: 'forkortB:d' + a, p: { t: 'd', a },
          spoerg: 'Forkort ' + math(frac(sup(x, mn(2)) + mo('−') + mn(a * a), x + mo('−') + mn(a))),
          forklaring: 'Faktorisér tælleren med tredje kvadratsætning: ' + math(frac(par(x + mo('+') + mn(a)) + par(x + mo('−') + mn(a)), x + mo('−') + mn(a)) + mo('=') + x + mo('+') + mn(a)) };
        return opgave(o, rng, lin(a), andre);
      }
      const o = { emne: 'broeker', type: 'forkortBroek', niveau, noegle: 'forkortB:k' + a, p: { t: 'k', a },
        spoerg: 'Forkort ' + math(frac(poly([1, 2 * a, a * a]), x + mo('+') + mn(a))),
        forklaring: 'Tælleren er ' + math(sup(par(x + mo('+') + mn(a)), mn(2))) + ', så der kan forkortes med ' + math(x + mo('+') + mn(a)) + '.' };
      return opgave(o, rng, lin(a), andre);
    },

    // ===== I.4b Brøk gange og dele med et tal =====
    broekTal(niveau, rng) {
      const b = heltal(rng, 3, 9), a = heltal(rng, 1, b - 1), k = heltal(rng, 2, 6);
      const minus = niveau >= 2 && rng() < 0.5 ? -1 : 1;
      const gange = rng() < 0.5;
      const fa = minus * a;
      const vis = gange ? (minus < 0 ? mo('−') : '') + mn(k) + mo('·') + frac(mn(a), mn(b)) : (minus < 0 ? mo('−') : '') + par(frac(mn(a), mn(b))) + mo(':') + mn(k);
      const o = { emne: 'broeker', type: 'broekTal', niveau, noegle: 'broekTal:' + (gange ? 'g' : 'd') + fa + '/' + b + ':' + k, p: { a: fa, b, k, gange },
        spoerg: 'Udregn ' + math(vis),
        forklaring: gange ? 'Brøk gange tal: gang tælleren. ' + math(frac(mn(k) + mo('·') + led(fa), mn(b)) + mo('=') + broek(k * fa, b)) : 'Brøk divideret med tal: gang nævneren. ' + math(frac(mn(fa), mn(b) + mo('·') + mn(k)) + mo('=') + broek(fa, b * k)) };
      const rigtig = gange ? bv(k * fa, b) : bv(fa, b * k);
      return opgave(o, rng, rigtig, [bv(k * fa, k * b, 'Ganget både tæller og nævner (så ændres intet)'), gange ? bv(fa, k * b, 'Reglerne for gange og dele forvekslet') : bv(k * fa, b, 'Reglerne for gange og dele forvekslet'), minus < 0 ? (gange ? bv(-k * fa, b, 'Fortegnsfejl') : bv(-fa, b * k, 'Fortegnsfejl')) : (gange ? bv(k * fa + 1, b) : bv(fa + 1, b * k))]);
    },

    // ===== I.4c Gange og dele med brøker =====
    broekGangeDele(niveau, rng) {
      const b = heltal(rng, 2, 9), d = heltal(rng, 2, 9), a = heltal(rng, 1, 9), c = heltal(rng, 1, 9);
      const gange = niveau === 1 ? rng() < 0.6 : rng() < 0.4;
      const dobbelt = niveau >= 3 && !gange;
      const A = frac(mn(a), mn(b)), C = frac(mn(c), mn(d));
      const o = { emne: 'broeker', type: 'broekGangeDele', niveau, noegle: 'broekGD:' + (gange ? 'g' : 'd') + [a, b, c, d].join(','), p: { a, b, c, d, gange },
        spoerg: 'Udregn ' + math(gange ? A + mo('·') + C : dobbelt ? frac(A, C) : A + mo(':') + C),
        forklaring: gange ? 'Tæller gange tæller og nævner gange nævner: ' + math(frac(mn(a * c), mn(b * d)) + mo('=') + broek(a * c, b * d)) : 'Gang med den omvendte brøk: ' + math(A + mo('·') + frac(mn(d), mn(c)) + mo('=') + broek(a * d, b * c)) };
      if (gange) return opgave(o, rng, bv(a * c, b * d), [bv(a * d, b * c, 'Ganget over kors'), bv(a + c, b + d, 'Lagt tællere og nævnere sammen'), bv(a * c, b + d), bv(a * c + 1, b * d)]);
      return opgave(o, rng, bv(a * d, b * c), [bv(a * c, b * d, 'Glemt at vende den anden brøk'), bv(b * c, a * d, 'Vendt den forkerte brøk'), bv(a * d + 1, b * c), bv(a * d, b * c + 1)]);
    },

    // ===== I.4d Addere og subtrahere brøker =====
    broekMinus(niveau, rng) {
      let a, b, c, d;
      const nv = niveau >= 2 ? [2, 3, 4, 5, 6] : [2, 3, 4];
      do { b = vaelg(rng, nv); d = vaelg(rng, nv); a = heltal(rng, 1, b - 1); c = heltal(rng, 1, d - 1); } while (b === d || a * d <= c * b);
      const o = { emne: 'broeker', type: 'broekMinus', niveau, noegle: 'broekMinus:' + [a, b, c, d].join(','), p: { a, b, c, d },
        spoerg: 'Udregn ' + math(frac(mn(a), mn(b)) + mo('−') + frac(mn(c), mn(d))),
        forklaring: 'Fællesnævner ' + b * d + ': ' + math(frac(mn(a * d), mn(b * d)) + mo('−') + frac(mn(c * b), mn(b * d)) + mo('=') + broek(a * d - c * b, b * d)) };
      const f = [bv(a * d - c, b * d, 'Kun den ene tæller forlænget'), bv(a * d + c * b, b * d, 'Lagt sammen i stedet for at trække fra')];
      if (b - d > 0 && a - c > 0) f.unshift(bv(a - c, b - d, 'Trukket tællere og nævnere fra hver for sig'));
      f.push(bv(a * d - c * b + 1, b * d));
      return opgave(o, rng, bv(a * d - c * b, b * d), f);
    },

    // ===== I.5 Potenser og rødder =====
    potensRegler(niveau, rng) {
      const a = vaelg(rng, ['2', '3', '5', 'x']);
      const A = /\d/.test(a) ? mn(a) : mi(a);
      const pv = (eks, nøgle, f) => udv(sup(A, eks), 'p:' + a + '^' + nøgle, f);
      const t = vaelg(rng, niveau === 1 ? ['potpot', 'neg'] : niveau === 2 ? ['potpot', 'neg', 'rod'] : ['rod', 'broek', 'neg']);
      let m = heltal(rng, 2, 5), n = heltal(rng, 2, 5);
      if (t === 'potpot') {
        if (m === 2 && n === 2) n = 3;
        const o = { emne: 'broeker', type: 'potensRegler', niveau, noegle: 'potR:pp' + a + m + n, p: { t, a, m, n },
          spoerg: 'Skriv som én potens: ' + math(sup(par(sup(A, mn(m))), mn(n))),
          forklaring: 'Potens af en potens: eksponenterne ganges. ' + math(sup(A, mn(m * n))) };
        return opgave(o, rng, pv(mn(m * n), String(m * n)), [pv(mn(m + n), String(m + n), 'Lagt eksponenterne sammen'), pv(sup(mn(m), mn(n)), m + '^' + n, 'Opløftet eksponenten'), pv(mn(m * n + 1), String(m * n + 1))]);
      }
      if (t === 'neg') {
        const o = { emne: 'broeker', type: 'potensRegler', niveau, noegle: 'potR:neg' + a + n, p: { t, a, n },
          spoerg: 'Skriv uden negativ eksponent: ' + math(sup(A, mn(-n))),
          forklaring: math(sup(mi('a'), mo('−') + mi('p')) + mo('=') + frac(mn(1), sup(mi('a'), mi('p')))) };
        return opgave(o, rng, udv(frac(mn(1), sup(A, mn(n))), 'inv:' + a + '^' + n), [udv(mo('−') + sup(A, mn(n)), 'neg:' + a + '^' + n, 'Minus i eksponenten gør ikke tallet negativt'), udv(mo('−') + frac(mn(1), sup(A, mn(n))), 'neginv:' + a + '^' + n, 'Både omvendt og negativt'), udv(frac(mn(1), mn(n) + A), 'inv:' + n + a, 'Ganget med eksponenten')]);
      }
      if (t === 'rod') {
        while (m === n) m = heltal(rng, 2, 5);
        const o = { emne: 'broeker', type: 'potensRegler', niveau, noegle: 'potR:rod' + a + m + n, p: { t, a, m, n },
          spoerg: 'Skriv som en potens: ' + math(mroot(sup(A, mn(m)), n)),
          forklaring: math(mroot(sup(mi('a'), mi('p')), 'n') + mo('=') + sup(mi('a'), frac(mi('p'), mi('n')))) };
        return opgave(o, rng, pv(frac(mn(m), mn(n)), m + '/' + n), [pv(frac(mn(n), mn(m)), n + '/' + m, 'Brøken i eksponenten vendt om'), pv(mn(m - n), 'd' + (m - n), 'Trukket fra i stedet for at dele'), pv(mn(m * n), 'g' + m * n, 'Ganget i stedet for at dele')]);
      }
      let p, q;
      do { p = heltal(rng, 2, 4); q = heltal(rng, 3, 7); } while (gcd(p, q) !== 1);
      n = heltal(rng, 2, 3);
      const P = Math.pow(p, n), Q = Math.pow(q, n);
      const o = { emne: 'broeker', type: 'potensRegler', niveau, noegle: 'potR:b' + p + '/' + q + '^' + n, p: { t, p, q, n },
        spoerg: 'Udregn ' + math(sup(par(frac(mn(p), mn(q))), mn(n))),
        forklaring: 'Både tæller og nævner opløftes: ' + math(frac(sup(mn(p), mn(n)), sup(mn(q), mn(n))) + mo('=') + frac(mn(P), mn(Q))) };
      return opgave(o, rng, bv(P, Q), [bv(P, q, 'Kun tælleren opløftet'), bv(p, Q, 'Kun nævneren opløftet'), bv(p * n, q * n, 'Ganget med eksponenten'), bv(P + 1, Q)]);
    },
    titalsform(niveau, rng) {
      const mm = heltal(rng, 11, 99);
      let n;
      do { n = heltal(rng, -6, 7); } while (n === 0);
      const cifre = mm % 10 === 0 ? String(mm / 10) : String(mm);
      const bTekst = cifre.length === 1 ? cifre : cifre[0] + ',' + cifre[1];
      const talTekst = (() => {
        const e = n - (cifre.length - 1);
        const heleCifre = cifre.length + e;
        let hel, rest;
        if (heleCifre <= 0) { hel = '0'; rest = '0'.repeat(-heleCifre) + cifre; }
        else if (heleCifre >= cifre.length) { hel = cifre + '0'.repeat(heleCifre - cifre.length); rest = ''; }
        else { hel = cifre.slice(0, heleCifre); rest = cifre.slice(heleCifre); }
        hel = hel.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return hel + (rest ? ',' + rest : '');
      })();
      const tv = (eks, f) => udv(mn(bTekst) + mo('·') + sup(mn(10), mn(eks)), 't10:' + bTekst + 'e' + eks, f);
      const o = { emne: 'broeker', type: 'titalsform', niveau, noegle: 'titals:' + mm + 'e' + n, p: { cifre, n, talTekst },
        spoerg: 'Skriv ' + math(mn(talTekst)) + ' på formen ' + math(mi('b') + mo('·') + sup(mn(10), mi('n'))) + ', hvor ' + math(mn(1) + mo('≤') + mi('b') + mo('<') + mn(10)) + '.',
        forklaring: 'Kommaet flyttes ' + Math.abs(n) + (Math.abs(n) === 1 ? ' plads' : ' pladser') + (n > 0 ? ' til venstre, så eksponenten er positiv.' : ' til højre, så eksponenten er negativ.') };
      return opgave(o, rng, tv(n), [tv(-n, 'Fortegnsfejl i eksponenten'), tv(n + 1, 'Talt nullerne forkert'), tv(n - 1, 'Talt nullerne forkert')]);
    },

    // ===== II.1 Ligninger generelt =====
    krydsGange(niveau, rng) {
      const b = heltal(rng, 2, 9), c = heltal(rng, 2, 9), k = heltal(rng, 1, 4);
      const xx = c * k, a = b * k;
      const o = { emne: 'ligninger', type: 'krydsGange', niveau, noegle: 'kryds:' + [a, b, c].join(','), p: { a, b, c },
        spoerg: 'Løs ligningen ' + math(frac(mn(a), mi('x')) + mo('=') + frac(mn(b), mn(c))),
        forklaring: 'Gang over kors: ' + math(mn(b) + mi('x') + mo('=') + mn(a) + mo('·') + mn(c)) + ', så ' + math(mi('x') + mo('=') + frac(mn(a * c), mn(b)) + mo('=') + mn(xx)) };
      return opgave(o, rng, bv(xx, 1), [bv(b * c, a, 'Ganget forkert over kors'), bv(a * b, c, 'Ganget de forkerte tal'), bv(a - b + c, 1, 'Lagt til og trukket fra i stedet for at gange')]);
    },
    loesningsantal(niveau, rng) {
      const t = vaelg(rng, ['ingen', 'en', 'mange']);
      const a = heltal(rng, 2, 6), m = heltal(rng, 1, 6);
      let b = heltal(rng, -6, 6), c = heltal(rng, -6, 6), c2 = heltal(rng, 2, 6);
      if (t === 'ingen' && b === c) c = b + 3;
      if (c2 === a) c2 = a + 1;
      const x = mi('x');
      const spoerg = t === 'ingen' ? lign(monom(a, 1) + plusLed(b), monom(a, 1) + plusLed(c))
        : t === 'mange' ? lign(mn(a) + par(x + plusLed(m)), monom(a, 1) + plusLed(a * m))
          : lign(monom(a, 1) + plusLed(b), monom(c2, 1) + plusLed(c));
      // Ligningen som A1·x + B1 = A2·x + B2 (til den uafhængige test)
      const P = t === 'ingen' ? { A1: a, B1: b, A2: a, B2: c } : t === 'mange' ? { A1: a, B1: a * m, A2: a, B2: a * m } : { A1: a, B1: b, A2: c2, B2: c };
      const o = { emne: 'ligninger', type: 'loesningsantal', niveau, noegle: 'antal:' + t + [a, b, c, c2, m].join(','), p: P,
        spoerg: 'Hvor mange løsninger har ' + math(spoerg) + '?',
        forklaring: t === 'ingen' ? 'Træk ' + a + 'x fra på begge sider: ' + math(mn(b) + mo('=') + mn(c)) + ' er falsk, så der er ingen løsninger.'
          : t === 'mange' ? 'Gang parentesen ud: begge sider er ens. Alle x passer — uendeligt mange løsninger.'
            : 'x-leddene er forskellige, så x forsvinder ikke: præcis én løsning.' };
      const v = (k, vis, f) => ({ vis: vis, nøgle: k, fejl: f });
      const alle = [v('ingen', 'Ingen'), v('en', 'Én'), v('mange', 'Uendeligt mange')];
      return opgave(o, rng, alle.find((z) => z.nøgle === t), alle.filter((z) => z.nøgle !== t).map((z) => Object.assign({}, z, { fejl: 'Se, hvad der står tilbage, når x er væk' })), 3);
    },

    // ===== II.2 Andengradsligninger =====
    diskriminant(niveau, rng) {
      const x = mi('x');
      if (niveau === 1) {
        const a = vaelg(rng, [1, 2, -1, 3]), b = heltal(rng, -6, 6), c = heltal(rng, -6, 6);
        const d = b * b - 4 * a * c;
        if (rng() < 0.5) {
          const o = { emne: 'ligninger', type: 'diskriminant', niveau, noegle: 'disk:d' + [a, b, c].join(','), p: { t: 'd', a, b, c },
            spoerg: 'Hvad er diskriminanten d for ' + math(lign(poly([a, b, c]), mn(0))) + '?',
            forklaring: math(mi('d') + mo('=') + sup(led(b), mn(2)) + mo('−') + mn(4) + mo('·') + led(a) + mo('·') + led(c) + mo('=') + mn(d)) };
          return opgave(o, rng, tal(d), [tal(b * b + 4 * a * c, 'Fortegnsfejl: det er minus 4ac'), tal(-b * b - 4 * a * c, '(−b)² er positiv'), tal(b - 4 * a * c, 'Glemt at kvadrere b')]);
        }
        const antal = d > 0 ? 2 : d === 0 ? 1 : 0;
        const o = { emne: 'ligninger', type: 'diskriminant', niveau, noegle: 'disk:n' + [a, b, c].join(','), p: { t: 'n', a, b, c },
          spoerg: 'Hvor mange løsninger har ' + math(lign(poly([a, b, c]), mn(0))) + '?',
          forklaring: math(mi('d') + mo('=') + mn(d)) + (d > 0 ? ' > 0: to løsninger.' : d === 0 ? ' = 0: én løsning.' : ' < 0: ingen løsninger.') };
        return opgave(o, rng, tal(antal), [0, 1, 2].filter((v) => v !== antal).map((v) => tal(v, 'd > 0: to, d = 0: én, d < 0: ingen')), 3);
      }
      if (niveau === 2) {
        const a = vaelg(rng, [1, 2, -1]);
        let r1, r2;
        do { r1 = heltal(rng, -5, 5); r2 = heltal(rng, -5, 5); } while (r1 === r2 || r1 === -r2);
        const B = -a * (r1 + r2), C = a * r1 * r2;
        const o = { emne: 'ligninger', type: 'diskriminant', niveau, noegle: 'disk:l' + [a, r1, r2].sort().join(','), p: { t: 'l', a, r1, r2 },
          spoerg: 'Løs ' + math(lign(poly([a, B, C]), mn(0))),
          forklaring: math(mi('d') + mo('=') + mn(B * B - 4 * a * C)) + ', så ' + math(mi('x') + mo('=') + frac(mn(-B) + mo('±') + sqrt(mn(B * B - 4 * a * C)), mn(2 * a))) + ': ' + math(mi('x') + mo('=') + mn(Math.min(r1, r2)) + mo('∨') + mi('x') + mo('=') + mn(Math.max(r1, r2))) };
        return opgave(o, rng, loesning([r1, r2]), [loesning([-r1, -r2], 'Fortegnet på b glemt (−b)'), loesning([2 * r1, 2 * r2], 'Glemt 2-tallet i 2a'), { vis: math(x + mo('=') + mn(r1)), nøgle: 'x:' + r1, fejl: 'Kun den ene løsning' }]);
      }
      const m = heltal(rng, 2, 6);
      const kv = (vis, nøgle, f) => udv(mi('k') + mo('=') + vis, 'k:' + nøgle, f);
      const o = { emne: 'ligninger', type: 'diskriminant', niveau, noegle: 'disk:k' + m, p: { t: 'k', m },
        spoerg: 'For hvilke k har ' + math(lign(sup(x, mn(2)) + mo('+') + mi('k') + x + mo('+') + mn(m * m), mn(0))) + ' netop én løsning?',
        forklaring: 'Én løsning når ' + math(mi('d') + mo('=') + sup(mi('k'), mn(2)) + mo('−') + mn(4 * m * m) + mo('=') + mn(0)) + ', altså ' + math(mi('k') + mo('=') + mo('±') + mn(2 * m)) };
      return opgave(o, rng, kv(mo('±') + mn(2 * m), 'pm' + 2 * m), [kv(mn(2 * m), String(2 * m), 'Glemt den negative løsning'), kv(mo('±') + mn(m), 'pm' + m, 'Glemt faktoren 2 (√4 = 2)'), kv(mo('±') + mn(m * m), 'pm' + m * m, 'Glemt at tage kvadratroden')]);
    },

    // ===== II.3 Nulreglen =====
    udenForParentes(niveau, rng) {
      const a = heltal(rng, 1, 5);
      let r;
      do { r = heltal(rng, -6, 6); } while (r === 0);
      const x = mi('x');
      const o = { emne: 'ligninger', type: 'udenForParentes', niveau, noegle: 'ufp:' + a + ',' + r, p: { a, r },
        spoerg: 'Løs ' + math(lign(poly([a, -a * r, 0]), mn(0))),
        forklaring: 'Sæt ' + math((a === 1 ? '' : mn(a)) + x) + ' uden for parentes: ' + math((a === 1 ? '' : mn(a)) + x + par(x + plusLed(-r)) + mo('=') + mn(0)) + '. Nulreglen giver ' + math(x + mo('=') + mn(0)) + ' eller ' + math(x + mo('=') + mn(r)) + '. Del aldrig med x — så forsvinder løsningen 0.' };
      return opgave(o, rng, loesning([0, r]), [{ vis: math(x + mo('=') + mn(r)), nøgle: 'x:' + r, fejl: 'Delt med x — så forsvinder løsningen x = 0' }, loesning([0, -r], 'Fortegnsfejl')].concat(Math.abs(r) === 1 ? [loesning([0, r + 2])] : [{ vis: math(x + mo('=') + mn(0) + mo('∨') + x + mo('=') + broek(1, r)), nøgle: 'l:0,1/' + r, fejl: 'Delt forkert' }]));
    },

    // ===== II.4 Isolere en variabel =====
    omvendtFunktion(niveau, rng) {
      const x = mi('x');
      const t = vaelg(rng, niveau >= 3 ? ['exp', 'ln', 'pot'] : ['exp', 'ln']);
      if (t === 'exp') {
        const a = heltal(rng, 2, 9);
        const o = { emne: 'ligninger', type: 'omvendtFunktion', niveau, noegle: 'omv:e' + a, p: { t, a },
          spoerg: 'Løs ' + math(lign(sup(mi('e'), x), mn(a))),
          forklaring: 'ln er den omvendte funktion til e: ' + math(x + mo('=') + mi('ln') + mn(a)) };
        return opgave(o, rng, udv(x + mo('=') + mi('ln') + mn(a), 'ln' + a), [udv(x + mo('=') + sup(mi('e'), mn(a)), 'e' + a, 'Brugt e i stedet for ln'), udv(x + mo('=') + frac(mn(a), mi('e')), 'a/e', 'Delt med e'), udv(x + mo('=') + mi('log') + mn(a), 'log' + a, 'Brugt log i stedet for ln')]);
      }
      if (t === 'ln') {
        const k = heltal(rng, 2, 5);
        const o = { emne: 'ligninger', type: 'omvendtFunktion', niveau, noegle: 'omv:l' + k, p: { t, k },
          spoerg: 'Løs ' + math(lign(mi('ln') + x, mn(k))),
          forklaring: 'e er den omvendte funktion til ln: ' + math(x + mo('=') + sup(mi('e'), mn(k))) };
        return opgave(o, rng, udv(x + mo('=') + sup(mi('e'), mn(k)), 'e' + k), [udv(x + mo('=') + mi('ln') + mn(k), 'ln' + k, 'Brugt ln igen'), udv(x + mo('=') + mn(k) + mi('e'), 'ke', 'Ganget med e'), udv(x + mo('=') + sup(mn(10), mn(k)), '10^' + k, 'Brugt 10 som grundtal')]);
      }
      const n = vaelg(rng, [3, 5]), m = heltal(rng, 2, n === 5 ? 3 : 5);
      const M = Math.pow(m, n);
      const o = { emne: 'ligninger', type: 'omvendtFunktion', niveau, noegle: 'omv:p' + n + ',' + m, p: { t, n, m },
        spoerg: 'Løs ' + math(lign(sup(x, mn(n)), mn(M))),
        forklaring: math(x + mo('=') + mroot(mn(M), n) + mo('=') + mn(m)) + ', fordi ' + math(sup(mn(m), mn(n)) + mo('=') + mn(M)) };
      return opgave(o, rng, bv(m, 1), [bv(M, n, 'Delt med eksponenten i stedet for at tage roden'), bv(M - n, 1, 'Trukket eksponenten fra'), bv(m * n, 1)]);
    },

    // ===== III.1 Ensvinklede trekanter =====
    erEnsvinklede(niveau, rng) {
      const [a, b, c] = vaelg(rng, [[3, 4, 5], [2, 3, 4], [4, 5, 6], [5, 6, 8], [3, 5, 7]]);
      const k = heltal(rng, 2, 4);
      const er = rng() < 0.5;
      const side = heltal(rng, 0, 2);
      const store = [a * k, b * k, c * k];
      if (!er) store[side] += vaelg(rng, [-1, 1]);
      const o = { emne: 'trekanter', type: 'erEnsvinklede', niveau, noegle: 'erEns:' + [a, b, c].join(',') + ':' + store.join(','), p: { a, b, c, store },
        spoerg: 'En trekant har siderne ' + [a, b, c].join(', ') + ', en anden ' + store.join(', ') + '. Er de ensvinklede?',
        forklaring: 'Forholdene ' + [0, 1, 2].map((i) => math(frac(mn(store[i]), mn([a, b, c][i])))).join(', ') + (er ? ' er ens (' + k + '), så ja.' : ' er ikke ens, så nej.') };
      return opgave(o, rng, er ? ja : nej, [er ? nej : ja], 2);
    },

    // ===== III.2 Pythagoras med rod i svaret =====
    pythagorasRod(niveau, rng) {
      const kvadrat = (v) => Number.isInteger(Math.sqrt(v));
      const rod = (N, f) => udv(sqrt(mn(N)), 'r:' + N, f);
      if (niveau >= 3 && rng() < 0.6) {
        let a, c;
        do { c = heltal(rng, 3, 8); a = heltal(rng, 1, c - 1); } while (kvadrat(c * c - a * a));
        const N = c * c - a * a;
        const o = { emne: 'trekanter', type: 'pythagorasRod', niveau, noegle: 'pythR:k' + a + ',' + c, p: { katete: true, a, c },
          spoerg: 'En retvinklet trekant har hypotenusen ' + math(mn(c)) + ' og en katete ' + math(mn(a)) + '. Hvor lang er den anden katete?',
          figur: { art: 'retvinklet', a: a, b: Math.sqrt(N), c: c, spoerg: 'b' },
          forklaring: math(mi('b') + mo('=') + sqrt(sup(mn(c), mn(2)) + mo('−') + sup(mn(a), mn(2))) + mo('=') + sqrt(mn(N))) };
        return opgave(o, rng, rod(N), [tal(c - a, 'Trukket siderne fra hinanden uden kvadrater'), rod(c * c + a * a, 'Lagt kvadraterne sammen — c er hypotenusen'), tal(N, 'Glemt kvadratroden')]);
      }
      let a, b;
      do { a = heltal(rng, 1, 7); b = heltal(rng, 1, 7); } while (kvadrat(a * a + b * b));
      const N = a * a + b * b;
      const o = { emne: 'trekanter', type: 'pythagorasRod', niveau, noegle: 'pythR:' + Math.min(a, b) + ',' + Math.max(a, b), p: { katete: false, a, b },
        spoerg: 'En retvinklet trekant har kateterne ' + math(mn(a)) + ' og ' + math(mn(b)) + '. Hvor lang er hypotenusen?',
        figur: { art: 'retvinklet', a: a, b: b, c: '√' + N, spoerg: 'c' },
        forklaring: math(mi('c') + mo('=') + sqrt(sup(mn(a), mn(2)) + mo('+') + sup(mn(b), mn(2))) + mo('=') + sqrt(mn(N))) };
      const f = [tal(a + b, 'Lagt kateterne sammen'), tal(N, 'Glemt kvadratroden')];
      if (a !== b) f.push(rod(Math.abs(a * a - b * b), 'Forkert regnetegn'));
      f.push(rod(N + 1));
      return opgave(o, rng, rod(N), f);
    },

    // ===== IV.1 Funktioner generelt =====
    funktionsvaerdi(niveau, rng) {
      const a = vaelg(rng, [1, 2, -1]), b = heltal(rng, -5, 5), c = heltal(rng, -5, 5);
      let x0 = heltal(rng, -3, 3);
      if (x0 === 0) x0 = -2;
      const fx = a * x0 * x0 + b * x0 + c;
      const o = { emne: 'funktioner', type: 'funktionsvaerdi', niveau, noegle: 'fv:' + [a, b, c, x0].join(','), p: { a, b, c, x0 },
        spoerg: math(mi('f') + par(mi('x')) + mo('=') + poly([a, b, c])) + '. Hvad er ' + math(mi('f') + par(mn(x0))) + '?',
        forklaring: math(mi('f') + par(mn(x0)) + mo('=') + (a === 1 ? '' : a === -1 ? mo('−') : mn(a) + mo('·')) + sup(led(x0), mn(2)) + (b ? plusLed(b) + mo('·') + led(x0) : '') + plusLed(c) + mo('=') + mn(fx)) + (x0 < 0 ? ' — husk, at ' + math(sup(par(mn(x0)), mn(2)) + mo('=') + mn(x0 * x0)) + '.' : '') };
      const f = [];
      if (x0 < 0) f.push(tal(-a * x0 * x0 + b * x0 + c, '(−x₀)² regnet som −x₀²'));
      if (a !== 1) f.push(tal(x0 * x0 + b * x0 + c, 'Glemt a'));
      if (b * x0 !== 0) f.push(tal(a * x0 * x0 - b * x0 + c, 'Fortegnsfejl på b·x₀'));
      return opgave(o, rng, tal(fx), f.concat(naboer(rng, fx, []).map((v) => tal(v))));
    },
    proportional(niveau, rng) {
      const omvendt = niveau >= 2 && rng() < 0.5;
      if (!omvendt) {
        const k = heltal(rng, 2, 6), x0 = heltal(rng, 2, 5);
        let x1 = heltal(rng, 2, 9);
        if (x1 === x0) x1 = x0 + 2;
        const y0 = k * x0;
        const o = { emne: 'funktioner', type: 'proportional', niveau, noegle: 'prop:' + [k, x0, x1].join(','), p: { omvendt, k, x0, x1 },
          spoerg: 'y er proportional med x, og ' + math(mi('y') + mo('=') + mn(y0)) + ' når ' + math(mi('x') + mo('=') + mn(x0)) + '. Hvad er y, når ' + math(mi('x') + mo('=') + mn(x1)) + '?',
          forklaring: math(mi('k') + mo('=') + frac(mn(y0), mn(x0)) + mo('=') + mn(k)) + ', så ' + math(mi('y') + mo('=') + mn(k) + mo('·') + mn(x1) + mo('=') + mn(k * x1)) };
        return opgave(o, rng, bv(k * x1, 1), [bv(y0 + (x1 - x0), 1, 'Lagt forskellen til (additiv tænkning)'), bv(x0 * y0, x1, 'Regnet som omvendt proportional'), bv(k * x1 + k, 1)]);
      }
      const x0 = heltal(rng, 2, 6), y0 = heltal(rng, 2, 6), K = x0 * y0;
      const delere = []; for (let d = 2; d <= K; d++) if (K % d === 0 && d !== x0) delere.push(d);
      const x1 = vaelg(rng, delere.length ? delere : [K]);
      const o = { emne: 'funktioner', type: 'proportional', niveau, noegle: 'oprop:' + [x0, y0, x1].join(','), p: { omvendt, x0, y0, x1 },
        spoerg: 'y er omvendt proportional med x, og ' + math(mi('y') + mo('=') + mn(y0)) + ' når ' + math(mi('x') + mo('=') + mn(x0)) + '. Hvad er y, når ' + math(mi('x') + mo('=') + mn(x1)) + '?',
        forklaring: math(mi('k') + mo('=') + mn(x0) + mo('·') + mn(y0) + mo('=') + mn(K)) + ', så ' + math(mi('y') + mo('=') + frac(mn(K), mn(x1)) + mo('=') + mn(K / x1)) };
      return opgave(o, rng, bv(K, x1), [bv(y0 * x1, x0, 'Regnet som proportional'), bv(y0 + (x1 - x0), 1, 'Lagt forskellen til'), bv(K, x1 + 1)]);
    },

    // ===== IV.2 Lineære funktioner =====
    linjeToPunkter(niveau, rng) {
      let at, an;
      if (niveau >= 3 && rng() < 0.4) { at = vaelg(rng, [1, -1]); an = 2; }
      else { do { at = heltal(rng, -3, 3); } while (at === 0); an = 1; }
      const b = heltal(rng, -5, 5);
      const x1 = an * heltal(rng, -2, 1), x2 = x1 + an * heltal(rng, 1, 3);
      const y1 = at * x1 / an + b, y2 = at * x2 / an + b;
      const lin = (t, n, bt, bn, f) => udv(mi('f') + par(mi('x')) + mo('=') + ratMonom(t, n) + plusRat(bt, bn), 'lin:' + frStr(t, n) + ';' + frStr(bt, bn), f);
      const o = { emne: 'funktioner', type: 'linjeToPunkter', niveau, noegle: 'lin2p:' + [x1, y1, x2, y2].join(','), p: { x1, y1, x2, y2 },
        spoerg: 'En ret linje går gennem ' + math(par(mn(x1) + mo(',') + mn(y1))) + ' og ' + math(par(mn(x2) + mo(',') + mn(y2))) + '. Find forskriften.',
        forklaring: math(mi('a') + mo('=') + frac(mn(y2) + plusLed(-y1), mn(x2) + plusLed(-x1)) + mo('=') + rat(at, an)) + '. Sæt et punkt ind: ' + math(mi('b') + mo('=') + mn(y1) + mo('−') + rat(at, an) + mo('·') + led(x1) + mo('=') + mn(b)) };
      // a = Δy/Δx = at/an; omvendt: Δx/Δy = an/at med tilhørende b = y1 − x1·an/at
      const dy = y2 - y1, dx = x2 - x1;
      const f = [lin(at, an, y1 * an + at * x1, an, 'Fortegnsfejl i b (y₁ + a·x₁)'), lin(-at, an, y1 * an + at * x1, an, 'Fortegnsfejl i hældningen')];
      if (Math.abs(dy) !== Math.abs(dx)) f.unshift(lin(dx, dy, y1 * dy - x1 * dx, dy, 'Brøken vendt om (Δx/Δy)'));
      f.push(lin(at, an, b + 1, 1));
      return opgave(o, rng, lin(at, an, b, 1), f);
    },

    // ===== IV.3 Eksponentielle funktioner ud fra to punkter =====
    eksponentielToPunkter(niveau, rng) {
      const halv = niveau >= 3 && rng() < 0.4;
      const [at, an] = halv ? [1, 2] : [vaelg(rng, [2, 3]), 1];
      const b = halv ? vaelg(rng, [16, 32, 64]) : heltal(rng, 1, 6);
      const x1 = heltal(rng, 0, 2), dx = vaelg(rng, [1, 2]), x2 = x1 + dx;
      const yv = (xx) => [b * Math.pow(at, xx), Math.pow(an, xx)]; // y som brøk [tæller, nævner]
      const [y1t, y1n] = yv(x1), [y2t, y2n] = yv(x2);
      const exv = (bt, bn, t, n, f) => udv(mi('f') + par(mi('x')) + mo('=') + rat(bt, bn) + mo('·') + sup(n === 1 ? mn(t) : par(frac(mn(t), mn(n))), mi('x')), 'exp:' + frStr(bt, bn) + ';' + frStr(t, n), f);
      const o = { emne: 'funktioner', type: 'eksponentielToPunkter', niveau, noegle: 'exp2p:' + [b, at, an, x1, x2].join(','), p: { b, at, an, x1, x2 },
        spoerg: 'En eksponentiel funktion ' + math(mi('f') + par(mi('x')) + mo('=') + mi('b') + mo('·') + sup(mi('a'), mi('x'))) + ' går gennem ' + math(par(mn(x1) + mo(',') + rat(y1t, y1n))) + ' og ' + math(par(mn(x2) + mo(',') + rat(y2t, y2n))) + '. Find forskriften.',
        forklaring: math(sup(mi('a'), mn(dx)) + mo('=') + frac(rat(y2t, y2n), rat(y1t, y1n)) + mo('=') + rat(Math.pow(at, dx), Math.pow(an, dx))) + ', så ' + math(mi('a') + mo('=') + rat(at, an)) + '. ' + math(mi('b') + mo('=') + frac(rat(y1t, y1n), sup(mi('a'), mn(x1))) + mo('=') + mn(b)) };
      const f = [];
      if (dx === 2) {
        const At = Math.pow(at, 2), An = Math.pow(an, 2);
        f.push(exv(y1t * Math.pow(An, x1), y1n * Math.pow(At, x1), At, An, 'Glemt at tage roden (x₂ − x₁ = 2)'));
      }
      if (x1 !== 0) f.push(exv(y1t, y1n, at, an, 'b sat lig y₁ (glemt at dele med aˣ¹)'));
      // «Lineær» hældning brugt som a
      f.push(exv(b, 1, y2t * y1n - y1t * y2n, y1n * y2n * dx, 'Brugt den lineære hældning som a'));
      f.push(exv(b * at, an, at, an, 'b ganget med a'), exv(b, 1, at + an, an), exv(b + 1, 1, at, an));
      return opgave(o, rng, exv(b, 1, at, an), f.filter((x) => x.nøgle !== 'exp:' + b + ';' + frStr(at, an)));
    },

    // ===== IV.4 Potensfunktioner (valgfri) =====
    potensfunktion(niveau, rng) {
      const b = heltal(rng, 1, 5), a = heltal(rng, 2, 4);
      if (rng() < 0.5) {
        const o = { emne: 'funktioner', type: 'potensfunktion', niveau, noegle: 'potf:g' + a, p: { t: 'g', a, b },
          spoerg: math(mi('f') + par(mi('x')) + mo('=') + mn(b) + mo('·') + sup(mi('x'), mn(a))) + '. x fordobles. Hvor mange gange større bliver y?',
          forklaring: 'y ganges med ' + math(sup(mn(2), mn(a)) + mo('=') + mn(Math.pow(2, a))) + '.' };
        return opgave(o, rng, tal(Math.pow(2, a)), [tal(2 * a, 'Ganget 2 med eksponenten'), tal(2, 'Lineær tænkning'), tal(a + 2)]);
      }
      const o = { emne: 'funktioner', type: 'potensfunktion', niveau, noegle: 'potf:a' + a + ',' + b, p: { t: 'a', a, b },
        spoerg: 'En potensfunktion ' + math(mi('f') + par(mi('x')) + mo('=') + mi('b') + mo('·') + sup(mi('x'), mi('a'))) + ' har ' + math(mi('f') + par(mn(1)) + mo('=') + mn(b)) + ' og ' + math(mi('f') + par(mn(2)) + mo('=') + mn(b * Math.pow(2, a))) + '. Hvad er a?',
        forklaring: math(sup(mn(2), mi('a')) + mo('=') + frac(mn(b * Math.pow(2, a)), mn(b)) + mo('=') + mn(Math.pow(2, a))) + ', så ' + math(mi('a') + mo('=') + mn(a)) };
      return opgave(o, rng, tal(a), [tal(2 * a, 'Ganget med 2'), tal(Math.pow(2, a), 'Glemt at finde eksponenten'), tal(a + 2)]);
    },

    // ===== IV.5 Polynomier og parabler =====
    toppunkt(niveau, rng) {
      const a = vaelg(rng, [1, -1, 2]), p = heltal(rng, -4, 4), q = heltal(rng, -6, 6);
      const B = -2 * a * p, C = a * p * p + q;
      const T = (x, y, f) => udv(mi('T') + mo('=') + par(mn(x) + mo(',') + mn(y)), 'T:' + x + ',' + y, f);
      const o = { emne: 'funktioner', type: 'toppunkt', niveau, noegle: 'top:' + [a, p, q].join(','), p: { a, p, q },
        spoerg: 'Find toppunktet for parablen ' + math(mi('f') + par(mi('x')) + mo('=') + poly([a, B, C])),
        forklaring: math(mi('x') + mo('=') + frac(mo('−') + mi('b'), mn(2) + mi('a')) + mo('=') + mn(p)) + ' og ' + math(mi('f') + par(mn(p)) + mo('=') + mn(q)) };
      return opgave(o, rng, T(p, q), [T(-p, q, 'Fortegnsfejl i −b/(2a)'), T(p, -q, 'Glemt minus i −d/(4a)'), T(p, C, 'Brugt c som y-værdi'), T(p + 1, q), T(p, q - 1), T(p - 1, q + 1)]);
    },
    parabelFortegn(niveau, rng) {
      const a = vaelg(rng, [1, -1]);
      let p = heltal(rng, -2, 2), q = heltal(rng, -3, 3);
      const t = vaelg(rng, niveau === 1 ? ['a', 'c'] : ['a', 'c', 'd']);
      if (t === 'c' && a * p * p + q === 0) q += 1;
      const c = a * p * p + q;
      const v = t === 'a' ? a : t === 'c' ? c : -a * q; // d har samme fortegn som −a·q (toppunktet)
      const fortegn = v > 0 ? 'pos' : v < 0 ? 'neg' : 'nul';
      const tekst = { pos: 'positiv', neg: 'negativ', nul: 'nul' };
      const o = { emne: 'funktioner', type: 'parabelFortegn', niveau, noegle: 'parF:' + [t, a, p, q].join(','), p: { t, a, p, q },
        spoerg: 'Grafen er parablen ' + math(mi('y') + mo('=') + mi('a') + sup(mi('x'), mn(2)) + mo('+') + mi('b') + mi('x') + mo('+') + mi('c')) + '. Er ' + (t === 'd' ? 'diskriminanten d' : t) + ' positiv, negativ eller nul?',
        figur: { art: 'parabel', a, p, q },
        forklaring: t === 'a' ? (a > 0 ? 'Grenene vender opad: a > 0.' : 'Grenene vender nedad: a < 0.')
          : t === 'c' ? 'c er skæringen med y-aksen (ikke toppunktet): ' + math(mi('c') + mo('=') + mn(c)) + '.'
            : 'd > 0 betyder to nulpunkter, d = 0 ét og d < 0 ingen. Grafen har ' + (v > 0 ? 'to' : v === 0 ? 'ét' : 'ingen') + '.' };
      const alle = ['pos', 'neg', 'nul'].map((k) => ({ vis: tekst[k], nøgle: k }));
      const fejl = t === 'c' ? 'c er skæringen med y-aksen, ikke toppunktet' : t === 'd' ? 'd > 0 betyder to nulpunkter' : 'Se på grenenes retning';
      return opgave(o, rng, alle.find((x) => x.nøgle === fortegn), alle.filter((x) => x.nøgle !== fortegn).map((x) => Object.assign({}, x, { fejl })), 3);
    },

    // ===== V.1 Differentiation =====
    afledtMere(niveau, rng) {
      const x = mi('x');
      const fp = (ml, k, f) => udv(mi("f′") + par(x) + mo('=') + ml, k, f);
      if (niveau === 1) {
        const ikke0 = () => { let v; do { v = heltal(rng, -4, 4); } while (v === 0); return v; };
        const a = ikke0(), b = ikke0(), c = ikke0(), d = ikke0();
        const o = { emne: 'differential', type: 'afledtMere', niveau, noegle: 'afl:' + [a, b, c, d].join(','), p: { t: 'poly', a, b, c, d },
          spoerg: 'Find ' + math(mi("f′") + par(x)) + ' når ' + math(mi('f') + par(x) + mo('=') + poly([a, b, c, d])),
          forklaring: 'Led for led: ' + math(poly([3 * a, 2 * b, c])) + '. Konstanten ' + d + ' forsvinder.' };
        return opgave(o, rng, fp(poly([3 * a, 2 * b, c]), polyN([3 * a, 2 * b, c])), [fp(poly([3 * a, 2 * b, c + d]), polyN([3 * a, 2 * b, c + d]), 'Konstanten er ikke forsvundet'), fp(poly([3 * a, 2 * b, 0]), polyN([3 * a, 2 * b, 0]), 'Glemt (cx)′ = c'), fp(poly([3 * a, 2 * b, 0, c]), polyN([3 * a, 2 * b, 0, c]), 'Eksponenterne er ikke talt ned')]);
      }
      if (niveau === 2) {
        const k = 2 * heltal(rng, 1, 4);
        if (rng() < 0.5) {
          const o = { emne: 'differential', type: 'afledtMere', niveau, noegle: 'afl:rod' + k, p: { t: 'rod', k },
            spoerg: 'Find ' + math(mi("f′") + par(x)) + ' når ' + math(mi('f') + par(x) + mo('=') + mn(k) + sqrt(x)),
            forklaring: math(sqrt(x) + mo('=') + sup(x, frac(mn(1), mn(2)))) + ', så ' + math(mi("f′") + par(x) + mo('=') + mn(k) + mo('·') + frac(mn(1), mn(2)) + sup(x, mo('−') + frac(mn(1), mn(2))) + mo('=') + frac(mn(k / 2), sqrt(x))) };
          return opgave(o, rng, fp(frac(mn(k / 2), sqrt(x)), 'rod:' + k / 2), [fp(frac(mn(k), sqrt(x)), 'rod:' + k, 'Glemt at gange med ½'), fp(frac(mn(k) + sqrt(x), mn(2)), 'rodhalv:' + k, 'Kun delt med 2'), fp(mn(k) + mo('·') + mi('ln') + x, 'ln:' + k, 'Forvekslet med 1/x')]);
        }
        const o = { emne: 'differential', type: 'afledtMere', niveau, noegle: 'afl:inv' + k, p: { t: 'inv', k },
          spoerg: 'Find ' + math(mi("f′") + par(x)) + ' når ' + math(mi('f') + par(x) + mo('=') + frac(mn(k), x)),
          forklaring: math(frac(mn(k), x) + mo('=') + mn(k) + sup(x, mn(-1))) + ', så ' + math(mi("f′") + par(x) + mo('=') + mo('−') + mn(k) + sup(x, mn(-2)) + mo('=') + mo('−') + frac(mn(k), sup(x, mn(2)))) };
        return opgave(o, rng, fp(mo('−') + frac(mn(k), sup(x, mn(2))), 'inv:-' + k), [fp(frac(mn(k), sup(x, mn(2))), 'inv:' + k, 'Glemt minus'), fp(mn(k) + mo('·') + mi('ln') + x, 'ln:' + k, 'Forvekslet med stamfunktionen'), fp(mo('−') + frac(mn(k), x), 'inv1:-' + k, 'Eksponenten ikke talt ned')]);
      }
      const k = heltal(rng, 2, 5);
      if (rng() < 0.5) {
        const e = sup(mi('e'), mn(k) + x);
        const o = { emne: 'differential', type: 'afledtMere', niveau, noegle: 'afl:xe' + k, p: { t: 'xe', k },
          spoerg: 'Find ' + math(mi("f′") + par(x)) + ' når ' + math(mi('f') + par(x) + mo('=') + x + mo('·') + e) + ' (A)',
          forklaring: 'Produktreglen: ' + math(mn(1) + mo('·') + e + mo('+') + x + mo('·') + mn(k) + e + mo('=') + e + par(mn(1) + mo('+') + mn(k) + x)) };
        return opgave(o, rng, fp(e + par(mn(1) + mo('+') + mn(k) + x), 'xe:1+' + k + 'x'), [fp(mn(k) + e, 'xe:k', 'Kun den ene faktor differentieret'), fp(e, 'xe:1', 'Differentieret x og glemt resten'), fp(mn(k) + x + e, 'xe:kx', 'Produktreglen ikke brugt')]);
      }
      const a = heltal(rng, 2, 4), b = heltal(rng, -5, 5) || 1, n = heltal(rng, 2, 5);
      const ind = par(monom(a, 1) + plusLed(b));
      const o = { emne: 'differential', type: 'afledtMere', niveau, noegle: 'afl:sam' + [a, b, n].join(','), p: { t: 'sam', a, b, n },
        spoerg: 'Find ' + math(mi("f′") + par(x)) + ' når ' + math(mi('f') + par(x) + mo('=') + sup(ind, mn(n))) + ' (A)',
        forklaring: 'Ydre gange indre: ' + math(mn(n) + sup(ind, mn(n - 1)) + mo('·') + mn(a) + mo('=') + mn(n * a) + sup(ind, mn(n - 1))) };
      return opgave(o, rng, fp(mn(n * a) + sup(ind, mn(n - 1)), 'sam:' + n * a + ',' + (n - 1)), [fp(mn(n) + sup(ind, mn(n - 1)), 'sam:' + n + ',' + (n - 1), 'Glemt den indre afledte'), a !== n ? fp(mn(a) + sup(ind, mn(n - 1)), 'sam:a' + a + ',' + (n - 1), 'Glemt at gange eksponenten ned') : null, fp(mn(n * a) + sup(ind, mn(n)), 'sam:' + n * a + ',' + n, 'Eksponenten ikke talt ned'), fp(mn(n * a + 1) + sup(ind, mn(n - 1)), 'sam:' + (n * a + 1) + ',' + (n - 1))].filter(Boolean));
    },

    // ===== V.2 Tangentens ligning med ln og e =====
    tangentLnE(niveau, rng) {
      const x = mi('x');
      const lin = (m, q, f) => udv(mi('y') + mo('=') + (m === 0 ? '' : monom(m, 1)) + (m === 0 ? mn(q) : plusLed(q)), 'y:' + m + ',' + q, f);
      if (rng() < 0.5) {
        const k = heltal(rng, 2, 5), m = heltal(rng, -4, 4);
        const o = { emne: 'differential', type: 'tangentLnE', niveau, noegle: 'tanLn:' + k + ',' + m, p: { t: 'ln', k, m },
          spoerg: 'Find tangentens ligning til ' + math(mi('f') + par(x) + mo('=') + mn(k) + mi('ln') + x + plusLed(m)) + ' i ' + math(x + mo('=') + mn(1)) + '.',
          forklaring: math(mi('f') + par(mn(1)) + mo('=') + mn(m)) + ' (fordi ln 1 = 0) og ' + math(mi("f′") + par(mn(1)) + mo('=') + mn(k)) + ', så ' + math(mi('y') + mo('=') + mn(k) + par(x + mo('−') + mn(1)) + plusLed(m)) };
        return opgave(o, rng, lin(k, m - k), [lin(k, m, 'Brugt ln 1 = 1 (eller glemt at gange −1 ind)'), lin(1, m - 1, 'Glemt k i f′'), lin(k, m + k, 'Fortegnsfejl')]);
      }
      const k = heltal(rng, 2, 5), c = heltal(rng, 1, 4);
      const o = { emne: 'differential', type: 'tangentLnE', niveau, noegle: 'tanE:' + k + ',' + c, p: { t: 'e', k, c },
        spoerg: 'Find tangentens ligning til ' + math(mi('f') + par(x) + mo('=') + (c === 1 ? '' : mn(c)) + sup(mi('e'), mn(k) + x)) + ' i ' + math(x + mo('=') + mn(0)) + '.',
        forklaring: math(mi('f') + par(mn(0)) + mo('=') + mn(c)) + ' (fordi e⁰ = 1) og ' + math(mi("f′") + par(mn(0)) + mo('=') + mn(c * k)) + ', så ' + math(mi('y') + mo('=') + monom(c * k, 1) + plusLed(c)) };
      return opgave(o, rng, lin(c * k, c), [lin(c * k, 0, 'Brugt e⁰ = 0'), lin(c, c, 'Glemt k i f′'), lin(k, c, 'Glemt c i f′')]);
    },

    // ===== V.3 Væksthastighed =====
    vaeksthastighed(niveau, rng) {
      if (niveau === 1 || rng() < 0.4) {
        const a = heltal(rng, 1, 5), b = heltal(rng, 1, 9), t0 = heltal(rng, 2, 6);
        const o = { emne: 'differential', type: 'vaeksthastighed', niveau, noegle: 'vh:p' + [a, b, t0].join(','), p: { t: 'p', a, b, t0 },
          spoerg: 'En bil har kørt ' + math(mi('s') + par(mi('t')) + mo('=') + poly([a, b, 0]).replace(/<mi>x<\/mi>/g, '<mi>t</mi>')) + ' meter efter t sekunder. Hvad er farten (m/s) efter ' + t0 + ' sekunder?',
          forklaring: 'Farten er væksthastigheden: ' + math(mi("s′") + par(mi('t')) + mo('=') + mn(2 * a) + mi('t') + mo('+') + mn(b)) + ', så ' + math(mi("s′") + par(mn(t0)) + mo('=') + mn(2 * a * t0 + b)) };
        return opgave(o, rng, tal(2 * a * t0 + b), [tal(a * t0 * t0 + b * t0, 'Funktionsværdien i stedet for væksthastigheden'), tal(2 * a + b, 'Glemt at sætte t ind'), tal(a * t0 + b, 'Glemt at gange med 2')]);
      }
      const k = vaelg(rng, [0.1, 0.2, 0.5]), b = vaelg(rng, [100, 200, 500, 1000]);
      const v = Math.round(b * k);
      const o = { emne: 'differential', type: 'vaeksthastighed', niveau, noegle: 'vh:e' + k + ',' + b, p: { t: 'e', k, b },
        spoerg: 'En bakteriekultur har ' + math(mi('N') + par(mi('t')) + mo('=') + mn(b) + mo('·') + sup(mi('e'), mn(dec(k)) + mi('t'))) + ' bakterier efter t timer. Hvor hurtigt vokser den til tiden 0 (bakterier pr. time)?',
        forklaring: math(mi("N′") + par(mi('t')) + mo('=') + mn(b) + mo('·') + mn(dec(k)) + mo('·') + sup(mi('e'), mn(dec(k)) + mi('t'))) + ', og ' + math(sup(mi('e'), mn(0)) + mo('=') + mn(1)) + ', så ' + math(mi("N′") + par(mn(0)) + mo('=') + mn(v)) };
      return opgave(o, rng, tal(v), [tal(b, 'Funktionsværdien i stedet for væksthastigheden'), { vis: math(mn(dec(k))), nøgle: 'n:' + k, fejl: 'Kun vækstraten k' }, tal(b + v, 'Lagt sammen')]);
    },

    // ===== V.4 Monotoniforhold =====
    monotoniTo(niveau, rng) {
      const k = vaelg(rng, [1, 2, 3, -1]);
      let p, q;
      do { p = heltal(rng, -4, 3); q = heltal(rng, p + 1, 5); } while (p === q);
      const x = mi('x');
      const iv = (v, h, a, b) => mo(v) + (a === null ? mo('−') + mi('∞') : mn(a)) + mo(';') + (b === null ? mi('∞') : mn(b)) + mo(h);
      const fprime = (k === 1 ? '' : k === -1 ? mo('−') : mn(k)) + par(x + plusLed(-p)) + par(x + plusLed(-q));
      const t = vaelg(rng, ['voks', 'maks']);
      if (t === 'voks') {
        const ude = iv(']', ']', null, p) + mo('∪') + iv('[', '[', q, null);
        const inde = iv('[', ']', p, q);
        const o = { emne: 'differential', type: 'monotoniTo', niveau, noegle: 'mono2:v' + [k, p, q].join(','), p: { t, k, p, q },
          spoerg: 'Det oplyses, at ' + math(mi("f′") + par(x) + mo('=') + fprime) + '. Hvor er f voksende?',
          forklaring: 'f′ har nulpunkterne ' + p + ' og ' + q + '. ' + (k > 0 ? 'f′ ≥ 0 uden for dem (k > 0)' : 'f′ ≥ 0 mellem dem (k < 0)') + '. Endepunkterne regnes med (lukkede klammer).' };
        const rigtigUde = k > 0;
        return opgave(o, rng, udv(rigtigUde ? ude : inde, rigtigUde ? 'ude' : 'inde'), [udv(rigtigUde ? inde : ude, rigtigUde ? 'inde' : 'ude', 'Intervallerne byttet om'), udv(rigtigUde ? iv(']', '[', null, p) + mo('∪') + iv(']', '[', q, null) : iv(']', '[', p, q), 'aaben', 'Endepunkterne er med — lukkede klammer'), udv(rigtigUde ? iv('[', '[', q, null) : iv('[', '[', p, null), 'kun', 'Kun det ene interval')]);
      }
      const maks = k > 0 ? p : q;
      const o = { emne: 'differential', type: 'monotoniTo', niveau, noegle: 'mono2:m' + [k, p, q].join(','), p: { t, k, p, q },
        spoerg: 'Det oplyses, at ' + math(mi("f′") + par(x) + mo('=') + fprime) + '. Hvor har f lokalt maksimum?',
        forklaring: 'f går fra voksende (f′ > 0) til aftagende (f′ < 0) i ' + math(x + mo('=') + mn(maks)) + '.' };
      return opgave(o, rng, udv(x + mo('=') + mn(maks), 'x:' + maks), [udv(x + mo('=') + mn(k > 0 ? q : p), 'x:' + (k > 0 ? q : p), 'Det er lokalt minimum'), udv(x + mo('=') + mn(-maks), 'x:' + -maks, 'Fortegnsfejl'), udv(x + mo('=') + mn(0), 'x:0', 'f′(0) er ikke et ekstremum'), udv(x + mo('=') + mn(maks + 1), 'x:' + (maks + 1)), udv(x + mo('=') + mn(maks - 1), 'x:' + (maks - 1))].filter((f) => f.nøgle !== 'x:' + maks));
    },

    // ===== VI.1 Stamfunktioner =====
    stamfunktionMere(niveau, rng) {
      const x = mi('x');
      const Fk = (ml, k, f) => udv(mi('F') + par(x) + mo('=') + ml, k, f);
      if (niveau === 1) {
        const a = heltal(rng, 1, 4), b = heltal(rng, -4, 4) || 2, c = heltal(rng, -5, 5) || 3;
        const plusK = mo('+') + mi('k');
        const o = { emne: 'integral', type: 'stamfunktionMere', niveau, noegle: 'stam2:' + [a, b, c].join(','), p: { t: 'poly', a, b, c },
          spoerg: 'Find en stamfunktion til ' + math(mi('f') + par(x) + mo('=') + poly([3 * a, 2 * b, c])),
          forklaring: 'Led for led: tæl eksponenten op og del med den nye: ' + math(poly([a, b, c, 0]) + plusK) };
        return opgave(o, rng, Fk(poly([a, b, c, 0]) + plusK, 'F:' + [a, b, c].join(',')), [Fk(poly([6 * a, 2 * b]), 'F:diff', 'Differentieret i stedet'), Fk(poly([3 * a, 2 * b, c, 0]) + plusK, 'F:ikkedelt', 'Glemt at dele med den nye eksponent'), Fk(poly([a, b, c]) + plusK, 'F:cc', 'Konstanten c er ikke blevet til cx')]);
      }
      if (niveau === 2 && rng() < 0.5) {
        const k = heltal(rng, 2, 6), n = heltal(rng, 2, 4), m = n * heltal(rng, 1, 3);
        const e = sup(mi('e'), mn(n) + x);
        const o = { emne: 'integral', type: 'stamfunktionMere', niveau, noegle: 'stam2:ln' + [k, m, n].join(','), p: { t: 'lne', k, m, n },
          spoerg: 'Find en stamfunktion til ' + math(mi('f') + par(x) + mo('=') + frac(mn(k), x) + mo('+') + mn(m) + e),
          forklaring: math(frac(mn(1), x)) + ' giver ln|x|, og ' + math(sup(mi('e'), mi('n') + x)) + ' giver ' + math(frac(mn(1), mi('n')) + sup(mi('e'), mi('n') + x)) + ': ' + math(mn(k) + mi('ln') + mo('|') + x + mo('|') + mo('+') + (m / n === 1 ? '' : mn(m / n)) + e + mo('+') + mi('k')) };
        return opgave(o, rng, Fk(mn(k) + mi('ln') + mo('|') + x + mo('|') + mo('+') + (m / n === 1 ? '' : mn(m / n)) + e + mo('+') + mi('k'), 'F:ln' + k + ',' + m / n),
          [Fk(mo('−') + frac(mn(k), sup(x, mn(2))) + mo('+') + mn(m * n) + e, 'F:diff', 'Differentieret i stedet'), Fk(mn(k) + mi('ln') + mo('|') + x + mo('|') + mo('+') + mn(m * n) + e + mo('+') + mi('k'), 'F:ln' + k + ',' + m * n, 'Ganget med n i stedet for at dele'), Fk(frac(sup(x, mn(0)), mn(0)) + mo('+') + mn(m) + e, 'F:pot', 'Potensreglen gælder ikke for 1/x')]);
      }
      // Gennem et punkt: f(x) = 3a·x², F(x) = a·x³ + c, P(x0, y0)
      const a = heltal(rng, 1, 3), x0 = heltal(rng, -2, 2) || 1, y0 = heltal(rng, -6, 9);
      const c = y0 - a * x0 * x0 * x0;
      const o = { emne: 'integral', type: 'stamfunktionMere', niveau, noegle: 'stam2:P' + [a, x0, y0].join(','), p: { t: 'P', a, x0, y0 },
        spoerg: 'Find tallet c, så ' + math(mi('F') + par(x) + mo('=') + monom(a, 3) + mo('+') + mi('c')) + ' er den stamfunktion til ' + math(mi('f') + par(x) + mo('=') + monom(3 * a, 2)) + ', der går gennem ' + math(par(mn(x0) + mo(',') + mn(y0))) + '.',
        forklaring: math(mi('F') + par(mn(x0)) + mo('=') + mn(a * x0 * x0 * x0) + mo('+') + mi('c') + mo('=') + mn(y0)) + ', så ' + math(mi('c') + mo('=') + mn(c)) };
      return opgave(o, rng, tal(c), [tal(y0 + a * x0 * x0 * x0, 'Fortegnsfejl: lagt F(x₀) til'), tal(y0, 'Brugt y₀ som c'), tal(c + 1)]);
    },

    // ===== VI.2 Bestemte integraler =====
    bestemtAB(niveau, rng) {
      const x = mi('x');
      const int = (a, b, f) => '<msubsup><mo>∫</mo>' + row(mn(a)) + row(mn(b)) + '</msubsup>' + f + mi('d') + x;
      if (niveau <= 2) {
        const a = heltal(rng, 1, 3), b = heltal(rng, a + 1, 4);
        const t = vaelg(rng, niveau === 1 ? ['konst', 'lin'] : ['lin', 'kvad']);
        const c = t === 'lin' ? 2 * heltal(rng, 1, 3) : heltal(rng, 1, 3);
        const F = (v) => t === 'konst' ? c * v : t === 'lin' ? (c / 2) * v * v : c * v * v * v;
        const f = (v) => t === 'konst' ? c : t === 'lin' ? c * v : 3 * c * v * v;
        const fx = t === 'konst' ? mn(c) : t === 'lin' ? monom(c, 1) : monom(3 * c, 2);
        const o = { emne: 'integral', type: 'bestemtAB', niveau, noegle: 'bestAB:' + [t, c, a, b].join(','), p: { t, c, a, b },
          spoerg: 'Udregn ' + math(int(a, b, fx)),
          forklaring: 'Find en stamfunktion F og udregn ' + math(mi('F') + par(mn(b)) + mo('−') + mi('F') + par(mn(a)) + mo('=') + mn(F(b)) + mo('−') + led(F(a)) + mo('=') + mn(F(b) - F(a))) };
        const fl = [tal(F(a) - F(b), 'Grænserne byttet om: F(a) − F(b)'), tal(F(b), 'Glemt at trække F(a) fra')];
        if (t !== 'konst') fl.push(tal(f(b) - f(a), 'Brugt f i stedet for stamfunktionen'));
        return opgave(o, rng, tal(F(b) - F(a)), fl.concat(naboer(rng, F(b) - F(a), []).map((v) => tal(v))));
      }
      const p = vaelg(rng, [3, 6]);
      const o = { emne: 'integral', type: 'bestemtAB', niveau, noegle: 'bestAB:areal' + p, p: { t: 'areal', p },
        spoerg: 'Find arealet mellem x-aksen og grafen for ' + math(mi('f') + par(x) + mo('=') + poly([-1, p, 0])) + '.',
        forklaring: 'Nulpunkterne er 0 og ' + p + ': ' + math(int(0, p, par(poly([-1, p, 0]))) + mo('=') + broek(p * p * p, 6)) };
      return opgave(o, rng, bv(p * p * p, 6), [bv(-p * p * p, 6, 'Fortegnsfejl — et areal er positivt'), bv(-p * p * p, 2, 'Glemt at dele x³ med 3'), bv(3 * p - 2, 6, 'Brugt 0 og 1 som grænser')]);
    },

    // ===== VI.3 Integral og areal =====
    arealMellem(niveau, rng) {
      if (niveau === 1) {
        const A1 = heltal(rng, 3, 9), A2 = heltal(rng, 1, 8);
        const o = { emne: 'integral', type: 'arealMellem', niveau, noegle: 'arealM:' + A1 + ',' + A2, p: { t: 'f', A1, A2 },
          spoerg: 'Grafen for f afgrænser et område over x-aksen med arealet ' + A1 + ' og et område under x-aksen med arealet ' + A2 + ' (fra a til b). Hvad er ' + math('<msubsup><mo>∫</mo><mi>a</mi><mi>b</mi></msubsup>' + mi('f') + par(mi('x')) + mi('d') + mi('x')) + '?',
          forklaring: 'Areal over aksen tæller med plus, under med minus: ' + math(mn(A1) + mo('−') + mn(A2) + mo('=') + mn(A1 - A2)) };
        return opgave(o, rng, tal(A1 - A2), [tal(A1 + A2, 'Arealet under aksen tæller med minus'), tal(A2 - A1, 'Fortegnet vendt'), tal(A1 - A2 + 1)]);
      }
      const k = heltal(rng, 1, 4);
      const o = { emne: 'integral', type: 'arealMellem', niveau, noegle: 'arealM:k' + k, p: { t: 'kx', k },
        spoerg: 'Find arealet mellem graferne for ' + math(mi('f') + par(mi('x')) + mo('=') + monom(k, 1)) + ' og ' + math(mi('g') + par(mi('x')) + mo('=') + sup(mi('x'), mn(2))) + '.',
        forklaring: 'Skæring i 0 og ' + k + ', og f ≥ g dér: ' + math('<msubsup><mo>∫</mo>' + row(mn(0)) + row(mn(k)) + '</msubsup>' + par(monom(k, 1) + mo('−') + sup(mi('x'), mn(2))) + mi('d') + mi('x') + mo('=') + broek(k * k * k, 6)) };
      return opgave(o, rng, bv(k * k * k, 6), [bv(-k * k * k, 6, 'Trukket i forkert rækkefølge (g − f)'), bv(k * k * k, 2, 'Kun integreret kx'), bv(k * k * k, 3, 'Kun integreret x²')]);
    },

    // ===== VII.1 Cirkel: omskriv ved kvadratkomplettering =====
    cirkelOmskriv(niveau, rng) {
      let a, b, r;
      do { a = heltal(rng, -5, 5); b = heltal(rng, -5, 5); r = heltal(rng, 1, 6); } while (a === 0 && b === 0);
      const C = a * a + b * b - r * r;
      const x = mi('x'), y = mi('y');
      const venstre = sup(x, mn(2)) + plusMonom(-2 * a, 1, 'x') + mo('+') + sup(y, mn(2)) + plusMonom(-2 * b, 1, 'y') + (C ? plusLed(C) : '');
      const svar = (ca, cb, rr, rk, f) => ({ vis: 'centrum ' + math(par(mn(ca) + mo(',') + mn(cb))) + ', radius ' + math(rr), nøgle: 'c:' + ca + ',' + cb + ',' + rk, fejl: f });
      const o = { emne: 'abonus', type: 'cirkelOmskriv', niveau, noegle: 'cirkelO:' + [a, b, r].join(','), p: { a, b, r },
        spoerg: 'Find centrum og radius for cirklen ' + math(lign(venstre, mn(0))),
        forklaring: 'Kvadratkomplettering: ' + math(sup(par(x + plusLed(-a)), mn(2)) + mo('+') + sup(par(y + plusLed(-b)), mn(2)) + mo('=') + mn(r * r)) };
      const f = [svar(-a, -b, mn(r), String(r), 'Fortegnsfejl i centrum'), svar(a, b, mn(r * r), String(r * r), 'Glemt at tage roden af r²')];
      const rest = r * r - a * a - b * b;
      if (rest > 0 && !Number.isInteger(Math.sqrt(rest))) f.push(svar(a, b, sqrt(mn(rest)), 'r' + rest, 'Glemt at flytte a² + b² over'));
      else if (rest > 0) f.push(svar(a, b, mn(Math.sqrt(rest)), String(Math.sqrt(rest)), 'Glemt at flytte a² + b² over'));
      f.push(svar(b, a, mn(r), String(r), 'x og y byttet om'), svar(a, b, mn(r + 1), String(r + 1)));
      return opgave(o, rng, svar(a, b, mn(r), String(r)), f.filter((s) => s.nøgle !== 'c:' + a + ',' + b + ',' + r));
    },

    // ===== VII.2 Ortogonale og parallelle vektorer =====
    vektorK(niveau, rng) {
      const ikke0 = (lo, hi) => { let v; do { v = heltal(rng, lo, hi); } while (v === 0); return v; };
      const ortogonal = rng() < 0.5;
      const p = ikke0(-4, 4), q = ikke0(-4, 4);
      let s, t;
      if (ortogonal) { do { s = ikke0(-4, 4); } while ((p * q) % s !== 0); t = -p * q / s; }
      else { s = ikke0(-5, 5); t = p * s / q; if (!Number.isInteger(t)) { s = q * heltal(rng, 1, 2); t = p * s / q; } }
      const o = { emne: 'abonus', type: 'vektorK', niveau, noegle: 'vekK:' + (ortogonal ? 'o' : 'p') + [p, q, s].join(','), p: { ortogonal, p, q, s },
        spoerg: 'For hvilket t er ' + math(par('<mtable><mtr><mtd>' + mn(p) + '</mtd></mtr><mtr><mtd>' + mi('t') + '</mtd></mtr></mtable>')) + ' og ' + math(vektor(q, s)) + ' ' + (ortogonal ? 'ortogonale' : 'parallelle') + '?',
        forklaring: ortogonal ? 'Prikproduktet er 0: ' + math(mn(p) + mo('·') + led(q) + mo('+') + mi('t') + mo('·') + led(s) + mo('=') + mn(0)) + ', så ' + math(mi('t') + mo('=') + mn(t))
          : 'Determinanten er 0: ' + math(mn(p) + mo('·') + led(s) + mo('−') + mi('t') + mo('·') + led(q) + mo('=') + mn(0)) + ', så ' + math(mi('t') + mo('=') + mn(t)) };
      const andet = ortogonal ? p * s / q : -p * q / s;
      const f = [tal(-t, 'Fortegnsfejl')];
      if (Number.isInteger(andet)) f.push(tal(andet, ortogonal ? 'Brugt kravet for parallelle (determinanten)' : 'Brugt kravet for ortogonale (prikproduktet)'));
      f.push(tal(s, 'Sat t lig den anden vektors y-koordinat'));
      return opgave(o, rng, tal(t), f.filter((x) => x.nøgle !== 'n:' + t));
    },
    parallelogramAreal(niveau, rng) {
      let a1, a2, b1, b2, det;
      do { a1 = heltal(rng, -4, 5); a2 = heltal(rng, -4, 5); b1 = heltal(rng, -4, 5); b2 = heltal(rng, -4, 5); det = a1 * b2 - a2 * b1; } while (det === 0 || (rng() < 0.6 && det > 0));
      const trekant = niveau >= 3 && rng() < 0.5;
      const o = { emne: 'abonus', type: 'parallelogramAreal', niveau, noegle: 'parA:' + (trekant ? 't' : 'p') + [a1, a2, b1, b2].join(','), p: { trekant, a1, a2, b1, b2 },
        spoerg: 'Find arealet af ' + (trekant ? 'trekanten' : 'parallelogrammet') + ' udspændt af ' + math(vektor(a1, a2)) + ' og ' + math(vektor(b1, b2)) + '.',
        forklaring: math(mi('det') + mo('=') + mn(a1) + mo('·') + led(b2) + mo('−') + led(a2) + mo('·') + led(b1) + mo('=') + mn(det)) + (trekant ? ', og trekanten er det halve af ' : ', og arealet er ') + math(mo('|') + mn(det) + mo('|') + mo('=') + mn(Math.abs(det))) };
      const n = trekant ? 2 : 1;
      const f = [bv(Math.abs(a1 * b1 + a2 * b2), n, 'Brugt prikproduktet'), bv(Math.abs(a1 * b2 + a2 * b1), n, 'Lagt sammen i stedet for at trække fra')];
      if (det < 0) f.unshift(bv(det, n, 'Glemt numerisk tegn — et areal er positivt'));
      if (trekant) f.push(bv(Math.abs(det), 1, 'Glemt ½ for trekanten'));
      f.push(bv(Math.abs(det) + 1, n), bv(Math.abs(det) + 2, n), bv(Math.abs(det) + 3, n));
      return opgave(o, rng, bv(Math.abs(det), n), f);
    },
    projektion(niveau, rng) {
      const [b1, b2] = vaelg(rng, [[3, 4], [1, 0], [0, 2], [1, 1]]);
      const B2 = b1 * b1 + b2 * b2;
      let lam;
      do { lam = heltal(rng, -3, 3); } while (lam === 0);
      // a = λ·b + en vektor vinkelret på b
      const m = heltal(rng, -2, 2) || 1;
      const a1 = lam * b1 - m * b2, a2 = lam * b2 + m * b1;
      const prik = a1 * b1 + a2 * b2; // = λ·|b|²
      const vv = (x, y, f) => udv(vektor(x, y), 'v:' + x + ',' + y, f);
      const o = { emne: 'abonus', type: 'projektion', niveau, noegle: 'proj:' + [a1, a2, b1, b2].join(','), p: { a1, a2, b1, b2 },
        spoerg: 'Find projektionen af ' + math(vektor(a1, a2)) + ' på ' + math(vektor(b1, b2)) + '.',
        forklaring: math(frac(mi('a') + mo('·') + mi('b'), sup(mo('|') + mi('b') + mo('|'), mn(2))) + mo('=') + frac(mn(prik), mn(B2)) + mo('=') + mn(lam)) + ', så projektionen er ' + math(mn(lam) + mo('·') + vektor(b1, b2) + mo('=') + vektor(lam * b1, lam * b2)) };
      const f = [vv(-lam * b1, -lam * b2, 'Fortegnsfejl'), tal(prik, 'Prikproduktet er et tal — projektionen er en vektor')];
      const lb = Math.sqrt(B2);
      if (Number.isInteger(lb) && lb !== 1) f.unshift(vv(lam * lb * b1, lam * lb * b2, 'Delt med |b| i stedet for |b|²'));
      f.push(vv(lam * b1 + 1, lam * b2));
      return opgave(o, rng, vv(lam * b1, lam * b2), f);
    },

    // ===== VII.3 Parameterfremstillinger =====
    parameterLinje(niveau, rng) {
      let A1, A2, B1, B2;
      do { A1 = heltal(rng, -5, 5); A2 = heltal(rng, -5, 5); B1 = heltal(rng, -5, 5); B2 = heltal(rng, -5, 5); } while (A1 === B1 && A2 === B2);
      const r1 = B1 - A1, r2 = B2 - A2;
      const t = mi('t');
      const pf = (p1, p2, q1, q2) => vektor(p1, p2) + mo('+') + t + mo('·') + vektor(q1, q2);
      const xy = par('<mtable><mtr><mtd>' + mi('x') + '</mtd></mtr><mtr><mtd>' + mi('y') + '</mtd></mtr></mtable>') + mo('=');
      if (niveau >= 3 && rng() < 0.5) {
        const t0 = vaelg(rng, [-1, 2, 3]);
        const ligger = rng() < 0.5;
        // Forskudt 1 væk fra linjen (i x, hvis linjen er lodret)
        const P1 = A1 + t0 * r1 + (ligger || r1 !== 0 ? 0 : 1), P2 = A2 + t0 * r2 + (ligger || r1 === 0 ? 0 : 1);
        const o = { emne: 'abonus', type: 'parameterLinje', niveau, noegle: 'parL:p' + [A1, A2, r1, r2, P1, P2].join(','), p: { t: 'p', A1, A2, r1, r2, P1, P2 },
          spoerg: 'Ligger ' + math(mi('P') + par(mn(P1) + mo(',') + mn(P2))) + ' på linjen ' + math(xy + pf(A1, A2, r1, r2)) + '?',
          forklaring: (r1 !== 0 ? 'Løs x-koordinaten: ' + math(mn(A1) + plusMonom(r1, 1, 't') + mo('=') + mn(P1)) + ' giver t = ' + t0 + '. ' : 'Prøv t = ' + t0 + '. ') + 'Så er y = ' + (A2 + t0 * r2) + (ligger ? ' ✓ — ja.' : ', ikke ' + P2 + ' — nej.') };
        return opgave(o, rng, ligger ? ja : nej, [ligger ? nej : ja], 2);
      }
      const pv = (p1, p2, q1, q2, f) => udv(xy + pf(p1, p2, q1, q2), 'pf:' + [p1, p2, q1, q2].join(','), f);
      const o = { emne: 'abonus', type: 'parameterLinje', niveau, noegle: 'parL:' + [A1, A2, B1, B2].join(','), p: { t: 'l', A1, A2, B1, B2 },
        spoerg: 'Find en parameterfremstilling for linjen gennem ' + math(mi('A') + par(mn(A1) + mo(',') + mn(A2))) + ' og ' + math(mi('B') + par(mn(B1) + mo(',') + mn(B2))) + '.',
        forklaring: 'Retningsvektoren er ' + math(mover('AB') + mo('=') + vektor(r1, r2)) + ', og A er et punkt på linjen.' };
      const f = [pv(A1, A2, B1 + A1, B2 + A2, 'Lagt punkterne sammen i stedet for at trække fra'), pv(r1, r2, A1, A2, 'Punkt og retning byttet om')];
      f.push(r1 !== 0 ? pv(A1, A2, -r1, r2, 'Fortegnsfejl i retningsvektoren') : pv(A1, A2, r1, -r2, 'Fortegnsfejl i retningsvektoren'));
      return opgave(o, rng, pv(A1, A2, r1, r2), f.filter((x) => x.nøgle !== 'pf:' + [A1, A2, r1, r2].join(',')));
    },

    // ===== VII.4 Ligning for en linje =====
    linjeLigning(niveau, rng) {
      const ikke0 = () => { let v; do { v = heltal(rng, -4, 4); } while (v === 0); return v; };
      const a = ikke0(), b = ikke0(), x0 = heltal(rng, -4, 4), y0 = heltal(rng, -4, 4);
      const lin = (aa, bb, cc, f) => udv(monom(aa, 1, 'x') + plusMonom(bb, 1, 'y') + (cc ? plusLed(cc) : '') + mo('=') + mn(0), 'll:' + [aa, bb, cc].join(','), f);
      if (niveau >= 3 && rng() < 0.4) {
        const c = heltal(rng, -6, 6);
        const nv = (x, y, f) => udv(vektor(x, y), 'v:' + x + ',' + y, f);
        const o = { emne: 'abonus', type: 'linjeLigning', niveau, noegle: 'linL:n' + [a, b, c].join(','), p: { t: 'n', a, b, c },
          spoerg: 'Aflæs en normalvektor til linjen ' + math(monom(a, 1, 'x') + plusMonom(b, 1, 'y') + (c ? plusLed(c) : '') + mo('=') + mn(0)) + '.',
          forklaring: 'Koefficienterne til x og y er en normalvektor: ' + math(vektor(a, b)) };
        return opgave(o, rng, nv(a, b), [nv(b, -a, 'Det er en retningsvektor'), nv(a, -b, 'Fortegnsfejl'), udv(par('<mtable><mtr><mtd>' + mn(a) + '</mtd></mtr><mtr><mtd>' + mn(b) + '</mtd></mtr><mtr><mtd>' + mn(c) + '</mtd></mtr></mtable>'), 'v3', 'c hører ikke med')].filter((x) => x.nøgle !== 'v:' + a + ',' + b));
      }
      const c = -(a * x0 + b * y0);
      const o = { emne: 'abonus', type: 'linjeLigning', niveau, noegle: 'linL:' + [a, b, x0, y0].join(','), p: { t: 'l', a, b, x0, y0 },
        spoerg: 'Find en ligning for linjen gennem ' + math(mi('A') + par(mn(x0) + mo(',') + mn(y0))) + ' med normalvektoren ' + math(vektor(a, b)) + '.',
        forklaring: math(mn(a) + par(mi('x') + plusLed(-x0)) + plusLed(b) + par(mi('y') + plusLed(-y0)) + mo('=') + mn(0)) + ' giver ' + math(monom(a, 1, 'x') + plusMonom(b, 1, 'y') + (c ? plusLed(c) : '') + mo('=') + mn(0)) };
      const f = [lin(a, b, -c, 'Fortegnsfejl i c'), lin(b, -a, -(b * x0 - a * y0), 'Brugt normalvektoren som retningsvektor')];
      if (x0 !== 0 && y0 !== 0) f.push(lin(x0, y0, -(x0 * a + y0 * b), 'Punkt og normalvektor byttet om'));
      f.push(lin(a, b, c + 1));
      return opgave(o, rng, lin(a, b, c), f.filter((x) => x.nøgle !== 'll:' + [a, b, c].join(',')));
    },

    // ===== VII.5 Afstand med dist-formlen (valgfri) =====
    distFormel(niveau, rng) {
      const [a, b] = vaelg(rng, [[3, 4], [4, 3], [6, 8], [5, 12], [-3, 4]]);
      const Lr = Math.sqrt(a * a + b * b);
      const x1 = heltal(rng, -4, 4), y1 = heltal(rng, -4, 4), d = heltal(rng, 1, 5);
      const s = rng() < 0.6 ? -1 : 1;
      const c = s * d * Lr - (a * x1 + b * y1);
      const vaerdi = a * x1 + b * y1 + c; // = s·d·L
      const o = { emne: 'abonus', type: 'distFormel', niveau, noegle: 'dist:' + [a, b, c, x1, y1].join(','), p: { a, b, c, x1, y1 },
        spoerg: 'Find afstanden fra ' + math(mi('P') + par(mn(x1) + mo(',') + mn(y1))) + ' til linjen ' + math(monom(a, 1, 'x') + plusMonom(b, 1, 'y') + (c ? plusLed(c) : '') + mo('=') + mn(0)) + '.',
        forklaring: math(mi('dist') + mo('=') + frac(mo('|') + mn(vaerdi) + mo('|'), sqrt(mn(a * a + b * b))) + mo('=') + frac(mn(Math.abs(vaerdi)), mn(Lr)) + mo('=') + mn(d)) };
      const f = [];
      if (s < 0) f.push(bv(-d, 1, 'Glemt numerisk tegn — en afstand er aldrig negativ'));
      f.push(bv(Math.abs(vaerdi), Lr * Lr, 'Delt med a² + b² i stedet for kvadratroden'));
      f.push(bv(Math.abs(a * x1 + b * y1), Lr, 'Glemt c'));
      f.push(bv(d + 1, 1));
      return opgave(o, rng, bv(d, 1), f);
    },

    // ===== VII.6 Skæring =====
    skaering(niveau, rng) {
      const x = mi('x'), y = mi('y');
      const pt = (p, f) => udv(p.map((q) => par(mn(q[0]) + mo(',') + mn(q[1]))).join(mo('og')), 'pt:' + p.map((q) => q.join(',')).sort().join(';'), f);
      if (niveau === 1) {
        const x0 = heltal(rng, -4, 4), y0 = heltal(rng, -4, 4);
        let a1, a2;
        do { a1 = heltal(rng, -3, 3); a2 = heltal(rng, -3, 3); } while (a1 === a2 || a1 === 0);
        const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
        const o = { emne: 'abonus', type: 'skaering', niveau, noegle: 'skaer:l' + [a1, b1, a2, b2].join(','), p: { t: 'l', a1, b1, a2, b2 },
          spoerg: 'Find skæringspunktet mellem ' + math(y + mo('=') + (a1 ? monom(a1, 1) : '') + (a1 ? plusLed(b1) : mn(b1))) + ' og ' + math(y + mo('=') + (a2 ? monom(a2, 1) + (b2 ? plusLed(b2) : '') : mn(b2))) + '.',
          forklaring: 'Sæt dem lig hinanden og løs: ' + math(x + mo('=') + mn(x0)) + ', og så ' + math(y + mo('=') + mn(y0)) };
        const f = [];
        if (x0 !== y0) f.push(pt([[y0, x0]], 'x og y byttet om'));
        f.push(pt([[-x0, -a1 * x0 + b1]], 'Fortegnsfejl i x'));
        f.push(pt([[x0, a2 * x0 + b1]], 'De to linjer blandet sammen'));
        f.push(pt([[x0, y0 + 1]]), pt([[x0 + 1, y0]]), pt([[x0 - 1, y0 - 1]]));
        return opgave(o, rng, pt([[x0, y0]]), f.filter((q) => q.nøgle !== 'pt:' + x0 + ',' + y0));
      }
      if (niveau === 2) {
        const m = 2 * heltal(rng, -2, 2);
        const art = heltal(rng, 0, 2);
        const pk = art === 1 ? m * m / 4 : art === 0 ? m * m / 4 + heltal(rng, 1, 4) : m * m / 4 - heltal(rng, 1, 4);
        const k = heltal(rng, -3, 3), p = pk + k;
        const d = m * m - 4 * (p - k);
        const antal = d > 0 ? 2 : d === 0 ? 1 : 0;
        const o = { emne: 'abonus', type: 'skaering', niveau, noegle: 'skaer:p' + [p, m, k].join(','), p: { t: 'p', p, m, k },
          spoerg: 'Hvor mange skæringspunkter har parablen ' + math(y + mo('=') + sup(x, mn(2)) + (p ? plusLed(p) : '')) + ' og linjen ' + math(y + mo('=') + (m ? monom(m, 1) + (k ? plusLed(k) : '') : mn(k))) + '?',
          forklaring: 'Sæt lig hinanden: ' + math(lign(poly([1, -m, p - k]), mn(0))) + ', ' + math(mi('d') + mo('=') + mn(d)) + '.' };
        return opgave(o, rng, tal(antal), [0, 1, 2].filter((v) => v !== antal).map((v) => tal(v, 'd > 0: to, d = 0: ét, d < 0: ingen')), 3);
      }
      const L = vaelg(rng, [{ m: 1, k: 1, p: [[3, 4], [-4, -3]] }, { m: 1, k: -1, p: [[4, 3], [-3, -4]] }, { m: -1, k: 7, p: [[3, 4], [4, 3]] }, { m: -1, k: -1, p: [[3, -4], [-4, 3]] }]);
      const o = { emne: 'abonus', type: 'skaering', niveau, noegle: 'skaer:c' + L.m + ',' + L.k, p: { t: 'c', m: L.m, k: L.k },
        spoerg: 'Find skæringspunkterne mellem cirklen ' + math(sup(x, mn(2)) + mo('+') + sup(y, mn(2)) + mo('=') + mn(25)) + ' og linjen ' + math(y + mo('=') + monom(L.m, 1) + plusLed(L.k)) + '.',
        forklaring: 'Sæt y ind i cirklens ligning og løs andengradsligningen; find så y af linjens ligning.' };
      return opgave(o, rng, pt(L.p), [pt([L.p[0]], 'Kun det ene skæringspunkt'), pt(L.p.map((q) => [q[1], q[0]]), 'x og y byttet om'), pt(L.p.map((q) => [-q[0], -q[1]]), 'Fortegnsfejl')].filter((q) => q.nøgle !== pt(L.p).nøgle));
    },

    // ===== VIII.1 Er en opgivet funktion løsning? =====
    difflignMere(niveau, rng) {
      const x = mi('x'), y = mi('y');
      const t = vaelg(rng, niveau >= 3 ? ['pot', 'exp', 'anden'] : ['pot', 'exp']);
      const er = rng() < 0.5;
      if (t === 'pot') {
        const a = heltal(rng, 2, 5), n = heltal(rng, 2, 4), c = heltal(rng, -5, 5);
        const n2 = er ? n : n + 1;
        const o = { emne: 'abonus', type: 'difflignMere', niveau, noegle: 'dlm:p' + [a, n, c, n2].join(','), p: { t, a, n, c, n2 },
          spoerg: 'Er ' + math(mi('f') + par(x) + mo('=') + monom(a, n) + (c ? plusLed(c) : '')) + ' en løsning til ' + math(mi("y′") + mo('=') + monom(n2 * a, n2 - 1)) + '?',
          forklaring: math(mi("f′") + par(x) + mo('=') + monom(n * a, n - 1)) + (er ? ' — det passer, så ja.' : ' — det er ikke ' + math(monom(n2 * a, n2 - 1)) + ', så nej.') };
        return opgave(o, rng, er ? ja : nej, [er ? nej : ja], 2);
      }
      if (t === 'exp') {
        const c = heltal(rng, 2, 5), m = heltal(rng, 2, 4), k = heltal(rng, 1, 6);
        const fk = er ? -k : k;
        const o = { emne: 'abonus', type: 'difflignMere', niveau, noegle: 'dlm:e' + [c, m, k, fk].join(','), p: { t, c, m, k, fk },
          spoerg: 'Er ' + math(mi('f') + par(x) + mo('=') + mn(c) + sup(mi('e'), mn(m) + x) + plusLed(fk)) + ' en løsning til ' + math(mi("y′") + mo('=') + mn(m) + y + plusLed(m * k)) + '?',
          forklaring: 'Venstre side: ' + math(mn(c * m) + sup(mi('e'), mn(m) + x)) + '. Højre side: ' + math(mn(m) + par(mn(c) + sup(mi('e'), mn(m) + x) + plusLed(fk)) + plusLed(m * k) + mo('=') + mn(c * m) + sup(mi('e'), mn(m) + x) + (m * fk + m * k ? plusLed(m * fk + m * k) : '')) + (er ? ' — ens, så ja.' : ' — ikke ens, så nej.') };
        return opgave(o, rng, er ? ja : nej, [er ? nej : ja], 2);
      }
      const m = 2 * heltal(rng, 1, 4), p = heltal(rng, -4, 4), q = heltal(rng, -4, 4);
      const a = er ? m / 2 : m;
      const o = { emne: 'abonus', type: 'difflignMere', niveau, noegle: 'dlm:a' + [m, p, q, a].join(','), p: { t, m, a },
        spoerg: 'Er ' + math(mi('f') + par(x) + mo('=') + poly([a, p, q])) + ' en løsning til ' + math(mi("y″") + mo('=') + mn(m)) + '?',
        forklaring: math(mi("f″") + par(x) + mo('=') + mn(2 * a)) + (er ? ' — ja.' : ', ikke ' + m + ' — nej.') };
      return opgave(o, rng, er ? ja : nej, [er ? nej : ja], 2);
    },
    difflignTangent(niveau, rng) {
      const p = heltal(rng, -3, 3), q = heltal(rng, -3, 3) || 1, r = heltal(rng, -4, 4);
      let x0, y0;
      do { x0 = heltal(rng, -3, 3); y0 = heltal(rng, -3, 3); } while (x0 === y0 || x0 === 0);
      const m = p * x0 + q * y0 + r;
      const lin = (mm, qq, f) => udv(mi('y') + mo('=') + (mm === 0 ? mn(qq) : monom(mm, 1) + (qq ? plusLed(qq) : '')), 'y:' + mm + ',' + qq, f);
      const ret = (p ? monom(p, 1) : '') + (p ? plusMonom(q, 1, 'y') : monom(q, 1, 'y')) + (r ? plusLed(r) : '');
      const o = { emne: 'abonus', type: 'difflignTangent', niveau, noegle: 'dlt:' + [p, q, r, x0, y0].join(','), p: { p, q, r, x0, y0 },
        spoerg: 'f er en løsning til ' + math(mi("y′") + mo('=') + ret) + ', og ' + math(mi('P') + par(mn(x0) + mo(',') + mn(y0))) + ' ligger på grafen. Find tangentens ligning i P.',
        forklaring: 'Hældningen er ' + math(mi("y′") + mo('=') + mn(m)) + ', så ' + math(mi('y') + mo('=') + mn(m) + par(mi('x') + plusLed(-x0)) + plusLed(y0)) };
      const m2 = p * y0 + q * x0 + r;
      const f = [lin(m, -m * x0, 'Glemt + y₀'), lin(m, y0, 'Glemt at trække m·x₀ fra')];
      if (m2 !== m) f.unshift(lin(m2, y0 - m2 * x0, 'x₀ og y₀ byttet om i hældningen'));
      f.push(lin(m, y0 - m * x0 + 1), lin(m + 1, y0 - m * x0), lin(-m, y0 + m * x0));
      return opgave(o, rng, lin(m, y0 - m * x0), f.filter((z) => z.nøgle !== 'y:' + m + ',' + (y0 - m * x0)));
    },
  };
  const mover = (t) => '<mover>' + row(mi(t)) + row(mo('→')) + '</mover>';
  Object.assign(V, L);

  const VOKSEN_EMNER = {
    regnetricks: { navn: 'Regnetricks', e: '🧠', maxNiveau: 3, typer: { 1: ['hierarki', 'kvadratTrick', 'fortegn'], 2: ['kvadratTrick', 'fortegn', 'hierarki', 'findFejlen'], 3: ['kvadratTrick', 'fortegn', 'findFejlen'] } },
    broeker: { navn: 'Brøker og potenser', e: '🍰', maxNiveau: 3, typer: { 1: ['broekPlus', 'potensGange', 'nulPotens'], 2: ['broekPlus', 'potensGange', 'nulPotens', 'forkort'], 3: ['broekPlus', 'potensGange', 'nulPotens', 'forkort'] } },
    ligninger: { navn: 'Ligninger', e: '⚖️', maxNiveau: 3, typer: { 1: ['lineaer', 'isoler', 'erLoesning'], 2: ['lineaer', 'nulreglen', 'isoler', 'erLoesning', 'ohm', 'isolerBrik'], 3: ['andengrad', 'nulreglen', 'isolerBrik', 'lineaer', 'omvendtAndengrad', 'ohm'] } },
    trekanter: { navn: 'Trekanter', e: '📐', maxNiveau: 3, typer: { 1: ['pythagoras', 'ensvinklede'], 2: ['pythagoras', 'ensvinklede'], 3: ['pythagoras', 'ensvinklede'] } },
    funktioner: { navn: 'Funktioner', e: '📈', maxNiveau: 3, typer: { 1: ['haeldning', 'matchGraf', 'parabel', 'interval', 'linModel'], 2: ['haeldning', 'matchGraf', 'vaekst', 'parabel', 'lnRegler', 'fordobling', 'interval', 'linModel', 'rente'], 3: ['vaekst', 'matchGraf', 'haeldning', 'lnRegler', 'fordobling', 'rente'] } },
    differential: { navn: 'Differentialregning', e: '📉', maxNiveau: 3, typer: { 1: ['afledt', 'tangent'], 2: ['afledt', 'tangent', 'monotoni'], 3: ['afledt', 'monotoni', 'tangentLigning'] } },
    integral: { navn: 'Integralregning', e: '∫', maxNiveau: 3, typer: { 1: ['stamfunktion', 'bestemt'], 2: ['stamfunktion', 'bestemt'], 3: ['stamfunktion', 'bestemt'] } },
    abonus: { navn: 'A-bonus', e: '🧭', maxNiveau: 3, typer: { 1: ['prikprodukt', 'ortogonal'], 2: ['prikprodukt', 'ortogonal', 'cirkel', 'determinant', 'parallel'], 3: ['cirkel', 'prikprodukt', 'ortogonal', 'determinant', 'parallel', 'difflign'] } },
  };

  // Hver opgave laves med sit eget frø, så den kan bygges igen ud fra { type, niveau, froe } alene.
  // «Kommer igen»-køen gemmer kun de parametre — aldrig færdig HTML (se gem.js voksenGentag).
  function lavVoksenOpgave(type, niveau, rng) {
    const froe = Math.floor(rng() * 4294967296) >>> 0;
    return genskab({ type: type, niveau: niveau, froe: froe });
  }
  function genskab(p) {
    if (!p || !Object.prototype.hasOwnProperty.call(V, p.type) || !Number.isInteger(p.froe)) return null;
    const niveau = Math.min(3, Math.max(1, Number.isInteger(p.niveau) ? p.niveau : 1));
    const o = V[p.type](niveau, lavRng(p.froe >>> 0));
    o.froe = p.froe >>> 0;
    return o;
  }
  // Det, der gemmes, når en opgave skal komme igen
  const gentagParametre = (o, dato) => ({ type: o.type, niveau: o.niveau, froe: o.froe, emne: o.emne, noegle: o.noegle, dato: dato });

  // Dagens dosis: 5 opgaver — 3 fra den valgte verden, 2 til repetition (fejlede opgaver eller andre åbne verdener)
  function lavDosis(valgt, niveauer, rng, gentag) {
    const ud = [];
    const brugt = {};
    const tilfoej = (o) => { if (o && !brugt[o.noegle]) { brugt[o.noegle] = true; ud.push(o); return true; } return false; };
    const fra = (emne) => {
      const E = VOKSEN_EMNER[emne];
      const n = Math.min(E.maxNiveau, Math.max(1, niveauer[emne] || 1));
      return lavVoksenOpgave(vaelg(rng, E.typer[n]), n, rng);
    };
    let f = 0;
    while (ud.length < 3 && f++ < 50) tilfoej(fra(valgt));
    // Højst 2 gentagelser — dem, der ikke kan bygges (ukendt type), springes over, så de ikke blokerer køen
    let gentaget = 0;
    for (const p of gentag || []) {
      if (gentaget >= 2 || ud.length >= 5) break;
      const o = genskab(p);
      if (o) { o.gentaget = true; if (tilfoej(o)) gentaget++; }
    }
    const andre = Object.keys(niveauer).filter((e) => e !== valgt && VOKSEN_EMNER[e]);
    f = 0;
    while (ud.length < 5 && f++ < 50) tilfoej(fra(andre.length ? vaelg(rng, andre) : valgt));
    return ud;
  }

  // ---------- Huskekort: de vigtigste regler pr. verden (vises før dagens dosis, kan slås fra) ----------
  // Egne formuleringer af standardregler — intet er kopieret fra hæftet.
  const hx = mi('x'), ha = mi('a'), hb = mi('b'); // korte navne kun til huskekortene
  const sub = (v, n) => '<msub>' + row(v) + row(mn(n)) + '</msub>';
  const HUSKEKORT = {
    regnetricks: [
      'Rækkefølge: parenteser, potenser, gange og dele, plus og minus.',
      math(sup(par(ha + mo('+') + hb), mn(2)) + mo('=') + sup(ha, mn(2)) + mo('+') + sup(hb, mn(2)) + mo('+') + mn(2) + ha + hb) + ' og ' + math(par(ha + mo('+') + hb) + par(ha + mo('−') + hb) + mo('=') + sup(ha, mn(2)) + mo('−') + sup(hb, mn(2))),
      'Minus foran en parentes skifter fortegn på alt inde i den.',
    ],
    broeker: [
      math(frac(ha, hb) + mo('+') + frac(mi('c'), mi('d')) + mo('=') + frac(ha + mi('d') + mo('+') + mi('c') + hb, hb + mi('d'))),
      math(sup(ha, mi('m')) + mo('·') + sup(ha, mi('n')) + mo('=') + sup(ha, mi('m') + mo('+') + mi('n'))) + ', ' + math(sup(par(sup(ha, mi('m'))), mi('n')) + mo('=') + sup(ha, mi('m') + mo('·') + mi('n'))) + ', ' + math(sup(ha, mn(0)) + mo('=') + mn(1)),
      'Forkort kun med faktorer, der går op i hele tælleren og hele nævneren — aldrig med et led.',
    ],
    ligninger: [
      'Gør det samme på begge sider, til den ukendte står alene.',
      'Nulreglen: ' + math(ha + mo('·') + hb + mo('=') + mn(0)) + ' netop når ' + math(ha + mo('=') + mn(0)) + ' eller ' + math(hb + mo('=') + mn(0)) + '.',
      math(sup(hx, mn(2)) + mo('+') + hb + hx + mo('+') + mi('c') + mo('=') + par(hx + mo('−') + sub(mi('r'), 1)) + par(hx + mo('−') + sub(mi('r'), 2))) + ': rødderne giver summen ' + math(mo('−') + hb) + ' og produktet ' + math(mi('c')) + '.',
    ],
    trekanter: [
      'Pythagoras: ' + math(sup(ha, mn(2)) + mo('+') + sup(hb, mn(2)) + mo('=') + sup(mi('c'), mn(2))) + ', hvor c er hypotenusen (siden over for den rette vinkel).',
      'Ensvinklede trekanter: alle sider ganges med den samme skalafaktor.',
    ],
    funktioner: [
      'Ret linje ' + math(mi('y') + mo('=') + ha + hx + mo('+') + hb) + ': hældningen er ' + math(ha + mo('=') + frac(sub(mi('y'), 2) + mo('−') + sub(mi('y'), 1), sub(hx, 2) + mo('−') + sub(hx, 1))) + ', og b er skæringen med y-aksen.',
      'Eksponentiel ' + math(mi('f') + par(hx) + mo('=') + hb + mo('·') + sup(ha, hx)) + ': fremskrivningsfaktoren er ' + math(ha + mo('=') + mn(1) + mo('+') + mi('r')) + '. Fordoblingskonstanten T: f bliver dobbelt så stor, når x vokser med T.',
      'Parabel ' + math(mi('f') + par(hx) + mo('=') + ha + sup(hx, mn(2)) + mo('+') + hb + hx + mo('+') + mi('c')) + ': ' + math(ha + mo('>') + mn(0)) + ' giver grenene opad.',
      'Intervaller: ' + math(mo('[') + ha + mo(';') + hb + mo(']')) + ' er lukket (a og b er med), ' + math(mo(']') + ha + mo(';') + hb + mo('[')) + ' er åbent.',
    ],
    differential: [
      math(sup(par(sup(hx, mi('n'))), mo('′')) + mo('=') + mi('n') + sup(hx, mi('n') + mo('−') + mn(1))) + ', ' + math(sup(par(sup(mi('e'), mi('k') + hx)), mo('′')) + mo('=') + mi('k') + sup(mi('e'), mi('k') + hx)) + ', ' + math(sup(par(mi('ln') + hx), mo('′')) + mo('=') + frac(mn(1), hx)),
      'Tangenten i ' + math(sub(hx, 0)) + ': ' + math(mi('y') + mo('=') + mi("f′") + par(sub(hx, 0)) + par(hx + mo('−') + sub(hx, 0)) + mo('+') + mi('f') + par(sub(hx, 0))),
      math(mi("f′") + mo('>') + mn(0)) + ' betyder, at f er voksende.',
    ],
    integral: [
      math('<mo>∫</mo>' + sup(hx, mi('n')) + mi('d') + hx + mo('=') + frac(mn(1), mi('n') + mo('+') + mn(1)) + sup(hx, mi('n') + mo('+') + mn(1)) + mo('+') + mi('k')) + ' (for ' + math(mi('n') + mo('≠') + mo('−') + mn(1)) + ').',
      'Bestemt integral: ' + math('<msubsup><mo>∫</mo>' + row(ha) + row(hb) + '</msubsup>' + mi('f') + par(hx) + mi('d') + hx + mo('=') + mi('F') + par(hb) + mo('−') + mi('F') + par(ha)),
    ],
    abonus: [
      'Prikprodukt: ' + math(sub(ha, 1) + sub(hb, 1) + mo('+') + sub(ha, 2) + sub(hb, 2)) + '. Er det 0, er vektorerne ortogonale.',
      'Determinant: ' + math(sub(ha, 1) + sub(hb, 2) + mo('−') + sub(ha, 2) + sub(hb, 1)) + '. Er den 0, er vektorerne parallelle.',
      'Cirkel med centrum (a, b) og radius r: ' + math(sup(par(hx + mo('−') + ha), mn(2)) + mo('+') + sup(par(mi('y') + mo('−') + hb), mn(2)) + mo('=') + sup(mi('r'), mn(2))),
      math(mi("y′") + mo('=') + mi('k') + mi('y')) + ' har løsningerne ' + math(mi('f') + par(hx) + mo('=') + mi('c') + sup(mi('e'), mi('k') + hx)) + '.',
    ],
  };

  // ---------- Isolér med brikker: tjek den byggede rækkefølge ----------
  // { rigtig, fejl } — fejl er den typiske fejl, hvis rækkefølgen er en af de kendte forkerte
  // Udtrykket regnes ud i tre sæt værdier for bogstaverne: er det lig facit i dem alle, er det rigtigt —
  // også «A · 2 ÷ g» eller «2 · (A ÷ g)», selv om facit er skrevet «2 · A ÷ g».
  const PROEVEVAERDIER = [[1.7, 2.9, 4.3, 6.1, 7.7, 9.3], [3.1, 5.3, 1.9, 8.9, 2.3, 6.7], [11.3, 4.7, 7.1, 1.3, 5.9, 3.7]];
  function brikVaerdi(seq, vaerdier) {
    // Rekursiv nedstigning: udtryk = led ((+|−) led)*, led = faktor ((·|÷) faktor)*, faktor = −faktor | (udtryk) | tal | bogstav
    let i = 0;
    const faktor = () => {
      const t = seq[i++];
      if (t === '−') return -faktor();
      if (t === '(') { const v = udtryk(); if (seq[i++] !== ')') throw new Error('mangler )'); return v; }
      if (/^\d+$/.test(t)) return Number(t);
      if (t !== undefined && Object.prototype.hasOwnProperty.call(vaerdier, t)) return vaerdier[t];
      throw new Error('uventet ' + t);
    };
    const led = () => {
      let v = faktor();
      while (seq[i] === '·' || seq[i] === '÷') v = seq[i++] === '·' ? v * faktor() : v / faktor();
      return v;
    };
    const udtryk = () => {
      let v = led();
      while (seq[i] === '+' || seq[i] === '−') v = seq[i++] === '+' ? v + led() : v - led();
      return v;
    };
    const v = udtryk();
    if (i !== seq.length || !Number.isFinite(v)) throw new Error('ufuldstændigt');
    return v;
  }
  function tjekBrikker(o, seq) {
    const B = o && o.brikker;
    if (!B || !Array.isArray(seq) || !seq.length) return { rigtig: false, fejl: null };
    const bogstaver = [...new Set(B.svar[0].concat(B.brikker).filter((t) => /^[A-Za-zρ]$/.test(t)))].sort();
    const saet = PROEVEVAERDIER.map((tal) => { const v = {}; bogstaver.forEach((b, k) => { v[b] = tal[k % tal.length]; }); return v; });
    const vaerdi = (s) => { try { return saet.map((v) => brikVaerdi(s, v)); } catch (e) { return null; } };
    const ens = (a, b) => !!a && !!b && a.every((x, k) => Math.abs(x - b[k]) < 1e-9 * Math.max(1, Math.abs(x)));
    const den = vaerdi(seq);
    if (!den) return { rigtig: false, fejl: null };
    if (ens(den, vaerdi(B.svar[0]))) return { rigtig: true, fejl: null };
    const f = B.fejl.find((x) => ens(den, vaerdi(x.seq)));
    return { rigtig: false, fejl: f ? f.fejl : null };
  }

  // ---------- Eget taltastatur: svaret tastes (heltal, minus og brøkstreg) ----------
  // Værdien af en svarmulighed ud fra dens nøgle: «n:-3» (heltal), «b:3/4» (brøk), «a:1.5» (hældning som decimaltal)
  function noegleVaerdi(n) {
    let m = /^[na]:(-?\d+(?:\.\d+)?)$/.exec(n);
    if (m) return Number(m[1]);
    m = /^b:(-?\d+)\/(\d+)$/.exec(n);
    if (m && Number(m[2]) !== 0) return Number(m[1]) / Number(m[2]);
    return NaN;
  }
  // Kan opgaven besvares ved at taste? Kun når svaret og alle svarmuligheder er tal
  const kanTastes = (o) => !!o && Array.isArray(o.valg) && o.valg.length > 2 && Number.isFinite(noegleVaerdi(o.rigtigNøgle)) && o.valg.every((v) => Number.isFinite(noegleVaerdi(v.nøgle)));
  // Det tastede («−12», «3/4», «-6/8») som tal — eller NaN
  function tastetVaerdi(tekst) {
    const t = String(tekst || '').replace(/−/g, '-').replace(/\s/g, '');
    const m = /^(-?\d+)(?:\/(\d+))?$/.exec(t);
    if (!m) return NaN;
    if (m[2] === undefined) return Number(m[1]);
    return Number(m[2]) === 0 ? NaN : Number(m[1]) / Number(m[2]);
  }
  // Tjek et tastet svar: { gyldig, rigtig, fejl (typisk fejl, hvis det tastede er en af de forkerte svarmuligheder) }
  function tjekTastet(o, tekst) {
    const v = tastetVaerdi(tekst);
    if (!Number.isFinite(v)) return { gyldig: false, rigtig: false, fejl: null };
    // Hældninger er gemt afrundet til 3 decimaler («a:0.333» = 1/3): kun for dem afrundes det tastede på samme måde
    const ens = (n) => { const x = noegleVaerdi(n); return Math.abs(x - v) < 1e-9 || (/^a:/.test(n) && Math.round(v * 1000) / 1000 === x); };
    if (ens(o.rigtigNøgle)) return { gyldig: true, rigtig: true, fejl: null };
    const forkert = o.valg.find((x) => x.id !== o.svar && ens(x.nøgle));
    return { gyldig: true, rigtig: false, fejl: forkert ? forkert.fejl : null };
  }
  // Facit skrevet, som man ville taste det (til forklaringen og testene)
  function facitTekst(o) {
    const n = o.rigtigNøgle;
    const b = /^b:(-?\d+)\/(\d+)$/.exec(n);
    if (b) return (Number(b[1]) < 0 ? '−' : '') + Math.abs(Number(b[1])) + '/' + b[2];
    const v = noegleVaerdi(n);
    if (Number.isInteger(v)) return (v < 0 ? '−' : '') + Math.abs(v);
    // Decimaltal (hældning): som brøk med lille nævner
    for (let d = 2; d <= 12; d++) if (Math.abs(v * d - Math.round(v * d)) < 0.006) return (v < 0 ? '−' : '') + Math.abs(Math.round(v * d)) + '/' + d;
    return String(v);
  }

  // ---------- Tvillingeopgaver til familieduellen (VOKSEN-ANALYSE.md: «samme billede, større tal») ----------
  // Barnets verden → den voksnes opgave med samme idé. Barnet ser, at den voksne regner på «det samme».
  const TVILLINGER = {
    taelle: { ide: 'Tal og regnerækkefølge', emne: 'regnetricks', typer: ['hierarki', 'kvadratTrick'] },
    former: { ide: 'Figurer og trekanter', emne: 'trekanter', typer: ['pythagoras', 'ensvinklede'] },
    tegne: { ide: 'Tegn og mål: længder og figurer', emne: 'trekanter', typer: ['pythagoras', 'ensvinklede'] },
    plus10: { ide: 'Det, der kommer til, bliver mere', emne: 'funktioner', typer: ['fordobling', 'vaekst', 'linModel'] },
    venner: { ide: 'Det gemte tal', emne: 'ligninger', typer: ['lineaer', 'erLoesning'] },
    minus: { ide: 'Minus og fortegn', emne: 'regnetricks', typer: ['fortegn'] },
    tiere: { ide: 'Tiere og titalspotenser', emne: 'broeker', typer: ['nulPotens', 'potensGange'] },
    tierbro: { ide: 'Det gemte tal', emne: 'ligninger', typer: ['lineaer', 'isoler'] },
    moenstre: { ide: 'Samme skridt hver gang', emne: 'funktioner', typer: ['haeldning', 'linModel'] },
    maaling: { ide: 'Penge og tid', emne: 'funktioner', typer: ['linModel', 'rente'] },
  };

  // Den voksnes tvillingeopgave til barnets verden (på den voksnes eget niveau i emnet)
  function lavTvilling(barnEmne, niveauer, rng) {
    const t = TVILLINGER[barnEmne];
    if (!t) return null;
    const n = Math.min(VOKSEN_EMNER[t.emne].maxNiveau, Math.max(1, (niveauer && niveauer[t.emne]) || 1));
    // Kun typer, der hører til niveauet (ellers tæller duellen opgaver fra et andet trin med i op- og nedrykning)
    const paaNiveau = t.typer.filter((x) => VOKSEN_EMNER[t.emne].typer[n].indexOf(x) >= 0);
    const o = lavVoksenOpgave(vaelg(rng, paaNiveau.length ? paaNiveau : t.typer), n, rng);
    o.tvilling = t.ide;
    return o;
  }

  // Prøve: 8 forskellige opgaver fra én verden på det niveau, den voksne har nået
  function lavProeve(emne, niveau, rng) {
    const E = VOKSEN_EMNER[emne];
    const n = Math.min(E.maxNiveau, Math.max(1, niveau || 1));
    const ud = [];
    const brugt = {};
    for (let f = 0; ud.length < 8 && f < 200; f++) {
      // Skiftevis alle typer på niveauet, så prøven dækker hele verdenen
      const type = E.typer[n][ud.length % E.typer[n].length];
      const o = lavVoksenOpgave(f < 100 ? type : vaelg(rng, E.typer[n]), n, rng);
      if (!brugt[o.noegle]) { brugt[o.noegle] = true; ud.push(o); }
    }
    return ud;
  }

  // =====================================================================
  //  «📘 Lær»: bogens 8 kapitler og 33 trin i præcis bogens rækkefølge (docs/VOKSEN-LAER.md).
  //  Huskekort og eksempler er skrevet med egne ord og egne tal — intet er bogens tekst.
  //  typer: generatorer til 3–5 opgaver (eksisterende + nye). valgfri: udgået ifølge bogens egen prøveliste.
  // =====================================================================
  const KAPITLER = [
    { id: 'I', navn: 'De fire regningsarter', e: '➕' },
    { id: 'II', navn: 'Ligninger', e: '⚖️' },
    { id: 'III', navn: 'Trekanter', e: '📐' },
    { id: 'IV', navn: 'Sammenhænge og funktioner', e: '📈' },
    { id: 'V', navn: 'Differentialregning', e: '📉' },
    { id: 'VI', navn: 'Integralregning', e: '∫' },
    { id: 'VII', navn: 'Vektorer (A)', e: '🧭' },
    { id: 'VIII', navn: 'Differentialligninger (A)', e: '🌱' },
  ];
  const AFSNIT = [
    { id: 'I.1', kap: 'I', titel: 'Regningsarternes hierarki', typer: ['regneord', 'reducer', 'hierarki', 'fortegn'],
      husk: ['Først parenteser, så potenser, så gange og dele, til sidst plus og minus (fra venstre).', 'Sum (+), differens (−), produkt (·) og kvotient (:).', 'To ens fortegn giver plus, to forskellige minus. xy betyder x·y.'],
      eksempel: ['9 + 4·5 − 18 : 3', 'Gange og dele først: 4·5 = 20 og 18 : 3 = 6.', '9 + 20 − 6 = 23.', 'Med bogstaver: 5y + 2·4y − 3y·2 = 5y + 8y − 6y = 7y.', '(−2)·(−3)·(−1): tre minusser giver minus, så −6.'] },
    { id: 'I.2', kap: 'I', titel: 'Parenteser', typer: ['parentes', 'findFejlen'],
      husk: ['+(a + b) = a + b, men −(a − b) = −a + b: minus skifter fortegn på hvert led.', 'k(a − b) = ka − kb: gang hvert led.', '(a + b)(c + d) = ac + ad + bc + bd. Baglæns: sæt en fælles faktor uden for parentes.'],
      eksempel: ['−(4x − 7) + 3(x − 2)', 'Hæv parenteserne: −4x + 7 + 3x − 6.', 'Saml leddene: −x + 1.', '(x + 4)(x − 1) = x² − x + 4x − 4 = x² + 3x − 4.', 'Baglæns: 6x + 9 = 3(2x + 3).'] },
    { id: 'I.3', kap: 'I', titel: 'Kvadratsætninger', typer: ['kvadratsaetning', 'kvadratTrick', 'findFejlen'],
      husk: ['(a ± b)² = a² + b² ± 2ab.', '(a + b)(a − b) = a² − b².', 'De to kvadrater har altid plus. Begge kan bruges baglæns til at faktorisere.'],
      eksempel: ['(x + 5)² = x² + 25 + 2·x·5 = x² + 10x + 25.', '(3x − 2)² = 9x² + 4 − 12x.', '(x + 6)(x − 6) = x² − 36.', 'Baglæns: x² − 14x + 49 — 49 = 7² og 14x = 2·x·7, så (x − 7)².'] },
    { id: 'I.4a', kap: 'I', titel: 'Brøker: forkorte og forlænge', typer: ['forkortBroek', 'forkort'],
      husk: ['En brøk ændrer ikke værdi, når tæller og nævner ganges eller deles med det samme tal.', 'Man kan kun forkorte med en faktor i hele tælleren og hele nævneren — aldrig med et enkelt led.'],
      eksempel: ['18/24: begge kan deles med 6.', '18/24 = 3/4.', 'Forlæng 5/8 til nævneren 40: gang med 5 → 25/40.', '(x² − 16)/(x + 4) = (x + 4)(x − 4)/(x + 4) = x − 4.'] },
    { id: 'I.4b', kap: 'I', titel: 'Brøk gange og dele med et tal', typer: ['broekTal'],
      husk: ['Brøk gange tal: gang tælleren.', 'Brøk divideret med tal: gang nævneren.', 'Et minus foran en brøk: −a/b = (−a)/b = a/(−b).'],
      eksempel: ['5 · 2/7 = 10/7.', '(6/5) : 3 = 6/(5·3) = 6/15.', 'Forkort: 6/15 = 2/5.'] },
    { id: 'I.4c', kap: 'I', titel: 'Gange og dele med brøker', typer: ['broekGangeDele'],
      husk: ['a/b · c/d = (a·c)/(b·d).', 'At dele med en brøk er at gange med den omvendte: a/b : c/d = (a·d)/(b·c).', 'Et tal er en brøk med nævneren 1.'],
      eksempel: ['3/4 · 2/9 = 6/36 = 1/6.', '2/5 : 4/15 — vend den anden brøk.', '2/5 · 15/4 = 30/20 = 3/2.'] },
    { id: 'I.4d', kap: 'I', titel: 'Plus og minus med brøker', typer: ['broekPlus', 'broekMinus'],
      husk: ['Samme nævner: læg tællerne sammen (eller træk fra).', 'Ellers: forlæng først til en fællesnævner (b·d virker altid).', 'Deles en flerleddet størrelse, skal hvert led deles.'],
      eksempel: ['1/4 + 2/3: fællesnævner 12.', '3/12 + 8/12 = 11/12.', '7/10 − 1/4 = 14/20 − 5/20 = 9/20.', '3/x − 1/(2x) = 6/(2x) − 1/(2x) = 5/(2x).'] },
    { id: 'I.5', kap: 'I', titel: 'Potenser og rødder', typer: ['potensRegler', 'titalsform', 'potensGange', 'nulPotens'],
      husk: ['aᵖ·aᵠ = aᵖ⁺ᵠ, aᵖ/aᵠ = aᵖ⁻ᵠ, (aᵖ)ᵠ = aᵖᵠ, aᵖ·bᵖ = (ab)ᵖ.', 'a⁰ = 1, a⁻ᵖ = 1/aᵖ, ⁿ√(aᵖ) = a^(p/n).', 'Titalsform: b·10ⁿ med 1 ≤ b < 10.'],
      eksempel: ['5³·5⁴ = 5⁷.', '2⁹/2⁶ = 2³ = 8.', '4⁻² = 1/16 og ∛(x⁶) = x².', '0,00052 = 5,2·10⁻⁴.', '(3·10⁵)·(4·10⁻²) = 12·10³ = 1,2·10⁴.'] },
    { id: 'II.1', kap: 'II', titel: 'Ligninger generelt', typer: ['krydsGange', 'loesningsantal', 'lineaer', 'erLoesning'],
      husk: ['Et tal er en løsning, hvis ligningen passer, når tallet sættes ind.', 'Gør det samme på begge sider — men gang og del aldrig med 0.', 'a/b = c/d ⇔ a·d = b·c (gange over kors). Forsvinder x, er der ingen eller uendeligt mange løsninger.'],
      eksempel: ['5x − 4 = 2x + 11', 'Træk 2x fra: 3x − 4 = 11.', 'Læg 4 til: 3x = 15.', 'Del med 3: x = 5.', '6/x = 3/4 → 3x = 24 → x = 8.'] },
    { id: 'II.2', kap: 'II', titel: 'Andengradsligninger', typer: ['diskriminant', 'andengrad'],
      husk: ['ax² + bx + c = 0: d = b² − 4ac.', 'd < 0: ingen løsninger. d = 0: én, x = −b/(2a). d > 0: to, x = (−b ± √d)/(2a).', 'Mangler c-leddet, er nulreglen nemmere.'],
      eksempel: ['2x² + 3x − 2 = 0: a = 2, b = 3, c = −2.', 'd = 9 − 4·2·(−2) = 25.', '√d = 5.', 'x = (−3 ± 5)/4, altså x = 1/2 eller x = −2.'] },
    { id: 'II.3', kap: 'II', titel: 'Nulreglen', typer: ['udenForParentes', 'nulreglen', 'omvendtAndengrad'],
      husk: ['Et produkt er 0, netop når mindst én faktor er 0.', 'Del aldrig med x — sæt x uden for parentes (ellers forsvinder løsningen x = 0).'],
      eksempel: ['(x − 3)(2x + 8) = 0', 'x − 3 = 0 eller 2x + 8 = 0.', 'x = 3 eller x = −4.', '5x² − 15x = 0 → 5x(x − 3) = 0 → x = 0 eller x = 3.'] },
    { id: 'II.4', kap: 'II', titel: 'Isolere en variabel', typer: ['omvendtFunktion', 'isoler', 'isolerBrik', 'ohm', 'lnRegler'],
      husk: ['Brug reglerne for ligninger, til variablen står alene.', 'eˣ = a ⇔ x = ln a. ln x = a ⇔ x = eᵃ. xⁿ = a ⇔ x = ⁿ√a (a > 0).'],
      eksempel: ['Isolér h i V = ⅓·G·h.', 'Gang med 3: 3V = G·h.', 'Del med G: h = 3V/G.', 'eˣ = 5 → x = ln 5. x³ = 125 → x = 5.'] },
    { id: 'III.1', kap: 'III', titel: 'Ensvinklede trekanter', typer: ['erEnsvinklede', 'ensvinklede'],
      husk: ['Ensvinklede trekanter er forstørrelser af hinanden: alle sider ganges med samme skalafaktor k.', 'k = a₁/a.'],
      eksempel: ['Lille trekant 3, 5, 6. I den store svarer 3 til 12.', 'k = 12/3 = 4.', '5·4 = 20.', '6·4 = 24.'] },
    { id: 'III.2', kap: 'III', titel: 'Pythagoras', typer: ['pythagorasRod', 'pythagoras'],
      husk: ['I en retvinklet trekant: a² + b² = c², hvor c er hypotenusen (over for den rette vinkel).'],
      eksempel: ['a = 5, b = 12: c² = 25 + 144 = 169.', 'c = 13.', 'c = 17, a = 8: b² = 289 − 64 = 225, så b = 15.', 'a = 2, b = 3: c² = 13, så c = √13.'] },
    { id: 'IV.1', kap: 'IV', titel: 'Funktioner generelt', typer: ['funktionsvaerdi', 'proportional', 'linModel'],
      husk: ['En funktion giver præcis én y for hver x.', 'Proportional: y = k·x. Omvendt proportional: y = k/x.'],
      eksempel: ['f(x) = 2x² − 3x + 1. Find f(−2).', '(−2)² = 4, så 2·4 = 8.', '−3·(−2) = 6.', 'f(−2) = 8 + 6 + 1 = 15.', 'y = k/x og y = 6 for x = 5: k = 30, så y = 3 for x = 10.'] },
    { id: 'IV.2', kap: 'IV', titel: 'Lineære funktioner', typer: ['linjeToPunkter', 'haeldning', 'matchGraf'],
      husk: ['f(x) = ax + b: a er hældningen, b skæringen med y-aksen.', 'a = (y₂ − y₁)/(x₂ − x₁). b findes ved at sætte et punkt ind.'],
      eksempel: ['Punkterne (1, 4) og (3, 10).', 'a = (10 − 4)/(3 − 1) = 3.', '4 = 3·1 + b, så b = 1.', 'f(x) = 3x + 1. Tjek: f(3) = 10 ✓'] },
    { id: 'IV.3', kap: 'IV', titel: 'Eksponentielle funktioner', typer: ['eksponentielToPunkter', 'vaekst', 'fordobling', 'rente'],
      husk: ['f(x) = b·aˣ: konstant procentvis vækst; a = 1 + r.', 'Ud fra to punkter: a = ^(x₂−x₁)√(y₂/y₁).', 'Fordoblingskonstanten T: f fordobles, når x vokser med T.'],
      eksempel: ['Punkterne (1, 15) og (3, 135).', 'a² = 135/15 = 9, så a = 3.', '15 = b·3¹, så b = 5.', 'f(x) = 5·3ˣ. a = 1,06 betyder 6 % vækst pr. skridt.'] },
    { id: 'IV.4', kap: 'IV', titel: 'Potensfunktioner', valgfri: true, typer: ['potensfunktion'],
      husk: ['f(x) = b·xᵃ. b er y-værdien for x = 1.', 'Ganges x med (1 + r), ganges y med (1 + r)ᵃ.'],
      eksempel: ['f(1) = 5 og f(3) = 45.', 'b = 5.', '45 = 5·3ᵃ, så 3ᵃ = 9 og a = 2.', 'f(x) = 5x².'] },
    { id: 'IV.5', kap: 'IV', titel: 'Polynomier og parabler', typer: ['toppunkt', 'parabelFortegn', 'parabel', 'erLoesning'],
      husk: ['a > 0: grenene opad. a < 0: nedad. c er skæringen med y-aksen.', 'Toppunkt T = (−b/(2a), −d/(4a)).', 'Med rødderne: ax² + bx + c = a(x − r₁)(x − r₂).'],
      eksempel: ['f(x) = x² − 6x + 5.', 'd = 36 − 20 = 16, så x = (6 ± 4)/2: 1 og 5.', 'T = (6/2, −16/4) = (3, −4). Tjek: f(3) = −4 ✓', 'f(x) = (x − 1)(x − 5), og a = 1 > 0: grenene opad.'] },
    { id: 'V.1', kap: 'V', titel: 'Differentiation', typer: ['afledtMere', 'afledt'],
      husk: ['Led for led. (xᵃ)′ = a·xᵃ⁻¹, (ln x)′ = 1/x, (eᵏˣ)′ = k·eᵏˣ, (ax + b)′ = a.', 'A: (f·g)′ = f′g + fg′ og (f(g(x)))′ = f′(g(x))·g′(x).'],
      eksempel: ['f(x) = 2x⁴ + 3x² − 6x + 1.', 'f′(x) = 8x³ + 6x − 6.', 'g(x) = 6√x = 6x^½, så g′(x) = 3x^(−½) = 3/√x.', 'A: (x·ln x)′ = 1·ln x + x·(1/x) = ln x + 1.'] },
    { id: 'V.2', kap: 'V', titel: 'Tangentens ligning', typer: ['tangentLnE', 'tangent', 'tangentLigning'],
      husk: ['Tangenten i x₀: y = f′(x₀)(x − x₀) + f(x₀).', 'Husk: ln 1 = 0 og e⁰ = 1.'],
      eksempel: ['f(x) = x² + 4x i x₀ = 1.', 'f(1) = 5.', 'f′(x) = 2x + 4, så f′(1) = 6.', 'y = 6(x − 1) + 5 = 6x − 1.'] },
    { id: 'V.3', kap: 'V', titel: 'Væksthastighed', typer: ['vaeksthastighed', 'tangent'],
      husk: ['f′(x₀) er tangentens hældning — hvor hurtigt f vokser i x₀.', 'y″ er væksthastigheden for y′ (fx accelerationen).'],
      eksempel: ['f(x) = x³ − 2x.', 'f′(x) = 3x² − 2.', 'f′(2) = 10: f vokser 10 pr. x-enhed i x = 2.', 'N(t) = 300·e^(0,2t): N′(0) = 60 pr. tidsenhed.'] },
    { id: 'V.4', kap: 'V', titel: 'Monotoniforhold', typer: ['monotoniTo', 'monotoni', 'interval'],
      husk: ['f′ ≥ 0: f voksende. f′ ≤ 0: f aftagende.', 'Find f′\'s nulpunkter, lav en fortegnslinje og aflæs. Endepunkterne er med (lukkede klammer).'],
      eksempel: ['f(x) = x³ − 3x² − 9x + 2.', 'f′(x) = 3x² − 6x − 9 = 3(x + 1)(x − 3).', 'Fortegn: + før −1, − mellem, + efter 3.', 'Voksende i ]−∞; −1] og [3; ∞[, aftagende i [−1; 3].', 'Lokalt maksimum f(−1) = 7, lokalt minimum f(3) = −25.'] },
    { id: 'VI.1', kap: 'VI', titel: 'Stamfunktioner', typer: ['stamfunktionMere', 'stamfunktion'],
      husk: ['F er stamfunktion til f, når F′ = f.', 'xᵃ → xᵃ⁺¹/(a + 1) + k, 1/x → ln|x| + k, eᵏˣ → (1/k)·eᵏˣ + k.'],
      eksempel: ['f(x) = 9x² − 4x + 3.', 'F(x) = 3x³ − 2x² + 3x + k.', 'Gennem P(1, 5) for f(x) = 3x²: F(x) = x³ + k.', '1 + k = 5, så k = 4: F(x) = x³ + 4.'] },
    { id: 'VI.2', kap: 'VI', titel: 'Bestemte integraler', typer: ['bestemtAB', 'bestemt'],
      husk: ['∫ₐᵇ f(x) dx = F(b) − F(a).', 'Er f ≥ 0, er integralet arealet mellem grafen og x-aksen. Grænserne er tit grafens nulpunkter.'],
      eksempel: ['∫₁³ 2x dx', 'Stamfunktion: x².', '9 − 1 = 8.', 'Areal under f(x) = −x² + 4x: nulpunkter 0 og 4, så [−x³/3 + 2x²]₀⁴ = 32/3.'] },
    { id: 'VI.3', kap: 'VI', titel: 'Integral og areal', typer: ['arealMellem'],
      husk: ['Areal over x-aksen tæller med plus i integralet, areal under med minus.', 'Er f ≥ g på [a; b], er arealet mellem graferne ∫ₐᵇ (f − g) dx.'],
      eksempel: ['Mellem f(x) = 2x og g(x) = x².', 'Skæring i 0 og 2.', '∫₀² (2x − x²) dx = [x² − x³/3]₀².', '4 − 8/3 = 4/3.'] },
    { id: 'VII.1', kap: 'VII', titel: 'Cirkel og kugle', typer: ['cirkelOmskriv', 'cirkel'],
      husk: ['Cirkel med centrum (a, b) og radius r: (x − a)² + (y − b)² = r².', 'En udfoldet ligning omskrives med kvadratkomplettering.'],
      eksempel: ['x² − 4x + y² + 10y + 20 = 0', 'x² − 4x = (x − 2)² − 4.', 'y² + 10y = (y + 5)² − 25.', '(x − 2)² + (y + 5)² = 4 + 25 − 20 = 9.', 'Centrum (2, −5), radius 3.'] },
    { id: 'VII.2', kap: 'VII', titel: 'Ortogonale og parallelle vektorer', typer: ['vektorK', 'parallelogramAreal', 'projektion', 'prikprodukt', 'ortogonal', 'determinant', 'parallel'],
      husk: ['Ortogonale ⇔ prikproduktet er 0.', 'Parallelle ⇔ det(a, b) = a₁b₂ − a₂b₁ = 0.', 'Parallelogrammets areal = |det(a, b)|.'],
      eksempel: ['a = (3, t) og b = (2, −6).', 'Ortogonal: 6 − 6t = 0, så t = 1.', 'Parallel: 3·(−6) − t·2 = 0, så t = −9.', 'Areal for (4, 1) og (2, 3): |12 − 2| = 10.'] },
    { id: 'VII.3', kap: 'VII', titel: 'Parameterfremstillinger', typer: ['parameterLinje'],
      husk: ['Linjen gennem P₀ med retningsvektor r: (x, y) = P₀ + t·r.', 'Gennem A og B: brug r = AB. Samme linje har mange parameterfremstillinger.'],
      eksempel: ['A(2, −1) og B(5, 3).', 'AB = (3, 4).', '(x, y) = (2, −1) + t·(3, 4).', 'Ligger P(8, 7) på linjen? 2 + 3t = 8 giver t = 2, og −1 + 4·2 = 7 ✓'] },
    { id: 'VII.4', kap: 'VII', titel: 'Ligning for linje og plan', typer: ['linjeLigning'],
      husk: ['Linjen gennem P₀ med normalvektor n = (a, b): a(x − x₀) + b(y − y₀) = 0.', 'Fra ax + by + c = 0 aflæses n = (a, b).'],
      eksempel: ['A(1, 2) og n = (3, −2).', '3(x − 1) − 2(y − 2) = 0.', '3x − 3 − 2y + 4 = 0, altså 3x − 2y + 1 = 0.', 'Tjek med A: 3 − 4 + 1 = 0 ✓'] },
    { id: 'VII.5', kap: 'VII', titel: 'Afstand med dist-formlen', valgfri: true, typer: ['distFormel'],
      husk: ['Afstanden fra P(x₁, y₁) til ax + by + c = 0: |ax₁ + by₁ + c| / √(a² + b²).', 'En afstand er aldrig negativ.'],
      eksempel: ['P(4, 1) og 3x + 4y − 6 = 0.', 'Tæller: |12 + 4 − 6| = 10.', 'Nævner: √(9 + 16) = 5.', 'Afstanden er 2.'] },
    { id: 'VII.6', kap: 'VII', titel: 'Skæring med linjer', typer: ['skaering'],
      husk: ['Skæringspunkter er fælles løsninger: isolér y i den ene og sæt ind i den anden.', 'Linje mod parabel eller cirkel giver en andengradsligning: 0, 1 eller 2 punkter.'],
      eksempel: ['y = 2x + 1 og y = −x + 7.', '2x + 1 = −x + 7, så x = 2.', 'y = 5: skæringspunktet er (2, 5).', 'x² + y² = 25 og y = x + 1 giver x² + x − 12 = 0: (3, 4) og (−4, −3).'] },
    { id: 'VIII.1', kap: 'VIII', titel: 'Er en opgivet funktion løsning?', typer: ['difflignMere', 'difflignTangent', 'difflign'],
      husk: ['f er en løsning, hvis differentialligningen passer, når f (og f′, f″) sættes ind.', 'En ligning har tal som løsninger — en differentialligning funktioner.'],
      eksempel: ['Er f(x) = 2e³ˣ løsning til y′ = 3y?', 'f′(x) = 6e³ˣ.', '3·f(x) = 6e³ˣ — ens, så ja.', 'f løser y′ = x·y + 1, og P(1, 3) er på grafen: hældning 4, tangent y = 4x − 1.'] },
  ];

  // 3–5 opgaver til et afsnit: skiftevis afsnittets typer (de nye først), på niveauet fra den voksnes træning
  function lavLaerOpgaver(afsnitId, niveau, rng, antal) {
    const A = AFSNIT.find((x) => x.id === afsnitId);
    if (!A) return [];
    antal = antal || 4;
    const ud = [], brugt = {};
    for (let f = 0; ud.length < antal && f < 80; f++) {
      const type = A.typer[ud.length % A.typer.length];
      const o = lavVoksenOpgave(type, Math.min(3, Math.max(1, niveau || 1)), rng);
      if (!brugt[o.noegle]) { brugt[o.noegle] = true; o.afsnit = A.id; ud.push(o); }
    }
    return ud;
  }

  const VoksenOpgaver = { KAPITLER, AFSNIT, lavLaerOpgaver, V, VOKSEN_EMNER, HUSKEKORT, TVILLINGER, lavTvilling, tjekBrikker, kanTastes, tjekTastet, facitTekst, noegleVaerdi, lavVoksenOpgave, genskab, gentagParametre, lavDosis, lavProeve, gcd, broek, math };
  if (typeof module !== 'undefined' && module.exports) module.exports = VoksenOpgaver;
  else root.VoksenOpgaver = VoksenOpgaver;
})(typeof self !== 'undefined' ? self : this);
