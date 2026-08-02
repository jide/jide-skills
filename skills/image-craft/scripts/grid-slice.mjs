#!/usr/bin/env node
// Slice a filled grid image into equal rows × cols cells — plain inset crop.
// Grid geometry is trusted (the model filled a deterministic template).
//
// Usage:
//   node grid-slice.mjs --in grid.png --rows 5 --cols 6 --out-dir out \
//        [--names a,b,c,...] [--inset 0.08]
//
// --inset 0.06–0.10 trims cell edges so guide lines never survive into slices.
// For transparent sets: slice first, then remove-bg.mjs per slice.

import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
if (!fs.existsSync(path.join(here, "node_modules", "sharp"))) {
  execSync(`bash "${path.join(here, "setup.sh")}"`, { stdio: "inherit", env: { ...process.env, SETUP_QUIET: "1" } });
}
const { default: sharp } = await import(path.join(here, "node_modules", "sharp", "lib", "index.js"));

const args = process.argv.slice(2);
const opt = { inset: 0.08 };
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === "--in") opt.in = args[++i];
  else if (k === "--rows") opt.rows = parseInt(args[++i], 10);
  else if (k === "--cols") opt.cols = parseInt(args[++i], 10);
  else if (k === "--out-dir") opt.outDir = args[++i];
  else if (k === "--names") opt.names = args[++i].split(",").map((s) => s.trim());
  else if (k === "--inset") opt.inset = parseFloat(args[++i]);
}
if (!opt.in || !opt.rows || !opt.cols || !opt.outDir) {
  console.error("missing args: --in --rows --cols --out-dir [--names] [--inset]");
  process.exit(1);
}
fs.mkdirSync(opt.outDir, { recursive: true });

const meta = await sharp(opt.in).metadata();
const cellW = Math.floor(meta.width / opt.cols);
const cellH = Math.floor(meta.height / opt.rows);
const insetX = Math.floor(cellW * opt.inset);
const insetY = Math.floor(cellH * opt.inset);

let idx = 0;
for (let r = 0; r < opt.rows; r++) {
  for (let c = 0; c < opt.cols; c++) {
    const name = opt.names?.[idx] ?? `asset_${idx + 1}`;
    await sharp(opt.in)
      .extract({
        left: c * cellW + insetX,
        top: r * cellH + insetY,
        width: cellW - insetX * 2,
        height: cellH - insetY * 2,
      })
      .png()
      .toFile(path.join(opt.outDir, `${name}.png`));
    idx++;
  }
}
console.log(`sliced ${idx} cells -> ${opt.outDir}`);
