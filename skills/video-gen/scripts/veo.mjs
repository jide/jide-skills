#!/usr/bin/env node
// Veo 3.1 fast reference-to-video via fal — second alternate, up to 4K.
//   node veo.mjs --refs a.png,b.png --output out.mp4 --prompt "..." \
//     [--duration 8s] [--resolution 720p|1080p|4k] [--aspect 16:9] [--no-audio]

import { deps, upload, list, download, sidecar, progressDots } from "./lib.mjs";

const fal = await deps();
const ENDPOINT = "fal-ai/veo3.1/fast/reference-to-video";

const args = process.argv.slice(2);
let refsArg, output, prompt;
let duration = "8s", resolution = "1080p", aspect = "16:9", generateAudio = true;
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === "--refs" || k === "--images") refsArg = args[++i];
  else if (k === "--output") output = args[++i];
  else if (k === "--prompt") prompt = args[++i];
  else if (k === "--duration") duration = args[++i];
  else if (k === "--resolution") resolution = args[++i];
  else if (k === "--aspect") aspect = args[++i];
  else if (k === "--no-audio") generateAudio = false;
}
const refs = list(refsArg);
if (!refs.length || !output || !prompt) {
  console.error("Usage: veo.mjs --refs a,b --output out.mp4 --prompt p [--duration 8s] [--resolution 720p|1080p|4k] [--aspect 16:9] [--no-audio]");
  process.exit(1);
}

const input = {
  image_urls: await Promise.all(refs.map((p) => upload(fal, p))),
  prompt, duration, resolution, aspect_ratio: aspect, generate_audio: generateAudio,
};

try {
  const r = await fal.subscribe(ENDPOINT, { input, logs: true, onQueueUpdate: progressDots });
  const url = r?.data?.video?.url || r?.data?.videos?.[0]?.url;
  if (!url) throw new Error(`No video returned: ${JSON.stringify(r?.data)?.slice(0, 300)}`);
  await download(url, output);
  console.log(`\nSaved: ${output}\nSource: ${url}`);
  sidecar(output, {
    Endpoint: ENDPOINT, Resolution: resolution, Aspect: aspect, Duration: duration,
    Audio: generateAudio, Refs: refsArg, Source: url,
  }, prompt);
} catch (e) {
  console.error("\nGeneration failed:", e?.message || e);
  process.exit(1);
}
