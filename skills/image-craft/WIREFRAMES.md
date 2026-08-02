# Wireframes — structure first, quality second

Layout decisions and style decisions are separate purchases. Buy the cheap one
first: a lofi wireframe locks the structure with the user before any expensive
high-quality generation. Works for screens, posters, page layouts, compositions.

## 1. Lofi pass — structure only

Cheap and fast (`--quality low`, or `gemini-lite` for small sizes):

```bash
bash scripts/gen.sh --model gpt-image-2 --quality low --size 1024x1536 \
  --output renders/wf_v1.png \
  --prompt "Low-fidelity grayscale WIREFRAME of <what>. Simple boxes, thin
  outlines, light grey fills, placeholder shapes. Layout: <zones, hierarchy,
  what goes where>. Stay a wireframe — no color, no style, no finished art."
```

Preview, show the user, iterate on the *layout* — element placement,
proportions, hierarchy. Cheap rolls; burn as many as needed. Structure is
validated by the user, not by you.

## 2. Quality pass — skin the validated structure

The wireframe becomes a structural reference; style comes from the prompt and
style refs:

```bash
bash scripts/gen.sh --model gpt-image-2 --quality high --size 2048x3072 \
  --refs "renders/wf_v1.png[,refs/style.png]" \
  --output renders/final_v1.png \
  --prompt "Finished <what> following the layout of the wireframe reference —
  same zones, same placement, same proportions. <full style direction>. The
  result is polished final art, nothing wireframe-like in the rendering."
```

The wireframe dictates *where things are*, never *how they look*.

**Done when:** structure was user-validated at lofi stage, and the final was
previewed against the wireframe — layout held.
