# Detect — locate elements, annotate images

Gemini vision finds elements in any image and returns tight bounding boxes —
pixel rects, centers, and normalized [0..1] coords — plus an annotated overlay
(one color per element, label chips) to verify or to ship as documentation.

```bash
node scripts/detect.mjs --image ui.png \
  --items "the coral floating button, bottom right;the search field;the user avatar" \
  --out boxes.json --overlay annotated.png
```

- One label per element, **specific** ('the blue pin showing "3"', '"Confirm"
  button') — one detection returned per item, exactly.
- `--items-file` takes a JSON array or one label per line; `--prompt` adds
  scene context.
- Output JSON per item: `pixel` {x,y,width,height}, `pixelCenter`, `norm`,
  `normCenter`, plus image dims.

**Always preview the overlay before trusting boxes** — tight rects, right
elements. Loose or swapped boxes → sharpen the labels and re-run.

Uses: feeding crops ([LAYERS.md](LAYERS.md)), masks for surgical edits
([EDITS.md](EDITS.md)), click/tap coordinates for UI automation or hotspots,
annotated screenshots for docs and reviews.

**Done when:** the overlay has been looked at and every box is tight on the
right element.
