#!/usr/bin/env node
// Gemini TTS via fal. Single speaker.
//   node tts.mjs --text "..." --output out.mp3 [--voice Charon] [--style "..."] \
//     [--lang "French (France)"] [--temp 1]

import { deps, download, sidecar } from "./lib.mjs";

const fal = await deps();
const ENDPOINT = "fal-ai/gemini-3.1-flash-tts";

const args = process.argv.slice(2);
let text, output;
let voice = "Charon", style = "", lang = "English (US)", temp = "1";
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === "--text") text = args[++i];
  else if (k === "--output") output = args[++i];
  else if (k === "--voice") voice = args[++i];
  else if (k === "--style") style = args[++i];
  else if (k === "--lang") lang = args[++i];
  else if (k === "--temp") temp = args[++i];
}
if (!text || !output) {
  console.error('Usage: tts.mjs --text <t> --output <out.mp3> [--voice V] [--style S] [--lang "French (France)"] [--temp N]');
  process.exit(1);
}

const input = { prompt: text, voice, language_code: lang, output_format: "mp3", temperature: Number(temp) };
if (style) input.style_instructions = style;

console.log(`TTS voice=${voice} lang=${lang} → ${output}`);
try {
  const r = await fal.subscribe(ENDPOINT, { input, logs: false });
  const audio = r?.data?.audio || r?.data?.audio_url || r?.data?.audios?.[0];
  const url = typeof audio === "string" ? audio : audio?.url;
  if (!url) throw new Error(`No audio returned: ${JSON.stringify(r?.data)?.slice(0, 300)}`);
  await download(url, output);
  console.log(`Saved: ${output}`);
  sidecar(output, { Endpoint: ENDPOINT, Voice: voice, Lang: lang, Style: style, Source: url }, text);
} catch (e) {
  console.error("TTS failed:", e?.message || e);
  process.exit(1);
}
