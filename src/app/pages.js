// PAGES · the three paper pages behind the header: the journal (every log line of the session, in a terminal), a
// ten-question test on what the bench teaches, and the comparison tables by category with a compatibility matrix.
import {CATS, ITEMS, itemsOf, BY_ID, fitCheck} from '../catalog.js';
import {h, ico} from './ui.js';

export function renderPage(id, el, o) {
  el.innerHTML = '';
  const pin = h('div', {class: 'v-pin'});
  el.append(pin);
  if (id === 'logs') journal(pin, o);
  else if (id === 'quiz') quiz(pin, o);
  else compare(pin, o);
}

/* ------------------------------------------------------------ journal */
function journal(pin, o) {
  const L = o.S.logs;
  const n = (lv) => L.filter((l) => l.lv === lv).length;
  pin.append(
    h('div', {class: 'v-eb'}, h('span', {}, 'Session log'), h('span', {}, `${L.length} entries`)),
    h('h1', {}, 'What happened on the bench'),
    h('p', {class: 'lead'}, 'Every action and every board self test, timed from launch. Green is fine, yellow is a note, red is what stopped the PC from working.'),
  );
  const row = h('div', {class: 'v-btns', style: 'margin-top:2.4rem'},
    h('button', {class: 'v-btn dark', html: `${ico('wrench')}<span>Open the bench</span>`, onclick: () => { o.sfx.click(); o.go('bench'); }}),
    h('button', {class: 'v-btn ghost', html: `<span>Clear log</span>`, onclick: () => { o.sfx.click(); o.clearLogs(); renderPage('logs', pin.parentNode, o); }}),
  );
  pin.append(row);
  const term = h('div', {class: 'v-jr'});
  term.append(h('div', {class: 'head'}, `pc-verstak · log  —  ok: ${n('ok')}  ·  notes: ${n('warn')}  ·  errors: ${n('err')}`));
  if (!L.length) term.append(h('div', {class: 'v-empty'}, 'Empty so far. Build something on the bench and press Power on.'));
  for (const l of L) term.append(h('div', {class: 'ln'}, h('span', {class: 't'}, l.t), h('span', {class: l.lv}, l.text)));
  pin.append(term);
}

/* ------------------------------------------------------------ quiz */
const QUIZ = [
  {q: 'Why will a HyperX Genesis DDR3 stick not go into an MSI B660M board?',
    o: ['The DDR3 key notch is elsewhere, the slot will not take it', 'The BIOS needs an update first', 'The stick is too tall for the slot', 'The VRM heatsink is in the way'], a: 0,
    why: 'DDR3 and DDR4 have different pin counts (240 and 288) and a shifted key notch. It is a mechanical guard: the wrong memory will not go in, even with force.'},
  {q: 'Where are the pins on a Ryzen 7 5800X?',
    o: ['On the CPU itself, underneath: 1331 of them', 'In the board socket, like on Intel', 'There are no pins, only flat pads'], a: 0,
    why: 'AM4 is a PGA socket: pins on the CPU, holes in the socket. Intel LGA is the other way round: spring contacts in the socket, flat pads on the CPU.'},
  {q: 'What does the F in Core i3-9100F mean?',
    o: ['A CPU without integrated graphics', 'An unlocked multiplier', 'Lower power draw', 'A laptop version'], a: 0,
    why: 'F means no graphics core. With such a CPU and no graphics card the screen stays black. An unlocked multiplier is marked with a K.'},
  {q: 'The fans spin, there is no picture and the VGA LED is lit. What do you check first?',
    o: ['The graphics card: is it seated and is its power plugged in', 'The power supply, it burned out', 'The thermal paste on the CPU', 'The BIOS battery'], a: 0,
    why: 'The EZ Debug LEDs light in turn: CPU → DRAM → VGA → BOOT. A stuck VGA means the board found nowhere to send the picture.'},
  {q: 'Which power supply in the set suits the ROG Strix RTX 4090?',
    o: ['Volt 850 Gold, with headroom and a native 12VHPWR plug', 'Volt 550 Bronze, what matters is that it has the cables', 'Any of them: the card is powered by the PCIe slot'], a: 0,
    why: 'The card draws up to 450 W, and with the CPU and load spikes the build needs 750–850 W. The PCIe slot gives only 75 W; the rest comes over the cable.'},
  {q: 'Two memory sticks, four slots on the board. Where do they go?',
    o: ['In A2 and B2, for dual channel', 'In A1 and A2, side by side for shorter traces', 'It does not matter, the board sorts it out'], a: 0,
    why: 'Each stick in its own channel: data runs over two buses at once. Two sticks in one channel run at half speed. The right pair is always printed on the board and in the manual.'},
  {q: 'Why is there thermal paste between the CPU and the cooler?',
    o: ['It fills micro gaps so heat does not hit a layer of air', 'It glues the cooler to the CPU', 'It protects the lid from scratches', 'It carries current to the fan'], a: 0,
    why: 'Air conducts heat poorly, and a thin layer of paste pushes it out of the gaps. Too much paste is bad too: a pea-sized drop is enough.'},
  {q: 'A Pulse drive (PCIe 4.0) went into a Z490 board with PCIe 3.0. What happens?',
    o: ['It works but is capped by PCIe 3.0, about 3500 MB/s', 'It will not fit the slot', 'The drive controller burns out'], a: 0,
    why: 'PCIe is compatible both ways: the link runs at the speed of the slower side. The M.2 slot is the same.'},
  {q: 'What do the rows of chokes and transistors around the socket (VRM) do?',
    o: ['They step 12 V from the power supply down to ~1.2 V for the CPU', 'They cool the CPU', 'They store the BIOS settings', 'They route signals to USB'], a: 0,
    why: 'The voltage regulator works in phases: the more phases, the steadier the power under load and the less each one heats up. That is why strong boards have heatsinks over the VRM.'},
  {q: 'Besides the 24-pin, which cable must go into the board?',
    o: ['CPU 8-pin (EPS) at the top edge, the CPU power', 'SATA, into any port', 'Molex, for the fans', 'Nothing, the 24-pin is enough'], a: 0,
    why: 'The CPU has its own power through the 8-pin connector at the top edge of the board. Without it the board will not start.'},
];
function shuffleOpts(q, seed) {
  // the right answer should not always be first: a fixed per-question shuffle
  const idx = q.o.map((_, i) => i); let s = seed * 7919 + 13;
  for (let i = idx.length - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}
function quiz(pin, o) {
  const st = {done: 0, right: 0};
  pin.append(
    h('div', {class: 'v-eb'}, h('span', {}, 'Quiz · 10 questions'), h('span', {}, 'about the bench')),
    h('h1', {}, 'Test yourself'),
    h('p', {class: 'lead'}, 'Everything you see on the bench: keys, sockets, LEDs, power. Pick an answer and the explanation appears right away.'),
  );
  const grid = h('div', {class: 'v-quiz'});
  const score = h('div', {class: 'v-score'});
  const paint = () => {
    score.innerHTML = '';
    const all = st.done === QUIZ.length;
    score.append(h('b', {}, `${st.right} / ${QUIZ.length}`), h('div', {style: 'flex:1;font:400 1.6rem/1.45 var(--sans)'},
      all ? (st.right >= 9 ? 'Excellent: you are ready to build a real computer.' : st.right >= 6 ? 'Good! A couple of topics are worth a refresh on the bench.' : 'Have a look at the bench and try again, it all makes sense in your hands.')
        : `Answered ${st.done} of ${QUIZ.length}.`));
    if (all) score.append(h('button', {class: 'v-btn salmon', html: '<span>Try again</span>', onclick: () => { o.sfx.click(); renderPage('quiz', pin.parentNode, o); }}));
  };
  QUIZ.forEach((q, qi) => {
    const box = h('div', {class: 'v-q'});
    box.append(h('div', {class: 'n'}, `Question ${String(qi + 1).padStart(2, '0')}`), h('h3', {}, q.q));
    const opts = h('div', {class: 'opts'}); let answered = false;
    const why = h('div', {class: 'why v-gone'}, q.why);
    shuffleOpts(q, qi + 1).forEach((oi) => {
      const b = h('div', {class: 'opt'}, h('span', {style: 'font:600 1.2rem/1 var(--mono);color:var(--ink4)'}, '○'), q.o[oi]);
      b.onclick = () => {
        if (answered) return; answered = true; st.done++;
        const ok = oi === q.a; if (ok) st.right++;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) opts.children[[...opts.children].findIndex((c) => c.dataset.i === String(q.a))].classList.add('right');
        why.classList.remove('v-gone');
        ok ? o.sfx.ok() : o.sfx.error();
        paint();
        if (st.done === QUIZ.length) o.log(st.right >= 6 ? 'ok' : 'warn', `[QUIZ] Result: ${st.right} of ${QUIZ.length}`);
      };
      b.dataset.i = String(oi);
      opts.append(b);
    });
    box.append(opts, why);
    grid.append(box);
  });
  pin.append(grid, score);
  paint();
}

/* ------------------------------------------------------------ compare */
const COLS = {
  board: [['Socket', (x) => x.board.socket], ['Chipset', (x) => x.board.chipset], ['Form factor', (x) => `${x.board.form} · ${x.board.size}`], ['Memory', (x) => `${x.board.ram} × ${x.board.slots}`], ['M.2', (x) => x.board.m2], ['PCIe', (x) => x.board.pcie], ['Year', (x) => x.board.year]],
  cpu: [['Socket', (x) => x.cpu.socket], ['Cores', (x) => x.cpu.cores], ['Clock', (x) => x.cpu.clock], ['TDP', (x) => x.cpu.tdp + ' W', (x) => x.cpu.tdp / 150], ['Graphics', (x) => x.cpu.igpu], ['Year', (x) => x.cpu.year]],
  ram: [['Type', (x) => x.ram.type], ['Size', (x) => x.ram.size], ['Clock', (x) => x.ram.freq, (x) => parseInt(x.ram.freq, 10) / 3200], ['Timings', (x) => x.ram.timings], ['Voltage', (x) => x.ram.volt], ['Lighting', (x) => x.ram.rgb], ['Height', (x) => x.ram.h]],
  gpu: [['Memory', (x) => x.gpu.vram], ['Power', (x) => x.gpu.tbp + ' W', (x) => x.gpu.tbp / 450], ['Length', (x) => x.gpu.len], ['Slots', (x) => x.gpu.slots], ['Power', (x) => x.gpu.power], ['PSU from', (x) => x.gpu.psu + ' W'], ['Year', (x) => x.gpu.year]],
  cooler: [['Type', (x) => x.cooler.type], ['Handles', (x) => 'up to ' + x.cooler.tdp + ' W', (x) => x.cooler.tdp / 180], ['Fan', (x) => x.cooler.fan], ['Height', (x) => x.cooler.h], ['Noise', (x) => x.cooler.noise]],
  ssd: [['Interface', (x) => x.ssd.iface], ['Size', (x) => x.ssd.size], ['Read', (x) => x.ssd.read, (x) => parseInt(x.ssd.read, 10) / 7000], ['Write', (x) => x.ssd.write], ['Form factor', (x) => 'M.2 ' + x.ssd.form]],
  psu: [['Power', (x) => x.psu.watts + ' W', (x) => x.psu.watts / 850], ['Certificate', (x) => x.psu.cert], ['Modular', (x) => x.psu.modular], ['12 V rail', (x) => x.psu.amps], ['Fan', (x) => x.psu.fan]],
};
function compare(pin, o) {
  let cat = o.S.cat || 'board';
  pin.append(
    h('div', {class: 'v-eb'}, h('span', {}, 'Compare'), h('span', {}, `${ITEMS.length} parts · 7 categories`)),
    h('h1', {}, 'Everything side by side, by category'),
    h('p', {class: 'lead'}, 'The numbers a build depends on. Click a row to open the part in the showroom. The last tab shows which parts work with which board.'),
  );
  const seg = h('div', {class: 'v-seg'});
  const body = h('div', {});
  pin.append(seg, body);
  const tabs = [...CATS.map((c) => [c.id, c.name]), ['fit', 'Compatibility']];
  const paint = () => {
    seg.innerHTML = '';
    tabs.forEach(([id, name]) => seg.append(h('a', {class: id === cat ? 'on' : '', onclick: () => { o.sfx.click(); cat = id; paint(); }}, name)));
    body.innerHTML = '';
    body.append(cat === 'fit' ? fitTable(o) : catTable(cat, o));
  };
  paint();
}
function thumb(o, id) { return o.thumbs[id] ? h('img', {src: o.thumbs[id], alt: ''}) : h('span', {style: 'width:8rem;height:5rem;display:inline-block'}); }
function catTable(cat, o) {
  const cols = COLS[cat], c = CATS.find((x) => x.id === cat);
  const t = h('table', {class: 'v-tbl'});
  t.append(h('tr', {}, h('th', {}, c.one), ...cols.map(([n]) => h('th', {}, n)), h('th', {}, 'Level')));
  for (const it of itemsOf(cat)) {
    const tr = h('tr', {style: 'cursor:pointer', onclick: () => { o.sfx.click(); o.open && o.open(it.id); }});
    tr.append(h('td', {class: 'nm'}, thumb(o, it.id), h('span', {}, it.title)));
    for (const [, f, bar] of cols) {
      const td = h('td', {}, String(f(it)));
      if (bar) { const b = h('div', {class: 'bar'}); b.append(h('i', {style: `width:${Math.round(Math.min(1, bar(it)) * 100)}%`})); td.append(b); }
      tr.append(td);
    }
    tr.append(h('td', {}, it.level));
    t.append(tr);
  }
  return t;
}
function fitTable(o) {
  const wrap = h('div', {});
  const parts = [...itemsOf('cpu'), ...itemsOf('ram')];
  const t = h('table', {class: 'v-tbl'});
  t.append(h('tr', {}, h('th', {}, 'Board'), ...parts.map((p) => h('th', {style: 'white-space:normal'}, p.tile.replace('\n', ' ')))));
  for (const b of itemsOf('board')) {
    const tr = h('tr', {});
    tr.append(h('td', {class: 'nm'}, thumb(o, b.id), h('span', {}, b.title)));
    for (const p of parts) {
      const f = fitCheck(b.id, p.id);
      tr.append(h('td', {title: f.ok ? 'fits' : f.why, style: `font:600 1.6rem/1 var(--sans);color:${f.ok ? 'var(--green)' : 'var(--red)'}`}, f.ok ? '✓' : '×'));
    }
    t.append(tr);
  }
  wrap.append(t, h('p', {class: 'lead', style: 'margin-top:2.4rem;font-size:1.5rem'},
    'The coolers, graphics cards, drives and power supplies in the set fit all five boards. But fits does not mean works: the Volt 550 cannot feed an RTX 3090 and the Breeze 65 cannot hold a hot Core i5-12600K. You will see it when you power on at the bench.'));
  return wrap;
}
