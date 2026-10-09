// Runs tests/*.test.ts with node's built-in test runner. Each test file is
// bundled by esbuild first (the library uses extensionless imports, which
// node can't resolve on its own), so there's no test framework to install.
//
//   npm test                 every test file
//   npm test -- signals      only files whose name contains "signals"

import * as esbuild from "esbuild";
import {readdirSync, mkdirSync} from "node:fs";
import {join} from "node:path";
import {spawnSync} from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const testsDir = join(root, "tests");
const outDir = join(root, "node_modules", ".cache", "kino-tests");
const filter = process.argv[2] ?? "";

const files = readdirSync(testsDir).filter((f) => f.endsWith(".test.ts") && f.includes(filter));
mkdirSync(outDir, {recursive: true});
const outs = [];
for (const f of files) {
  const outfile = join(outDir, f.replace(/\.ts$/, ".mjs"));
  await esbuild.build({
    entryPoints: [join(testsDir, f)],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "error",
    loader: {".css": "text"},
  });
  outs.push(outfile);
}
const run = spawnSync(process.execPath, ["--test", ...outs], {stdio: "inherit"});
process.exit(run.status ?? 1);
