#!/bin/bash
# gen.sh — single image generation, one CLI over all backends.
#
# Usage:
#   gen.sh --output <path> --prompt "..." [--refs "ref1,ref2"]
#          [--model gpt-image-2|gemini|gemini-lite|grok|grok-quality|seedream]
#          [--aspect 16:9] [--size 1K|2K|4K|WxH] [--quality low|medium|high|auto]
#
# Models → backends:
#   gpt-image-2 (default) → OpenAI. Arbitrary WxH (edge ≤3840, mult of 16). --quality.
#   gemini / gemini-lite  → Google. Fixed ratios × 1K/2K/4K (lite: 1K only).
#   grok / grok-quality   → fal (xai/grok-imagine-image). Preset ratios × 1k/2k. Edit ≤3 refs.
#   seedream              → fal (bytedance/seedream/v5/pro). Edit ≤10 refs.
#
# The exact prompt is saved as <output-basename>.txt next to the output.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Don't cd — output paths must resolve relative to the caller's CWD.

OUTPUT=""
PROMPT=""
REFS=""
ASPECT=""
SIZE=""
MODEL="${IMAGE_CRAFT_MODEL:-gpt-image-2}"
QUALITY=""
MASK=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --output) OUTPUT="$2"; shift 2 ;;
        --prompt) PROMPT="$2"; shift 2 ;;
        --refs|--images) REFS="$2"; shift 2 ;;
        --aspect) ASPECT="$2"; shift 2 ;;
        --size) SIZE="$2"; shift 2 ;;
        --model) MODEL="$2"; shift 2 ;;
        --quality) QUALITY="$2"; shift 2 ;;
        --mask) MASK="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$OUTPUT" ] || [ -z "$PROMPT" ]; then
    echo "Usage: gen.sh --output <path> --prompt \"...\" [--refs \"a,b\"] [--model <m>] [--aspect w:h] [--size 1K|2K|4K|WxH] [--quality q]"
    exit 1
fi

case "$MODEL" in
    gpt-image-2|openai) BACKEND="openai" ;;
    gemini|gemini-lite) BACKEND="gemini" ;;
    grok|grok-quality|seedream) BACKEND="fal" ;;
    *) echo "Error: unknown --model '$MODEL' (gpt-image-2|gemini|gemini-lite|grok|grok-quality|seedream)"; exit 1 ;;
esac

if [ -n "$MASK" ] && [ "$BACKEND" != "openai" ]; then
    echo "Error: --mask is only supported with --model gpt-image-2."
    exit 1
fi

# Auto-install + key check on first run (idempotent, fast afterwards)
SETUP_BACKEND="$BACKEND" SETUP_QUIET=1 bash "$SCRIPT_DIR/setup.sh"

mkdir -p "$(dirname "$OUTPUT")"

case "$BACKEND" in
    openai)
        CMD=(node "$SCRIPT_DIR/openai.mjs" --prompt "$PROMPT" --output "$OUTPUT")
        [ -n "$ASPECT" ] && CMD+=(--aspect "$ASPECT")
        [ -n "$SIZE" ] && CMD+=(--size "$SIZE")
        [ -n "$QUALITY" ] && CMD+=(--quality "$QUALITY")
        [ -n "$MASK" ] && CMD+=(--mask "$MASK")
        ;;
    gemini)
        CMD=(node "$SCRIPT_DIR/gemini.mjs" --variant "$MODEL" --prompt "$PROMPT" --output "$OUTPUT")
        [ -n "$ASPECT" ] && CMD+=(--aspect "$ASPECT")
        [ -n "$SIZE" ] && CMD+=(--size "$SIZE")
        ;;
    fal)
        CMD=(node "$SCRIPT_DIR/fal.mjs" --model "$MODEL" --prompt "$PROMPT" --output "$OUTPUT")
        [ -n "$ASPECT" ] && CMD+=(--aspect "$ASPECT")
        [ -n "$SIZE" ] && CMD+=(--size "$SIZE")
        ;;
esac
[ -n "$REFS" ] && CMD+=(--refs "$REFS")

"${CMD[@]}"
