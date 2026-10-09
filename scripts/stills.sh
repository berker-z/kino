#!/usr/bin/env bash
# Pull exact frames from a render as JPEG stills, named <prefix>-<t>s.jpg.
#
#   scripts/stills.sh examples/xp-digicam/ab.mp4 examples/expansion/stills/digicam-ab 0.5 1.5 2.5
#
# Seeks are exact (-ss after -i), so a time lands on the frame HyperFrames
# rendered for it. Quality 2 keeps them close to the render.
set -eu
video=$1 prefix=$2; shift 2
mkdir -p "$(dirname "$prefix")"
for t in "$@"; do
  out=$(printf '%s-%05.2fs.jpg' "$prefix" "$t")
  ffmpeg -loglevel error -y -i "$video" -ss "$t" -frames:v 1 -q:v 2 "$out"
  echo "$out"
done
