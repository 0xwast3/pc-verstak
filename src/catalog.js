// CATALOG · every part on the bench: its category, the texts on its card, its numbers for the compare page and the
// compatibility rules, and the hotspots (in the part's own space) for parts whose model does not bring its own.
import {buildBoard, BOARD_SPECS} from './parts/boards.js';
import {buildRam} from './parts/ram.js';
import {buildGpu} from './parts/gpu.js';
import {buildCpu} from './parts/cpu.js';
import {buildCooler} from './parts/cooling.js';
import {buildSsd} from './parts/storage.js';
import {buildPsu} from './parts/power.js';

export const CATS = [
  {id: 'board', name: 'Boards', one: 'Motherboard', many: 'motherboards'},
  {id: 'cpu', name: 'CPUs', one: 'CPU', many: 'CPUs'},
  {id: 'ram', name: 'Memory', one: 'Memory', many: 'memory modules'},
  {id: 'gpu', name: 'Graphics', one: 'Graphics card', many: 'graphics cards'},
  {id: 'cooler', name: 'Cooling', one: 'Cooler', many: 'coolers'},
  {id: 'ssd', name: 'Storage', one: 'SSD', many: 'drives'},
  {id: 'psu', name: 'Power', one: 'Power supply', many: 'power supplies'},
];

const H = (id, name, desc, box) => ({id, name, desc, box});

export const ITEMS = [
  /* ---------------------------------------------------------------- boards */
  {id: 'b660m', cat: 'board', tile: 'MAG B660M\nMortar', eyebrow: 'MSI · 2022 · LGA1700', title: 'MSI MAG B660M Mortar', sub: 'Compact board with serious power delivery', level: 'Beginner',
    desc: 'Silver heatsinks with a dotted texture, twelve phases and two M.2 slots under shields. A solid base for 12th gen Core in a small case.',
    board: {socket: 'LGA1700', chipset: 'Intel B660', form: 'mATX', size: '244 × 244 mm', ram: 'DDR4', slots: 4, m2: 2, pcie: 'PCIe 4.0', year: 2022}},
  {id: 'z490', cat: 'board', tile: 'MPG Z490\nGaming Carbon', eyebrow: 'MSI · 2020 · LGA1200', title: 'MSI MPG Z490 Gaming Carbon', sub: 'Black carbon and overclocking on a Z chipset', level: 'Intermediate',
    desc: 'Carbon pattern on the heatsinks, lighting along the I/O shroud and the Z490 chipset, which unlocks overclocking for K-series CPUs.',
    board: {socket: 'LGA1200', chipset: 'Intel Z490', form: 'ATX', size: '305 × 244 mm', ram: 'DDR4', slots: 4, m2: 2, pcie: 'PCIe 3.0', year: 2020}},
  {id: 'x570', cat: 'board', tile: 'MEG X570\nGodlike', eyebrow: 'MSI · 2019 · AM4', title: 'MSI MEG X570 Godlike', sub: 'Ryzen flagship with mirror lighting', level: 'Expert',
    desc: 'E-ATX with a huge I/O shroud, three M.2 slots under Lightning plates and a dragon on the chipset. A board for enthusiasts who want everything.',
    board: {socket: 'AM4', chipset: 'AMD X570', form: 'E-ATX', size: '305 × 277 mm', ram: 'DDR4', slots: 4, m2: 3, pcie: 'PCIe 4.0', year: 2019}},
  {id: 'x99', cat: 'board', tile: 'X99 OC\nFormula', eyebrow: 'ASROCK · 2014 · LGA2011-3', title: 'ASRock X99 OC Formula', sub: 'A yellow board built for overclocking records', level: 'Expert',
    desc: 'Eight memory slots in quad channel, buttons and switches for overclockers and the famous yellow heatsinks.',
    board: {socket: 'LGA2011-3', chipset: 'Intel X99', form: 'ATX', size: '305 × 244 mm', ram: 'DDR4', slots: 8, m2: 1, pcie: 'PCIe 3.0', year: 2014}},
  {id: 'h310m', cat: 'board', tile: 'H310M\nGaming Arctic', eyebrow: 'MSI · 2018 · LGA1151', title: 'MSI H310M Gaming Arctic', sub: 'White and simple, made for a first build', level: 'Beginner',
    desc: 'White PCB, two memory slots and nothing extra. Great for learning: everything is in sight and nothing hides under heatsinks.',
    board: {socket: 'LGA1151', chipset: 'Intel H310', form: 'mATX', size: '244 × 190 mm', ram: 'DDR4', slots: 2, m2: 1, pcie: 'PCIe 3.0', year: 2018}},

  /* ---------------------------------------------------------------- processors */
  {id: 'i5_12600k', cat: 'cpu', tile: 'Core\ni5-12600K', eyebrow: 'INTEL · 2021 · LGA1700', title: 'Core i5-12600K', sub: '10 cores: six fast and four efficient', level: 'Intermediate',
    desc: 'Hybrid Alder Lake design: P-cores for games, E-cores for background work. The elongated lid is the giveaway of the LGA1700 socket.',
    cpu: {socket: 'LGA1700', cores: '6P + 4E / 16 threads', clock: '3.7–4.9 GHz', tdp: 125, igpu: 'UHD 770', year: 2021},
    hot: 'cpu'},
  {id: 'i7_10700k', cat: 'cpu', tile: 'Core\ni7-10700K', eyebrow: 'INTEL · 2020 · LGA1200', title: 'Core i7-10700K', sub: 'Eight Comet Lake cores', level: 'Intermediate',
    desc: 'The last pure eight-core chip on 14 nm. The K means an unlocked multiplier, so it goes on Z490 boards.',
    cpu: {socket: 'LGA1200', cores: '8 / 16 threads', clock: '3.8–5.1 GHz', tdp: 125, igpu: 'UHD 630', year: 2020}, hot: 'cpu'},
  {id: 'i3_9100f', cat: 'cpu', tile: 'Core\ni3-9100F', eyebrow: 'INTEL · 2019 · LGA1151', title: 'Core i3-9100F', sub: 'Four cores, no integrated graphics', level: 'Beginner',
    desc: 'F means no integrated graphics: without a graphics card the screen stays black. Cool and frugal, a box cooler is enough.',
    cpu: {socket: 'LGA1151', cores: '4 / 4 threads', clock: '3.6–4.2 GHz', tdp: 65, igpu: 'none', year: 2019}, hot: 'cpu'},
  {id: 'i7_5820k', cat: 'cpu', tile: 'Core\ni7-5820K', eyebrow: 'INTEL · 2014 · LGA2011-3', title: 'Core i7-5820K', sub: 'Six cores on the HEDT platform', level: 'Expert',
    desc: 'A big lid, four memory channels and 28 PCIe lanes. Once the cheapest way into the serious X99 platform.',
    cpu: {socket: 'LGA2011-3', cores: '6 / 12 threads', clock: '3.3–3.6 GHz', tdp: 140, igpu: 'none', year: 2014}, hot: 'cpu'},
  {id: 'r7_5800x', cat: 'cpu', tile: 'Ryzen 7\n5800X', eyebrow: 'AMD · 2020 · AM4', title: 'Ryzen 7 5800X', sub: 'Eight Zen 3 cores, pins underneath', level: 'Intermediate',
    desc: 'On AM4 the pins sit on the CPU itself, 1331 of them. Line up the gold triangle in the corner with the triangle on the socket.',
    cpu: {socket: 'AM4', cores: '8 / 16 threads', clock: '3.8–4.7 GHz', tdp: 105, igpu: 'none', year: 2020}, hot: 'cpu'},

  /* ---------------------------------------------------------------- memory */
  {id: 'hyperx', cat: 'ram', tile: 'HyperX\nGenesis DDR3', eyebrow: 'KINGSTON · 2011 · DDR3', title: 'HyperX Genesis DDR3', sub: 'Blue heatsink and the key in the wrong place', level: 'Beginner',
    desc: 'Classic DDR3-1600. The key notch sits elsewhere than on DDR4, so this stick simply will not go into a newer board.',
    ram: {type: 'DDR3', size: '4 GB', freq: '1600 MHz', timings: 'CL9', volt: '1.65 V', rgb: 'none', h: '39.6 mm'}, hot: 'ram'},
  {id: 'gloway', cat: 'ram', tile: 'Gloway GAME\nDDR4 8G', eyebrow: 'GLOWAY · 2019 · DDR4', title: 'Gloway GAME DDR4', sub: '8 GB at 2400 MHz, no frills', level: 'Beginner',
    desc: 'Low black heatsink with a stepped edge and a white QR sticker. A quiet workhorse for any DDR4 board.',
    ram: {type: 'DDR4', size: '8 GB', freq: '2400 MHz', timings: 'CL17', volt: '1.2 V', rgb: 'none', h: '33.4 mm'}, hot: 'ram'},
  {id: 'fury', cat: 'ram', tile: 'Fury Beast\nRGB DDR4', eyebrow: 'KINGSTON · 2021 · DDR4', title: 'Kingston FURY Beast RGB', sub: 'DDR4-3200 with a light bar', level: 'Intermediate',
    desc: 'Angular heatsink with a light diffuser on top. The XMP profile raises the speed to 3200 MHz with one BIOS setting.',
    ram: {type: 'DDR4', size: '8 GB', freq: '3200 MHz', timings: 'CL16', volt: '1.35 V', rgb: 'yes', h: '42.2 mm'}, hot: 'ram'},

  /* ---------------------------------------------------------------- graphics */
  {id: 'fe3090', cat: 'gpu', tile: 'RTX 3090\nFounders Ed.', eyebrow: 'NVIDIA · 2020 · 350 W', title: 'GeForce RTX 3090 Founders Edition', sub: 'Flow-through cooling and 24 GB of memory', level: 'Expert',
    desc: 'A titanium frame with X-shaped plates. The second fan blows straight through the heatsink, toward the CPU cooler.',
    gpu: {vram: '24 GB GDDR6X', tbp: 350, len: '313 mm', slots: '3', power: '12-pin', psu: 750, year: 2020}, hot: 'gpu'},
  {id: 'strix4090', cat: 'gpu', tile: 'ROG Strix\nRTX 4090', eyebrow: 'ASUS · 2022 · 450 W', title: 'ROG Strix GeForce RTX 4090', sub: 'Three Axial-tech fans and 3.5 slots', level: 'Expert',
    desc: 'A huge card with a chrome ring and a purple light bar. Power comes through one 16-pin 12VHPWR plug rated at 600 W.',
    gpu: {vram: '24 GB GDDR6X', tbp: 450, len: '358 mm', slots: '3,5', power: '16-pin', psu: 850, year: 2022}, hot: 'gpu'},

  /* ---------------------------------------------------------------- cooling */
  {id: 'breeze', cat: 'cooler', tile: 'Breeze 65\nBox cooler', eyebrow: 'VERSTAK · BOX · 65 W', title: 'VERSTAK Breeze 65', sub: 'A simple cooler from the box', level: 'Beginner',
    desc: 'A round aluminium heatsink with a copper core and four push pins. Handles 65 W; a hot CPU under it will start to throttle.',
    cooler: {type: 'Box', tdp: 65, fan: '80 mm', h: '47 mm', noise: '28 dBA'}, hot: 'breeze'},
  {id: 'tower', cat: 'cooler', tile: 'Tower 120\nTower cooler', eyebrow: 'VERSTAK · TOWER · 180 W', title: 'VERSTAK Tower 120', sub: 'Four heat pipes and a 120 mm fan', level: 'Intermediate',
    desc: 'The pipes carry heat from the copper base up into a stack of 52 fins. The fan blows toward the rear exhaust, where the hot air leaves the case.',
    cooler: {type: 'Tower', tdp: 180, fan: '120 mm', h: '160 mm', noise: '24 dBA'}, hot: 'tower'},

  /* ---------------------------------------------------------------- storage */
  {id: 'nova', cat: 'ssd', tile: 'Nova 1TB\nNVMe 3.0', eyebrow: 'VERSTAK · M.2 2280 · PCIE 3.0', title: 'VERSTAK Nova 1TB', sub: 'An NVMe drive the size of a stick of gum', level: 'Beginner',
    desc: 'A controller, a DRAM buffer and two flash chips under the label. It goes into M.2 at an angle and is held by one screw.',
    ssd: {iface: 'PCIe 3.0 ×4', size: '1 TB', read: '3500 MB/s', write: '3000 MB/s', form: '2280'}, hot: 'ssd'},
  {id: 'pulse', cat: 'ssd', tile: 'Pulse 2TB\nNVMe 4.0', eyebrow: 'VERSTAK · M.2 2280 · PCIE 4.0', title: 'VERSTAK Pulse 2TB', sub: 'Twice as fast, if the slot allows', level: 'Intermediate',
    desc: 'A PCIe 4.0 drive: it works in a 3.0 slot but is capped by the slot speed. The graphite label also spreads heat.',
    ssd: {iface: 'PCIe 4.0 ×4', size: '2 TB', read: '7000 MB/s', write: '6500 MB/s', form: '2280'}, hot: 'ssd'},

  /* ---------------------------------------------------------------- power */
  {id: 't550', cat: 'psu', tile: 'Volt 550\nBronze', eyebrow: 'VERSTAK · ATX · 550 W', title: 'VERSTAK Volt 550 Bronze', sub: 'Fixed cables and 80 PLUS Bronze', level: 'Beginner',
    desc: 'Enough for an office build and a mid-range card. Under an RTX 3090 or 4090 its protection trips at the first load.',
    psu: {watts: 550, cert: '80 PLUS Bronze', modular: 'none', amps: '45 A on 12 V', fan: '120 mm'}, hot: 'psu'},
  {id: 't850', cat: 'psu', tile: 'Volt 850\nGold', eyebrow: 'VERSTAK · ATX 3.0 · 850 W', title: 'VERSTAK Volt 850 Gold', sub: 'Modular, with a native 12VHPWR', level: 'Intermediate',
    desc: 'Every cable detaches, so only the needed ones go in the case. Headroom for a top graphics card and short load spikes.',
    psu: {watts: 850, cert: '80 PLUS Gold', modular: 'full', amps: '70.8 A on 12 V', fan: '135 mm'}, hot: 'psu'},
];
export const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const itemsOf = (cat) => ITEMS.filter((i) => i.cat === cat);
export const catOf = (id) => CATS.find((c) => c.id === id);

/* ---------------------------------------------------------------- model builders */
export function buildItem(id) {
  const m = buildRaw(id);
  // a Colorfigures part: its own heavy ink outline, and it takes no cast shadow on itself (shadows lie on the bench)
  m.root.userData.cfRoot = true;
  m.root.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  return m;
}
function buildRaw(id) {
  const it = BY_ID[id];
  switch (it.cat) {
    case 'board': return buildBoard(BOARD_SPECS[id]);
    case 'cpu': return buildCpu(id);
    case 'ram': return buildRam(id);
    case 'gpu': return buildGpu(id);
    case 'cooler': return buildCooler(id);
    case 'ssd': return buildSsd(id);
    case 'psu': return buildPsu(id);
  }
}

/* ---------------------------------------------------------------- hotspots for the parts (part space boxes) */
export function hotspotsFor(id, model) {
  const it = BY_ID[id];
  if (it.cat === 'board') return model.hot;
  switch (it.hot) {
    case 'cpu': {
      const [w, d] = model.pkg, t = model.top;
      const list = [
        H('ihs', 'Heat spreader', 'Nickel-plated copper over the die. Thermal paste goes here in a thin layer to fill the micro gaps between the lid and the cooler base.', [-w * 0.4, 1, -d * 0.4, w * 0.4, t, d * 0.4]),
        H('pin1', 'Pin 1 key', 'A gold triangle in the corner. The socket has the same mark: line them up and the CPU drops in without force.', [-w / 2, 0, d / 2 - 6, -w / 2 + 6, 1.6, d / 2]),
        H('sub', 'Substrate', 'The layered board under the lid routes the die signals to the contacts. Small filter capacitors sit around the lid.', [w * 0.38, 0, -d / 2, w / 2, 1.4, d / 2]),
      ];
      if (model.socket === 'AM4') list.push(H('pins', '1331 pins underneath', 'Thin gold-plated pins. A bent pin can be straightened, but better not to drop the CPU at all.', [-w / 2, -2, -d / 2, w / 2, 0, d / 2]));
      else list.push(H('lands', 'Contact pads', `Flat pads that meet the spring contacts of the ${model.socket} socket. Better not to touch them with your fingers.`, [-w / 2, -1, -d / 2, w / 2, 0.2, d / 2]));
      return list;
    }
    case 'ram': {
      const Hh = model.H, notch = model.ddr === 3 ? -11.975 : 5.175;
      const list = [
        H('fingers', model.ddr === 3 ? '240 pins' : '288 pins', 'The gold-plated edge that goes into the slot. Open the slot latches before installing.', [-1.5, 0, -66, 1.5, 4, 66]),
        H('key', model.ddr === 3 ? 'DDR3 key' : 'DDR4 key', model.ddr === 3 ? 'On DDR3 the notch is closer to the edge than on DDR4. It prevents mistakes: the stick will not go into the wrong slot, even with force.' : 'The notch is off center. If the stick does not go in, turn it around instead of pushing.', [-2, 0, notch - 3, 2, 6, notch + 3]),
        H('spreader', 'Heatsink and memory chips', 'Eight DRAM chips sit under the aluminium plates. The heatsink is held by thermal glue and spreads heat when overclocked.', [-4.5, 8, -56, 4.5, Hh - 2, 56]),
      ];
      if (model.rgb) list.push(H('rgb', 'Light bar', 'A diffuser with addressable LEDs. The board sets the color over the SPD bus, no extra cable needed.', [-3, Hh - 9, -60, 3, Hh + 1, 60]));
      return list;
    }
    case 'gpu': {
      const z1 = model.Z1, z0 = model.Z0, top = model.Y1;
      return [
        H('fans', model.id === 'fe3090' ? 'Fans on both sides' : 'Three Axial-tech fans', model.id === 'fe3090' ? 'The fan near the bracket blows into the heatsink and out through the bracket; the far one pulls air up through the fins.' : 'A ring on the blade tips keeps the pressure; the middle fan spins the other way so the flows do not fight.', [20, 20, z1 - 16, model.len - 70, top - 20, z1 + 3]),
        H('power', model.id === 'fe3090' ? '12-pin power connector' : '16-pin 12VHPWR connector', 'Up to 450–600 W over one cable. Push it in until it clicks: a loose plug heats up.', [model.plug.x - 14, top - 4, model.plug.z - 8, model.plug.x + 14, top + 10, model.plug.z + 8]),
        H('bracket', 'Bracket with video outputs', 'DisplayPort and HDMI. The monitor plugs in here, not into the board, or the picture comes from the integrated graphics (if there is any).', [-46, -2, z0 - 3, -34, top - 4, z1 + 3]),
        H('fingers', 'PCIe x16 connector', '164 contacts. The slot latch clicks when the card is fully seated; press it to remove the card.', [0, 0, -2, 92, 12, 2]),
        H('led', 'Lit logo', 'Glows when the card has power. Brightness and color are set in the vendor utility.', [model.len - 140, top - 2, z0, model.len - 30, top + 2, z1]),
      ];
    }
    case 'breeze': return [
      H('fan', '80 mm fan', 'Pushes air down through the fins and also cools the power phases around the socket.', [-42, 22, -42, 42, 32, 42]),
      H('fins', 'Radial fins', 'Aluminium plates fan out from the core: more surface at the same height.', [-46, 1, -46, 46, 23, 46]),
      H('pins', 'Push pins', 'Four legs go into the board holes. Press them crosswise until each one clicks.', [30, 0, 30, 45, 31, 45]),
      H('core', 'Copper core and paste', 'Copper quickly pulls heat from the CPU lid; a strip of thermal paste is already on the base.', [-14, -1, -14, 14, 3, 14]),
    ];
    case 'tower': return [
      H('fins', 'Fin stack', '52 thin aluminium plates. The more surface, the slower the fan can spin, and the quieter it is.', [-26, 50, -62, 26, 158, 62]),
      H('pipes', 'Heat pipes', 'Liquid boils and condenses inside the copper pipes, moving heat many times faster than solid copper.', [-22, 8, -14, 22, 50, 14]),
      H('fan', '120 mm fan', 'Blows backward toward the case exhaust. Rubber corners damp vibration.', [26, 47, -60, 52, 167, 60]),
      H('base', 'Base and mounting bar', 'Nickel-plated copper base. Tighten the screws half a turn at a time, in turn, for even pressure.', [-20, 0, -38, 20, 16, 38]),
    ];
    case 'ssd': return [
      H('key', 'M key', 'The notch by the contacts: an M key means four PCIe lanes. Insert the drive at 20 degrees and lower it to the standoff.', [0, -0.5, -11, 5, 1.5, 11]),
      H('ctrl', 'Controller', 'The brain of the drive: spreads data across the chips and tracks cell wear.', [8, 0.5, -6, 20, 2.4, 6]),
      H('nand', 'NAND flash', 'Two 512 GB chips (or 1 TB each on the Pulse). They keep data without power.', [37, 0.5, -9, 71, 2.6, 9]),
      H('screw', 'Screw notch', 'The half-round notch at the far end sits on the board standoff and is held by a tiny M2 screw.', [76, -0.5, -4, 81, 1.5, 4]),
    ];
    case 'psu': return [
      H('fan', 'Fan', 'Draws air from the bottom of the case and blows it out the back. At low load it may not spin at all.', [-model.D / 2 + 8, 70, -68, model.D / 2 - 8, 90, 68]),
      H('rear', 'Power inlet and switch', 'While the switch is at O the PC will not start, a common reason for nothing works.', [-model.D / 2 - 6, 10, -78, -model.D / 2 + 2, 60, -20]),
      H('label', 'Rating label', 'What matters most is the 12 V current: that rail feeds the CPU and the graphics card.', [-model.D / 2 + 10, 10, 72, model.D / 2 - 10, 78, 78]),
      H('cables', model.modular ? 'Modular sockets' : 'Fixed cables', model.modular ? 'Plug in only the cables you need. Never use cables from another unit: every brand has its own pinout.' : 'The bundle leaves through a rubber grommet. Spare cables are tucked behind the tray.', [model.D / 2 - 4, 10, -70, model.D / 2 + 46, 80, 70]),
    ];
  }
  return [];
}

/* ---------------------------------------------------------------- the build: what goes where, and what fits */
export const KIT_ORDER = ['cpu', 'cooler', 'ram', 'gpu', 'ssd', 'psu'];
export const DEFAULT_KIT = {
  b660m: {cpu: 'i5_12600k', cooler: 'tower', ram: 'fury', gpu: 'fe3090', ssd: 'pulse', psu: 't850'},
  z490: {cpu: 'i7_10700k', cooler: 'tower', ram: 'fury', gpu: 'strix4090', ssd: 'pulse', psu: 't850'},
  x570: {cpu: 'r7_5800x', cooler: 'tower', ram: 'fury', gpu: 'strix4090', ssd: 'pulse', psu: 't850'},
  x99: {cpu: 'i7_5820k', cooler: 'tower', ram: 'gloway', gpu: 'fe3090', ssd: 'nova', psu: 't850'},
  h310m: {cpu: 'i3_9100f', cooler: 'breeze', ram: 'gloway', gpu: 'fe3090', ssd: 'nova', psu: 't850'},
};
export function fitCheck(boardId, itemId) {
  // can this part go into this board at all? {ok, why}
  const b = BY_ID[boardId].board, it = BY_ID[itemId];
  if (it.cat === 'cpu' && it.cpu.socket !== b.socket) return {ok: false, why: `Wrong socket: the CPU is ${it.cpu.socket}, the board is ${b.socket}. The contacts will not match, it cannot go in.`};
  if (it.cat === 'ram' && it.ram.type !== b.ram) return {ok: false, why: `This is ${it.ram.type}, but the board slots are ${b.ram}. The key notch is elsewhere: the stick will not physically fit.`};
  return {ok: true};
}
