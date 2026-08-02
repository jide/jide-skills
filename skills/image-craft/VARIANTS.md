# Variants — N takes on one image

Two distinct intents. Pick before running; if the user's wording is ambiguous,
ask ONE question:

| User says… | Mode |
|---|---|
| "give me 4 of these", "regenerate ×4", "another batch" | **A** — same prompt, N rolls |
| "try a few directions", "different lighting / mood / framing" | **B** — N distinct prompts |
| ambiguous ("4 variants of X") | ask: "same prompt 4× for model variability, or 4 directions?" |

Default count: 4. State variants of a UI element (hover, active…) are edits,
not variants → [EDITS.md](EDITS.md).

## Mode A — same prompt × N rolls

Prompt is dialed in; the user wants raw model variability (compositions, lucky
strikes):

```bash
bash scripts/parallel.sh --variants 4 \
  --output-prefix renders/scene_v1 \
  --refs "refs/anchor.png" \
  --prompt "..."
```

## Mode B — N distinct directions

Craft N prompt variations — **vary ONE axis per batch** (lighting OR mood OR
framing OR palette), keep subject and references identical. One prompt per
line in a file:

```bash
cat > /tmp/prompts.txt <<'EOF'
…courtyard at dawn, soft golden fog, warm low sun
…courtyard at dusk, blue hour, lanterns just lit
…courtyard at midday, harsh overhead sun, hard shadows
…courtyard under overcast sky, flat diffuse light
EOF

bash scripts/parallel.sh --prompts-file /tmp/prompts.txt \
  --output-prefix renders/scene_v1 --refs "refs/anchor.png"
```

## Both modes

Outputs: `scene_v1a.png` … `scene_v1d.png` (up to 16, a–p); each prompt
auto-saved as `<basename>.txt`. Preview all, let the user pick, move losers to
`_old/`.

**Done when:** the user has seen the batch and picked (or asked for another
axis).
