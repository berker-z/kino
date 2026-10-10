// Bundles src/ into one browser script and drops it, plus GSAP and the
// fonts from src/tokens/fonts.json, into the vendor/ directory of every
// composition in compositions/, lab/, attic/ and works/.
//
// Compositions are standalone HyperFrames projects: the preview server and
// renderer only see files inside the composition directory, so the library
// has to be copied in rather than referenced from ../../. Nothing loads from
// a CDN, so renders are offline and reproducible.
//
//   npm run build          one-off
//   npm run watch          rebuild on change in src/

import * as esbuild from "esbuild";
import {copyFileSync, mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";

const root = new URL("..", import.meta.url).pathname;
const compositionDirs = ["compositions", "lab", "attic", "works"].map((dir) => join(root, dir));
const outfile = join(root, "dist", "kino.js");
const gsapFile = join(root, "node_modules", "gsap", "dist", "gsap.min.js");
const fontsFile = join(root, "src", "tokens", "fonts.json");

// Every family in fonts.json → [file name, source path, @font-face rule].
function fontFaces() {
  const fonts = JSON.parse(readFileSync(fontsFile, "utf8"));
  return Object.entries(fonts).flatMap(([family, {package: pkg, weights}]) =>
    weights.map((weight) => {
      const name = `${pkg}-latin-${weight}-normal.woff2`;
      return {
        name,
        source: join(root, "node_modules", "@fontsource", pkg, "files", name),
        rule: `@font-face { font-family: "${family}"; font-weight: ${weight}; font-style: normal; font-display: block; src: url("fonts/${name}") format("woff2"); }`,
      };
    }),
  );
}

function compositions() {
  return compositionDirs
    .filter((parent) => existsSync(parent))
    .flatMap((parent) =>
      readdirSync(parent, {withFileTypes: true})
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(parent, entry.name)),
    )
    .filter((dir) => existsSync(join(dir, "index.html")));
}

function distribute() {
  for (const dir of compositions()) {
    const vendor = join(dir, "vendor");
    mkdirSync(vendor, {recursive: true});
    copyFileSync(outfile, join(vendor, "kino.js"));
    copyFileSync(gsapFile, join(vendor, "gsap.min.js"));
    mkdirSync(join(vendor, "fonts"), {recursive: true});
    const faces = fontFaces();
    for (const face of faces) copyFileSync(face.source, join(vendor, "fonts", face.name));
    writeFileSync(join(vendor, "fonts.css"), faces.map((face) => face.rule).join("\n") + "\n");
  }
  console.log(`kino: bundled → ${compositions().length} composition(s)`);
}

const options = {
  entryPoints: [join(root, "src", "index.ts")],
  outfile,
  bundle: true,
  format: "iife",
  globalName: "Kino",
  target: "chrome120",
  loader: {".css": "text"},
  logLevel: "warning",
  plugins: [
    {
      name: "distribute",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) distribute();
        });
      },
    },
  ],
};

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
