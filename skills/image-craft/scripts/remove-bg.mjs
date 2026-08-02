#!/usr/bin/env node
// Background removal via fal-ai/ideogram/remove-background ($0.01/call).
// THE alpha path — generation models output no alpha.
//   node remove-bg.mjs --in <image> --out <transparent.png>
// Env: FAL_KEY.

import { loadEnvUpwards, readRefs } from "./lib.mjs";
import { falRun, downloadImage } from "./fal.mjs";
import { fileToDataUri } from "./lib.mjs";

loadEnvUpwards();

const args = process.argv.slice(2);
let input, output;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--in") input = args[++i];
  if (args[i] === "--out") output = args[++i];
}
if (!input || !output) {
  console.error("Usage: remove-bg.mjs --in <image> --out <transparent.png>");
  process.exit(1);
}
const [abs] = readRefs(input);

try {
  const result = await falRun("fal-ai/ideogram/remove-background", {
    image_url: fileToDataUri(abs),
  });
  const url = result?.image?.url;
  if (!url) throw new Error(`No image in response: ${JSON.stringify(result).slice(0, 300)}`);
  await downloadImage(url, output);
  console.log(`Saved: ${output}`);
} catch (error) {
  console.error("Remove-background failed:", error?.message || error);
  process.exit(1);
}
