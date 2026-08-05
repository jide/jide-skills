# Sheets — many coherent images in one generation

One generation = one style. When a set must share its visual identity, generate
it as a single gridded sheet, then slice. Never generate set members one by
one: per-item generations drift. Two kinds:

- **Asset sheets** — small subjects centered in their cells: icons, cards,
  tiles, props, illustrations (§1–4).
- **Design sheets** — each cell is a full composition edge-to-edge: mobile
  screens, desktop pages, print pieces, all in one design system (§5).

## 1. Build the grid template

A full-bleed grid of thin guide lines (hairline, 2–4px) on a flat background:

```bash
node scripts/grid-template.mjs --cols 6 --rows 5 --cell 512 \
  --bg "#8c8c8c" --out /tmp/template.png
```

- **Background choice decides the endgame:**
  - Assets destined for a known surface → `--bg` = that exact color (CSS token).
    Slices blend in with no further work.
  - Assets needing transparency → neutral grey, remove background later (§4).
- Fit within model limits (gpt-image-2: edge ≤ 3840, multiples of 16, ≤ 8.3MP).
  6×5 @ 512 = 3072×2560 ✓. More cells → smaller `--cell`.
- **Check count vs grid before generating**: 30 assets = 6×5, not 6×6.

## 2. Fill the cells

Edit mode — template as input image, plus style references if the set must match
an existing art direction (a kit sheet, approved renders):

```bash
bash scripts/gen.sh --model gpt-image-2 --size 3072x2560 \
  --refs "/tmp/template.png[,refs/style.png]" \
  --output renders/sheet_v1.png \
  --prompt "Fill the cells LEFT-TO-RIGHT, TOP-TO-BOTTOM, exactly ONE asset per
  cell, centered with equal margins, all at the same scale and stroke weight.
  Keep the background color exactly. Draw EXACTLY N assets in the first N cells,
  leave any remaining cells empty. No text, no numbers, no labels, no captions.
  <shared style descriptor>. Assets in order: (1) …; (2) …; (3) …"
```

The ordered list is the contract: one numbered entry per cell, never painted
numbers on the image.

Preview the sheet (`scripts/preview.js`) and check every cell against the list
**before** slicing — one bad cell = re-roll the sheet, not a post-fix.

## 3. Slice

Grid geometry is trusted — plain inset crop per cell:

```bash
node scripts/grid-slice.mjs --in renders/sheet_v1.png --cols 6 --rows 5 \
  --inset 0.08 --out-dir assets/ --names coin,gem,sword,...
```

`--inset 0.06–0.10` trims cell edges so guide lines never survive into slices.

## 4. Transparency (if needed)

Slice, then remove the background per asset:

```bash
node scripts/remove-bg.mjs --in assets/coin.png --out assets/coin_alpha.png
```

## 5. Design sheets — N screens, one design system

The coherence play for whole designs: 4 mobile screens, 3 desktop pages, a
print set — one generation, one shared palette/typography/component language.

Differences from asset sheets:

- **Rectangular cells at the screen's aspect**: `--cell-w 768 --cell-h 1152`
  for mobile portrait, wide cells for desktop, paper ratios for print.
- **Full-bleed per cell**: each composition runs edge-to-edge inside its cell —
  the thin separator is the only boundary. No outer margin, no phone frames,
  no captions, nothing crossing a separator.
- **Slice with a minimal inset** (`--inset 0.01`) — just enough to cut the
  hairline; an asset-level inset would crop the design's edges.

```bash
node scripts/grid-template.mjs --cols 2 --rows 2 --cell-w 768 --cell-h 1152 \
  --out /tmp/screens.png
bash scripts/gen.sh --model gpt-image-2 --size 1536x2304 \
  --refs "/tmp/screens.png[,style-refs/kit.png]" \
  --output renders/screens_v1.png \
  --prompt "Each cell is ONE complete mobile app screen, full-bleed to its cell
  edges. One consistent design system across all screens: same palette,
  typography, components. Keep the thin separator lines exactly; nothing
  crosses them; no phone frames, no outer margin, no captions.
  <app + art direction>. Screens in order: (1) …; (2) …; (3) …; (4) …"
node scripts/grid-slice.mjs --in renders/screens_v1.png --cols 2 --rows 2 \
  --inset 0.01 --out-dir designs/ --names onboarding,home,detail,profile
```

Write the sheet prompt as a creative brief — intention, general art direction,
detailed content, explicit creative license — not a style/layout spec:
[DESIGN.md](DESIGN.md). Structure not yet validated with the user? Do a lofi
pass first — [WIREFRAMES.md](WIREFRAMES.md) — then feed the validated
wireframe as a ref.

## Cheap tricks

- Recolor per-instance with CSS (`filter: hue-rotate(…)`) instead of
  regenerating a tinted set.
- Massive sheets of tiny assets → consider `gemini-lite` (1K max but $0.03,
  sub-2s) with a smaller grid per call.

**Done when:** every requested asset exists as its own named file, previewed,
matching its list entry.
