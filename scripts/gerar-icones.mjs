// Gera public/icon-192.png e public/icon-512.png a partir da marca Stash.
// Correr da raiz do projeto: node scripts/gerar-icones.mjs
// Mantém os paths em sincronia com src/components/logo-stash.tsx.
import sharp from "sharp";

const marca = `
  <g fill="none" stroke="#5eead4" stroke-width="6" stroke-linecap="round">
    <ellipse cx="60" cy="22" rx="26" ry="10.5"/>
    <path d="M86 22 v3 c0 7 -5 11 -12 12"/>
    <path d="M34 22 v8 c0 8 11 12 26 12 h13 c9 0 9 10 -3 10 H50 c-10 0 -16 6 -16 12 v2"/>
    <ellipse cx="60" cy="68" rx="26" ry="10.5"/>
    <path d="M34 68 v12 c0 7 11 11 26 11 s26 -4 26 -11 V68"/>
    <path d="M34 74 c0 7 11 11 26 11 s26 -4 26 -11"/>
  </g>`;

// Quadrado cheio (o iOS/Android arredondam os cantos por conta deles);
// a marca ocupa ~70% do tile.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 -4.75 112 112">
  <rect x="4" y="-4.75" width="112" height="112" fill="#0d1b26"/>
  ${marca}
</svg>`;

for (const tamanho of [192, 512]) {
  await sharp(Buffer.from(svg))
    .resize(tamanho, tamanho)
    .png()
    .toFile(`public/icon-${tamanho}.png`);
  console.log(`✓ public/icon-${tamanho}.png`);
}
