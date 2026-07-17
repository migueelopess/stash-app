// Gera public/icon-192.png e public/icon-512.png a partir da marca Stash.
// Correr da raiz do projeto: node scripts/gerar-icones.mjs
// A marca vive em src/lib/marca-stash.json (única fonte de verdade).
import sharp from "sharp";
import { readFileSync } from "node:fs";

const marca = JSON.parse(readFileSync("src/lib/marca-stash.json", "utf8"));

// A marca está centrada em (512,512) no canvas 1024 e mede ~372x444.
// Tile quadrado cheio (o iOS/Android arredondam os cantos por conta deles);
// a marca ocupa ~62% da altura do tile.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="154 154 716 716">
  <rect x="154" y="154" width="716" height="716" fill="#0d1b26"/>
  <path fill="#61E5C3" fill-rule="evenodd" d="${marca.d}"/>
</svg>`;

for (const tamanho of [192, 512]) {
  await sharp(Buffer.from(svg))
    .resize(tamanho, tamanho)
    .png()
    .toFile(`public/icon-${tamanho}.png`);
  console.log(`✓ public/icon-${tamanho}.png`);
}
