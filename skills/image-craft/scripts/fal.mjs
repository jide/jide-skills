#!/usr/bin/env node
// fal.ai backend — Grok Imagine (speed/quality) and Seedream v5 pro.
//   node fal.mjs --model grok|grok-quality|seedream --prompt <text> --output <path>
//                [--refs a,b] [--aspect w:h] [--size 1k|2k|auto_2K|...]
// Sync endpoint: POST https://fal.run/{slug} with Authorization: Key $FAL_KEY.
// Refs are sent as data URIs. Grok edit: ≤3 refs. Seedream edit: ≤10 refs.
// Env: FAL_KEY.

import fs from "node:fs";
import { loadEnvUpwards, readRefs, fileToDataUri, savePromptSidecar } from "./lib.mjs";

loadEnvUpwards();

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("Error: FAL_KEY not found in env.");
  process.exit(1);
}

const SLUGS = {
  grok: { t2i: "xai/grok-imagine-image", edit: "xai/grok-imagine-image/edit", maxRefs: 3 },
  "grok-quality": {
    t2i: "xai/grok-imagine-image/quality/text-to-image",
    edit: "xai/grok-imagine-image/quality/edit",
    maxRefs: 3,
  },
  seedream: {
    t2i: "bytedance/seedream/v5/pro/text-to-image",
    edit: "bytedance/seedream/v5/pro/edit",
    maxRefs: 10,
  },
};

// Grok accepts only preset aspect ratios.
const GROK_RATIOS = ["2:1", "20:9", "19.5:9", "16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16", "9:19.5", "9:20", "1:2"];

function nearestGrokRatio(aspect) {
  const m = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(aspect || "16:9");
  if (!m) return "16:9";
  if (GROK_RATIOS.includes(`${m[1]}:${m[2]}`)) return `${m[1]}:${m[2]}`;
  const target = Number(m[1]) / Number(m[2]);
  let best = "16:9", bestDiff = Infinity;
  for (const r of GROK_RATIOS) {
    const [w, h] = r.split(":").map(Number);
    const diff = Math.abs(w / h - target);
    if (diff < bestDiff) { bestDiff = diff; best = r; }
  }
  console.log(`Aspect ${aspect} is not a Grok preset — using nearest: ${best}`);
  return best;
}

export async function falRun(slug, body) {
  const res = await fetch(`https://fal.run/${slug}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fal ${slug} → HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

export async function downloadImage(url, output) {
  if (url.startsWith("data:")) {
    fs.writeFileSync(output, Buffer.from(url.split(",")[1], "base64"));
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  fs.writeFileSync(output, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const args = process.argv.slice(2);
  let prompt, refsArg, output;
  let model = "grok";
  let aspect = ""; // empty = not explicitly requested
  let size = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--prompt") prompt = args[++i];
    if (args[i] === "--refs") refsArg = args[++i];
    if (args[i] === "--output") output = args[++i];
    if (args[i] === "--model") model = args[++i] || model;
    if (args[i] === "--aspect") aspect = args[++i] || aspect;
    if (args[i] === "--size") size = args[++i] || size;
  }

  if (!prompt || !output) {
    console.error("Usage: fal.mjs --model grok|grok-quality|seedream --prompt <text> --output <path> [--refs a,b] [--aspect w:h] [--size 1k|2k|auto_2K]");
    process.exit(1);
  }
  const def = SLUGS[model];
  if (!def) {
    console.error(`Error: --model must be grok, grok-quality or seedream (got: ${model})`);
    process.exit(1);
  }

  const refs = readRefs(refsArg);
  if (refs.length > def.maxRefs) {
    console.error(`Error: ${model} edit takes at most ${def.maxRefs} reference images (got ${refs.length}).`);
    process.exit(1);
  }
  const slug = refs.length ? def.edit : def.t2i;

  const body = { prompt, num_images: 1, output_format: "png" };
  if (model === "seedream") {
    body.image_size = size || "auto_2K";
  } else {
    // Grok edit: no explicit --aspect → "auto" (keep the input image's shape).
    // Grok t2i: no explicit --aspect → 16:9 default.
    body.aspect_ratio = refs.length && !aspect ? "auto" : nearestGrokRatio(aspect || "16:9");
    body.resolution = /1k/i.test(size) ? "1k" : "2k";
  }
  if (refs.length) body.image_urls = refs.map(fileToDataUri);

  console.log(`fal:${slug}  refs=${refs.length}  → ${output}`);
  try {
    const result = await falRun(slug, body);
    const url = result?.images?.[0]?.url;
    if (!url) throw new Error(`No image in response: ${JSON.stringify(result).slice(0, 300)}`);
    await downloadImage(url, output);
    console.log(`Saved: ${output}`);
    savePromptSidecar(output, {
      Model: slug,
      ...(body.aspect_ratio ? { Aspect: body.aspect_ratio, Resolution: body.resolution } : {}),
      ...(body.image_size ? { Size: body.image_size } : {}),
      ...(refsArg ? { Refs: refsArg } : {}),
    }, prompt);
  } catch (error) {
    console.error("Generation failed:", error?.message || error);
    process.exit(1);
  }
}

// Run main() only when executed directly (remove-bg.mjs imports falRun/downloadImage).
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
