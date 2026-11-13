// CRC: crc-Build.md | R196, R197, R200, R303, R305
// Bundles src/main.ts into dist/app.js and copies the page beside it. The page's version is "dev"
// with no date unless publishing sets HOLLOW_VERSION and HOLLOW_DATE (a release: its tag and day;
// publish.sh: "dev" and the publish time) and HOLLOW_OUT (a folder of its own, so dist/ keeps
// saying just "dev").
import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const out = process.env.HOLLOW_OUT ?? 'dist';
await mkdir(out, { recursive: true });
await build({
  entryPoints: ['src/main.ts'],
  outfile: `${out}/app.js`,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: process.env.HOLLOW_OUT !== undefined,
  sourcemap: true,
  define: {
    HOLLOW_VERSION: JSON.stringify(process.env.HOLLOW_VERSION ?? 'dev'),
    HOLLOW_DATE: JSON.stringify(process.env.HOLLOW_DATE ?? ''),
  },
});
for (const f of ['src/index.html', 'src/ui/theme.css']) {
  if (existsSync(f)) await copyFile(f, `${out}/${f.split('/').pop()}`);
}
