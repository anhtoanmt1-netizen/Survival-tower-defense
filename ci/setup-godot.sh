#!/usr/bin/env bash
# Tải Godot 4.3 (và export templates nếu truyền "templates") trực tiếp từ bản phát hành chính thức.
set -euo pipefail
V="4.3-stable"
BASE="https://github.com/godotengine/godot/releases/download/${V}"
BIN="Godot_v${V}_linux.x86_64"

mkdir -p "$HOME/godot"
cd "$HOME/godot"
curl -fL --retry 5 --retry-delay 5 -o godot.zip "${BASE}/${BIN}.zip"
unzip -q -o godot.zip
chmod +x "$BIN"
sudo ln -sf "$HOME/godot/$BIN" /usr/local/bin/godot
godot --version

if [ "${1:-}" = "templates" ]; then
  TPL="$HOME/.local/share/godot/export_templates/4.3.stable"
  curl -fL --retry 5 --retry-delay 5 -o templates.tpz "${BASE}/Godot_v${V}_export_templates.tpz"
  rm -rf tpl && mkdir -p tpl "$TPL"
  unzip -q -o templates.tpz -d tpl
  cp -r tpl/templates/* "$TPL/"
  test -f "$TPL/android_debug.apk" || { echo "LỖI: thiếu android_debug.apk trong export templates"; ls -la "$TPL"; exit 1; }
  echo "Export templates OK: $TPL"
fi
