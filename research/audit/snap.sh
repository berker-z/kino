#!/usr/bin/env bash
# Snapshot compositions at fixed times into research/audit/media/<label>/<comp>/.
# Usage: research/audit/snap.sh <label> [comp...]   (default: every composition)
# Runs four at a time. hyperframes snapshot segfaults on exit after writing its
# frames; that's a known tool issue, so success is judged by the files.
set -u
cd "$(dirname "$0")/../.."
label=$1; shift
comps=("$@")
[ ${#comps[@]} -eq 0 ] && comps=(screen-test cyanotype-lab teletext oscilloscope blueprint risograph waves-test dither-lab html-lab riso-lab hero-brutalist hero-nord)
times_for() {
  case $1 in
    screen-test) echo 1.5,6,12,18 ;;
    teletext) echo 3,9,20 ;;
    cyanotype-lab) echo 1 ;;
    hero-*) echo 1,3 ;;
    dither-lab) echo 1.5,7.5,18 ;;
    html-lab|riso-lab) echo 1,7.5 ;;
    xp-*|smoke) echo 1,2,3.5,5,7 ;;
    *) echo 3,12,20 ;;
  esac
}
out=research/audit/media/$label
mkdir -p "$out"
run() {
  local c=$1
  (cd compositions/$c && timeout 900 env -u WAYLAND_DISPLAY hyperframes snapshot --at "$(times_for $c)" --output "../../$out/$c" > "../../$out/$c.log" 2>&1)
  echo "$c $(ls "$out/$c" 2>/dev/null | wc -l) frames"
}
i=0
for c in "${comps[@]}"; do
  run "$c" &
  i=$((i + 1))
  [ $((i % 4)) -eq 0 ] && wait
done
wait
