// UI · the DOM layer over the canvas: header, frosted card, part card, toolbar, the tray of plates with category
// tabs, the workbench kit panel, the exit pill, the live log, pages, the first frame, toasts. Pure DOM; the app
// wires behaviour through the callbacks it passes in.
export const ICON = {
  chip: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  rotate: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r=".6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  right: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
  power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  exit: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  screw: '<path d="m12 2 3 3-1.5 1.5L16 9l-7 7-2.5-2.5L5 15l-3-3"/><path d="M14 10l-4 4M17 13l5 5-4 4-5-5"/>',
};
export const ico = (k, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24">${ICON[k]}</svg>`;

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
export const lvlBars = (n) => `<span class="v-lvl">${[0.45, 0.7, 1].map((hh, i) => `<i class="${i < n ? 'on' : ''}" style="height:${hh * 100}%"></i>`).join('')}</span>`;
export const LEVEL_N = {'Beginner': 1, 'Intermediate': 2, 'Expert': 3};

export function buildUI(root, cb) {
  const U = {};
  const ui = h('div', {class: 'v-ui'});
  root.append(ui);
  U.root = ui;
  U.haze = h('div', {class: 'v-haze'}); ui.append(U.haze);
  U.layer = h('div', {class: 'v-layer'}); ui.append(U.layer);
  U.tip = h('div', {class: 'v-tip v-hide'}); U.layer.append(U.tip);

  /* ---------------- header */
  U.nav = h('nav', {class: 'v-nav'});
  U.navItems = {};
  [['show', 'Showroom'], ['bench', 'Bench'], ['logs', 'Log'], ['quiz', 'Quiz'], ['compare', 'Compare']].forEach(([id, label]) => {
    const a = h('a', {onclick: () => cb.nav(id)}, label); U.navItems[id] = a; U.nav.append(a);
  });
  U.music = h('button', {class: 'v-music', onclick: () => cb.music()}, 'Lo-fi', h('span', {class: 'v-bars', html: '<i></i><i></i><i></i>'}));
  U.top = h('div', {class: 'v-top'}, h('div', {class: 'v-brand', html: `${ico('chip')}<span>PC Verstak</span>`, onclick: () => cb.nav('show')}), U.nav, U.music);
  ui.append(U.top);

  /* ---------------- the item card */
  U.card = h('div', {class: 'v-card'});
  U.card.innerHTML = `<div class="v-eb"><span data-k="eb"></span><span data-k="ct"></span></div>
    <div class="v-title" data-k="title"></div>
    <div class="v-rest"><div class="v-sub" data-k="sub"></div>
    <div class="v-btns"><button class="v-btn dark" data-k="open">${ico('wrench')}<span>Build on the bench</span></button><button class="v-btn ghost" data-k="lvl"></button></div>
    <div class="v-div"></div><div class="v-desc" data-k="desc"></div><dl class="v-specs" data-k="specs"></dl><div class="v-list v-gone" data-k="list"></div></div>`;
  U.card.querySelector('[data-k=open]').onclick = () => cb.openBench();
  U.card.querySelector('[data-k=lvl]').onclick = () => cb.nav('compare');
  ui.append(U.card);
  const q = (el, k) => el.querySelector(`[data-k=${k}]`);
  U.setCard = (it, idx, n, specs) => {
    q(U.card, 'eb').textContent = it.eyebrow; q(U.card, 'ct').textContent = `${String(idx + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    q(U.card, 'title').textContent = it.title; q(U.card, 'sub').textContent = it.sub; q(U.card, 'desc').textContent = it.desc;
    q(U.card, 'lvl').innerHTML = `${lvlBars(LEVEL_N[it.level] || 1)}<span>${it.level}</span>`;
    q(U.card, 'specs').innerHTML = specs.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
    U.card.classList.remove('off'); void U.card.offsetWidth;
  };
  U.setLabelsList = (list, onPick) => {
    const L = q(U.card, 'list');
    if (!list) { L.classList.add('v-gone'); q(U.card, 'specs').classList.remove('v-gone'); return; }
    q(U.card, 'specs').classList.add('v-gone'); L.classList.remove('v-gone');
    L.innerHTML = ''; list.forEach((hs, i) => L.append(h('div', {onclick: () => onPick(i)}, h('b', {}, String(i + 1).padStart(2, '0')), hs.name)));
  };

  /* ---------------- the part card */
  U.pcard = h('div', {class: 'v-card v-pcard off'});
  U.pcard.innerHTML = `<div class="v-eb"><span>Part</span><span style="display:flex;gap:1.4rem;align-items:center"><span data-k="ct"></span><button class="v-x" data-k="x">${ico('x')}</button></span></div>
    <div class="v-ptitle" data-k="title"></div><div class="v-ptext" data-k="text"></div><div class="v-div"></div>
    <div class="v-pnav"><button class="v-round" data-k="prev">${ico('left')}</button><button class="v-round" data-k="next">${ico('right')}</button><div class="v-hint">Drag to rotate,<br>wheel to zoom</div></div>`;
  q(U.pcard, 'x').onclick = () => cb.closePart();
  q(U.pcard, 'prev').onclick = () => cb.stepPart(-1);
  q(U.pcard, 'next').onclick = () => cb.stepPart(1);
  ui.append(U.pcard);
  U.setPart = (hs, idx, n) => {
    if (!hs) { U.pcard.classList.add('off'); U.card.classList.remove('compact'); return; }
    U.card.classList.add('compact');
    q(U.pcard, 'ct').textContent = `${String(idx + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    q(U.pcard, 'title').textContent = hs.name; q(U.pcard, 'text').textContent = hs.desc;
    requestAnimationFrame(() => { U.pcard.style.top = (U.card.offsetTop + U.card.offsetHeight) / U.rem + 1.2 + 'rem'; U.pcard.classList.remove('off'); });
  };

  /* ---------------- toolbar */
  U.tool = h('div', {class: 'v-tool'});
  const tb = (k, label, icon, cls = '') => { const b = h('button', {class: 'v-tb ' + cls, html: (icon ? ico(icon) : '') + `<span>${label}</span>`, onclick: () => cb.tool(k)}); U.tool.append(b); return b; };
  U.tb = {
    v34: tb('v34', '3/4'), top: tb('top', 'Top'), bottom: tb('bottom', 'Bottom'), front: tb('front', 'Front'),
  };
  U.tool.append(h('span', {class: 'v-sep'}));
  U.tb.rotate = tb('rotate', 'Rotate', 'rotate');
  U.tb.labels = tb('labels', 'Labels', 'tag');
  U.tool.append(h('span', {class: 'v-sep'}));
  U.tb.find = tb('find', 'Find the part', 'target', 'out');
  U.tb.build = tb('build', 'Build', 'wrench', 'acc');
  ui.append(U.tool);

  /* ---------------- tray: category tabs and plates */
  U.tray = h('div', {class: 'v-tray'});
  U.tabs = h('div', {class: 'v-tabs'}); U.tiles = h('div', {class: 'v-tiles'});
  U.tray.append(U.tabs, U.tiles); ui.append(U.tray);
  U.setTabs = (cats, active, counts) => {
    U.tabs.innerHTML = '';
    cats.forEach((c) => U.tabs.append(h('div', {class: 'v-tab' + (c.id === active ? ' on' : ''), onclick: () => cb.tab(c.id)}, c.name, h('span', {}, String(counts[c.id])))));
  };
  U.tileEls = {};
  U.setTiles = (items, selId, thumbs, bad = {}) => {
    U.tiles.innerHTML = ''; U.tileEls = {};
    items.forEach((it, i) => {
      const t = h('div', {class: 'v-tile' + (it.id === selId ? ' sel' : '') + (bad[it.id] ? ' bad' : ''), style: `animation-delay:${i * 40}ms`, title: bad[it.id] || ''});
      t.append(thumbs[it.id] ? h('img', {src: thumbs[it.id], draggable: 'false'}) : h('div', {class: 'ph'}), h('p', {}, it.tile));
      t.addEventListener('pointerdown', (e) => cb.tileDown(e, it.id));
      U.tiles.append(t); U.tileEls[it.id] = t;
    });
  };
  U.setThumb = (id, url) => { const t = U.tileEls[id]; if (!t) return; const ph = t.querySelector('.ph'); if (ph) ph.replaceWith(h('img', {src: url, draggable: 'false'})); };

  /* ---------------- find-the-part chip */
  U.find = h('div', {class: 'v-find v-hide'});
  U.find.innerHTML = `<div><div class="eb" data-k="eb">FIND THE PART · 1 / 5</div><div class="q" data-k="q"></div></div><button class="v-btn ghost" data-k="skip" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.18)">Skip</button><button class="v-btn ghost" data-k="stop" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.18)">${ico('x')}</button>`;
  q(U.find, 'skip').onclick = () => cb.findSkip(); q(U.find, 'stop').onclick = () => cb.findStop();
  ui.append(U.find);
  U.setFind = (st) => {
    if (!st) { U.find.classList.add('v-hide'); return; }
    U.find.classList.remove('v-hide'); q(U.find, 'eb').textContent = st.eb; q(U.find, 'q').textContent = st.q; q(U.find, 'skip').style.display = st.done ? 'none' : '';
  };
  U.shakeFind = () => { U.find.classList.remove('shake'); void U.find.offsetWidth; U.find.classList.add('shake'); };

  /* ---------------- workbench: kit panel */
  U.kit = h('div', {class: 'v-kit off'});
  U.kit.innerHTML = `<div class="v-kh"><div class="row"><div><div class="eb2">Build kit</div><h2 data-k="title"></h2></div><button class="v-close" data-k="x">${ico('x')}</button></div>
      <div class="v-prog"><i data-k="bar"></i></div><div class="v-pr"><span data-k="cnt"></span><span data-k="time">0:00</span></div></div>
    <div class="v-stat" data-k="stat"><div class="eb3" data-k="seb"></div><p data-k="stext"></p><div data-k="sbtn"></div></div>
    <div class="v-klh">Parts · in build order</div><div class="v-rows" data-k="rows"></div>
    <div class="v-kf"><button class="v-btn ghost" data-k="hint">${ico('bulb')}<span>Hint</span></button><button class="v-btn salmon" data-k="auto"><span>Auto install</span></button>
      <div class="v-chal" data-k="chal"><span class="sw"></span><span>Challenge</span><span class="st" data-k="chst">OFF</span></div>
      <button class="v-btn out" data-k="reset">Start over</button><button class="v-btn out" data-k="exit">Exit</button>
      <div class="v-foot" data-k="foot">Thermal paste is already on the cooler base, just like in a real kit.</div></div>`;
  q(U.kit, 'x').onclick = () => cb.exitBench(); q(U.kit, 'exit').onclick = () => cb.exitBench();
  q(U.kit, 'hint').onclick = () => cb.hint(); q(U.kit, 'auto').onclick = () => cb.autoNext();
  q(U.kit, 'reset').onclick = () => cb.resetBench(); q(U.kit, 'chal').onclick = () => cb.challenge();
  ui.append(U.kit);
  U.kq = (k) => q(U.kit, k);
  U.setKitRows = (rows) => {
    const R = q(U.kit, 'rows'); R.innerHTML = '';
    rows.forEach((r) => R.append(h('div', {class: 'v-row ' + (r.cls || ''), onclick: () => cb.rowClick(r.cat)}, h('span', {class: 'dot'}), h('div', {class: 'nm'}, r.name, h('small', {}, r.sub)), h('span', {class: 'tg'}, r.tag))));
  };
  U.setStatus = (cls, eb, text, btn) => {
    const S = q(U.kit, 'stat'); S.className = 'v-stat ' + (cls || '');
    q(U.kit, 'seb').textContent = eb; q(U.kit, 'stext').textContent = text;
    const B = q(U.kit, 'sbtn'); B.innerHTML = '';
    if (btn) B.append(h('button', {class: 'v-btn ' + (btn.cls || 'dark'), html: (btn.icon ? ico(btn.icon) : '') + `<span>${btn.label}</span>`, onclick: btn.on}));
  };

  U.exit = h('button', {class: 'v-exit off', html: `${ico('exit')}<span>Leave the build</span>`, onclick: () => cb.exitBench()});
  ui.append(U.exit);
  U.log = h('div', {class: 'v-log off'}); ui.append(U.log);
  U.addLog = (ln) => {
    U.log.append(h('div', {class: 'ln', html: `<span class="t">${ln.t}</span><span class="${ln.lv}">${ln.text}</span>`}));
    while (U.log.children.length > 11) U.log.firstChild.remove();
  };

  /* ---------------- pages */
  U.page = h('div', {class: 'v-page off'}); ui.insertBefore(U.page, U.top);
  U.ghost = h('div', {class: 'v-ghost v-gone'}); ui.append(U.ghost);
  U.toast = h('div', {class: 'v-toast'}); ui.append(U.toast);
  let tt = 0;
  U.say = (text, kind = '', ms = 3200) => { U.toast.textContent = text; U.toast.className = 'v-toast on ' + kind; clearTimeout(tt); tt = setTimeout(() => U.toast.classList.remove('on'), ms); };

  /* ---------------- first frame */
  U.load = h('div', {class: 'v-load'});
  U.load.innerHTML = `<div class="mk">${ico('chip')}</div><h1>PC Verstak</h1><p>Build a computer from real parts, right on the desk.</p><div class="pb"><i></i></div><div class="st">Setting up the bench · 0%</div>`;
  root.append(U.load);
  U.loadProgress = (k, label) => { U.load.querySelector('.pb i').style.width = Math.round(k * 100) + '%'; U.load.querySelector('.st').textContent = `${label} · ${Math.round(k * 100)}%`; };
  U.loadDone = () => U.load.classList.add('off');

  /* ---------------- layout scale: 1rem = 10px at 1862 x 1080 */
  U.fit = () => {
    const s = Math.max(0.5, Math.min(1.35, Math.min(innerWidth / 1862, innerHeight / 1080)));
    U.rem = 10 * s; document.documentElement.style.fontSize = U.rem + 'px';
  };
  U.fit();
  U.setNav = (id) => { for (const [k, a] of Object.entries(U.navItems)) a.classList.toggle('on', k === id); };
  return U;
}
