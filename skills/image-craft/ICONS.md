# Icons — sets, and single icons that join a set

Two branches. A whole set is a sheet job; one icon joining an existing set is a
reference job.

## A. New icon set → sheet

Follow [SHEETS.md](SHEETS.md) with icon specifics:

- Prompt style block: "minimalist flat icons, identical stroke weight, one icon
  per cell, perfectly centered with equal margins, no text". Off-center icons
  slice badly — say "perfectly centered" explicitly.
- Background = the exact color of the surface the icons will sit on (card, tile,
  CSS token) → slices blend with zero post-work. Transparency needed instead →
  neutral grey + ideogram (SHEETS §4).
- `--quality medium` is plenty for small icons.

## B. One icon joining an existing set

The set's style is passed as input, not described:

```bash
bash scripts/gen.sh --model gpt-image-2 --size 1024x1024 \
  --refs "style-refs/set-sheet.png,style-refs/exemplar1.png,style-refs/exemplar2.png" \
  --output /tmp/newicon_raw.png \
  --prompt "ONE new icon in EXACTLY the style of the reference icons — same
  palette, stroke weight, level of detail, mood. <what the icon depicts>.
  Single centered icon, plain background, no text."
```

Then match the set's framing — trim to content, recenter at the set's fill
ratio and canvas size:

```bash
node scripts/recenter.mjs --in /tmp/newicon_raw.png \
  --canvas 440 --fill 0.68 --bg "#ffffff" --out assets/icons/newicon.webp
```

Measure `--canvas`/`--fill` once from an existing icon of the set (canvas = file
dimensions; fill ≈ icon bbox / canvas).

### Composition: emblem, not scene

Describe a **compact near-square emblem** — one metaphor only. A horizontal
mechanic (timeline, slider, map path) must be folded into a cluster, not drawn
as a thin strip: "compact timeline emblem: one short curved line, three
clustered nodes, one focused marker — fills width AND height like the reference
icons, not a horizontal strip".

Before accepting: preview the icon **next to 2–3 set neighbors** — same visual
density, same weight, doesn't read as a panoramic mini-scene.

### Project convention

Keep a `style-refs/` folder in the project: the set sheet + a few clean
exemplar icons. A new icon that turns out great → promote it into the folder;
future generations inherit it.

**Done when:** the icon sits in its target folder at set size, previewed
side-by-side with neighbors, density matching.
