# UI kits — one sheet of primitives, one art direction

A UI kit is a single large sheet cataloguing interface primitives — buttons,
fields, cards, headers, badges, panels — all in one art direction. Generated
once, it becomes the style reference for every subsequent generation (sheets,
screens, assets): the art direction lives in an image, not in prose repeated
across prompts.

## From a brief

```bash
bash scripts/gen.sh --model gpt-image-2 --quality high --size 2880x2880 \
  --output renders/kit_v1.png \
  --prompt "UI component kit sheet, sectioned like an editorial catalog.
  <art direction: palette, materials, typography mood, shape language>.
  Sections: (A) buttons — primary, secondary, disabled; (B) input fields;
  (C) cards; (D) headers/titles; (E) badges and chips; (F) panels/dialogs;
  <adapt sections to the project>. Every primitive flat on a plain uniform
  background, evenly spaced — this is a system kit, not a mockup. Realistic
  label text on components, no annotations or captions around them."
```

## From an existing design

Pass the design as reference; the kit extracts and systematizes its components:

```bash
bash scripts/gen.sh --model gpt-image-2 --quality high --size 2880x2880 \
  --refs "designs/screen.png" \
  --output renders/kit_v1.png \
  --prompt "Extract the UI components visible in the reference into a clean
  component kit sheet: <sections>. Same palette, radii, typography, materials
  as the reference. Each primitive isolated flat on a plain background."
```

## Exploring directions

Several art directions to compare → [VARIANTS.md](VARIANTS.md) mode B: one kit
prompt per style direction, pick with the user.

## Using the kit

Pass `renders/kit_v1.png` in `--refs` of any generation that must match the
direction. Components whose real text matters downstream should carry realistic
labels in the kit — models copy what they see.

**Done when:** kit previewed, user approved the direction, file parked where
the project keeps style refs (`style-refs/`).
