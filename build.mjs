// CRC: crc-Build.md | R196, R197
// Bundles src/main.ts into dist/app.js and copies the page beside it. The stamp is "dev" unless
// publishing sets HOLLOW_STAMP (publish.sh stamps the build time).
import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const out = 'dist';
await mkdir(out, { recursive: true });
await build({
  entryPoints: ['src/main.ts'],
  outfile: `${out}/app.js`,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: process.env.HOLLOW_STAMP !== undefined,
  sourcemap: true,
  define: { HOLLOW_STAMP: JSON.stringify(process.env.HOLLOW_STAMP ?? 'dev') },
});
for (const f of ['src/index.html', 'src/ui/theme.css']) {
  if (existsSync(f)) await copyFile(f, `${out}/${f.split('/').pop()}`);
}
