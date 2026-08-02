# Assembly — sync-locked master edit

Clips ≤15s each; the story is the edit. Order of operations matters:

1. **Re-time first** (§Speed-ramp) — the master keys off final clip durations.
2. **Bake each clip's final audio** (mix VO/SFX/ambience per clip with ffmpeg
   `amix`) — the assembler joins finished clips, it doesn't mix.
3. **Assemble** with the sync-locked script.
4. **Overlays last** (§Overlays).

## Why a dedicated assembler

Naive `xfade` + chained `acrossfade` drifts the voice LATE ~0.2–0.3s by the
end of a multi-clip timeline: xfade snaps transitions to frame boundaries, and
each clip's AAC encoder padding accumulates. The script normalizes every clip
so audio length == exact video frame-duration, computes offsets in INTEGER
frames, and anchors each clip's audio ABSOLUTELY (adelay→amix) instead of
chaining — nothing can accumulate.

```bash
bash scripts/assemble-master.sh --manifest clips.tsv --out master.mp4 --fps 24
```

`clips.tsv` — tab-separated, one clip per line, in order:

```
intro.mp4	12	freeze
shot01.mp4	8
shot02.mp4	0
```

- Column 2: crossfade length INTO the next clip, in integer frames.
- `freeze`: end-holds the clip's last frame for the dissolve (good intro/outro
  beat).
- **Lock ONE fps end-to-end** (24 or 30) — every clip and the master must
  agree or the frame math drifts.
- It prints `v=` and `a=` — they must match within a frame.

## Speed-ramp

- Integer 2×/3× (snappier moves): `-vf "setpts=PTS/2" -r <fps>` — uniform
  decimation, no artifacts.
- Non-integer (1.5×): `minterpolate=fps=<n>:mi_mode=mci:me_mode=bidir:vsbmc=1,setpts=PTS/1.5`.
- A baked SFX that no longer fits: stretch pitch-preserving with `atempo=<src/dst>`.

## Overlays (text, logo, lower-thirds)

Many ffmpeg builds lack `drawtext`. Two paths:

- **Remotion** (preferred for anything animated): a comp plays the master via
  `OffthreadVideo` and overlays logo / lower-thirds / URL; render with
  `node_modules/.bin/remotion render`.
- **ImageMagick**: render each text block to a transparent PNG, then ffmpeg
  `overlay`.

## ffmpeg gotchas

- Build filtergraphs in a `/tmp/*.sh` file and run `bash x.sh` — fish/zsh
  parse `$VAR[v]` as array indexing and corrupt inline graphs.
- `bc` prints `.5` (no leading zero) which ffmpeg rejects — compute durations
  with `awk "BEGIN{printf …}"`.
- Before declaring any output done: `ffprobe` BOTH streams and check v≈a.
