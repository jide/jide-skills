// Shared helpers for the backend scripts (ESM).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// Walk up from scripts/ loading .env files; stop at the workspace root
// (marker: AGENTS.md or CLAUDE.md). Shell-exported vars still win.
export function loadEnvUpwards() {
  let dir = SCRIPT_DIR;
  for (let i = 0; i < 6 && dir !== "/"; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
    if (
      fs.existsSync(path.join(dir, "AGENTS.md")) ||
      fs.existsSync(path.join(dir, "CLAUDE.md"))
    )
      break;
    dir = path.dirname(dir);
  }
}

export function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

export function readRefs(refsArg) {
  if (!refsArg) return [];
  return refsArg
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const abs = path.resolve(p);
      if (!fs.existsSync(abs)) {
        console.error(`Error: reference image not found: ${abs}`);
        process.exit(1);
      }
      return abs;
    });
}

export function fileToDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:${mimeFor(filePath)};base64,${buf.toString("base64")}`;
}

// Save the exact prompt as a sidecar .txt next to the output image.
export function savePromptSidecar(output, meta, prompt) {
  const outputPath = path.resolve(output);
  const dir = path.dirname(outputPath);
  const base = path.basename(outputPath, path.extname(outputPath));
  const lines = [
    `# Prompt for ${path.basename(outputPath)}`,
    `# Generated: ${new Date().toISOString()}`,
    ...Object.entries(meta).map(([k, v]) => `# ${k}: ${v}`),
    "",
    prompt,
  ];
  fs.writeFileSync(path.join(dir, `${base}.txt`), lines.join("\n"));
}
