#!/usr/bin/env node
// Build a grid template PNG: cols × rows equal square cells on a flat bg with
// thin hairline guide lines. Feed it to gen.sh (--refs) so the model fills one
// asset per cell — deterministic cell positions make slicing exact afterwards.
//
// Usage:
//   node grid-template.mjs --cols 6 --rows 5 --cell 512 --out template.png \
//        [--bg "#8c8c8c"] [--line "#6a6a6a"] [--stroke 3]
//   Rectangular cells (screen sheets): --cell-w 768 --cell-h 1152 instead of --cell.
//
// Background: the exact color of the target surface (CSS token) for blend-in
// slices, or neutral grey (default) when transparency comes later (remove-bg).
// Sizing for gpt-image-2: long edge ≤3840, ≤8.29M px, multiples of 16.
// e.g. 6x5 @ cell 512 → 3072x2560 (7.9MP, OK). Bigger grids need a smaller cell.

import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
if (!fs.existsSync(path.join(here, "node_modules", "sharp"))) {
  execSync(`bash "${path.join(here, "setup.sh")}"`, { stdio: "inherit", env: { ...process.env, SETUP_QUIET: "1" } });
}
const { default: sharp } = await import(path.join(here, "node_modules", "sharp", "lib", "index.js"));

const a = process.argv.slice(2);
const o = { cols: 6, rows: 5, cell: 512, cellW: 0, cellH: 0, bg: "#8c8c8c", line: "#6a6a6a", stroke: 3, out: "template.png" };
for (let i = 0; i < a.length; i++) {
  const k = a[i];
  if (k === "--cols") o.cols = +a[++i];
  else if (k === "--rows") o.rows = +a[++i];
  else if (k === "--cell") o.cell = +a[++i];
  else if (k === "--cell-w") o.cellW = +a[++i];
  else if (k === "--cell-h") o.cellH = +a[++i];
  else if (k === "--bg") o.bg = a[++i];
  else if (k === "--line") o.line = a[++i];
  else if (k === "--stroke") o.stroke = +a[++i];
  else if (k === "--out") o.out = a[++i];
}
const cellW = o.cellW || o.cell;
const cellH = o.cellH || o.cell;
const W = o.cols * cellW;
const H = o.rows * cellH;
let lines = "";
for (let c = 0; c <= o.cols; c++) {
  const x = Math.min(c * cellW, W - o.stroke / 2);
  lines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" />`;
}
for (let r = 0; r <= o.rows; r++) {
  const y = Math.min(r * cellH, H - o.stroke / 2);
  lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" />`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${o.bg}"/>
  <g stroke="${o.line}" stroke-width="${o.stroke}">${lines}</g>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(o.out);
const totalMP = (W * H) / 1e6;
console.log(`${o.out}  ${W}x${H}  (${o.cols}x${o.rows} cells @ ${cellW}x${cellH}px, ${totalMP.toFixed(1)}MP)`);
if (Math.max(W, H) > 3840 || totalMP > 8.29) {
  console.warn("WARN: exceeds gpt-image-2 limits (long edge 3840 / 8.29MP) — use a smaller --cell.");
}
