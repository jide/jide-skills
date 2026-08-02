#!/usr/bin/env node
// Gemini image backend (only on explicit request — except lite for mass/cheap/small).
//   node gemini.mjs --variant gemini|gemini-lite --prompt <text> --output <path>
//                   [--refs a,b] [--aspect w:h] [--size 1K|2K|4K]
//                   [--thinking MINIMAL|LOW|MEDIUM|HIGH]
// Fixed ratio × size grid only (no arbitrary pixels). Lite: 1K max.
// Env: GOOGLE_API_KEY / GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY.

import fs from "node:fs";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { loadEnvUpwards, mimeFor, readRefs, savePromptSidecar } from "./lib.mjs";

loadEnvUpwards();

const API_KEY =
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!API_KEY) {
  console.error("Error: GOOGLE_API_KEY / GEMINI_API_KEY not found in env.");
  process.exit(1);
}

const MODELS = {
  gemini: "gemini-3.1-flash-image",
  "gemini-lite": "gemini-3.1-flash-lite-image",
};

const SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }));

async function main() {
  const args = process.argv.slice(2);
  let prompt, refsArg, output;
  let variant = "gemini";
  let aspect = "16:9";
  let size = ""; // empty = not explicitly requested
  let thinking = (process.env.GEMINI_THINKING_LEVEL || "HIGH").toUpperCase();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--prompt") prompt = args[++i];
    if (args[i] === "--refs") refsArg = args[++i];
    if (args[i] === "--output") output = args[++i];
    if (args[i] === "--variant") variant = args[++i] || variant;
    if (args[i] === "--aspect") aspect = args[++i] || aspect;
    if (args[i] === "--size") size = args[++i] || size;
    if (args[i] === "--thinking") thinking = (args[++i] || thinking).toUpperCase();
  }
  if (!new Set(["MINIMAL", "LOW", "MEDIUM", "HIGH"]).has(thinking)) {
    console.error("Error: --thinking must be MINIMAL, LOW, MEDIUM or HIGH.");
    process.exit(1);
  }

  if (!prompt || !output) {
    console.error("Usage: gemini.mjs --variant gemini|gemini-lite --prompt <text> --output <path> [--refs a,b] [--aspect w:h] [--size 1K|2K|4K]");
    process.exit(1);
  }
  const modelName = MODELS[variant];
  if (!modelName) {
    console.error(`Error: --variant must be gemini or gemini-lite (got: ${variant})`);
    process.exit(1);
  }
  const sizeExplicit = size !== "";
  size = String(size || (variant === "gemini-lite" ? "1K" : "2K")).toUpperCase();
  if (/^\d+x\d+$/i.test(size)) {
    console.error("Error: Gemini takes no arbitrary WxH — use --size 1K|2K|4K + --aspect.");
    process.exit(1);
  }
  if (variant === "gemini-lite" && size !== "1K") {
    if (sizeExplicit) console.log("gemini-lite is 1K max — forcing size=1K.");
    size = "1K";
  }

  const refs = readRefs(refsArg);
  console.log(`${modelName}  aspect=${aspect}  size=${size}  refs=${refs.length}  → ${output}`);

  const contents = [{ role: "user", parts: [{ text: prompt }] }];
  for (const p of refs) {
    contents[0].parts.push({
      inlineData: { mimeType: mimeFor(p), data: fs.readFileSync(p).toString("base64") },
    });
  }

  const client = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents,
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: { imageSize: size, aspectRatio: aspect },
        safetySettings: SAFETY_SETTINGS,
        thinkingConfig: { thinkingLevel: thinking },
      },
    });
    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error("No image data returned from model.");
    fs.writeFileSync(output, Buffer.from(part.inlineData.data, "base64"));
    console.log(`Saved: ${output}`);
    savePromptSidecar(output, {
      Model: modelName, Aspect: aspect, Size: size,
      ...(refsArg ? { Refs: refsArg } : {}),
    }, prompt);
  } catch (error) {
    console.error("Generation failed:", error?.message || error);
    process.exit(1);
  }
}

main();
