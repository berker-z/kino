#!/usr/bin/env bash
# Benchmark screenPass in the same headless Chrome hyperframes renders with.
# Serves the repo on a spare port, loads tools/bench/screen-pass.html, prints
# ms per frame for paint, upload and each shader variant at 1080p and 1440p.
#
#   scripts/bench-screen-pass.sh [frames-per-variant]
set -u
cd "$(dirname "$0")/.."
frames=${1:-6}
npm run -s build >/dev/null
chrome=${HYPERFRAMES_BROWSER_PATH:-$(sed -n "s/.*HYPERFRAMES_BROWSER_PATH-'\([^']*\)'.*/\1/p" "$(readlink -f "$(command -v hyperframes)")")}
port=8099
python3 -m http.server $port --bind 127.0.0.1 >/dev/null 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT
sleep 1
env -u WAYLAND_DISPLAY timeout 1200 "$chrome" --no-sandbox --enable-logging=stderr --v=0 --dump-dom \
  "http://127.0.0.1:$port/tools/bench/screen-pass.html?frames=$frames" 2>&1 >/dev/null |
  sed -n '/BENCH/,/^\[/p' | sed -e 's/^.*CONSOLE.*"BENCH/BENCH/' -e '/^\[/d' -e 's/", source.*//'
