#!/usr/bin/env node
// Kling v3 pro image-to-video via fal — start[→end] frames, element refs,
// multi-prompt shots. Alternate when Seedance moderation rejects real faces.
//   node kling.mjs --start s.png --output out.mp4 (--prompt "..." | --shots "p1::d1||p2::d2") \
//     [--end e.png] [--elements a.png,b.png] [--duration 10] [--cfg 0.5]

import { deps, upload, list, download, sidecar, progressDots } from "./lib.mjs";

const fal = await deps();
const ENDPOINT = "fal-ai/kling-video/v3/pro/image-to-video";

const args = process.argv.slice(2);
let start, end, output, prompt, shots;
let elementsArg, duration = "10", cfg = "0.5";
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === "--start") start = args[++i];
  else if (k === "--end") end = args[++i];
  else if (k === "--output") output = args[++i];
  else if (k === "--prompt") prompt = args[++i];
  else if (k === "--shots") shots = args[++i];
  else if (k === "--elements") elementsArg = args[++i];
  else if (k === "--duration") duration = args[++i];
  else if (k === "--cfg") cfg = args[++i];
}
if (!start || !output || (!prompt && !shots)) {
  console.error("Usage: kling.mjs --start s.png --output out.mp4 (--prompt p | --shots 'p1::d1||p2::d2') [--end e.png] [--elements a,b] [--duration N] [--cfg N]");
  process.exit(1);
}

const input = { start_image_url: await upload(fal, start), duration, cfg_scale: Number(cfg) };
if (shots) {
  input.multi_prompt = shots.split("||").map((s) => {
    const [p, d] = s.split("::");
    return { prompt: p.trim(), duration: (d || "5").trim() };
  });
  if (prompt) input.prompt = prompt;
} else {
  input.prompt = prompt;
}
if (end) input.end_image_url = await upload(fal, end);
const elements = list(elementsArg);
if (elements.length) {
  const urls = await Promise.all(elements.map((p) => upload(fal, p)));
  input.elements = urls.map((u) => ({ frontal_image_url: u, reference_image_urls: [u] }));
}

try {
  const r = await fal.subscribe(ENDPOINT, { input, logs: true, onQueueUpdate: progressDots });
  const url = r?.data?.video?.url || r?.data?.videos?.[0]?.url;
  if (!url) throw new Error(`No video returned: ${JSON.stringify(r?.data)?.slice(0, 300)}`);
  await download(url, output);
  console.log(`\nSaved: ${output}\nSource: ${url}`);
  sidecar(output, {
    Endpoint: ENDPOINT, Duration: duration, Cfg: cfg, Start: start, End: end,
    Elements: elementsArg, Source: url,
  }, shots || prompt);
} catch (e) {
  console.error("\nGeneration failed:", e?.message || e);
  process.exit(1);
}
