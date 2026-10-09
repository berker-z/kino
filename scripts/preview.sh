#!/usr/bin/env bash
# Quick stills from a composition, as a contact sheet in the browser, before
# committing to a full render. Uses `hyperframes snapshot` (a minute or
# two, against half an hour for a heavy render).
#
#   scripts/preview.sh xp-shutter 1 4.5 7.5 10.5          the composition
#   scripts/preview.sh xp-shutter --ab 0.5 1.5 2.5 3.5    its ab/ab.html
#
# Snapshot can't pick a file, so for --ab the composition is mirrored into a
# temporary project with ab/ab.html as its index (vendor, assets and scene
# files are symlinked). Output: research/expansion/media/preview/<name>/
# (gitignored), opened with xdg-open.
set -eu
cd "$(dirname "$0")/.."
comp=$1; shift
ab=0
if [ "${1:-}" = "--ab" ]; then ab=1; shift; fi
times=$(IFS=,; echo "$*")
name=$comp$([ $ab = 1 ] && echo "-ab" || true)
out=research/expansion/media/preview/$name
mkdir -p "$out"
dir=compositions/$comp
if [ $ab = 1 ]; then
  proj=${TMPDIR:-/tmp}/kino-preview-$comp
  mkdir -p "$proj"
  for f in "$PWD/$dir"/*; do
    case $(basename "$f") in index.html|ab|snapshots) ;; *) ln -sfn "$f" "$proj/$(basename "$f")" ;; esac
  done
  sed 's#\.\./#./#g' "$dir/ab/ab.html" > "$proj/index.html"
  dir=$proj
fi
stamp=$(date +%H%M%S)
abs=$PWD/$out
(cd "$dir" && env -u WAYLAND_DISPLAY timeout 600 hyperframes snapshot --no-end --timeout 120000 --at "$times" --output "$abs/$stamp" > "$abs/$stamp.log" 2>&1) || true
imgs=$(ls "$out/$stamp"/*.png 2>/dev/null || true)
[ -n "$imgs" ] || { echo "no frames written; see $out/$stamp.log"; exit 1; }
{
  echo "<!doctype html><meta charset=utf-8><title>$name $stamp</title>"
  echo "<style>body{background:#0b0c0f;color:#ccc;font:14px ui-monospace,monospace;margin:20px}img{width:100%;display:block;border:1px solid #333}figure{margin:0 0 18px}figcaption{margin:4px 0}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(640px,1fr));gap:12px}</style>"
  echo "<h1 style='font-size:16px'>$name · snapshot preview · $stamp</h1><div class=g>"
  for f in $imgs; do echo "<figure><a href='$stamp/$(basename "$f")'><img src='$stamp/$(basename "$f")'></a><figcaption>$(basename "$f")</figcaption></figure>"; done
  echo "</div>"
} > "$out/$stamp.html"
echo "$out/$stamp.html"
xdg-open "$out/$stamp.html" >/dev/null 2>&1 || true
