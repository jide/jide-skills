# Keyframes — drive the camera with a storyboard grid

When a prompt alone can't steer the camera through a *specific* space — plunge
through a doorway into a room, dive into a portal, thread between objects —
hand the model the trajectory as images: a keyframe grid.

## Build the grid

One **gutterless** N×N image: the camera's keyframes edge-to-edge, **no
dividing lines** (unlike image-craft sheets — this grid is a reference the
model reads, never sliced; visible lines get copied into the video). A square
grid inside a 16:9 canvas yields 16:9 cells.

- Keyframes go **monotonic** — one continuous move, no cuts: approach (target
  stable in frame) → enter → through → arrival. ~6 cells for a short move, up
  to 16 for a long one.
- Build it with `image-craft` (edit mode). Refs: `[start_frame, destination]`
  ONLY — passing a previous grid as a "model" contaminates content.
- A text-to-image grid (no refs) also works as a whole-video storyboard for
  planning shots before generating anything.

## Generate the move

Seedance ref-to-video, refs = `[start_frame, grid, destination]`:

```bash
node scripts/seedance.mjs \
  --refs "start.png,keyframe_grid.png,destination.png" \
  --output out/dive.mp4 --duration 6 --resolution 1080p \
  --prompt "One continuous first-person camera move following the keyframes of
  @Image2 in order, from the exact view of @Image1, arriving in @Image3.
  The environment stays IDENTICAL to @Image1 — do not redraw it. Animate
  smoothly and continuously, no jitter, no morphing."
```

- The **reverse move** (back out): same grid logic, keyframes reversed; end on
  the start frame for a clean loop.
- Multi-scene fly-through without a grid: 2–3 scene refs + "one continuous
  first-person camera flying through these places (@Image1 → @Image2 →
  @Image3)"; decelerate at the end for assembly.

**Done when:** the frame strip shows the camera hitting each keyframe in order
with no scene redraw.
