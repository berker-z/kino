// Screenshots of a running web app (a product a work is about, or any page),
// at exact sizes, through the same chrome-headless-shell HyperFrames uses,
// driven over the DevTools protocol (Node's built-in WebSocket; no
// puppeteer). Also how storyboards get checked: `?t=` opens one at a time.
//
//   node scripts/capture.mjs <base url> <out dir> [shot ...]
//
// A shot is name=path@WIDTHxHEIGHT[*scale][+waitMs], e.g.
//   dash=/@2560x1440*2+2500
// Scale 2 gives plates a camera can push into without going soft.

import {spawn, execSync} from "node:child_process";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";

const [base, out, ...specs] = process.argv.slice(2);
if (!base || !out || !specs.length) throw new Error("usage: node scripts/capture.mjs <base url> <out dir> name=/path@WxH[*scale][+waitMs] ...");
mkdirSync(out, {recursive: true});

function browser() {
  if (process.env.KINO_BROWSER) return process.env.KINO_BROWSER;
  const wrapper = execSync("command -v hyperframes", {shell: "/bin/sh"}).toString().trim();
  const m = /HYPERFRAMES_BROWSER_PATH-'([^']+)'/.exec(readFileSync(wrapper, "utf8"));
  if (!m) throw new Error("set KINO_BROWSER to a chrome-headless-shell");
  return m[1];
}

const port = 9333;
const env = {...process.env};
delete env.WAYLAND_DISPLAY;
const chrome = spawn(browser(), [
  `--remote-debugging-port=${port}`, "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb",
  `--user-data-dir=${process.env.TMPDIR ?? "/tmp"}/copland-capture-profile`, "about:blank",
], {env, stdio: "ignore"});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find((t) => t.type === "page");
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  } catch { ws = null; await sleep(200); }
}
let next = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const send = (method, params = {}) => new Promise((ok, bad) => {
  const id = ++next;
  pending.set(id, (m) => (m.error ? bad(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
  ws.send(JSON.stringify({id, method, params}));
});

await send("Page.enable");
await send("Runtime.enable");
for (const spec of specs) {
  const m = /^([\w-]+)=([^@]+)@(\d+)x(\d+)(?:\*(\d+(?:\.\d+)?))?(?:\+(\d+))?$/.exec(spec);
  if (!m) throw new Error(`bad shot ${spec}`);
  const [, name, path, w, h, scale = "1", wait = "2500"] = m;
  await send("Emulation.setDeviceMetricsOverride", {width: +w, height: +h, deviceScaleFactor: +scale, mobile: false});
  await send("Page.navigate", {url: base + path});
  await sleep(+wait);
  const {data} = await send("Page.captureScreenshot", {format: "png"});
  writeFileSync(join(out, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`${name}.png  ${w}x${h} @${scale}x`);
}
ws.close();
chrome.kill();
