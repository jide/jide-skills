#!/usr/bin/env node
// detect.mjs — locate elements in an image with Gemini vision, return bounding
// boxes (pixels + normalized). Gemini returns box_2d as [ymin,xmin,ymax,xmax]
// in 0–1000 normalized space; converted to pixel rects + centers.
//
// Usage:
//   node detect.mjs --image ui.png --items "the floating action button;the hero card" --out boxes.json
//   node detect.mjs --image ui.png --items-file items.txt --out boxes.json --overlay debug.png
//
// Items: one label PER element, specific ('the coral round button with a plus
// icon, bottom right'). One detection returned per item. Always verify with
// --overlay before trusting boxes.
// Env: GEMINI_API_KEY / GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import process from "node:process";
import { loadEnvUpwards, mimeFor } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
if (!existsSync(join(here, "node_modules", "sharp"))) {
  execSync(`bash "${join(here, "setup.sh")}"`, {
    stdio: "inherit",
    env: { ...process.env, SETUP_QUIET: "1", SETUP_BACKEND: "gemini" },
  });
}
const { default: sharp } = await import(join(here, "node_modules", "sharp", "lib", "index.js"));
const { GoogleGenAI } = await import(join(here, "node_modules", "@google", "genai", "dist", "node", "index.mjs"));

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith("--")) {
      const name = k.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) a[name] = true;
      else { a[name] = next; i++; }
    }
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));
const die = (m) => { console.error("detect: " + m); process.exit(1); };

const imagePath = args.image;
if (!imagePath) die("--image <path> required");
const out = args.out || null;
const overlayPath = args.overlay || null;
loadEnvUpwards();
const model = args.model || process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash";
const NORM = 1000;

let items = [];
if (args["items-file"]) {
  const raw = readFileSync(args["items-file"], "utf8").trim();
  try { items = JSON.parse(raw); if (!Array.isArray(items)) throw 0; }
  catch { items = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean); }
} else if (typeof args.items === "string") {
  items = args.items.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
}
items = items.map((it, i) =>
  typeof it === "string" ? { id: it, label: it } : { id: it.id ?? `item${i + 1}`, label: it.label ?? it.id ?? `item${i + 1}` }
);
if (items.length === 0) die("provide --items or --items-file (one label per element)");

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) die("GEMINI_API_KEY / GOOGLE_API_KEY not set — run setup.sh");

const meta = await sharp(imagePath).metadata();
const W = meta.width, H = meta.height;
if (!W || !H) die("could not read image dimensions for " + imagePath);
const b64 = readFileSync(imagePath).toString("base64");

const LABELS = items.map((_, i) => `E${i + 1}`);
const itemList = items.map((it, i) => `- ${LABELS[i]}: ${it.label}`).join("\n");
const extra = typeof args.prompt === "string" ? `\n\nExtra context: ${args.prompt}` : "";
const prompt = `You are locating elements in an image (${W}x${H} px).

Locate each of the following elements and return a tight bounding box for each. Each element is a SEPARATE, DISTINCT visual region.

Elements to locate (${items.length} total):
${itemList}

Return bounding boxes as [ymin, xmin, ymax, xmax] in 0-1000 normalized coordinates (0 = top/left edge, 1000 = bottom/right edge).

RULES:
- EVERY label (E1..E${items.length}) must have exactly one detection — ${items.length} in, ${items.length} out.
- Use the exact label key (E1, E2, …) in the "label" field.
- Each detection is a DISTINCT region; do not reuse a box.
- Return a TIGHT box around the described element only — exclude surrounding background/padding unless the description says otherwise.${extra}`;

const responseSchema = {
  type: "object",
  required: ["objects"],
  properties: {
    objects: {
      type: "array",
      items: {
        type: "object",
        required: ["label", "box_2d"],
        properties: {
          label: { type: "string" },
          box_2d: { type: "array", items: { type: "number" } },
          confidence: { type: "number" },
        },
      },
    },
  },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function box2dToRect([yminR, xminR, ymaxR, xmaxR]) {
  const ymin = clamp(yminR, 0, NORM), xmin = clamp(xminR, 0, NORM);
  const ymax = clamp(ymaxR, ymin + 1, NORM), xmax = clamp(xmaxR, xmin + 1, NORM);
  const x = Math.round((xmin / NORM) * W), y = Math.round((ymin / NORM) * H);
  const x2 = Math.round((xmax / NORM) * W), y2 = Math.round((ymax / NORM) * H);
  const px = clamp(x, 0, W - 1), py = clamp(y, 0, H - 1);
  const width = Math.max(1, clamp(x2, px + 1, W) - px);
  const height = Math.max(1, clamp(y2, py + 1, H) - py);
  return { x: px, y: py, width, height };
}

const ai = new GoogleGenAI({ apiKey });
const res = await ai.models.generateContent({
  model,
  config: { responseMimeType: "application/json", responseSchema },
  contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: b64, mimeType: mimeFor(imagePath) } }] }],
});
const text = res.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("") || "";
if (!text) die("Gemini returned empty response");
const parsed = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
const objects = Array.isArray(parsed.objects) ? parsed.objects : [];

const byKey = new Map();
for (const o of objects) {
  const key = String(o.label || "").trim().split(/[:\s]/)[0];
  if (key) byKey.set(key, o);
}

const detections = items.map((it, i) => {
  const o = byKey.get(LABELS[i]) || objects[i];
  if (!o || !Array.isArray(o.box_2d) || o.box_2d.length !== 4) {
    die(`no detection for "${it.label}" (label ${LABELS[i]})`);
  }
  const box_2d = o.box_2d.map(Number);
  const r = box2dToRect(box_2d);
  return {
    id: it.id,
    label: it.label,
    box_2d,
    confidence: typeof o.confidence === "number" ? o.confidence : undefined,
    pixel: r,
    pixelCenter: { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) },
    norm: { x: +(r.x / W).toFixed(4), y: +(r.y / H).toFixed(4), width: +(r.width / W).toFixed(4), height: +(r.height / H).toFixed(4) },
    normCenter: { x: +((r.x + r.width / 2) / W).toFixed(4), y: +((r.y + r.height / 2) / H).toFixed(4) },
  };
});

const result = { image: imagePath, imageWidth: W, imageHeight: H, model, detections };
const json = JSON.stringify(result, null, 2);
if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, json); console.error(`wrote ${out}`); }
else console.log(json);

if (overlayPath) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rects = detections.map((d, i) => {
    const { x, y, width, height } = d.pixel;
    const hue = (i * 47) % 360;
    const col = `hsl(${hue} 90% 45%)`;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${col}" stroke-width="${Math.max(2, Math.round(W / 400))}"/>` +
      `<rect x="${x}" y="${Math.max(0, y - 22)}" width="${Math.min(width + 40, 220)}" height="20" fill="${col}"/>` +
      `<text x="${x + 4}" y="${Math.max(14, y - 7)}" font-family="sans-serif" font-size="14" fill="#fff">${esc(d.id).slice(0, 28)}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rects}</svg>`;
  await sharp(imagePath).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(overlayPath);
  console.error(`wrote overlay ${overlayPath}`);
}
