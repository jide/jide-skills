// Shared helpers for the video-gen scripts (ESM).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

export const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// Self-install on first use, then require deps from the local node_modules
// (createRequire resolves relative to this file — CJS packages load cleanly).
export async function deps() {
  if (!fs.existsSync(path.join(SCRIPT_DIR, "node_modules", "@fal-ai", "client"))) {
    execSync(`bash "${path.join(SCRIPT_DIR, "setup.sh")}"`, {
      stdio: "inherit",
      env: { ...process.env, SETUP_QUIET: "1" },
    });
  }
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const dotenv = require("dotenv");
  let dir = SCRIPT_DIR;
  for (let i = 0; i < 6 && dir !== "/"; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
    if (fs.existsSync(path.join(dir, "AGENTS.md")) || fs.existsSync(path.join(dir, "CLAUDE.md"))) break;
    dir = path.dirname(dir);
  }
  const key = process.env.FAL_KEY || process.env.FAL_API_KEY;
  if (!key) {
    console.error("Missing FAL_KEY in environment or workspace .env.");
    process.exit(1);
  }
  const { fal } = require("@fal-ai/client");
  fal.config({ credentials: key });
  return fal;
}

const MIMES = {
  jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", png: "image/png",
  mp4: "video/mp4", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav",
};
export const mimeFor = (p) =>
  MIMES[path.extname(p).toLowerCase().replace(".", "")] || "application/octet-stream";

export async function upload(fal, filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }
  const buffer = fs.readFileSync(filePath);
  const url = await fal.storage.upload(new Blob([buffer], { type: mimeFor(filePath) }));
  console.log(`Uploaded ${path.basename(filePath)}`);
  return url;
}

export const list = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

export async function download(url, output) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  await fs.promises.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await fs.promises.writeFile(output, Buffer.from(await res.arrayBuffer()));
}

// Save prompt + meta sidecar next to the output.
export function sidecar(output, meta, prompt) {
  const op = path.resolve(output);
  const file = path.join(path.dirname(op), `${path.basename(op, path.extname(op))}.txt`);
  const lines = [
    `# ${path.basename(op)}`,
    `# Generated: ${new Date().toISOString()}`,
    ...Object.entries(meta).filter(([, v]) => v != null && v !== "").map(([k, v]) => `# ${k}: ${v}`),
    "",
    prompt,
  ];
  fs.writeFileSync(file, lines.join("\n"));
  console.log(`Prompt saved to ${file}`);
}

export function progressDots(u) {
  if (u.status === "IN_PROGRESS") process.stdout.write(".");
}
