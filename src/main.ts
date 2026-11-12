// CRC: crc-Build.md | R196, R201
// The page's entry point. The table, store and network attach here as their layers land; with
// `?test` the page exposes one object, `window.hollow`, for Playwright, and nothing otherwise.

declare const HOLLOW_STAMP: string;

const hollow: Record<string, unknown> = { stamp: HOLLOW_STAMP };

if (new URLSearchParams(location.search).has('test')) {
  (window as unknown as { hollow: typeof hollow }).hollow = hollow;
}
