#!/usr/bin/env node
// Preview: resize an image for the agent's vision tool.
// Usage: node preview.js <image_path> [--width 800] [--output /tmp/preview.png]
//
// Outputs a small copy to /tmp so the agent can look at it.
// NEVER use this to resize images before passing them to a generation model.

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const scriptDir = __dirname;
if (!fs.existsSync(path.join(scriptDir, "node_modules", "sharp"))) {
  execSync(`bash "${path.join(scriptDir, "setup.sh")}"`, {
    stdio: "inherit",
    env: { ...process.env, SETUP_QUIET: "1" },
  });
}
const sharp = require(path.join(scriptDir, "node_modules", "sharp"));

const args = process.argv.slice(2);
let input = null;
let width = 800;
let output = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--width") { width = parseInt(args[++i], 10); }
  else if (args[i] === "--output") { output = args[++i]; }
  else if (!input) { input = args[i]; }
}

if (!input) {
  console.error("Usage: node preview.js <image_path> [--width 800] [--output /tmp/preview.png]");
  process.exit(1);
}

if (!output) {
  const base = path.basename(input, path.extname(input));
  output = `/tmp/${base}_preview.png`;
}

sharp(input)
  .resize(width, null, { withoutEnlargement: true })
  .toFile(output)
  .then((info) => {
    console.log(`${output}`);
    console.log(`${info.width}x${info.height}`);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
