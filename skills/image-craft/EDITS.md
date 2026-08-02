# Edits — erase, isolate, transparency, states

Editing an existing image instead of regenerating. Model picks (details in
[MODELS.md](MODELS.md)): Grok edit = cheap general edits and erasing; Seedream =
region-precise edits and multi-reference compositing (≤10 refs); gpt-image-2 =
edits that must follow long instructions or render text.

Every edit degrades an image a little. Anchor to non-AI sources, keep the
original, and if quality visibly slides after a few passes → [DESLOP.md](DESLOP.md).

## Erase an element

```bash
bash scripts/gen.sh --model grok --refs "renders/scene.png" \
  --output renders/scene_clean.png \
  --prompt "Remove the <element> completely. Reconstruct the background behind
  it naturally. Change nothing else."
```

## Isolate a subject (clean a dirty reference)

A reference cropped from a busy image, low quality, or entangled with a
background makes a poor ref. Clean it first:

```bash
bash scripts/gen.sh --model grok --refs "refs/dirty-crop.png" \
  --output refs/subject_iso.png \
  --prompt "Isolate the <subject> alone, centered, on a plain uniform light-grey
  background. Reproduce it faithfully — same colors, materials, proportions.
  Remove everything else."
```

The isolated version becomes the reference for all subsequent generations.
Extracting elements from inside a larger design (locate → crop → isolate,
possibly many of them) is the [LAYERS.md](LAYERS.md) pipeline.

## Transparency

Generation models output no alpha. The pipeline is always:
**uniform background → ideogram remove-background**:

```bash
# if the subject isn't already on a uniform background, isolate first (above)
node scripts/remove-bg.mjs --in refs/subject_iso.png --out refs/subject_alpha.png
```

$0.01 per call, clean edges (hair, glass).

## Masked edit (surgical region)

When only one region may change, prompt-only preservation is not enough — use
a mask (gpt-image-2 only). The mask is a PNG with alpha, same dimensions as the
image: **transparent pixels = region to change**, opaque pixels are preserved
(visually identical; expect invisible re-encode drift, not pixel equality).

```bash
bash scripts/gen.sh --model gpt-image-2 --refs "renders/scene.png" \
  --mask masks/zone.png --output renders/scene_fixed.png \
  --prompt "<what to draw in the masked region>"
```

## Extend (outpaint)

Grow an image beyond its edges — original content preserved, new content
continues it (expand values in px). **Cap: expanded canvas ≤ 2560px per edge**
(the script checks before calling) — downscale the input first if needed:

```bash
node scripts/outpaint.mjs --in renders/bg.png --out renders/bg_wide.png \
  --left 256 --right 256
```

## State variants (hover, active, disabled…)

One base asset, one edit call per state — everything else stays identical:

```bash
bash scripts/gen.sh --model grok --refs "assets/button.png" \
  --output assets/button_hover.png \
  --prompt "Same button, hover state: <what changes — glow, lift, brightness>.
  Identical size, position, typography, everything else."
```

A whole family of states can also be generated as one sheet (base as style ref,
one state per cell) — [SHEETS.md](SHEETS.md).

**Done when:** edited image previewed against the original — the requested
change happened, nothing else drifted.
