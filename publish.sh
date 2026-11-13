#!/usr/bin/env bash
# CRC: crc-Build.md | R200, R305
# Publishes the page over IPNS for the test rig. Players get GitHub Pages (R199); IPNS is for testing.
#
# The link is the key's subdomain, http://<key>.ipns.localhost:<port>/, never a CID: the origin is what
# saved games and each browser's identity belong to, and a CID would be a new origin every build. A
# dedicated key, hollow-table, keeps other projects' links where they are.

set -euo pipefail
cd "$(dirname "$0")"
KEY="${IPNS_KEY:-hollow-table}"

find_ipfs() {
  if command -v ipfs >/dev/null 2>&1; then command -v ipfs; return; fi
  # IPFS Desktop's AppImage mounts somewhere new on every restart, so glob for it.
  local c
  for c in /tmp/.mount_ipfs_*/resources/app.asar.unpacked/node_modules/kubo/kubo/ipfs; do
    [ -x "$c" ] && { echo "$c"; return; }
  done
  echo "publish.sh: no ipfs binary found (is IPFS Desktop running?). Set IPFS=/path/to/ipfs" >&2
  exit 1
}
IPFS="${IPFS:-$(find_ipfs)}"

# Build, minified, into a folder of its own (dist/ keeps saying just "dev"): version "dev", and the
# time of this publish as its date, so the page shows which publish it is.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
STAMP="$(date '+%b %-d, %Y %H:%M:%S')"
QUOTED="$(printf '%s%s%s' '"' "$STAMP" '"')"   # as it stands in app.js
HOLLOW_VERSION=dev HOLLOW_DATE="$STAMP" HOLLOW_OUT="$STAGE/hollow-table" node build.mjs
grep -qF "$QUOTED" "$STAGE/hollow-table/app.js" || { echo "publish.sh: the publish time isn't in app.js" >&2; exit 1; }

CID="$("$IPFS" add -r -Q --cid-version 1 "$STAGE/hollow-table")"   # add pins it too

# Pinned content isn't in the web UI's Files screen (that lists MFS), so mirror the build there.
"$IPFS" files rm -r /hollow-table >/dev/null 2>&1 || true
"$IPFS" files cp "/ipfs/$CID" /hollow-table

if ! "$IPFS" key list | grep -qx "$KEY"; then
  "$IPFS" key gen "$KEY" >/dev/null
  echo "note   created IPNS key '$KEY'"
fi
NAME="$("$IPFS" key list -l | awk -v k="$KEY" '$2 == k { print $1 }')"
# A 15 s TTL: resolvers cache the name this long, and the default hour would hide a fresh build. The
# publish runs in the background: the node holds the new record at once, while the DHT put that
# `name publish` waits for takes about a minute.
LOG="${TMPDIR:-/tmp}/hollow-table-publish.log"
nohup "$IPFS" name publish --key="$KEY" --ttl=15s --quieter "/ipfs/$CID" >"$LOG" 2>&1 &

PORT="$("$IPFS" config Addresses.Gateway | sed 's#.*/tcp/##; s#/.*##')"
URL="http://${NAME}.ipns.localhost:${PORT}/"
echo "build  $CID  ($STAMP)"
echo "here   $URL"
echo "share  http://${NAME}.ipns.localhost:<their gateway port>/   (8080 on a default install)"

# Wait until this machine's gateway serves this build (WAIT=0 to skip).
T0=$SECONDS GOT=''
while [ "${WAIT:-90}" -gt 0 ] && [ $((SECONDS - T0)) -lt "${WAIT:-90}" ]; do
  GOT="$(curl -s -m 10 --resolve "${NAME}.ipns.localhost:${PORT}:127.0.0.1" "${URL}app.js" | grep -oF "$QUOTED" || true)"
  [ -n "$GOT" ] && { echo "live   after $((SECONDS - T0)) s (reload the page)"; exit 0; }
  sleep 2
done
[ "${WAIT:-90}" -gt 0 ] && echo "slow   the gateway has not served $STAMP after ${WAIT:-90} s; the publish is still going (see $LOG)"
exit 0
