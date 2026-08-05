# Designs — app screens, sites, pages

Generating a design (a screen, a landing page, a poster-like layout) is a
different prompting job than generating an asset. The failure mode is specific:
**cold, exhaustive style-and-layout prose produces basic, generic design.**
gpt-image-2 in particular rises to creative freedom and sinks under
specification.

## The creative brief pattern

Prompt like you'd brief a designer, not like you'd spec a build:

1. **Intention** — what this design is for, who it's for, how it should feel.
2. **A general art direction** — a few strokes: palette mood, typographic
   attitude, material/shape language. Direction, not inventory.
3. **The content, in detail** — what the screen actually displays: real
   labels, real data, the actual sections. Content is the one thing the model
   can't invent correctly.
4. **Explicit creative license** — say it: "be creative", "surprise me",
   "make it feel crafted". It measurably changes the output.

Leave layout decisions to the model **unless a specific layout is required** —
and when it is, don't write it in prose: lock it with a structural reference
(a wireframe, [WIREFRAMES.md](WIREFRAMES.md)). Layout belongs to reference
images; style belongs to the brief.

```text
A mobile screen for 'Atlas', a travel journal — it should feel like a
beautifully kept notebook, warm and personal, not a SaaS dashboard.
Art direction: warm ivory, one confident accent, refined editorial
typography, real photography. Be creative with the composition — surprise me.
Content: current trip card (Kyoto, Japan — 12 places, 48 km, 5 days),
a "My Destinations" row (Fushimi Inari, Arashiyama, Kinkaku-ji), user
avatar, notifications, tab bar (Explore, Journal, Map, Profile).
```

Compare with a prompt that dictates "a 380px hero card with 16px radius at
the top, below it a 3-column stats grid…" — same content, flat result.

## Scaling up

- Several screens in one design system → design sheet, [SHEETS.md](SHEETS.md) §5
  (the brief pattern applies to the sheet prompt as a whole).
- Validate structure with the user before the expensive pass →
  [WIREFRAMES.md](WIREFRAMES.md), then the quality pass keeps a creative brief
  + the wireframe as the layout lock.
- Extract the design system for reuse across future generations →
  [KITS.md](KITS.md).

**Done when:** the design was generated from a brief (intention + direction +
content + license), not a spec — and layout, where it mattered, came from a
reference.
