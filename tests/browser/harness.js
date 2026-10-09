// A tiny in-page test harness. Pages call test(name, fn) (fn may be async),
// then run(). Inside a test, show(label, canvas) attaches a fixture to the
// report so the page can be opened in a browser and looked at: each test is
// listed with its pass/fail and the canvases it checked, scaled up with
// hard pixels. Results also land in <pre id="result"> as JSON, which
// scripts/browser-test.mjs reads back with --dump-dom.
const cases = [];
let figures = null;
window.test = (name, fn) => cases.push({name, fn});
window.assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };
window.show = (label, c, zoom) => { if (figures) figures.push({label, c: copy(c), zoom}); return c; };
function copy(c) { const d = canvas(c.width, c.height); d.getContext("2d").drawImage(c, 0, 0); return d; }

const harnessCss = `
  body { background: #101012; color: #ddd; font: 14px/1.4 ui-monospace, monospace; margin: 24px; }
  h1 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
  .sum { color: #888; margin-bottom: 20px; }
  .case { border-top: 1px solid #2a2a2e; padding: 12px 0; }
  .ok { color: #8fd18f; } .bad { color: #ff7b6b; }
  .msg { color: #ff7b6b; white-space: pre-wrap; margin: 4px 0 0 22px; }
  .note { color: #888; margin-left: 22px; }
  .figs { display: flex; flex-wrap: wrap; gap: 14px; margin: 10px 0 0 22px; }
  figure { margin: 0; } figcaption { color: #888; font-size: 12px; margin-top: 4px; max-width: 520px; }
  figure canvas { image-rendering: pixelated; border: 1px solid #333; display: block; background: #000; }
  #result { display: none; }`;

window.run = async () => {
  const results = [];
  const report = [];
  for (const {name, fn} of cases) {
    figures = [];
    try { const note = await fn(); results.push({name, ok: true, note: note ?? null}); }
    catch (e) { results.push({name, ok: false, msg: String((e && e.message) || e)}); }
    report.push(figures);
    figures = null;
  }
  const style = document.createElement("style");
  style.textContent = harnessCss;
  document.head.appendChild(style);
  const h = document.createElement("h1");
  h.textContent = document.title || location.pathname.split("/").pop();
  document.body.appendChild(h);
  const sum = document.createElement("div");
  sum.className = "sum";
  const nOk = results.filter((r) => r.ok).length;
  sum.textContent = `${nOk} of ${results.length} passed`;
  document.body.appendChild(sum);
  results.forEach((r, i) => {
    const box = document.createElement("div");
    box.className = "case";
    box.innerHTML = `<span class="${r.ok ? "ok" : "bad"}">${r.ok ? "✔" : "✖"}</span> `;
    box.append(r.name);
    if (r.note) { const n = document.createElement("div"); n.className = "note"; n.textContent = r.note; box.appendChild(n); }
    if (!r.ok) { const m = document.createElement("div"); m.className = "msg"; m.textContent = r.msg; box.appendChild(m); }
    if (report[i].length) {
      const figs = document.createElement("div");
      figs.className = "figs";
      for (const f of report[i]) {
        const fig = document.createElement("figure");
        const zoom = f.zoom ?? Math.max(1, Math.min(8, Math.floor(520 / f.c.width)));
        f.c.style.width = f.c.width * zoom + "px";
        f.c.style.height = f.c.height * zoom + "px";
        if (zoom < 1) f.c.style.imageRendering = "auto";
        const cap = document.createElement("figcaption");
        cap.textContent = f.label;
        fig.append(f.c, cap);
        figs.appendChild(fig);
      }
      box.appendChild(figs);
    }
    document.body.appendChild(box);
  });
  const pre = document.createElement("pre");
  pre.id = "result";
  pre.textContent = JSON.stringify(results);
  document.body.appendChild(pre);
};
// Helpers
window.canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
window.px = (c, x, y) => Array.from(c.getContext("2d").getImageData(x, y, 1, 1).data);
window.pixels = (c) => c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
window.maxDiff = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };
window.near = (a, b, tol = 2) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
