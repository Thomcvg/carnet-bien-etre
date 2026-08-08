import { readFileSync, writeFileSync } from 'node:fs'

const SRC = 'C:/Users/thoma/dev/Appli crystèle/docs/01-brainstorming.md'
const OUT = 'C:/Users/thoma/AppData/Local/Temp/claude/C--Users-thoma-dev-Appli-cryst-le/cadca73d-d258-45b6-8240-e0672027f34a/scratchpad/selection.html'

const md = readFileSync(SRC, 'utf8')

// ---- parse ------------------------------------------------------------------
const parsed = []
let current = null

for (const raw of md.split(/\r?\n/)) {
  const sec = raw.match(/^## ([A-Z])\. (.+)$/)
  if (sec) {
    current = { key: sec[1], title: sec[2].trim(), blurb: '', items: [] }
    parsed.push(current)
    continue
  }
  if (/^## /.test(raw)) { current = null; continue }
  if (!current) continue

  const item = raw.match(/^- \*\*([A-Z]\d+)\*\*\s*(.+)$/)
  if (item) {
    let rest = item[2].trim()
    const star = rest.startsWith('⭐')
    if (star) rest = rest.slice(1).trim()
    const split = rest.indexOf(' — ')
    const label = (split === -1 ? rest : rest.slice(0, split)).replace(/\.$/, '').trim()
    const detail = split === -1 ? '' : rest.slice(split + 3).trim()
    current.items.push({ code: item[1], star, label, detail })
    continue
  }
  // first prose paragraph after the heading becomes the family blurb
  if (!current.items.length && raw.trim() && !raw.startsWith('#') && !current.blurb) {
    current.blurb = raw.trim()
  }
}

// Q (arbitrages) and R (reco) carry no checkable items — drop the empty shells
const families = parsed.filter(f => f.items.length > 0)

const total = families.reduce((n, f) => n + f.items.length, 0)
const starred = families.flatMap(f => f.items).filter(i => i.star).length
if (!total) throw new Error('parse failed: no items')

// ---- presets (from section R) -----------------------------------------------
const PRESETS = {
  v1: 'A5 A7 A8 A26 A27 F1 F2 F9 F14 G1 G2 G3 G4 G6 I1 I2 I3 I11 J1 J2 J3 J5 J6 J7 J8 J10 K1 K2 K3 K4 K7 K8 K16 L1 L2 L4 L5 L7 L13 L16 M1 M7 M8 M10 P1 P2 P4 P10',
  v2: 'A1 A2 A4 A16 A24 A25 B1 B5 B10 C1 C2 C3 C12 C14 C18 C22 D1 D2 D5 E1 E2 E3 E4 F3 F4 F7 F11 F15 G5 G10 G15 G16 J13 J17 K5 K12 K18 L3 L6 N1 N2 O1 O8',
  v3: 'A18 A19 A20 A21 A31 B3 E7 G11 G12 G23 H1 H2 H3 H4 H5 H6 H8 H9 L8 M2 M3 M4',
}

// ---- arbitrages (section Q) -------------------------------------------------
const ARBITRAGES = [
  { id: 'q1', label: 'Q1 · Technologie',
    opts: ['PWA installable (recommandé)', 'Natif iOS + Android', 'Web + desktop Tauri', 'À voir ensemble'] },
  { id: 'q2', label: 'Q2 · Stockage',
    opts: ['100 % local, sans compte (recommandé)', 'Backend avec compte (Supabase)', 'Local + sync fichier', 'À voir ensemble'] },
  { id: 'q4', label: 'Q4 · Licence',
    opts: ['AGPL-3.0 (protège du repli commercial)', 'MIT (diffusion maximale)', 'GPL-3.0', 'À voir ensemble'] },
  { id: 'q6', label: 'Q6 · Nom',
    opts: ['Garder « Carnet Bien-être »', 'Chercher un autre nom', 'À voir ensemble'] },
]

// ---- render -----------------------------------------------------------------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const nav = families.map(f => `
      <a class="navlink" href="#fam-${f.key}">
        <span class="navkey">${f.key}</span>
        <span class="navtitle">${esc(f.title)}</span>
        <span class="navcount" data-count-for="${f.key}">0<span class="navslash">/</span>${f.items.length}</span>
      </a>`).join('')

const sections = families.map(f => `
    <section class="family" id="fam-${f.key}" data-family="${f.key}">
      <header class="famhead">
        <div class="famtitle">
          <span class="famkey">${f.key}</span>
          <h2>${esc(f.title)}</h2>
        </div>
        <div class="famtools">
          <span class="fambadge"><b data-count-for="${f.key}">0</b> / ${f.items.length}</span>
          <button class="minibtn" type="button" data-fam-all="${f.key}">Tout</button>
          <button class="minibtn" type="button" data-fam-star="${f.key}">Les ★</button>
          <button class="minibtn" type="button" data-fam-none="${f.key}">Rien</button>
        </div>
      </header>
      ${f.blurb ? `<p class="famblurb">${esc(f.blurb)}</p>` : ''}
      <ul class="items">
${f.items.map(i => `        <li class="item${i.star ? ' is-star' : ''}" data-code="${i.code}" data-star="${i.star ? '1' : '0'}" data-search="${esc((i.code + ' ' + i.label + ' ' + i.detail).toLowerCase())}">
          <label>
            <input type="checkbox" value="${i.code}" data-fam="${f.key}">
            <span class="box" aria-hidden="true"></span>
            <span class="code">${i.code}</span>
            <span class="text">
              <span class="label">${esc(i.label)}${i.star ? '<span class="star" title="Recommandé pour la V1">★</span>' : ''}</span>
              ${i.detail ? `<span class="detail">${esc(i.detail)}</span>` : ''}
            </span>
          </label>
        </li>`).join('\n')}
      </ul>
    </section>`).join('')

const arbHtml = ARBITRAGES.map(a => `
        <fieldset class="arb">
          <legend>${esc(a.label)}</legend>
          ${a.opts.map((o, n) => `<label class="radio"><input type="radio" name="${a.id}" value="${esc(o)}"${n === 0 ? '' : ''}><span class="dot" aria-hidden="true"></span><span>${esc(o)}</span></label>`).join('')}
        </fieldset>`).join('')

const html = `<title>Carnet Bien-être — fiche de sélection</title>
<style>
  :root {
    /* --sage / --blue paint surfaces; --*-deep carry small text (AA on light grounds) */
    --sage:        #6d8a71;
    --sage-deep:   #4f6a54;
    --sage-soft:   #e6ece5;
    --sage-line:   #c9d6c8;
    --ink:         #242825;
    --ink-2:       #55605a;
    --ink-3:       #626d68;
    --paper:       #f6f6f2;
    --card:        #ffffff;
    --rule:        #e0e2dc;
    --blue:        #4f7ba6;
    --blue-deep:   #3a6389;
    --blue-soft:   #dfeaf4;
    --blue-line:   #b9d0e3;
    --ochre:       #8f6220;
    --shadow:      0 1px 2px rgba(36,40,37,.05), 0 8px 24px -16px rgba(36,40,37,.22);

    --serif: ui-serif, Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif;
    --sans:  -apple-system, "Segoe UI Variable Text", "Segoe UI", system-ui, Roboto, sans-serif;
    --mono:  "Cascadia Mono", Consolas, ui-monospace, "SF Mono", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --sage:      #9cbc9f;
      --sage-deep: #a8c5ab;
      --sage-soft: #232a24;
      --sage-line: #3a463b;
      --ink:       #e6e9e4;
      --ink-2:     #a8b2ab;
      --ink-3:     #7d8880;
      --paper:     #141715;
      --card:      #1b1f1c;
      --rule:      #2b302c;
      --blue:      #83aad0;
      --blue-deep: #93b8dc;
      --blue-soft: #1b2530;
      --blue-line: #35506b;
      --ochre:     #d0a15c;
      --shadow:    0 1px 2px rgba(0,0,0,.4), 0 8px 24px -16px rgba(0,0,0,.7);
    }
  }
  :root[data-theme="dark"] {
    --sage: #9cbc9f; --sage-deep: #a8c5ab; --sage-soft: #232a24; --sage-line: #3a463b;
    --ink: #e6e9e4; --ink-2: #a8b2ab; --ink-3: #7d8880;
    --paper: #141715; --card: #1b1f1c; --rule: #2b302c;
    --blue: #83aad0; --blue-deep: #93b8dc; --blue-soft: #1b2530; --blue-line: #35506b;
    --ochre: #d0a15c;
    --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px -16px rgba(0,0,0,.7);
  }
  :root[data-theme="light"] {
    --sage: #6d8a71; --sage-deep: #4f6a54; --sage-soft: #e6ece5; --sage-line: #c9d6c8;
    --ink: #242825; --ink-2: #55605a; --ink-3: #626d68;
    --paper: #f6f6f2; --card: #ffffff; --rule: #e0e2dc;
    --blue: #4f7ba6; --blue-deep: #3a6389; --blue-soft: #dfeaf4; --blue-line: #b9d0e3;
    --ochre: #8f6220;
    --shadow: 0 1px 2px rgba(36,40,37,.05), 0 8px 24px -16px rgba(36,40,37,.22);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--paper); color: var(--ink);
    font-family: var(--sans); font-size: 15px; line-height: 1.55;
    -webkit-text-size-adjust: 100%;
  }
  :focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; border-radius: 3px; }

  /* ---------- top bar ---------- */
  .bar {
    position: sticky; top: 0; z-index: 20;
    background: color-mix(in srgb, var(--paper) 88%, transparent);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--rule);
  }
  .barin {
    max-width: 1180px; margin: 0 auto; padding: 10px 20px;
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  }
  .brand { font-family: var(--serif); font-size: 17px; letter-spacing: -.01em; margin-right: auto; }
  .brand em { font-style: italic; color: var(--sage-deep); }
  .tally {
    font-family: var(--mono); font-variant-numeric: tabular-nums; font-size: 13px;
    padding: 5px 10px; border-radius: 999px;
    background: var(--blue-soft); border: 1px solid var(--blue-line); color: var(--blue-deep);
    white-space: nowrap;
  }
  .btn {
    font: inherit; font-size: 13.5px; cursor: pointer;
    padding: 7px 14px; border-radius: 7px;
    border: 1px solid var(--rule); background: var(--card); color: var(--ink);
    transition: border-color .12s, background .12s;
  }
  .btn:hover { border-color: var(--sage); }
  .btn-go {
    background: var(--sage-deep); border-color: var(--sage-deep);
    color: var(--paper); font-weight: 600;
  }
  .btn-go:hover { filter: brightness(1.12); border-color: var(--sage-deep); }

  /* ---------- layout ---------- */
  .wrap { max-width: 1180px; margin: 0 auto; padding: 0 20px 96px; }
  .lede { padding: 34px 0 26px; border-bottom: 1px solid var(--rule); max-width: 62ch; }
  .lede h1 {
    font-family: var(--serif); font-weight: 400; font-size: clamp(28px, 4.4vw, 40px);
    line-height: 1.12; letter-spacing: -.02em; margin: 0 0 12px; text-wrap: balance;
  }
  .lede p { margin: 0 0 10px; color: var(--ink-2); }
  .lede p:last-child { margin-bottom: 0; }
  .kbd { font-family: var(--mono); font-size: .88em; color: var(--ochre); }

  .cols { display: grid; grid-template-columns: 232px minmax(0, 1fr); gap: 40px; align-items: start; }
  @media (max-width: 900px) { .cols { grid-template-columns: 1fr; gap: 0; } .side { display: none; } }

  .side { position: sticky; top: 68px; padding-top: 28px; }
  .sidelabel {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: .1em;
    color: var(--ink-3); margin: 0 0 10px 10px;
  }
  .navlink {
    display: grid; grid-template-columns: 18px 1fr auto; gap: 8px; align-items: baseline;
    padding: 5px 10px; border-radius: 6px; text-decoration: none; color: var(--ink-2);
    font-size: 13px; border-left: 2px solid transparent;
  }
  .navlink:hover { background: var(--sage-soft); color: var(--ink); }
  .navkey { font-family: var(--mono); font-size: 11px; color: var(--sage-deep); font-weight: 700; }
  .navtitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .navcount { font-family: var(--mono); font-size: 11px; font-variant-numeric: tabular-nums; color: var(--ink-3); }
  .navslash { opacity: .45; }
  .navlink.has-picks .navcount { color: var(--blue-deep); font-weight: 700; }

  /* ---------- filters ---------- */
  .filters {
    position: sticky; top: 57px; z-index: 10;
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
    padding: 14px 0; margin-bottom: 6px;
    background: linear-gradient(var(--paper) 78%, transparent);
  }
  .search {
    font: inherit; font-size: 13.5px; padding: 7px 11px; min-width: 190px; flex: 1 1 190px;
    border: 1px solid var(--rule); border-radius: 7px; background: var(--card); color: var(--ink);
  }
  .search::placeholder { color: var(--ink-3); }
  .seg { display: flex; border: 1px solid var(--rule); border-radius: 7px; overflow: hidden; background: var(--card); }
  .seg button {
    font: inherit; font-size: 13px; cursor: pointer; padding: 7px 12px;
    border: 0; background: transparent; color: var(--ink-2); border-right: 1px solid var(--rule);
  }
  .seg button:last-child { border-right: 0; }
  .seg button[aria-pressed="true"] { background: var(--sage-soft); color: var(--ink); font-weight: 600; }

  /* ---------- families ---------- */
  .family { padding: 26px 0; border-top: 1px solid var(--rule); scroll-margin-top: 116px; }
  .family:first-of-type { border-top: 0; }
  .family.is-hidden { display: none; }
  .famhead { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 4px; }
  .famtitle { display: flex; align-items: baseline; gap: 10px; margin-right: auto; }
  .famkey {
    font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--sage-deep);
    border: 1px solid var(--sage-line); background: var(--sage-soft);
    border-radius: 5px; padding: 1px 6px;
  }
  .famhead h2 {
    font-family: var(--serif); font-weight: 400; font-size: 22px;
    letter-spacing: -.01em; margin: 0; text-wrap: balance;
  }
  .famtools { display: flex; align-items: center; gap: 6px; }
  .fambadge {
    font-family: var(--mono); font-size: 11.5px; font-variant-numeric: tabular-nums;
    color: var(--ink-3); margin-right: 4px;
  }
  .fambadge b { color: var(--blue-deep); }
  .minibtn {
    font: inherit; font-size: 12px; cursor: pointer; padding: 3px 9px;
    border: 1px solid var(--rule); border-radius: 999px; background: var(--card); color: var(--ink-2);
  }
  .minibtn:hover { border-color: var(--sage); color: var(--ink); }
  .famblurb { color: var(--ink-2); font-size: 13.5px; margin: 6px 0 14px; max-width: 68ch; }

  .items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  .item.is-hidden { display: none; }
  .item label {
    display: grid; grid-template-columns: 17px 34px minmax(0, 1fr); gap: 12px;
    align-items: start; cursor: pointer;
    padding: 9px 12px 9px 10px; border-radius: 8px;
    border: 1px solid transparent; border-left: 3px solid transparent;
    transition: background .12s, border-color .12s;
  }
  .item label:hover { background: var(--card); border-color: var(--rule); }
  .item input { position: absolute; opacity: 0; width: 0; height: 0; }
  .box {
    width: 17px; height: 17px; margin-top: 2px; border-radius: 4px;
    border: 1.5px solid var(--sage-line); background: var(--card);
    display: grid; place-items: center; flex: none;
  }
  .box::after {
    content: ""; width: 9px; height: 5px; margin-top: -2px;
    border-left: 2px solid #fff; border-bottom: 2px solid #fff;
    transform: rotate(-45deg) scale(.4); opacity: 0;
    transition: transform .14s, opacity .12s;
  }
  .code {
    font-family: var(--mono); font-size: 11.5px; font-weight: 700; letter-spacing: .02em;
    color: var(--ink-3); margin-top: 3px; font-variant-numeric: tabular-nums;
  }
  .text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .label { font-weight: 550; }
  .star { color: var(--ochre); font-size: 11px; margin-left: 6px; vertical-align: 1px; }
  .detail { color: var(--ink-2); font-size: 13.5px; }

  .item input:checked ~ .box { background: var(--blue); border-color: var(--blue); }
  .item input:checked ~ .box::after { opacity: 1; transform: rotate(-45deg) scale(1); }
  .item input:checked ~ .code { color: var(--blue-deep); }
  .item:has(input:checked) label {
    background: var(--blue-soft); border-color: var(--blue-line); border-left-color: var(--blue);
  }
  .item input:focus-visible ~ .box { outline: 2px solid var(--blue); outline-offset: 2px; }

  /* ---------- arbitrages ---------- */
  .block { padding: 30px 0; border-top: 1px solid var(--rule); }
  .block > h2 {
    font-family: var(--serif); font-weight: 400; font-size: 22px; margin: 0 0 6px;
    letter-spacing: -.01em;
  }
  .block > p { color: var(--ink-2); font-size: 13.5px; margin: 0 0 18px; max-width: 68ch; }
  .arbs { display: grid; grid-template-columns: repeat(auto-fit, minmax(258px, 1fr)); gap: 14px; }
  .arb {
    border: 1px solid var(--rule); border-radius: 10px; background: var(--card);
    padding: 12px 14px 14px; margin: 0; min-width: 0;
  }
  .arb legend {
    font-family: var(--mono); font-size: 11.5px; font-weight: 700; color: var(--sage-deep);
    text-transform: uppercase; letter-spacing: .06em; padding: 0 4px;
  }
  .radio {
    display: grid; grid-template-columns: 15px 1fr; gap: 9px; align-items: start;
    padding: 5px 2px; cursor: pointer; font-size: 13.5px; color: var(--ink-2);
  }
  .radio:hover { color: var(--ink); }
  .radio input { position: absolute; opacity: 0; width: 0; height: 0; }
  .dot {
    width: 15px; height: 15px; margin-top: 3px; border-radius: 50%;
    border: 1.5px solid var(--sage-line); background: var(--card);
    display: grid; place-items: center; flex: none;
  }
  .dot::after {
    content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--blue);
    transform: scale(0); transition: transform .14s;
  }
  .radio input:checked ~ .dot { border-color: var(--blue); }
  .radio input:checked ~ .dot::after { transform: scale(1); }
  .radio:has(input:checked) { color: var(--ink); font-weight: 550; }
  .radio input:focus-visible ~ .dot { outline: 2px solid var(--blue); outline-offset: 2px; }

  .notes {
    font: inherit; font-size: 14px; width: 100%; min-height: 96px; resize: vertical;
    margin-top: 14px; padding: 11px 13px; border: 1px solid var(--rule); border-radius: 10px;
    background: var(--card); color: var(--ink); font-family: var(--sans);
  }
  .notes::placeholder { color: var(--ink-3); }

  /* ---------- output ---------- */
  .out { padding: 30px 0 0; border-top: 1px solid var(--rule); }
  .outhead { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
  .outhead h2 { font-family: var(--serif); font-weight: 400; font-size: 22px; margin: 0 auto 0 0; letter-spacing: -.01em; }
  pre.recap {
    font-family: var(--mono); font-size: 12.5px; line-height: 1.65;
    background: var(--card); border: 1px solid var(--rule); border-radius: 10px;
    padding: 16px 18px; margin: 0; max-height: 420px; overflow: auto;
    white-space: pre-wrap; word-break: break-word; color: var(--ink-2);
    box-shadow: var(--shadow);
  }
  .hint { color: var(--ink-3); font-size: 12.5px; margin: 12px 0 0; }
  .empty { color: var(--ink-3); font-style: italic; }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<div class="bar">
  <div class="barin">
    <span class="brand">Carnet <em>Bien-être</em> · fiche de sélection</span>
    <span class="tally" id="tally">0 / ${total}</span>
    <button class="btn" type="button" id="apply-star">Cocher les ★ (${starred})</button>
    <button class="btn" type="button" id="clear">Vider</button>
    <button class="btn btn-go" type="button" id="copy">Copier ma sélection</button>
  </div>
</div>

<div class="wrap">
  <div class="lede">
    <h1>${total} propositions à trier avant d'écrire une ligne de code</h1>
    <p>Le cahier des charges de Crystèle couvre déjà le noyau du carnet. Cette liste explore ce qui pourrait
    l'entourer pour que l'app serve aussi d'autres personnes, à d'autres âges, sans jamais alourdir son usage à elle.</p>
    <p>Coche ce que tu veux garder, puis clique sur <span class="kbd">Copier ma sélection</span> et colle le résultat
    dans la conversation. Les <span class="star" style="font-size:12px">★</span> sont mes recommandations pour la V1.
    Rien n'est engageant : on écrira le cahier des charges définitif ensuite.</p>
  </div>

  <div class="cols">
    <aside class="side">
      <p class="sidelabel">Familles</p>
      <nav>${nav}
      </nav>
    </aside>

    <main>
      <div class="filters">
        <input class="search" id="search" type="search" placeholder="Filtrer : ménopause, export, IMC…" aria-label="Filtrer les propositions">
        <div class="seg" role="group" aria-label="Affichage">
          <button type="button" data-view="all" aria-pressed="true">Tout</button>
          <button type="button" data-view="star" aria-pressed="false">★ seulement</button>
          <button type="button" data-view="picked" aria-pressed="false">Mes choix</button>
        </div>
        <div class="seg" role="group" aria-label="Préréglages">
          <button type="button" data-preset="v1">+ Reco V1</button>
          <button type="button" data-preset="v2">+ V2</button>
          <button type="button" data-preset="v3">+ V3</button>
        </div>
      </div>
${sections}

      <section class="block">
        <h2>Arbitrages de fond</h2>
        <p>Quatre décisions qui conditionnent tout le reste. Si tu n'as pas d'avis, laisse vide : je proposerai et tu valideras.</p>
        <div class="arbs">${arbHtml}
        </div>
        <textarea class="notes" id="notes" placeholder="Autres remarques, idées qui manquent, priorités, contraintes de calendrier…"></textarea>
      </section>

      <section class="out">
        <div class="outhead">
          <h2>Ce que tu vas me transmettre</h2>
          <button class="btn btn-go" type="button" id="copy2">Copier</button>
        </div>
        <pre class="recap" id="recap"></pre>
        <p class="hint">Ta sélection est conservée dans ce navigateur : tu peux fermer la page et y revenir.</p>
      </section>
    </main>
  </div>
</div>

<script>
(function () {
  var DATA = ${JSON.stringify(families.map(f => ({ key: f.key, title: f.title, items: f.items.map(i => ({ code: i.code, label: i.label })) })))};
  var PRESETS = ${JSON.stringify(PRESETS)};
  var TOTAL = ${total};
  var STORE = 'carnet-bienetre-selection-v1';

  var boxes = Array.prototype.slice.call(document.querySelectorAll('.item input[type=checkbox]'));
  var byCode = {};
  boxes.forEach(function (b) { byCode[b.value] = b; });
  var labelOf = {};
  DATA.forEach(function (f) { f.items.forEach(function (i) { labelOf[i.code] = i.label; }); });

  var tally = document.getElementById('tally');
  var recap = document.getElementById('recap');
  var notes = document.getElementById('notes');
  var search = document.getElementById('search');
  var view = 'all';

  function picked() { return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }); }

  function arbAnswers() {
    var out = [];
    document.querySelectorAll('.arb').forEach(function (fs) {
      var hit = fs.querySelector('input:checked');
      if (hit) out.push({ q: fs.querySelector('legend').textContent.trim(), a: hit.value });
    });
    return out;
  }

  function buildRecap() {
    var sel = picked();
    var lines = [];
    lines.push('SÉLECTION — Carnet Bien-être');
    lines.push(sel.length + ' propositions retenues sur ' + TOTAL);
    lines.push('');
    if (!sel.length) {
      lines.push('(rien de coché pour le moment)');
    } else {
      DATA.forEach(function (f) {
        var kept = f.items.filter(function (i) { return byCode[i.code] && byCode[i.code].checked; });
        if (!kept.length) return;
        lines.push(f.key + '. ' + f.title + '  (' + kept.length + '/' + f.items.length + ')');
        kept.forEach(function (i) { lines.push('  ' + i.code + '  ' + i.label); });
        lines.push('');
      });
    }
    var arbs = arbAnswers();
    if (arbs.length) {
      lines.push('ARBITRAGES');
      arbs.forEach(function (a) { lines.push('  ' + a.q + ' : ' + a.a); });
      lines.push('');
    }
    var n = (notes.value || '').trim();
    if (n) { lines.push('NOTES'); lines.push('  ' + n.split(/\\n/).join('\\n  ')); lines.push(''); }
    lines.push('CODES  ' + (sel.length ? sel.join(' ') : '—'));
    return lines.join('\\n');
  }

  function counts() {
    var per = {};
    boxes.forEach(function (b) {
      var k = b.dataset.fam;
      per[k] = per[k] || 0;
      if (b.checked) per[k]++;
    });
    document.querySelectorAll('[data-count-for]').forEach(function (el) {
      var k = el.dataset.countFor;
      var v = per[k] || 0;
      if (el.classList.contains('navcount')) {
        el.firstChild.nodeValue = String(v);
        el.closest('.navlink').classList.toggle('has-picks', v > 0);
      } else {
        el.textContent = String(v);
      }
    });
  }

  function refresh() {
    var n = picked().length;
    tally.textContent = n + ' / ' + TOTAL;
    counts();
    recap.textContent = buildRecap();
    applyFilter();
    save();
  }

  function applyFilter() {
    var q = (search.value || '').trim().toLowerCase();
    document.querySelectorAll('.family').forEach(function (fam) {
      var shown = 0;
      fam.querySelectorAll('.item').forEach(function (li) {
        var box = li.querySelector('input');
        var ok = true;
        if (view === 'star' && li.dataset.star !== '1') ok = false;
        if (view === 'picked' && !box.checked) ok = false;
        if (ok && q && li.dataset.search.indexOf(q) === -1) ok = false;
        li.classList.toggle('is-hidden', !ok);
        if (ok) shown++;
      });
      fam.classList.toggle('is-hidden', shown === 0);
    });
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        codes: picked(),
        arbs: arbAnswers().map(function (a) { return a.a; }),
        notes: notes.value
      }));
    } catch (e) { /* mode privé : on continue sans persistance */ }
  }

  function restore() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var s = JSON.parse(raw);
      (s.codes || []).forEach(function (c) { if (byCode[c]) byCode[c].checked = true; });
      (s.arbs || []).forEach(function (val) {
        document.querySelectorAll('.arb input[type=radio]').forEach(function (r) { if (r.value === val) r.checked = true; });
      });
      if (s.notes) notes.value = s.notes;
    } catch (e) { /* ignore */ }
  }

  function setPreset(list, on) {
    list.split(' ').forEach(function (c) { if (byCode[c]) byCode[c].checked = on; });
  }

  async function copy(btn) {
    var text = buildRecap();
    var done = false;
    try { await navigator.clipboard.writeText(text); done = true; } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { done = document.execCommand('copy'); } catch (e2) { done = false; }
      document.body.removeChild(ta);
    }
    var was = btn.textContent;
    btn.textContent = done ? 'Copié — colle-le dans le chat' : 'Copie refusée, sélectionne le texte ci-dessous';
    setTimeout(function () { btn.textContent = was; }, 2600);
  }

  document.addEventListener('change', function (e) {
    if (e.target.matches('.item input, .arb input')) refresh();
  });
  notes.addEventListener('input', function () { recap.textContent = buildRecap(); save(); });
  search.addEventListener('input', applyFilter);

  document.querySelectorAll('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      view = b.dataset.view;
      document.querySelectorAll('[data-view]').forEach(function (o) {
        o.setAttribute('aria-pressed', String(o === b));
      });
      applyFilter();
    });
  });

  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () { setPreset(PRESETS[b.dataset.preset], true); refresh(); });
  });
  document.querySelectorAll('[data-fam-all]').forEach(function (b) {
    b.addEventListener('click', function () {
      boxes.forEach(function (x) { if (x.dataset.fam === b.dataset.famAll) x.checked = true; });
      refresh();
    });
  });
  document.querySelectorAll('[data-fam-star]').forEach(function (b) {
    b.addEventListener('click', function () {
      boxes.forEach(function (x) {
        if (x.dataset.fam === b.dataset.famStar && x.closest('.item').dataset.star === '1') x.checked = true;
      });
      refresh();
    });
  });
  document.querySelectorAll('[data-fam-none]').forEach(function (b) {
    b.addEventListener('click', function () {
      boxes.forEach(function (x) { if (x.dataset.fam === b.dataset.famNone) x.checked = false; });
      refresh();
    });
  });

  document.getElementById('apply-star').addEventListener('click', function () {
    boxes.forEach(function (x) { if (x.closest('.item').dataset.star === '1') x.checked = true; });
    refresh();
  });
  document.getElementById('clear').addEventListener('click', function () {
    boxes.forEach(function (x) { x.checked = false; });
    document.querySelectorAll('.arb input:checked').forEach(function (r) { r.checked = false; });
    refresh();
  });
  document.getElementById('copy').addEventListener('click', function () { copy(this); });
  document.getElementById('copy2').addEventListener('click', function () { copy(this); });

  restore();
  refresh();
})();
</script>
`

writeFileSync(OUT, html, 'utf8')
console.log('familles :', families.length)
console.log('propositions :', total, '| recommandées :', starred)
console.log(families.map(f => f.key + ':' + f.items.length).join('  '))
console.log('taille html :', (html.length / 1024).toFixed(0) + ' Ko')
