// Runs tests/browser/*.html in the same headless Chrome HyperFrames renders
// with, for the parts of the library that need a real canvas (compositing,
// WebGL passes, htmlPlate). Each page loads dist/kino.js and writes its
// results as JSON into <pre id="result">; this reads them with --dump-dom.
//
//   npm run test:browser            every page
//   npm run test:browser -- film    only pages whose name contains "film"
//
// Pages are served from the repo root on 127.0.0.1 (file:// can't fetch(),
// which htmlPlate needs to inline fonts).
//
// The browser is $KINO_BROWSER, else the one the hyperframes wrapper pins.
// Run `npm run build` first: pages test the bundle, not the sources.

import {readdirSync, readFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {spawn, execSync} from "node:child_process";
import {createServer} from "node:http";
import {extname} from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dir = join(root, "tests", "browser");
const filter = process.argv[2] ?? "";

function browser() {
  if (process.env.KINO_BROWSER) return process.env.KINO_BROWSER;
  const wrapper = execSync("command -v hyperframes", {shell: "/bin/sh"}).toString().trim();
  const m = /HYPERFRAMES_BROWSER_PATH-'([^']+)'/.exec(readFileSync(wrapper, "utf8"));
  if (!m) throw new Error("set KINO_BROWSER to a chrome-headless-shell");
  return m[1];
}

if (!existsSync(join(root, "dist", "kino.js"))) throw new Error("run npm run build first");
const bin = browser();
const env = {...process.env};
delete env.WAYLAND_DISPLAY; // see docs/lessons.md: WebGL is null under Wayland
const types = {".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg"};
const server = createServer((req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!path.startsWith(root) || !existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, {"content-type": types[extname(path)] ?? "application/octet-stream"}).end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/tests/browser/`;

// Async spawn: the server above has to keep answering while Chrome runs.
function dump(url) {
  return new Promise((resolve) => {
    const p = spawn(bin, ["--headless", "--no-sandbox", "--virtual-time-budget=60000", "--enable-logging=stderr", "--v=0", "--dump-dom", url], {env});
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    const kill = setTimeout(() => p.kill(), 180000);
    p.on("close", () => { clearTimeout(kill); resolve({out, console: err.split("\n").filter((l) => l.includes("CONSOLE")).map((l) => l.replace(/^.*CONSOLE[^\]]*\] /, "")).join("\n")}); });
  });
}

let failed = 0, passed = 0;
for (const page of readdirSync(dir).filter((f) => f.endsWith(".html") && f !== "index.html" && f.includes(filter))) {
  const {out: stdout, console: log} = await dump(base + page);
  const m = /<pre id="result">([\s\S]*?)<\/pre>/.exec(stdout);
  if (!m) {
    console.log(`✖ ${page}: no results (page error or timeout)${log ? "\n    " + log.replace(/\n/g, "\n    ") : ""}`);
    failed++;
    continue;
  }
  const text = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  for (const r of JSON.parse(text)) {
    if (r.ok) { passed++; console.log(`✔ ${page}: ${r.name}${r.note ? `  (${r.note})` : ""}`); }
    else { failed++; console.log(`✖ ${page}: ${r.name}\n    ${r.msg}`); }
  }
}
server.close();
console.log(`\n${passed} passed, ${failed} failed`);
console.log(`To look at them: serve the repo (python3 -m http.server 8077 --bind 127.0.0.1) and open http://127.0.0.1:8077/tests/browser/`);
process.exit(failed ? 1 : 0);
