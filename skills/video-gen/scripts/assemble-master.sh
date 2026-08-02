#!/bin/bash
# assemble-master.sh — sync-locked master assembly for multi-clip AI videos.
#
# Joins pre-sourced clips (each clip ALREADY carries its final audio: dialogue/VO/SFX baked in)
# with frame-accurate cross-dissolves. The point of this script is the ONE thing that is easy to
# get wrong: keeping voice lip-sync locked across a long timeline.
#
# Why not just xfade + acrossfade and concat? Two errors accumulate and drift the audio LATE:
#   1. xfade snaps every transition to a video-frame boundary (lossy vs the ideal offset).
#   2. each clip's AAC track has a few ms of encoder padding.
# Chained, these sum to ~0.2–0.3s by the end — voice clearly trails the lips in the last clips.
# Fix here: (a) normalize every clip so audio length == its exact video frame-duration, then
# (b) anchor each clip's audio ABSOLUTELY (adelay -> amix) at frame-aligned offsets instead of
# chaining acrossfade, so nothing can accumulate. Video stays an xfade chain on the SAME offsets.
#
# Manifest: tab-separated, one line per clip IN ORDER (lines starting with # are ignored):
#   <clip.mp4>\t<crossfade_frames_to_next>\t[freeze]
#     crossfade_frames_to_next : dissolve length (INTEGER frames) into the NEXT clip (last line's is ignored)
#     freeze (optional)        : end-hold THIS clip's last frame for the crossfade (freeze-then-dissolve)
#
# Usage: assemble-master.sh --manifest clips.tsv --out master.mp4 [--fps 24] [--size 1920x1080]
set -e
MAN=""; OUT=""; FPS=24; SIZE=1920x1080
while [[ $# -gt 0 ]]; do case "$1" in
  --manifest) MAN="$2"; shift 2;;
  --out) OUT="$2"; shift 2;;
  --fps) FPS="$2"; shift 2;;
  --size) SIZE="$2"; shift 2;;
  *) echo "unknown arg: $1"; exit 1;;
esac; done
if [ -z "$MAN" ] || [ -z "$OUT" ]; then
  echo "usage: assemble-master.sh --manifest <tsv> --out <mp4> [--fps 24] [--size WxH]"; exit 1
fi
W=${SIZE%x*}; H=${SIZE#*x}
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
VF="fps=$FPS,scale=$W:$H:force_original_aspect_ratio=decrease,pad=$W:$H:-1:-1,setsar=1,setpts=N/$FPS/TB"
AF="aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"
ENC="-c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 192k"

# --- parse manifest ---
CLIP=(); CF=(); FRZ=()
while IFS=$'\t' read -r clip cf frz; do
  [ -z "$clip" ] && continue
  case "$clip" in \#*) continue;; esac
  CLIP+=("$clip"); CF+=("${cf:-0}"); FRZ+=("${frz:-}")
done < "$MAN"
n=${#CLIP[@]}
if [ "$n" -lt 1 ]; then echo "empty manifest"; exit 1; fi

# --- 1. normalize each clip: CFR + size + audio length == exact video frame-duration; optional end-freeze ---
declare -a NF
for ((k=0;k<n;k++)); do
  ffmpeg -y -i "${CLIP[$k]}" -filter_complex "[0:v]$VF[v];[0:a]$AF,asetpts=N/SR/TB[a]" -map "[v]" -map "[a]" $ENC "$TMP/n$k.mp4" 2>/dev/null
  if [ "${FRZ[$k]}" = "freeze" ] && [ "${CF[$k]}" -gt 0 ]; then
    hold=$(awk "BEGIN{printf \"%.5f\", ${CF[$k]}/$FPS}")
    ffmpeg -y -i "$TMP/n$k.mp4" -filter_complex "[0:v]tpad=stop_duration=$hold:stop_mode=clone,setpts=N/$FPS/TB[v];[0:a]apad=pad_dur=$hold,asetpts=N/SR/TB[a]" -map "[v]" -map "[a]" $ENC "$TMP/h$k.mp4" 2>/dev/null
    mv "$TMP/h$k.mp4" "$TMP/n$k.mp4"
  fi
  nf=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$TMP/n$k.mp4" | tr -dc '0-9')
  vd=$(awk "BEGIN{printf \"%.5f\", $nf/$FPS}")
  ffmpeg -y -i "$TMP/n$k.mp4" -map 0:v -map 0:a -c:v copy -af "apad,atrim=end=$vd,asetpts=N/SR/TB" -c:a aac -b:a 192k "$TMP/m$k.mp4" 2>/dev/null
  mv "$TMP/m$k.mp4" "$TMP/n$k.mp4"
  NF[$k]=$nf
done

# --- 2. frame-aligned start offsets (integer frame math => xfade offset lands on a frame boundary, no snap drift) ---
declare -a OFFF
OFFF[0]=0
for ((k=1;k<n;k++)); do OFFF[$k]=$(( OFFF[k-1] + NF[k-1] - CF[k-1] )); done

# --- 3. video xfade chain + audio adelay->amix (absolute anchor + per-junction fades) ---
inputs=(); for ((k=0;k<n;k++)); do inputs+=(-i "$TMP/n$k.mp4"); done
vfilt=""; vp="0:v"
for ((k=1;k<n;k++)); do
  cf=$(awk "BEGIN{printf \"%.6f\", ${CF[$((k-1))]}/$FPS}")
  off=$(awk "BEGIN{printf \"%.6f\", ${OFFF[$k]}/$FPS}")
  vfilt+="[$vp][$k:v]xfade=transition=fade:duration=$cf:offset=$off[vx$k];"
  vp="vx$k"
done
afilt=""; amins=""
for ((k=0;k<n;k++)); do
  cl=0; if [ "$k" -ge 1 ]; then cl=${CF[$((k-1))]}; fi
  cr=0; if [ "$k" -lt $((n-1)) ]; then cr=${CF[$k]}; fi
  seg="[$k:a]$AF"
  if [ "$cl" -gt 0 ]; then fin=$(awk "BEGIN{printf \"%.6f\", $cl/$FPS}"); seg+=",afade=t=in:st=0:d=$fin"; fi
  if [ "$cr" -gt 0 ]; then fos=$(awk "BEGIN{printf \"%.6f\", (${NF[$k]}-$cr)/$FPS}"); fod=$(awk "BEGIN{printf \"%.6f\", $cr/$FPS}"); seg+=",afade=t=out:st=$fos:d=$fod"; fi
  dms=$(awk "BEGIN{printf \"%d\", ${OFFF[$k]}*1000/$FPS}")
  if [ "$dms" -gt 0 ]; then seg+=",adelay=$dms|$dms"; fi
  afilt+="$seg[a$k];"; amins+="[a$k]"
done
afilt+="${amins}amix=inputs=$n:normalize=0:duration=longest,alimiter=limit=0.97[aout]"

ffmpeg -y "${inputs[@]}" -filter_complex "${vfilt}${afilt}" -map "[$vp]" -map "[aout]" \
  -c:v libx264 -crf 19 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k "$OUT" 2>/dev/null
va=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$OUT")
aa=$(ffprobe -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 "$OUT")
echo "assembled $OUT — $n clips, v=${va}s a=${aa}s (should match within a frame)"
