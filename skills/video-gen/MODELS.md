# Models — endpoints, constraints, moderation

Facts battle-tested 2026-07 (production use). Pricing moves — check the fal
model page before big batches.

## Endpoints

| Model | Endpoint (fal) | Use | Key params |
|---|---|---|---|
| Seedance 2.0 ref-to-video | `bytedance/seedance-2.0/reference-to-video` — **no `fal-ai/` prefix** | The workhorse: refs + optional lip-sync | `image_urls` ≤9 (cited `@Image1..N`), `audio_urls` (lip-sync to your track), `video_urls`, `generate_audio`, `duration` = `auto` or integer 4–15, `resolution` 480p/720p/1080p, `aspect_ratio`, `seed` |
| Seedance 2.0 i2v | `bytedance/seedance-2.0/image-to-video` | Interpolation start[→end] | `image_url`, `end_image_url`. Refs+prompt usually control better |
| Seedance 2.0 fast i2v | `bytedance/seedance-2.0/fast/image-to-video` | Cheap previews | **480p/720p only** |
| Seedance 2.0 t2v | `bytedance/seedance-2.0/text-to-video` | No refs | same core params |
| Kling v3 pro i2v | `fal-ai/kling-video/v3/pro/image-to-video` | Start→end frames, elements refs, multi-prompt shots | `start_image_url`, `end_image_url`, `elements` (frontal + reference urls), `multi_prompt` [{prompt, duration}], `cfg_scale` |
| Veo 3.1 fast ref | `fal-ai/veo3.1/fast/reference-to-video` | Alternate, up to 4K | `image_urls`, `duration` "8s", `resolution` 720p/1080p/4k, `generate_audio` |
| Gemini TTS | `fal-ai/gemini-3.1-flash-tts` | Voice-over | `prompt`, `voice` (30 voices), `language_code`, `style_instructions`, `temperature` |

Uploads: local files go through fal storage (`fal.storage.upload`) — the
scripts handle it.

## Hard limits

- **15s max per Seedance clip** — longer stories are assembled ([ASSEMBLY.md](ASSEMBLY.md)).
- Durations are integers (or `auto`); fast i2v caps at 720p.
- One clip at a time — no parallel video generation (cost + queue fairness).

## Moderation — when a shot 422s

1. A still **composing several recognizable faces** trips ref-to-video →
   pass each person as their OWN calm neutral ref.
2. Rewording rarely fixes a face rejection — **switch model**: Kling v3
   tolerates real faces; Veo 3.1 second choice.
3. Identity drift (not a refusal): hammer the identity tokens ("keep the face
   recognizable, same glasses, same hair") and re-roll.
4. **403 Forbidden = account spend cap / out of credits** — not your input.

Two failed attempts on the same shot → tell the user which shot is blocked and
what you tried.

## Doc URLs

- https://fal.ai/models/bytedance/seedance-2.0/reference-to-video
- https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video
- https://fal.ai/models/fal-ai/veo3.1/fast/reference-to-video
- https://fal.ai/models/fal-ai/gemini-3.1-flash-tts
