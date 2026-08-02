# Deslop — repair an AI-degraded image

Repeated AI edits accumulate artifacts: mushy textures, plastic sheen, drifted
details. Deslop routes the image through a structural outline, then re-renders
from a clean visual source. Two model calls, three user inputs. **Interactive
on purpose** — ask, run, show, ask next; never batch the steps.

## Why it works

The outline destroys textures and AI tells while preserving composition. The
visual reference then re-paints the surface from a non-AI-tainted source. Using
the same sloppy image as its own reference would feed the artifacts back in.

## Protocol

**A — collect inputs** (ask one at a time if not given):

1. **Sloppy image** — the image to fix.
2. **Outline target** — usually the sloppy image itself; confirm.
3. **Visual reference** — a *different* image anchoring style, lighting,
   textures: real photo, approved render, sibling scene. **Must differ from
   the sloppy image.**

**B — outline (call 1):**

```bash
bash scripts/gen.sh --refs "<sloppy>" --output renders/_edits/<name>_outline.png \
  --prompt "Convert this image into a clean outline drawing. Black lines on
  white background, like a technical illustration. Preserve all structural
  detail, every object shape and position. No shading, no color, no texture —
  just clean precise outlines."
```

Preview it, show the user, confirm the structure survived. Missing detail →
redo naming what to preserve.

**C — re-render (call 2):**

```bash
bash scripts/gen.sh --refs "renders/_edits/<name>_outline.png,<visual_ref>" \
  --output renders/<name>_deslop_v1.png \
  --prompt "Render the first image (outline drawing) into a finished scene. Use
  the second image as the quality, lighting and texture reference — match its
  material quality, lighting direction and color palette exactly. High detail,
  no AI artifacts."
```

**D — review, iterate:** still sloppy? Add a third ref (detail close-up),
tighten the render prompt with scene-specific anchors, or swap the visual
reference.

**Done when:** the user approves the re-render next to the original.
