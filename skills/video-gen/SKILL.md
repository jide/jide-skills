---
name: video-gen
description: Generate AI video clips — text-to-video, image-to-video, reference-driven shots with consistent characters/scenes, lip-synced speech, voice-over (TTS); drive camera moves with keyframe grids; assemble clips into a sync-locked master edit. Use when the user wants any video generated, narrated, or cut together.
---

# video-gen

Production video generation on fal. This file is the trunk; branch files load on
demand. Video is slow and costly (tens of cents to dollars per clip) — **state
the shot plan and get a go before generating**, and iterate at low resolution
before any 1080p run.

## Choosing a model

Guidance, not rules — endpoints, params and moderation in [MODELS.md](MODELS.md).

- **Default: Seedance 2.0 `reference-to-video`** — the workhorse. Up to 9 image
  refs (cited `@Image1..N` in the prompt), optional `audio_urls` for lip-sync
  to your own track. 15s hard cap per clip.
- **Previews / drafts:** Seedance `fast/image-to-video` (480p/720p, cheap) —
  validate motion before paying for 1080p.
- **Start→end frame control, multi-prompt shots, real faces:** Kling v3 pro —
  also the fallback when Seedance moderation rejects a shot.
- **Second alternate:** Veo 3.1 (reference-to-video, up to 4K).
- **Voice-over:** Gemini TTS ([VOICE.md](VOICE.md)).

## Generate

```bash
node scripts/seedance.mjs --prompt "<structured prompt>" \
  --refs "scene.png,character.png,character_face.png" \
  --output out/shot01.mp4 --resolution 1080p --duration 8 --aspect 16:9 \
  [--audio vo/track.mp3] [--mode i2v] [--fast] [--end last_frame.png] [--seed N]
```

First run self-installs (Node ≥ 18; `FAL_KEY` in workspace `.env`). Every
output saves a `<basename>.txt` sidecar (prompt, endpoint, refs, source URL).

## The structured prompt

Video prompts work as labeled blocks — keep them all, drop none:

- **Style** — look, grade, lighting.
- **CAMERA** — one continuous move, described physically; **decelerate to a
  gentle stop** at the end (abrupt endings ruin crossfades at assembly).
- **SCENE LOCK** — "`@Image1` IS the opening frame; environment IDENTICAL; do
  not rebuild it."
- **SUBJECTS** — map each `@ImageN` to its role; "faces and outfits PERFECTLY
  CONSISTENT with the references".
- **TIMED ACTION** — timestamped beats (`0-1s …; 1-4s …; after …`).
- **DIALOGUE** — the exact transcript in the spoken language (markedly better
  lip-sync).
- **AUDIO** — what should be heard (ambience, fx, the line).

## References

- Refs are the consistency engine — scene ref locks the set, character refs
  lock identity. For a character: a neutral full-body + a face close-up
  (produce them with the `image-craft` skill).
- First pass often drops identity details (glasses, hair, age) — hammer those
  tokens and re-roll.
- Composing several real faces into ONE ref image trips moderation — pass each
  person as their own ref (MODELS.md §Moderation).

## Verify

You cannot watch the clip. After every generation:

```bash
ffprobe -v error -show_entries stream=codec_type,duration -of csv out/shot01.mp4
ffmpeg -y -i out/shot01.mp4 -vf "select='not(mod(n,24))',scale=320:-1,tile=5x3" -frames:v 1 /tmp/shot01_strip.png
```

Check both streams exist and v≈a duration, then Read the tile strip and judge
motion, identity, framing. A clip is done when its frames have been looked at.

## Branches

| Task at hand | Open |
|---|---|
| Endpoints, params, pricing, moderation recovery | [MODELS.md](MODELS.md) |
| Voice-over, lip-sync to a built audio track | [VOICE.md](VOICE.md) |
| Precise camera path through a space (keyframe grid) | [KEYFRAMES.md](KEYFRAMES.md) |
| Join clips into a master edit, re-timing, overlays | [ASSEMBLY.md](ASSEMBLY.md) |
