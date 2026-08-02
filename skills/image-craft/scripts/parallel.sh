#!/bin/bash
# parallel.sh — parallel image generation, two modes (see VARIANTS.md).
#
# MODE A — same prompt, N rolls:
#   parallel.sh --variants 4 --output-prefix renders/scene_v1 --prompt "..." [opts]
#
# MODE B — N distinct prompts, one roll each (one prompt per line; blank lines
# and #-comments ignored):
#   parallel.sh --prompts-file prompts.txt --output-prefix renders/scene_v1 [opts]
#
# Opts forwarded to gen.sh: --refs, --model, --aspect, --size, --quality.
# Outputs: <prefix>a.png, <prefix>b.png, … (max 16, a–p) + prompt sidecars.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Don't cd — output paths must resolve relative to the caller's CWD.

VARIANTS=0
PROMPTS_FILE=""
OUTPUT_PREFIX=""
PROMPT=""
FWD=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --variants) VARIANTS="$2"; shift 2 ;;
        --prompts-file) PROMPTS_FILE="$2"; shift 2 ;;
        --output-prefix) OUTPUT_PREFIX="$2"; shift 2 ;;
        --prompt) PROMPT="$2"; shift 2 ;;
        --refs|--images|--model|--aspect|--size|--quality) FWD+=("$1" "$2"); shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$OUTPUT_PREFIX" ]; then
    echo "Error: --output-prefix required."
    exit 1
fi

PROMPTS=()
if [ -n "$PROMPTS_FILE" ]; then
    if [ -n "$PROMPT" ] || [ "$VARIANTS" -gt 0 ]; then
        echo "Error: --prompts-file is mutually exclusive with --prompt/--variants."
        exit 1
    fi
    if [ ! -f "$PROMPTS_FILE" ]; then
        echo "Error: prompts file not found: $PROMPTS_FILE"
        exit 1
    fi
    while IFS= read -r line || [ -n "$line" ]; do
        [ -z "$line" ] && continue
        [[ "$line" == \#* ]] && continue
        PROMPTS+=("$line")
    done < "$PROMPTS_FILE"
    if [ "${#PROMPTS[@]}" -eq 0 ]; then
        echo "Error: prompts file has no usable lines."
        exit 1
    fi
elif [ -n "$PROMPT" ] && [ "$VARIANTS" -ge 1 ]; then
    for ((i=0; i<VARIANTS; i++)); do PROMPTS+=("$PROMPT"); done
else
    echo "Usage:"
    echo "  Mode A (same prompt × N): parallel.sh --variants N --output-prefix <prefix> --prompt \"...\" [opts]"
    echo "  Mode B (N distinct):      parallel.sh --prompts-file <file> --output-prefix <prefix> [opts]"
    exit 1
fi

SUFFIXES=(a b c d e f g h i j k l m n o p)
COUNT="${#PROMPTS[@]}"
if [ "$COUNT" -gt "${#SUFFIXES[@]}" ]; then
    echo "Error: max ${#SUFFIXES[@]} variants supported (got $COUNT)."
    exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PREFIX")"

PIDS=()
for ((i=0; i<COUNT; i++)); do
    OUTPUT="${OUTPUT_PREFIX}${SUFFIXES[$i]}.png"
    echo "Starting variant ${SUFFIXES[$i]}: $OUTPUT"
    bash "$SCRIPT_DIR/gen.sh" --output "$OUTPUT" --prompt "${PROMPTS[$i]}" "${FWD[@]}" &
    PIDS+=($!)
done

echo "Launched ${#PIDS[@]} variants. Waiting..."

FAILED=0
for pid in "${PIDS[@]}"; do
    if ! wait "$pid"; then ((FAILED++)); fi
done

echo ""
echo "Done. ${#PIDS[@]} variants, $FAILED failed."
[ "$FAILED" -gt 0 ] && exit 1 || exit 0
