#!/usr/bin/env node
// Seedance 2.0 via fal — the workhorse.
//   node seedance.mjs --prompt "<structured prompt>" --refs a.png,b.png --output out.mp4 \
//     [--mode ref|i2v|t2v] [--fast] [--end end.png] [--audio track.mp3] [--videos ref.mp4] \
//     [--resolution 480p|720p|1080p] [--duration auto|4-15] [--aspect 16:9] [--no-audio] [--seed N]
// Modes: ref (default) = reference-to-video (refs cited @Image1..N, --audio lip-syncs);
//        i2v = image-to-video (first ref = start frame, --end optional); --fast = cheap preview (480p/720p);
//        t2v = text-to-video (no refs).

import { deps, upload, list, download, sidecar, progressDots } from "./lib.mjs";

const fal = await deps();

const args = process.argv.slice(2);
let prompt, output, refsArg, audioArg, videosArg, endImg, seed;
let mode = "ref";
let fast = false;
let resolution = "1080p";
let duration = "8";
let aspect = "16:9";
let generateAudio = true;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--prompt") prompt = args[++i];
  else if (a === "--refs" || a === "--images") refsArg = args[++i];
  else if (a === "--audio") audioArg = args[++i];
  else if (a === "--videos") videosArg = args[++i];
  else if (a === "--output") output = args[++i];
  else if (a === "--mode") mode = args[++i];
  else if (a === "--fast") fast = true;
  else if (a === "--end") endImg = args[++i];
  else if (a === "--resolution") resolution = args[++i];
  else if (a === "--duration") duration = args[++i];
  else if (a === "--aspect") aspect = args[++i];
  else if (a === "--no-audio") generateAudio = false;
  else if (a === "--seed") seed = parseInt(args[++i], 10);
}

const refs = list(refsArg);
if (!prompt || !output || (mode !== "t2v" && refs.length === 0)) {
  console.error("Usage: seedance.mjs --prompt <text> --refs <a,b,...> --output <out.mp4> [--mode ref|i2v|t2v] [--fast] [--end e.png] [--audio a.mp3] [--videos v.mp4] [--resolution R] [--duration D] [--aspect A] [--no-audio] [--seed N]");
  process.exit(1);
}
if (mode === "ref" && refs.length > 9) {
  console.error(`Error: reference-to-video takes at most 9 refs (got ${refs.length}).`);
  process.exit(1);
}
if (fast && mode !== "i2v") console.warn("--fast applies to --mode i2v only; ignoring.");
if (fast && mode === "i2v" && !["480p", "720p"].includes(resolution)) {
  console.warn(`fast/image-to-video supports 480p|720p only; clamping ${resolution} -> 720p.`);
  resolution = "720p";
}

const endpoint =
  mode === "t2v" ? "bytedance/seedance-2.0/text-to-video"
  : mode === "i2v" ? (fast ? "bytedance/seedance-2.0/fast/image-to-video" : "bytedance/seedance-2.0/image-to-video")
  : "bytedance/seedance-2.0/reference-to-video";

console.log(`Endpoint: ${endpoint}`);
console.log(`Output: ${output} | ${resolution} ${aspect} ${duration}s audio=${generateAudio}`);

const input = { prompt, resolution, duration, aspect_ratio: aspect, generate_audio: generateAudio };
if (mode === "i2v") {
  input.image_url = await upload(fal, refs[0]);
  if (endImg) input.end_image_url = await upload(fal, endImg);
} else if (mode === "ref") {
  input.image_urls = await Promise.all(refs.map((p) => upload(fal, p)));
  const audios = list(audioArg);
  if (audios.length) input.audio_urls = await Promise.all(audios.map((p) => upload(fal, p)));
  const videos = list(videosArg);
  if (videos.length) input.video_urls = await Promise.all(videos.map((p) => upload(fal, p)));
}
if (seed !== undefined) input.seed = seed;

try {
  const result = await fal.subscribe(endpoint, { input, logs: true, onQueueUpdate: progressDots });
  const video = result?.data?.video || result?.data?.videos?.[0];
  if (!video?.url) throw new Error(`No video returned: ${JSON.stringify(result?.data)?.slice(0, 300)}`);
  await download(video.url, output);
  console.log(`\nSaved: ${output}\nSource: ${video.url}`);
  sidecar(output, {
    Endpoint: endpoint, Resolution: resolution, Aspect: aspect, Duration: `${duration}s`,
    Audio: generateAudio, Refs: refsArg, AudioRefs: audioArg, VideoRefs: videosArg,
    End: endImg, Seed: seed, Source: video.url,
  }, prompt);
} catch (e) {
  console.error("\nGeneration failed:", e?.message || e);
  process.exit(1);
}
