#!/usr/bin/env node
// OpenAI gpt-image-2 backend.
//   node openai.mjs --prompt <text> --output <path> [--refs a,b] [--aspect w:h]
//                   [--size 1K|2K|4K|WxH] [--quality low|medium|high|auto]
//                   [--mask mask.png]
// With --refs, calls images.edit (refs are source images); otherwise images.generate.
// --mask (requires --refs): PNG with alpha, same dimensions as the first ref;
// transparent pixels mark the region to change, opaque pixels are preserved.
// Aspect+size resolve to raw WxH: multiples of 16, edge ≤3840, ≤8.29M pixels.
// Env: OPENAI_API_KEY. Optional: OPENAI_IMAGE_MODEL, OPENAI_IMAGE_QUALITY, OPENAI_IMAGE_MODERATION.

import fs from "node:fs";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import { loadEnvUpwards, mimeFor, readRefs, savePromptSidecar } from "./lib.mjs";

loadEnvUpwards();

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Error: OPENAI_API_KEY not found in env.");
  process.exit(1);
}

const MAX_EDGE = 3840;
const MAX_TOTAL_PIXELS = 8_294_400;
const VALID_QUALITIES = new Set(["low", "medium", "high", "auto"]);

const fit16 = (v) => Math.max(16, Math.floor(v / 16) * 16);

function resolveSize({ aspect, size }) {
  const explicit = /^(\d+)x(\d+)$/i.exec(size || "");
  if (explicit) {
    let w = Number(explicit[1]);
    let h = Number(explicit[2]);
    const scale = Math.min(
      MAX_EDGE / Math.max(w, h),
      Math.sqrt(MAX_TOTAL_PIXELS / (w * h)),
      1,
    );
    return `${fit16(w * scale)}x${fit16(h * scale)}`;
  }
  const long =
    { "1K": 1024, "2K": 2048, "4K": MAX_EDGE }[String(size || "").toUpperCase()] ?? 2048;
  const m = /^(\d+)\s*:\s*(\d+)$/.exec(aspect || "16:9");
  const aw = m ? Number(m[1]) : 16;
  const ah = m ? Number(m[2]) : 9;
  let w, h;
  if (aw >= ah) { w = long; h = (long * ah) / aw; }
  else { h = long; w = (long * aw) / ah; }
  const pixelScale = Math.min(Math.sqrt(MAX_TOTAL_PIXELS / (w * h)), 1);
  return `${fit16(w * pixelScale)}x${fit16(h * pixelScale)}`;
}

async function main() {
  const args = process.argv.slice(2);
  let prompt, refsArg, output, maskArg;
  let modelName = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  let quality = (process.env.OPENAI_IMAGE_QUALITY || "medium").toLowerCase();
  let moderation = (process.env.OPENAI_IMAGE_MODERATION || "low").toLowerCase();
  let aspect = "16:9";
  let size = "2K";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--prompt") prompt = args[++i];
    if (args[i] === "--refs") refsArg = args[++i];
    if (args[i] === "--output") output = args[++i];
    if (args[i] === "--mask") maskArg = args[++i];
    if (args[i] === "--quality") quality = (args[++i] || quality).toLowerCase();
    if (args[i] === "--aspect") aspect = args[++i] || aspect;
    if (args[i] === "--size") size = args[++i] || size;
  }

  if (!prompt || !output) {
    console.error("Usage: openai.mjs --prompt <text> --output <path> [--refs a,b] [--mask mask.png] [--aspect w:h] [--size 1K|2K|4K|WxH] [--quality q]");
    process.exit(1);
  }
  if (maskArg && !refsArg) {
    console.error("Error: --mask requires --refs (the image being edited).");
    process.exit(1);
  }
  if (!VALID_QUALITIES.has(quality)) {
    console.error("Error: --quality must be low, medium, high or auto.");
    process.exit(1);
  }

  const resolvedSize = resolveSize({ aspect, size });
  const refs = readRefs(refsArg);
  console.log(`gpt-image-2  quality=${quality}  size=${resolvedSize}  refs=${refs.length}  → ${output}`);

  const client = new OpenAI({ apiKey: API_KEY });
  try {
    let response;
    if (refs.length) {
      const files = [];
      for (const p of refs) {
        files.push(await toFile(fs.readFileSync(p), path.basename(p), { type: mimeFor(p) }));
      }
      const editRequest = {
        image: files.length === 1 ? files[0] : files,
        model: modelName, moderation, n: 1, prompt, quality, size: resolvedSize,
      };
      if (maskArg) {
        const [maskPath] = readRefs(maskArg);
        editRequest.mask = await toFile(fs.readFileSync(maskPath), path.basename(maskPath), { type: mimeFor(maskPath) });
      }
      response = await client.images.edit(editRequest);
    } else {
      response = await client.images.generate({
        model: modelName, moderation, n: 1, prompt, quality, size: resolvedSize,
      });
    }
    const b64 = response?.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image data returned from model.");
    fs.writeFileSync(output, Buffer.from(b64, "base64"));
    console.log(`Saved: ${output}`);
    savePromptSidecar(output, {
      Model: modelName, Quality: quality, Size: resolvedSize,
      ...(refsArg ? { Refs: refsArg } : {}),
      ...(maskArg ? { Mask: maskArg } : {}),
    }, prompt);
  } catch (error) {
    console.error("Generation failed:", error?.message || error);
    process.exit(1);
  }
}

main();
