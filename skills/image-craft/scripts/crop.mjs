#!/usr/bin/env node
// Crop a rect from an image (bbox from detect.mjs, or by hand).
//   node crop.mjs --in ui.png --out layer.png --rect x,y,w,h [--pad 8]
// --pad expands the rect on all sides (clamped to image bounds).

import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
if (!fs.existsSync(path.join(here, "node_modules", "sharp"))) {
  execSync(`bash "${path.join(here, "setup.sh")}"`, { stdio: "inherit", env: { ...process.env, SETUP_QUIET: "1" } });
}
const { default: sharp } = await import(path.join(here, "node_modules", "sharp", "lib", "index.js"));

const args = process.argv.slice(2);
const o = { pad: 0 };
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === "--in") o.in = args[++i];
  else if (k === "--out") o.out = args[++i];
  else if (k === "--rect") o.rect = args[++i];
  else if (k === "--pad") o.pad = parseInt(args[++i], 10);
}
const m = /^(\d+),(\d+),(\d+),(\d+)$/.exec(o.rect || "");
if (!o.in || !o.out || !m) {
  console.error("Usage: crop.mjs --in <img> --out <img> --rect x,y,w,h [--pad 8]");
  process.exit(1);
}
const meta = await sharp(o.in).metadata();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const left = clamp(+m[1] - o.pad, 0, meta.width - 1);
const top = clamp(+m[2] - o.pad, 0, meta.height - 1);
const width = clamp(+m[3] + o.pad * 2, 1, meta.width - left);
const height = clamp(+m[4] + o.pad * 2, 1, meta.height - top);

fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
await sharp(o.in).extract({ left, top, width, height }).png().toFile(o.out);
console.log(`${o.out}  ${width}x${height}  (from ${left},${top})`);
