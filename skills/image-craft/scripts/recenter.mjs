#!/usr/bin/env node
// Recenter a generated icon to match an existing set's framing:
// trim to content bounding box, scale to the set's fill ratio, center on a
// square canvas.
//   node recenter.mjs --in raw.png --out icon.webp --canvas 440 [--fill 0.68] [--bg "#ffffff"]
// Measure --canvas/--fill once from an existing icon of the set.

import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
if (!fs.existsSync(path.join(here, "node_modules", "sharp"))) {
  execSync(`bash "${path.join(here, "setup.sh")}"`, {
    stdio: "inherit",
    env: { ...process.env, SETUP_QUIET: "1" },
  });
}
const { default: sharp } = await import(path.join(here, "node_modules", "sharp", "lib", "index.js"));

const args = process.argv.slice(2);
const o = { canvas: 440, fill: 0.68, bg: "#ffffff", quality: 90 };
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === "--in") o.in = args[++i];
  else if (k === "--out") o.out = args[++i];
  else if (k === "--canvas") o.canvas = parseInt(args[++i], 10);
  else if (k === "--fill") o.fill = parseFloat(args[++i]);
  else if (k === "--bg") o.bg = args[++i];
  else if (k === "--quality") o.quality = parseInt(args[++i], 10);
}
if (!o.in || !o.out) {
  console.error("Usage: recenter.mjs --in <raw> --out <final> [--canvas 440] [--fill 0.68] [--bg #ffffff]");
  process.exit(1);
}

// 1. Trim to content
const trimmed = await sharp(o.in).trim({ threshold: 12 }).png().toBuffer();

// 2. Fit inside fill×canvas box
const inner = Math.round(o.canvas * o.fill);
const fitted = await sharp(trimmed)
  .resize(inner, inner, { fit: "contain", background: o.bg })
  .png()
  .toBuffer();

// 3. Center on canvas
const pad = Math.round((o.canvas - inner) / 2);
const pipeline = sharp(fitted).extend({
  top: pad,
  bottom: o.canvas - inner - pad,
  left: pad,
  right: o.canvas - inner - pad,
  background: o.bg,
});

fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
if (/\.webp$/i.test(o.out)) await pipeline.webp({ quality: o.quality }).toFile(o.out);
else await pipeline.png().toFile(o.out);

console.log(`${o.out}  ${o.canvas}x${o.canvas}  (fill ${o.fill})`);
