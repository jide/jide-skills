# Layers — isolate elements from a stacked design

Turn one flat image of a layered composition into independent parts: each
element as its own transparent layer, plus (optionally) the clean surface
underneath. Elements are isolated **independently** — one element failing or
drifting never contaminates the others.

## Isolate one element (the core pipeline)

```
locate → crop with margin → isolate on uniform background → remove-bg
```

**1. Locate.** Simple stack: preview and eyeball. Dense UI: detect boxes and
verify the overlay — [DETECT.md](DETECT.md).

**2. Crop with margin** — the margin gives the edit model context:

```bash
node scripts/crop.mjs --in ui.png --out /tmp/el_crop.png --rect 612,180,420,560 --pad 40
```

**3. Isolate on a uniform background** (grok — cheap; seedream when precision
or multiple refs needed):

```bash
bash scripts/gen.sh --model grok --refs "/tmp/el_crop.png" \
  --output /tmp/el_iso.png \
  --prompt "Reproduce ONLY the <element> from this image, exactly as it appears
  — same colors, details, proportions, lighting. Centered on a plain uniform
  light-grey background. Remove everything else: background, overlapping
  elements, neighbors."
```

**4. Transparency:**

```bash
node scripts/remove-bg.mjs --in /tmp/el_iso.png --out layers/element.png
```

Repeat per element — independently, parallelizable.

**Shortcut for flat rectangular elements on clean ground** (a card, a button):
skip step 3 — a plain crop + remove-bg is already pixel-exact. Use the full
pipeline whenever the element is entangled with imagery or neighbors.

## The base underneath (optional)

One single erase pass listing every element — one edit accumulates far less
drift than a chain of erases:

```bash
bash scripts/gen.sh --model grok --refs "ui.png" --output base.png \
  --prompt "Remove the following elements completely: <list>. Reconstruct what
  is behind each naturally. Change NOTHING else."
```

Preview against the original — an erase can subtly recompose neighbors (a
title shifts, a card edge grows). If it matters, confine with a masked edit
([EDITS.md](EDITS.md)).

## Remount (optional)

```bash
node scripts/compose.mjs --base base.png --out rebuilt.png \
  --layer "layers/card.png@84,340" --layer "layers/fab.png@606,1174"
```

Positions from the detect rects. Isolated layers are faithful re-renditions,
not pixel copies — for a pixel-exact remount prefer the shortcut layers where
it applies.

**Done when:** every requested element exists as a transparent layer, previewed
— faithful to the original, neighbors absent.
