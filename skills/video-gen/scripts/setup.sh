#!/bin/bash
# setup.sh — first-run installer for video-gen scripts. Idempotent.
# Checks: Node >=18, npm install (@fal-ai/client, dotenv), FAL_KEY, ffmpeg (warn).
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
QUIET="${SETUP_QUIET:-0}"
log() { [ "$QUIET" = "1" ] || echo "$@"; }

if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js not installed. Install from https://nodejs.org (>=18)." >&2; exit 1
fi
NODE_MAJOR=$(node -v | sed 's/v//;s/\..*//')
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Error: Node.js >=18 required (found $(node -v))." >&2; exit 1
fi

if [ ! -d "node_modules/@fal-ai/client" ] || [ ! -d "node_modules/dotenv" ]; then
    log "Installing dependencies (@fal-ai/client, dotenv)..."
    npm install --no-audit --no-fund --silent
    log "Dependencies installed."
fi

# FAL_KEY: env, scripts-local .env, or workspace .env (walk up to AGENTS.md/CLAUDE.md)
have_key() {
    env | grep -qE "^(FAL_KEY|FAL_API_KEY)=.+" && return 0
    [ -f ".env" ] && grep -qE "^(FAL_KEY|FAL_API_KEY)=.+" .env && return 0
    local probe="$SCRIPT_DIR"
    for _ in 1 2 3 4 5 6; do
        [ "$probe" = "/" ] && break
        [ -f "$probe/.env" ] && grep -qE "^(FAL_KEY|FAL_API_KEY)=.+" "$probe/.env" && return 0
        { [ -f "$probe/AGENTS.md" ] || [ -f "$probe/CLAUDE.md" ]; } && break
        probe="$(dirname "$probe")"
    done
    return 1
}
# Preferred .env target: workspace root (next to AGENTS.md/CLAUDE.md) —
# survives skill updates, shared by every skill. Fallback: scripts/.env.
env_target() {
    local probe="$SCRIPT_DIR"
    for _ in 1 2 3 4 5 6; do
        [ "$probe" = "/" ] && break
        if [ -f "$probe/AGENTS.md" ] || [ -f "$probe/CLAUDE.md" ]; then
            echo "$probe/.env"; return
        fi
        probe="$(dirname "$probe")"
    done
    echo "$SCRIPT_DIR/.env"
}

if ! have_key; then
    if [ -t 0 ] && [ -t 1 ]; then
        echo ""; echo "fal.ai API key required. Get one at https://fal.ai/dashboard/keys"
        printf "Paste key: "; read -r K
        [ -z "$K" ] && { echo "Error: empty key." >&2; exit 1; }
        TARGET="$(env_target)"
        printf "FAL_KEY=%s\n" "$K" >> "$TARGET"; chmod 600 "$TARGET"
        log "Key written to $TARGET (chmod 600)."
        TDIR="$(dirname "$TARGET")"
        if [ -d "$TDIR/.git" ] && ! git -C "$TDIR" check-ignore -q .env 2>/dev/null; then
            echo "WARN: $TARGET is NOT gitignored — add '.env' to $TDIR/.gitignore before committing." >&2
        fi
    else
        echo "Error: no FAL_KEY found." >&2
        echo "  Add to $(env_target): FAL_KEY=your-key-here" >&2
        echo "Get a key at https://fal.ai/dashboard/keys" >&2; exit 1
    fi
fi

command -v ffmpeg >/dev/null 2>&1 || log "WARN: ffmpeg not on PATH — needed for audio tracks, verify strips and assembly."
log "Setup OK."
