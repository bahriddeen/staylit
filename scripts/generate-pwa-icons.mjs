/**
 * Generate the PWA PNG icons from the committed SVG sources. Run once (or after
 * changing the SVGs) with `node scripts/generate-pwa-icons.mjs`; the resulting
 * PNGs are committed to public/ so the build itself needs no image toolchain.
 *
 *   public/favicon.svg        -> icon-192.png, icon-512.png   (purpose: any)
 *   public/icon-maskable.svg  -> icon-maskable-512.png        (purpose: maskable)
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

async function render(srcName, outName, size) {
  const svg = await readFile(join(publicDir, srcName));
  const png = await sharp(svg, { density: 512 })
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
  await writeFile(join(publicDir, outName), png);
  console.log(`  ${outName} (${size}x${size})`);
}

console.log("Generating PWA icons:");
await render("favicon.svg", "icon-192.png", 192);
await render("favicon.svg", "icon-512.png", 512);
await render("icon-maskable.svg", "icon-maskable-512.png", 512);
console.log("Done.");
