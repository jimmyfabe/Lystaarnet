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
        return opgave(o, rng, e(k), [e(1, 'Glemt den indre afledte'), { vis: math(mi("f′") + par(mi('x')) + mo('=') + mn(k) + mi('x') + mo('·') + sup(mi('e'), mn(k - 1) + mi('x'))), nøgle: 'e:pot', fejl: 'Behandlet som en potens' }, { vis: math(mi("f′") + par(mi('x')) + mo('=') + frac(mn(1), mn(k)) + sup(mi('e'), mn(k) + mi('x'))), nøgle: 'e:1/k', fejl: 'Stamfunktion i stedet for afledt' }]);
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

  const VoksenOpgaver = { V, VOKSEN_EMNER, HUSKEKORT, TVILLINGER, lavTvilling, tjekBrikker, kanTastes, tjekTastet, facitTekst, noegleVaerdi, lavVoksenOpgave, genskab, gentagParametre, lavDosis, lavProeve, gcd, broek, math };
  if (typeof module !== 'undefined' && module.exports) module.exports = VoksenOpgaver;
  else root.VoksenOpgaver = VoksenOpgaver;
})(typeof self !== 'undefined' ? self : this);
