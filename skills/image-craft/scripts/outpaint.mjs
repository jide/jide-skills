#!/usr/bin/env node
// Extend an image (outpaint) via fal-ai/flux-2-pro/outpaint.
//   node outpaint.mjs --in <image> --out <path> [--left N] [--right N] [--top N] [--bottom N]
// Expansion values in pixels. Original content is preserved (re-encode only).
// Endpoint cap: expanded canvas ≤ 2560px per edge — checked before calling.
// Env: FAL_KEY.

import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { loadEnvUpwards, readRefs, fileToDataUri } from "./lib.mjs";
import { falRun, downloadImage } from "./fal.mjs";

loadEnvUpwards();

const MAX_CANVAS = 2560;

const here = path.dirname(new URL(import.meta.url).pathname);
if (!fs.existsSync(path.join(here, "node_modules", "sharp"))) {
  execSync(`bash "${path.join(here, "setup.sh")}"`, {
    stdio: "inherit",
    env: { ...process.env, SETUP_QUIET: "1", SETUP_BACKEND: "fal" },
  });
}
const { default: sharp } = await import(path.join(here, "node_modules", "sharp", "lib", "index.js"));

const args = process.argv.slice(2);
const o = { left: 0, right: 0, top: 0, bottom: 0 };
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === "--in") o.in = args[++i];
  else if (k === "--out") o.out = args[++i];
  else if (k === "--left") o.left = parseInt(args[++i], 10);
  else if (k === "--right") o.right = parseInt(args[++i], 10);
  else if (k === "--top") o.top = parseInt(args[++i], 10);
  else if (k === "--bottom") o.bottom = parseInt(args[++i], 10);
}
if (!o.in || !o.out || !(o.left + o.right + o.top + o.bottom > 0)) {
  console.error("Usage: outpaint.mjs --in <image> --out <path> --left|--right|--top|--bottom <px> (at least one)");
  process.exit(1);
}
const [abs] = readRefs(o.in);

const meta = await sharp(abs).metadata();
const finalW = meta.width + o.left + o.right;
const finalH = meta.height + o.top + o.bottom;
if (finalW > MAX_CANVAS || finalH > MAX_CANVAS) {
  console.error(
    `Error: expanded canvas ${finalW}x${finalH} exceeds the endpoint max (${MAX_CANVAS}px per edge).\n` +
    `Input is ${meta.width}x${meta.height} — reduce the expansion, or downscale the input first.`,
  );
  process.exit(1);
}

try {
  const result = await falRun("fal-ai/flux-2-pro/outpaint", {
    image_url: fileToDataUri(abs),
    expand_left: o.left,
    expand_right: o.right,
    expand_top: o.top,
    expand_bottom: o.bottom,
    output_format: "png",
  });
  const url = result?.images?.[0]?.url;
  if (!url) throw new Error(`No image in response: ${JSON.stringify(result).slice(0, 300)}`);
  await downloadImage(url, o.out);
  console.log(`Saved: ${o.out}  (+${o.left}L +${o.right}R +${o.top}T +${o.bottom}B)`);
} catch (error) {
  console.error("Outpaint failed:", error?.message || error);
  process.exit(1);
}
