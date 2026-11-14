# PC Verstak

A 3D PC builder in one HTML file. Pick a motherboard, CPU, memory, graphics card, cooler, drive and power supply on
the plates, drag every part onto the board on the bench and power it on: the board runs a POST self test, checks the
power budget and the cooling, and tells you what works and what does not.

- 5 motherboards (ASRock X99 OC Formula, MSI H310M Gaming Arctic, MSI MEG X570 Godlike, MSI MPG Z490 Gaming Carbon,
  MSI MAG B660M Mortar), 3 memory kits, 2 graphics cards (RTX 3090 Founders Edition, ROG Strix RTX 4090), 5 CPUs,
  2 coolers, 2 SSDs, 2 power supplies.
- Showroom with labels and part details, a bench with drag and drop assembly, a session log, a quiz and a compare page.
- Models drawn in a flat inked style: three flat tones per face, ink outlines, flat blue cast shadows.
- Calm procedural lo-fi music (starts on the first click).

## Run

Open `index.html` in a browser. It is fully offline: three.js, fonts and all textures are inside the file.

## Deploy on Vercel

Import this repository in Vercel as a static project: no build command, output directory `/` (the repository root).
`index.html` is served at the root URL.

## Source

`src/` holds the source modules (three.js r186). `index.html` is the bundled build of `src/main.js`.
