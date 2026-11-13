// CRC: crc-Build.md | R198, R201, R297
// The browser specs: headless Chromium and Firefox, each test's pages in their own contexts, the
// built page served from dist/ on a port of its own so no one's table is touched.
import { defineConfig, devices } from '@playwright/test';

const PORT = 8781, RELAY = 8782;

export default defineConfig({
  testDir: 'tests',
  // Each test has its own contexts and room, so they run side by side (HOLLOW_WORKERS to change it).
  fullyParallel: true,
  workers: Number(process.env.HOLLOW_WORKERS ?? 4),
  timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${PORT}/`, viewport: { width: 1400, height: 840 } },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 840 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1400, height: 840 } } },
  ],
  webServer: [
    { command: `npm run build && python3 -m http.server ${PORT} --bind 127.0.0.1 --directory dist`, url: `http://127.0.0.1:${PORT}/`, reuseExistingServer: false },
    // R297: the local relay networked specs meet through.
    { command: `node tests/relay.ts ${RELAY}`, port: RELAY, reuseExistingServer: false },
  ],
});
