#!/usr/bin/env bash
# One lab round: build, snapshot the lab composition, make 2x2 comparison
# grids (reference top-left, tries A/B/C), print region measurements.
#
#   round.sh <lab-composition> <source.mp4> <out-dir> <pairs...>
#
# Each pair is "reftime:frameA,frameB,frameC" for one plate, using the
# snapshot file names, e.g.
#   "16.2:frame-01-at-1.5s.png,frame-04-at-4.5s.png,frame-07-at-7.5s.png"
# The lab renders try k, plate p in the second starting at k * plates + p.
# AT sets the snapshot times (default: 9 slots for 3 tries x 3 plates).
set -euo pipefail
LAB=$(realpath "$1") SRC=$(realpath "$2") OUT=$(realpath -m "$3"); shift 3
HERE=$(cd "$(dirname "$0")" && pwd)
AT=${AT:-0.5,1.5,2.5,3.5,4.5,5.5,6.5,7.5,8.5}
mkdir -p "$OUT"
cd "$(git -C "$LAB" rev-parse --show-toplevel)"
npm run build >/dev/null
# snapshot segfaults on exit after writing; ignore its status
(cd "$LAB" && env -u WAYLAND_DISPLAY hyperframes snapshot --at "$AT" --output "$OUT" >/dev/null 2>&1 || true)

grid() { # name reftime A B C crop
  local s="scale=960:540:flags=neighbor"
  ffmpeg -v error -y -ss "$2" -i "$SRC" -i "$OUT/$3" -i "$OUT/$4" -i "$OUT/$5" -filter_complex \
    "[0:v]crop=$6,$s[r];[1:v]crop=$6,$s[a];[2:v]crop=$6,$s[b];[3:v]crop=$6,$s[c];[r][a]hstack[t];[b][c]hstack[u];[t][u]vstack" \
    -frames:v 1 "$OUT/$1.png"
}
i=0
for pair in "$@"; do
  t=${pair%%:*}
  IFS=, read -r A B C <<<"${pair#*:}"
  grid "p${i}_full" "$t" "$A" "$B" "$C" 3840:2160:0:0
  grid "p${i}_center" "$t" "$A" "$B" "$C" 960:540:1600:900
  grid "p${i}_zoom" "$t" "$A" "$B" "$C" 240:135:1900:1100
  python3 "$HERE/measure.py" regions "$SRC" "$t" "$OUT/$A" "$OUT/$B" "$OUT/$C"
  i=$((i + 1))
done
echo "grids in $OUT"
