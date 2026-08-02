#!/bin/bash
# setup.sh — first-run installer. Idempotent. Safe to call repeatedly.
# Checks: Node >=18, npm install, .env with the API key for the backend in use.
# Auto-invoked by gen.sh / parallel.sh / *.mjs when deps are missing.
#
# SETUP_BACKEND: openai (default) | gemini | fal
# SETUP_QUIET=1 silences non-error output.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

QUIET="${SETUP_QUIET:-0}"
BACKEND="${SETUP_BACKEND:-openai}"

log() { [ "$QUIET" = "1" ] || echo "$@"; }

# 1. Node check
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js not installed. Install from https://nodejs.org (>=18)." >&2
    exit 1
fi
NODE_MAJOR=$(node -v | sed 's/v//;s/\..*//')
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Error: Node.js >=18 required (found $(node -v))." >&2
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm not found (should ship with Node.js)." >&2
    exit 1
fi

# 2. Dependencies
NEED_INSTALL=0
if [ ! -d "node_modules" ]; then
    NEED_INSTALL=1
elif [ ! -d "node_modules/sharp" ] || [ ! -d "node_modules/dotenv" ] \
  || [ ! -d "node_modules/openai" ] || [ ! -d "node_modules/@google/genai" ]; then
    NEED_INSTALL=1
fi
if [ "$NEED_INSTALL" = "1" ]; then
    log "Installing dependencies (sharp, openai, @google/genai, dotenv)..."
    npm install --no-audit --no-fund --silent
    log "Dependencies installed."
fi

# 3. API key check — depends on backend.
#    Looks at env vars, scripts-local .env, then walks up to the workspace .env
#    (stops at a dir containing AGENTS.md or CLAUDE.md).
key_in_env_or_files() {
    local pattern="$1"
    if env | grep -qE "^($pattern)=.+"; then return 0; fi
    if [ -f ".env" ] && grep -qE "^($pattern)=.+" .env; then return 0; fi
    local probe="$SCRIPT_DIR"
    for _ in 1 2 3 4 5 6; do
        [ "$probe" = "/" ] && break
        if [ -f "$probe/.env" ] && grep -qE "^($pattern)=.+" "$probe/.env"; then return 0; fi
        if [ -f "$probe/AGENTS.md" ] || [ -f "$probe/CLAUDE.md" ]; then break; fi
        probe="$(dirname "$probe")"
    done
    return 1
}

require_key() {
    local label="$1" pattern="$2" default_var="$3" help_url="$4"
    if key_in_env_or_files "$pattern"; then return 0; fi
    if [ -t 0 ] && [ -t 1 ]; then
        echo ""
        echo "$label API key required. Get one at $help_url"
        printf "Paste key: "
        read -r USER_KEY
        if [ -z "$USER_KEY" ]; then echo "Error: empty key." >&2; exit 1; fi
        printf "%s=%s\n" "$default_var" "$USER_KEY" >> .env
        chmod 600 .env
        log ".env written (chmod 600)."
    else
        echo "Error: no $label API key found." >&2
        echo "Set one of: $(echo "$pattern" | tr '|' ' ')" >&2
        echo "  or add to $SCRIPT_DIR/.env: $default_var=your-key-here" >&2
        echo "Get a key at $help_url" >&2
        exit 1
    fi
}

case "$BACKEND" in
    openai) require_key "OpenAI" "OPENAI_API_KEY" "OPENAI_API_KEY" "https://platform.openai.com/api-keys" ;;
    gemini) require_key "Gemini" "GOOGLE_API_KEY|GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY" "GOOGLE_API_KEY" "https://aistudio.google.com/apikey" ;;
    fal)    require_key "fal.ai" "FAL_KEY" "FAL_KEY" "https://fal.ai/dashboard/keys" ;;
    *) echo "Error: SETUP_BACKEND must be openai, gemini or fal (got: $BACKEND)" >&2; exit 1 ;;
esac

log "Setup OK (backend=$BACKEND)."
