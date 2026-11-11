#!/usr/bin/env bash
# Publish the mockup over IPFS for the two-daemon test rig (Bill, 11-09: IPNS is fine for testing,
# not for delivery -- the page is what boots players into installing IPFS, so players get GitHub
# Pages). Adapted from ~/work/ipfs-test/publish.sh.
#
# The share link is the IPNS-key subdomain form, http://<key>.ipns.localhost:<port>/, because the
# origin is what CORS, the local-network permission, and IndexedDB are keyed to: a CID link would be
# a new origin every build and strand the saved games. A dedicated key (not `self`) keeps
# ipfs-test's link where it is.

set -euo pipefail
cd "$(dirname "$0")"
KEY="${IPNS_KEY:-glimmer-mockup}"

find_ipfs() {
  if command -v ipfs >/dev/null 2>&1; then command -v ipfs; return; fi
  # IPFS Desktop's AppImage mounts somewhere new on every restart, so glob for it
  local c
  for c in /tmp/.mount_ipfs_*/resources/app.asar.unpacked/node_modules/kubo/kubo/ipfs; do
    [ -x "$c" ] && { echo "$c"; return; }
  done
  echo "publish.sh: no ipfs binary found. Set IPFS=/path/to/ipfs" >&2
  exit 1
}
IPFS="${IPFS:-$(find_ipfs)}"

# Only what the browser needs: no tests, notes, or screenshots.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/glimmer"
cp -r index.html net "$STAGE/glimmer/"
# Stamp the build so a browser shows which one it has (Kubo caches IPNS names, so an old one can linger)
STAMP="$(date '+%b %-d %H:%M:%S')"
sed -i "s|<span id=\"build\"\([^>]*\)>dev</span>|<span id=\"build\"\1>$STAMP</span>|" "$STAGE/glimmer/index.html"
grep -q ">$STAMP</span>" "$STAGE/glimmer/index.html" || { echo "publish.sh: build stamp not found in index.html" >&2; exit 1; }

CID="$("$IPFS" add -r -Q --cid-version 1 "$STAGE/glimmer")"   # add pins it too

# Pinned content doesn't appear in the web UI's Files screen; that lists MFS. Mirror the build there
# (replacing the last one) so it sits beside ipfs-test/.
"$IPFS" files rm -r /glimmer-mockup 2>/dev/null || true
"$IPFS" files cp "/ipfs/$CID" /glimmer-mockup

if ! "$IPFS" key list | grep -qx "$KEY"; then
  "$IPFS" key gen "$KEY" >/dev/null
  echo "note  created IPNS key '$KEY'"
fi
NAME="$("$IPFS" key list -l | awk -v k="$KEY" '$2 == k { print $1 }')"
# A short TTL (15 s, Bill): resolvers cache the name this long, and the default (an hour) hides a
# fresh build. The publish itself runs in the background: IPNS-over-pubsub (Ipns.UsePubsub on both
# daemons) reaches connected peers in seconds, while the DHT put that `name publish` waits for takes
# about a minute (Bill: "I don't want to wait a full minute for each change").
LOG="${TMPDIR:-/tmp}/glimmer-publish.log"
nohup "$IPFS" name publish --key="$KEY" --ttl=15s --quieter "/ipfs/$CID" >"$LOG" 2>&1 &

PORT="$("$IPFS" config Addresses.Gateway | sed 's#.*/tcp/##; s#/.*##')"
echo "build  $CID  ($STAMP)"
echo "here   http://${NAME}.ipns.localhost:${PORT}/"
echo "share  http://${NAME}.ipns.localhost:<their gateway port>/   (8080 on a default install)"

# Watch the test rig's gateway until it serves this build (CHECK=host:port, or CHECK= to skip).
CHECK="${CHECK-windows-gpu:8080}"
if [ -n "$CHECK" ]; then
  HOST="${CHECK%:*}" GPORT="${CHECK##*:}" T0=$SECONDS
  URL="http://${NAME}.ipns.localhost:${GPORT}/"
  while [ $((SECONDS - T0)) -lt 90 ]; do
    GOT="$(ssh -o BatchMode=yes -o ConnectTimeout=5 "$HOST" "curl.exe -s -m 10 $URL" 2>/dev/null | grep -o 'id="build"[^>]*>[^<]*<' | sed 's/.*>//; s/<$//' || true)"
    [ "$GOT" = "$STAMP" ] && { echo "live   on $HOST after $((SECONDS - T0)) s (reload the page there)"; exit 0; }
    sleep 2
  done
  echo "slow   $HOST still serves '${GOT:-nothing}' after 90 s; the DHT publish is still going (see $LOG)"
fi
