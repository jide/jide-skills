---
name: image-craft
description: Generate production image assets — single images, batches and variants, coherent sheets (assets, icon sets, multi-screen designs), UI kits, lofi wireframes; edit images (erase elements, isolate subjects, transparency); split a stacked design into separate element layers; locate elements in an image (bounding boxes, annotated overlays); repair AI-degraded images (deslop). Use when the user wants any image or visual asset generated, edited, decomposed, located, or cleaned.
---

# image-craft

Production image generation and editing. This file is the trunk every run reads;
branch files load on demand — open one only when its task is in play.

## Choosing a model

Guidance, not rules — weigh the job, say your pick in one line, generate. Exact
constraints, sizes and pricing live in [MODELS.md](MODELS.md).

- **Default:** `gpt-image-2` — instruction-following, text rendering, grids,
  arbitrary sizes (≤3840px edge, multiples of 16).
- **Mass / fast / cheap, small outputs (≤1024px):** `gemini-3.1-flash-lite-image`.
- **Cheap edits, erasing elements:** Grok edit (fal).
- **Precise multi-reference edits, dense layouts:** Seedream v5 pro (fal).
- **Any transparency / alpha:** `fal-ai/ideogram/remove-background` — generation
  models output no alpha; transparency is always a post-step.
- Other Gemini image models: only when the user explicitly asks for them.

## Generate

```bash
bash scripts/gen.sh \
  --output renders/hero_v1.png \
  --prompt "..." \
  [--refs "refs/logo.png,refs/character.png"] \
  [--model gpt-image-2|gemini-lite|grok|grok-quality|seedream] \
  [--aspect 16:9] [--size 2K|WxH] \
  [--quality low|medium|high] [--mask mask.png]
```

`--quality` (gpt-image-2): medium by default and right in most cases — `low`
for drafts, `high` only when medium misses fidelity or text.

The exact prompt auto-saves as `<basename>.txt` next to each output.

First run self-installs (Node ≥ 18 required). API keys — only the one for the
model in use: `OPENAI_API_KEY`, `FAL_KEY`, `GOOGLE_API_KEY` — in the
workspace-root `.env`, or scripts-local `.env` as fallback. Missing key:
interactive prompt writes `.env` (chmod 600); non-interactive: ask the user,
write it, retry.

## References

References are the coherence engine — pass them for anything that must match:
logos, characters, objects, UI, style.

- Model input = full-resolution originals, always. Never feed a downscaled copy.
- Dirty reference (cropped with clutter, busy background, low quality)? Isolate
  it into a clean version first — [EDITS.md](EDITS.md).
- Never chain pure AI outputs: each iteration anchors to at least one non-AI or
  locked source (real photo, approved render, original asset).

## Seeing the result

You cannot read full-res renders directly. After every generation:

```bash
node scripts/preview.js path/to/image.png    # → small preview in /tmp
```

Read the preview with your vision tool, judge it, show the user. A generation is
done when the image has been looked at — not when the command exits.

## Branches

| Task at hand | Open |
|---|---|
| N variants of one image, or state variants (hover, active…) | [VARIANTS.md](VARIANTS.md) |
| Coherent set in one generation: asset sheet, or multi-screen design sheet | [SHEETS.md](SHEETS.md) |
| Icon set, or one icon matching an existing set | [ICONS.md](ICONS.md) |
| UI kit from a design or brief | [KITS.md](KITS.md) |
| Structure first: lofi wireframe, then high quality | [WIREFRAMES.md](WIREFRAMES.md) |
| Erase, isolate, make transparent, retouch | [EDITS.md](EDITS.md) |
| Split a stacked design into separate element layers | [LAYERS.md](LAYERS.md) |
| Locate elements: bounding boxes, annotated overlays | [DETECT.md](DETECT.md) |
| Image degraded by repeated AI edits — repair | [DESLOP.md](DESLOP.md) |
| Model limits, pricing, refusal recovery | [MODELS.md](MODELS.md) |

## When generation fails

Empty response or policy refusal → [MODELS.md](MODELS.md) §Refusals. Two retries
per slot maximum, then ship a generic fallback and tell the user which slot
needs a real asset.
