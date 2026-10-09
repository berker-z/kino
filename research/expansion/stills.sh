#!/usr/bin/env bash
# Makes the stills for examples/expansion/ from the renders: hero frames at
# 1920 wide, and each A/B as rows of frames side by side (identical
# timestamps in the A/B renders, see each ab/ab.html for what is where).
#
#   research/expansion/stills.sh
set -eu
cd "$(dirname "$0")/../.."
out=examples/expansion/stills
tmp=${TMPDIR:-/tmp}/kino-expansion-stills
mkdir -p "$out" "$tmp"

hero() { # video name t...
  local v=$1 n=$2; shift 2
  for t in "$@"; do
    f=$(printf '%s/%s-%05.2fs.jpg' "$out" "$n" "$t")
    ffmpeg -loglevel error -y -i "$v" -ss "$t" -frames:v 1 -vf scale=1920:-1 -q:v 3 "$f"
  done
}
row() { # video name label... (pairs: t label)
  local v=$1 n=$2; shift 2
  local parts=()
  while [ $# -gt 0 ]; do
    local t=$1 label=$2; shift 2
    local f="$tmp/$n-$t.png"
    ffmpeg -loglevel error -y -i "$v" -ss "$t" -frames:v 1 -vf scale=960:-1 "$f"
    magick "$f" -gravity northwest -fill '#f2efe8' -undercolor '#0b0c0fcc' -font DejaVu-Sans-Mono -pointsize 20 -annotate +14+12 " $label " "$f"
    parts+=("$f")
  done
  magick "${parts[@]}" -background '#0b0c0f' -splice 6x0 +append -chop 6x0 -quality 84 "$out/$n.jpg"
}

E=examples
hero $E/xp-digicam/the-stairwell.mp4 digicam-the-stairwell 0.5 6 11.8
row $E/xp-digicam/ab.mp4 digicam-ab-scene 0.5 "raw (authored flash)" 1.5 "digicamPass" 2.5 "filmPass"
row $E/xp-digicam/ab.mp4 digicam-ab-livingroom 3.5 "raw: bright interior" 4.5 "digicamPass" 5.5 "filmPass"
row $E/xp-digicam/ab.mp4 digicam-ab-cat 6.5 "raw: cat, daylight" 7.5 "digicamPass" 8.5 "filmPass"
row $E/xp-digicam/ab.mp4 digicam-ab-geometry 9.5 "raw: procedural RGB" 10.5 "digicamPass" 11.5 "filmPass"

hero $E/xp-shutter/afterimage.mp4 shutter-afterimage 1 4.5 7.5 10.5
row $E/xp-shutter/ab.mp4 shutter-ab-components 0.5 "source at t" 1.5 "trails only" 2.5 "trails + flash, digicam" 3.5 "same exposure, filmPass"
row $E/xp-shutter/ab.mp4 shutter-ab-footage 4.5 "footage frame" 5.5 "0.5 s shutter + rear flash"

hero $E/xp-xerox/the-testament.mp4 xerox-the-testament 2 6 9.5 11.5
row $E/xp-xerox/ab.mp4 xerox-ab-page 0.5 "original" 1.5 "copy 1" 2.5 "copy 3" 3.5 "copy 6"
row $E/xp-xerox/ab.mp4 xerox-ab-architecture 4.5 "original" 5.5 "copy 3" 6.5 "copy 6"
row $E/xp-xerox/ab.mp4 xerox-ab-materials 7.5 "raw" 8.5 "xerox copy 3" 9.5 "ditherPass" 10.5 "risoPass"

hero $E/xp-projection/sanctuary.mp4 projection-sanctuary 1.5 6 9.5 11.5
row $E/xp-projection/ab.mp4 projection-ab-mapping 0.5 "the projected frame" 1.5 "naive overlay" 2.5 "surfaceProject"
row $E/xp-projection/ab.mp4 projection-ab-occlusion 2.5 "occlusion on" 3.5 "occlusion off"
row $E/xp-projection/ab.mp4 projection-ab-content 4.5 "second source: water" 5.5 "numbered grid"

hero $E/xp-infrared/white-orchard.mp4 infrared-white-orchard 1.5 4 6.5 10
row $E/xp-infrared/ab.mp4 infrared-ab-field 0.5 "raw" 1.5 "global pass" 2.5 "with mattes" 3.5 "the mattes"
row $E/xp-infrared/ab.mp4 infrared-ab-stone 4.5 "raw: stone, moss" 5.5 "global pass"

hero $E/xp-transmission/reliquary.mp4 transmission-reliquary 1.5 5 8.5 11.5
row $E/xp-transmission/ab.mp4 transmission-ab-lights 1.5 "moving band" 2.5 "broad cool light, same plate" 3.5 "naive screen blend"
row $E/xp-transmission/ab.mp4 transmission-ab-photo 0.5 "density and tint maps" 4.5 "glass negative" 5.5 "positive slide" 6.5 "slide, moving band"
ls "$out" | wc -l
