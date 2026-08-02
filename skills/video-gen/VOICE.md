# Voice — TTS and lip-sync

## Voice-over (Gemini TTS)

```bash
node scripts/tts.mjs --voice Charon --lang "French (France)" --temp 0.7 \
  --style "warm calm narrator, natural, NOT theatrical" \
  --text "…" --output vo/line01.mp3
```

- 30 voices — **audition several on one line before committing**; voice choice
  is subjective and client-driven.
- Keep `--style` grounded: over-styling ("theatrical, mischievous") sounds
  comic. Understate.
- Pacing: tighten with pitch-preserving `atempo` (~1.5 natural, >1.6 rushed):
  `ffmpeg -i vo.mp3 -af atempo=1.5 vo_fast.mp3`

## Lip-sync

Seedance ref-to-video lip-syncs to the track you feed via `--audio`. The
recipe:

1. **Build one input track at an exact integer duration** (Seedance durations
   are integers). Optional intro fx before the voice (an eruption, a whoosh —
   anything that plays before speech):

```bash
bash scripts/build-audio-track.sh --vo vo/line01.mp3 --out vo/input.mp3 \
  --duration 12 [--fx fx/whoosh.wav --fx-len 4.5]
```

2. **Generate with the track + the exact transcript.** Keep `generate_audio`
   ON (ambience gets layered around your voice); put the transcript verbatim
   in the DIALOGUE block — it measurably improves mouth sync:

```bash
node scripts/seedance.mjs --refs "scene.png,speaker.png,speaker_face.png" \
  --audio vo/input.mp3 --duration 12 --resolution 1080p \
  --output out/speech01.mp4 --prompt "… DIALOGUE: \"<exact spoken text>\" …"
```

3. Verify with the frame strip (trunk §Verify) — mouth moving during the
   speech window, still before it.

**Done when:** the clip's speech window matches the track and the user approved
the voice.
