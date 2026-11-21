#!/usr/bin/env bash
# Stiahne veľký zoznam reklamných domén do assets APK (pred buildom).
# HaGeZi Multi PRO (reklamy, trackery, phishing, scam) + Pop-Up Ads (popupy
# a presmerovania typické pre streamovacie stránky), formát "wildcard
# onlydomains" = doména aj všetky jej subdomény.
# Výstup je zoradený bajtovo (LC_ALL=C), appka v ňom hľadá binárne.
# Keď sťahovanie zlyhá, súbor sa nevytvorí a appka použije len vstavaný zoznam.
set -euo pipefail

out="$(dirname "$0")/../app/src/main/assets/adhosts.txt"
base="https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

if ! curl -fsSL --retry 3 --max-time 120 \
  "$base/pro-onlydomains.txt" \
  "$base/popupads-onlydomains.txt" \
  | tr -d '\r' \
  | tr 'A-Z' 'a-z' \
  | grep -E '^[a-z0-9_-]+(\.[a-z0-9_-]+)+$' \
  | LC_ALL=C sort -u > "$tmp"; then
  echo "Ad blocklist download failed – the APK will use only the built-in list" >&2
  rm -f "$out"
  exit 0
fi

count=$(wc -l < "$tmp")
if [ "$count" -lt 10000 ]; then
  echo "Ad blocklist looks incomplete ($count domains) – skipping" >&2
  rm -f "$out"
  exit 0
fi

mv "$tmp" "$out"
trap - EXIT
echo "Ad blocklist: $count domains → $out"
