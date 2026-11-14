// FONTS · inlined by build.mjs (woff2 → base64): Source Serif 4 for titles (the video's display serif, with Cyrillic),
// Inter for text, JetBrains Mono for eyebrows, counters and logs. The kit's own @font-face covers Latin; these add
// Cyrillic and the serif.
import serifLat from '@fontsource-variable/source-serif-4/files/source-serif-4-latin-opsz-normal.woff2';
import serifCyr from '@fontsource-variable/source-serif-4/files/source-serif-4-cyrillic-opsz-normal.woff2';
import interCyr from '@fontsource-variable/inter/files/inter-cyrillic-wght-normal.woff2';
import monoCyr4 from '@fontsource/jetbrains-mono/files/jetbrains-mono-cyrillic-400-normal.woff2';
import monoCyr6 from '@fontsource/jetbrains-mono/files/jetbrains-mono-cyrillic-600-normal.woff2';
import monoCyr7 from '@fontsource/jetbrains-mono/files/jetbrains-mono-cyrillic-700-normal.woff2';
import monoLat5 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2';

const LAT = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const CYR = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const buf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

export async function loadFonts() {
  const faces = [
    new FontFace('Source Serif 4', buf(serifLat), {weight: '200 900', unicodeRange: LAT}),
    new FontFace('Source Serif 4', buf(serifCyr), {weight: '200 900', unicodeRange: CYR}),
    new FontFace('Inter', buf(interCyr), {weight: '100 900', unicodeRange: CYR}),
    new FontFace('JetBrains Mono', buf(monoCyr4), {weight: '400', unicodeRange: CYR}),
    new FontFace('JetBrains Mono', buf(monoCyr6), {weight: '500 600', unicodeRange: CYR}),
    new FontFace('JetBrains Mono', buf(monoCyr7), {weight: '700 800', unicodeRange: CYR}),
    new FontFace('JetBrains Mono', buf(monoLat5), {weight: '500', unicodeRange: LAT}),
  ];
  for (const f of faces) document.fonts.add(f);
  await Promise.all([
    ...faces.map((f) => f.load().catch(() => {})),
    document.fonts.load('400 20px "Inter"'), document.fonts.load('700 20px "Inter"'), document.fonts.load('800 20px "Inter"'),
    document.fonts.load('400 20px "JetBrains Mono"'), document.fonts.load('700 20px "JetBrains Mono"'),
    document.fonts.load('400 20px "Source Serif 4"'), document.fonts.load('600 20px "Source Serif 4"'),
    document.fonts.load('400 20px "Inter"', 'Hello'), document.fonts.load('400 20px "Source Serif 4"', 'Hello'), document.fonts.load('700 20px "JetBrains Mono"', 'Hello'),
  ]).catch(() => {});
}
