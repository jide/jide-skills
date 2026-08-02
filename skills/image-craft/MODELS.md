# Models — constraints, pricing, refusals

Verified against official docs 2026-07-17. Re-verify before relying on pricing.

## Constraints table

| Model | ID / slug | Modes | Size rules | Price / image | Notes |
|---|---|---|---|---|---|
| GPT Image 2 | `gpt-image-2` (OpenAI) | t2i + edit + refs + masks | Arbitrary `WxH`: edge ≤ 3840px, multiples of 16, ratio ≤ 3:1, ≤ 8.3MP | 1024²: $0.006 low / $0.053 med / $0.211 high | `quality low\|medium\|high` — **medium is right in most cases**; `low` for drafts, `high` only when medium misses fidelity or text. `moderation: low`, input always high-fidelity |
| Gemini Flash Lite Image | `gemini-3.1-flash-lite-image` (Google) | t2i + edit + refs | **1K max**, 14 fixed aspect ratios | $0.0336 | Sub-2s latency. The mass/cheap workhorse for small outputs |
| Gemini Flash Image | `gemini-3.1-flash-image` (Google) | t2i + edit + refs (10 obj + 4 char) | Fixed: 14 ratios × 0.5K/1K/2K/4K | $0.045–0.151 | Only on explicit user request |
| Grok Imagine (speed) | `xai/grok-imagine-image[/edit]` (fal) | t2i + edit (≤ 3 input imgs) | 12 preset ratios × 1k/2k — **not arbitrary**; edit also takes `auto` (keeps input shape) | $0.02 (+$0.002/input img on edit) | Cheapest capable model; 1–4 imgs/request |
| Grok Imagine (quality) | `xai/grok-imagine-image/quality/text-to-image` · `/quality/edit` (fal) | same | same | $0.05 (1k) / $0.07 (2k) | Better lighting/texture/text |
| Seedream v5 pro | `bytedance/seedream/v5/pro/text-to-image` · `/edit` (fal) | t2i + edit (≤ 10 input imgs) | `image_size` enum, default `auto_2K`, ~2048² pixel cap | $0.0675 (≤1536²) / $0.135 above; edit +$0.0045/extra input | Region-precise edits, dense layouts, native text in 14 languages; 1–6 outputs |
| Ideogram remove-bg | `fal-ai/ideogram/remove-background` (fal) | image → transparent PNG | input ≤ 10MB (JPEG/PNG/WebP) | $0.01 | THE alpha path — clean edges (hair, glass). All transparency goes through it |
| FLUX.2 pro outpaint | `fal-ai/flux-2-pro/outpaint` (fal) | image → extended image | expand per edge in px; **expanded canvas ≤ 2560px per edge** | per-MP FLUX pricing | Extend backgrounds/scenes; original content preserved |

## API notes

**OpenAI** — `POST /v1/images/generations` · `/v1/images/edits`. Params: `size`
(`WxH` or `auto`), `quality`, `format` (png/jpeg/webp), `output_compression`,
`moderation: low`. Do not pass `input_fidelity` (always high on gpt-image-2).

**Gemini** — `generateContent` with `aspect_ratio` + `image_size` (`1K|2K|4K`;
lite accepts only 1K). No arbitrary pixel dims — fixed ratio × size grid only.

**fal** — auth header `Authorization: Key $FAL_KEY`.
Sync: `POST https://fal.run/{model-id}` with JSON body.
Queue (long jobs): `POST https://queue.fal.run/{model-id}` → `request_id` →
poll `GET …/requests/{id}/status` → fetch `GET …/requests/{id}`.

## Refusals

Symptom: empty response, "no image data returned", or explicit policy block —
usually trademarks, celebrity likenesses, copyrighted characters, brand logos.

Recovery ladder, cheapest first:

1. **Reword to generic.** Names → roles/eras: "Michael Jordan" → "legendary
   basketball guard in red-and-black uniform".
2. **Strip proper nouns entirely** — carry the vibe via medium, lighting,
   palette, setting.
3. **Shorten.** Long name-dense prompts refuse more; one generic sentence often
   passes.
4. **Re-roll** — a batch of 4 sometimes gets 1–2 through on identical input.

Two retries per slot, then generic fallback + tell the user.

## Doc URLs

- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image
- https://developers.openai.com/api/docs/guides/image-generation
- https://fal.ai/models/xai/grok-imagine-image/llms.txt
- https://fal.ai/models/bytedance/seedream/v5/pro/edit/llms.txt
- https://fal.ai/models/fal-ai/ideogram/remove-background/llms.txt
- https://fal.ai/docs/model-apis/model-endpoints/queue
