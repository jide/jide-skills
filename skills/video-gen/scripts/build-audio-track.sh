#!/bin/bash
# build-audio-track.sh — build a lip-sync input track at an EXACT integer duration
# (Seedance durations are integers 4..15): [optional intro fx, faded out] + voice,
# padded with silence to --duration. Feed the result to seedance.mjs --audio.
#
# Usage:
#   build-audio-track.sh --vo line.mp3 --out input.mp3 --duration 12 [--fx whoosh.wav --fx-len 4.5]
set -e
FX=""; VO=""; OUT=""; DUR=""; FXLEN=4.5
while [[ $# -gt 0 ]]; do case "$1" in
  --fx) FX="$2"; shift 2;;
  --vo) VO="$2"; shift 2;;
  --out) OUT="$2"; shift 2;;
  --duration) DUR="$2"; shift 2;;
  --fx-len) FXLEN="$2"; shift 2;;
  *) echo "unknown arg: $1"; exit 1;;
esac; done
if [ -z "$VO" ] || [ -z "$OUT" ] || [ -z "$DUR" ]; then
  echo "usage: build-audio-track.sh --vo <vo.mp3> --out <out.mp3> --duration <4..15> [--fx <fx.wav> --fx-len 4.5]"; exit 1
fi

if [ -n "$FX" ]; then
  # awk, not bc: bc prints ".5" without a leading zero, which ffmpeg rejects.
  FADE_ST=$(awk "BEGIN{printf \"%.3f\", $FXLEN - 0.5}")
  ffmpeg -y -i "$FX" -i "$VO" -filter_complex \
"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${FXLEN},afade=t=out:st=${FADE_ST}:d=0.5[fx];\
[1:a]aformat=sample_rates=44100:channel_layouts=stereo[v];\
[fx][v]concat=n=2:v=0:a=1[c];[c]apad[p]" \
  -map "[p]" -t "$DUR" -ar 44100 -ac 2 -b:a 192k "$OUT" >/dev/null 2>&1
else
  ffmpeg -y -i "$VO" -filter_complex \
"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,apad[p]" \
  -map "[p]" -t "$DUR" -ar 44100 -ac 2 -b:a 192k "$OUT" >/dev/null 2>&1
fi
echo "built $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
