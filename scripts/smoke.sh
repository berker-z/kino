#!/usr/bin/env bash
# Smoke test for the whole toolchain on a machine without our private media:
# typecheck, unit tests, build, then the synthetic `smoke` composition
# through hyperframes (check + snapshot) and a check that the screenPass
# grille actually changes the picture (it silently didn't, for a while).
#
#   scripts/smoke.sh
#
# Needs: node, npm deps installed, hyperframes CLI with a headless Chrome
# that has WebGL2, python3 with numpy, ImageMagick. On Linux under Wayland,
# WAYLAND_DISPLAY is unset for hyperframes (see docs/lessons.md).
#
# Known tool behaviour, not a failure: `hyperframes snapshot` can segfault
# on exit after writing its frames, so snapshots are judged by the files.
set -u
cd "$(dirname "$0")/.."
out=${SMOKE_OUT:-${TMPDIR:-/tmp}/kino-smoke-$(date +%Y%m%d-%H%M%S)}
mkdir -p "$out"
echo "output: $out"
fail=0
step() { printf '\n== %s\n' "$1"; }

step "typecheck"; npm run -s typecheck || fail=1
step "unit tests"; npm test --silent 2>&1 | grep -E "^ℹ (tests|pass|fail)|^✖" || true
npm test --silent > /dev/null 2>&1 || fail=1
step "build"; npm run -s build || fail=1

step "hyperframes check (smoke)"
if (cd compositions/smoke && env -u WAYLAND_DISPLAY hyperframes check > "$out/check.log" 2>&1); then
  echo "check passed"
else
  echo "check FAILED (exit $?): see $out/check.log"
  tail -5 "$out/check.log"
  fail=1
fi

step "snapshot (smoke)"
(cd compositions/smoke && env -u WAYLAND_DISPLAY timeout 300 hyperframes snapshot --at 0.5,1.5,2.5,3.5 --output "$out/frames" > "$out/snapshot.log" 2>&1) || true
n=$(ls "$out/frames"/frame-0[0-3]-*.png 2>/dev/null | wc -l)
echo "$n of 4 frames written"
[ "$n" -eq 4 ] || fail=1

step "screenPass grille has an effect"
if [ "$n" -eq 4 ]; then
  off=$(python3 research/audit/grille.py "$out"/frames/frame-00-*.png --pitch 5.75 | awk '{print $1}')
  on=$(python3 research/audit/grille.py "$out"/frames/frame-01-*.png --pitch 5.75 | awk '{print $1}')
  echo "grille strength: off $off, on $on"
  python3 -c "import sys; sys.exit(0 if float('$on') > 4 * max(float('$off'), 1) else 1)" && echo ok || { echo "FAILED: grille on is not clearly stronger than off"; fail=1; }
  for f in "$out"/frames/frame-0[0-3]-*.png; do
    k=$(magick "$f" -format "%k" info:)
    echo "$(basename "$f"): $k colours"
  done
fi

echo
[ $fail -eq 0 ] && echo "SMOKE OK" || echo "SMOKE FAILED"
exit $fail
