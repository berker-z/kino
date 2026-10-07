#!/usr/bin/env bash
# Cuts the clips and stills research/nouscon/index.html shows.
# Usage: research/nouscon/cut.sh path/to/source.mp4
set -euo pipefail
SRC=$1
OUT=$(dirname "$0")/media
mkdir -p "$OUT"
clip() { # name start end [crop]
  local vf="scale=1280:-2"
  [ -n "${4:-}" ] && vf="crop=$4,scale=1280:-2"
  ffmpeg -v error -y -ss "$2" -to "$3" -i "$SRC" -an -vf "$vf" -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/$1.mp4"
  ffmpeg -v error -y -ss "$(awk "BEGIN{print ($2+$3)/2}")" -i "$SRC" -frames:v 1 -vf "$vf" -q:v 3 "$OUT/$1.jpg"
}
clip letter-relay       0.00  3.10
clip overspray-stencil  2.70  3.20
clip overspray-nyc     13.95 14.80
clip torn-print        0.80  1.70
clip ripple-lens       3.10  3.70
clip ripple-skyline    26.0  27.0
clip lens-title       18.20 19.45
clip plate-and-strip   3.60  5.30
clip chip-smash        5.30  7.00
clip echo-walker       7.00  7.42
clip plate-title       7.40  8.50
clip skyline-title    12.95 13.95
clip tunnel-rush       8.45  9.45
clip hands-chip        9.47 10.72
clip rack-focus       10.73 11.90
clip radial-bloom     11.90 12.95
clip light-streak     14.80 15.80
clip felt-type        15.80 17.02
clip felt-nous        21.90 23.50
clip felt-hermes      24.00 25.23
clip wired-head       17.03 17.70
clip node-tree        19.47 21.03
clip emblem           21.03 21.90
clip collage          25.23 26.07
clip glitch-collage   26.30 27.10
clip lockup           27.10 29.29
clip intro-rhythm      0.00  8.50
clip crt-macro         4.30  4.80 "1280:720:1280:720"
clip crt-fringe       27.30 27.80 "1280:720:1280:720"
clip crt-focus        22.30 22.80 "1280:720:0:0"
