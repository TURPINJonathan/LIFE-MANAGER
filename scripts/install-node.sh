#!/bin/sh
set -eu

if [ -x "$HOME/.local/node/bin/node" ]; then
  "$HOME/.local/node/bin/node" -v
  exit 0
fi

VERSION=$(python3 - <<'PY'
import json
import urllib.request

with urllib.request.urlopen("https://nodejs.org/dist/index.json") as response:
    releases = json.load(response)

for release in releases:
    if release["version"].startswith("v22."):
        print(release["version"])
        break
else:
    raise SystemExit("Node 22 introuvable")
PY
)

ARCHIVE="node-${VERSION}-linux-x64.tar.xz"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

curl -fsSL "https://nodejs.org/dist/${VERSION}/${ARCHIVE}" -o "$TMP/node.tar.xz"
tar -xJf "$TMP/node.tar.xz" -C "$TMP"
rm -rf "$HOME/.local/node"
mkdir -p "$HOME/.local"
mv "$TMP/node-${VERSION}-linux-x64" "$HOME/.local/node"

if ! grep -q '.local/node/bin' "$HOME/.bashrc"; then
  printf '\nexport PATH="$HOME/.local/node/bin:$PATH"\n' >> "$HOME/.bashrc"
fi

"$HOME/.local/node/bin/node" -v
"$HOME/.local/node/bin/npm" -v
