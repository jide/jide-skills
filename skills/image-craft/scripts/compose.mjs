#!/usr/bin/env node
// Recompose layers onto a base image (the "remount" step of the layer peel).
//   node compose.mjs --base bg.png --out final.png \
//        --layer "card_alpha.png@120,340" --layer "fab_alpha.png@612,1180" ...
// Layers composite in the order given (first = bottom). Positions = top-left
// corner in px (use the detect.mjs pixel rect minus any --pad used at crop).

import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
if (!fs.existsSync(path.join(here, "node_modules", "sharp"))) {
  execSync(`bash "${path.join(here, "setup.sh")}"`, { stdio: "inherit", env: { ...process.env, SETUP_QUIET: "1" } });
}
const { default: sharp } = await import(path.join(here, "node_modules", "sharp", "lib", "index.js"));

const args = process.argv.slice(2);
const layers = [];
let base, out;
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === "--base") base = args[++i];
  else if (k === "--out") out = args[++i];
  else if (k === "--layer") layers.push(args[++i]);
}
if (!base || !out || layers.length === 0) {
  console.error('Usage: compose.mjs --base <img> --out <img> --layer "file.png@x,y" [--layer ...]');
  process.exit(1);
}

const composites = layers.map((spec) => {
  const m = /^(.+)@(\d+),(\d+)$/.exec(spec);
  if (!m) { console.error(`Bad --layer spec: ${spec} (expected file.png@x,y)`); process.exit(1); }
  if (!fs.existsSync(m[1])) { console.error(`Layer not found: ${m[1]}`); process.exit(1); }
  return { input: m[1], left: +m[2], top: +m[3] };
});

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
await sharp(base).composite(composites).png().toFile(out);
console.log(`${out}  (base + ${composites.length} layers)`);
