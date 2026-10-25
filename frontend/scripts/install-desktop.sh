#!/bin/sh
# Installs the release desktop build for this user, no root needed: the
# binary in ~/.local/bin, and a launcher entry with the app's icon.
# `npm run desktop:install` builds first; `--uninstall` removes it all again,
# leaving the app's settings (~/.config/com.omega.app.desktop) and data
# (~/.local/share/com.omega.app.desktop).
set -eu
cd "$(dirname "$0")/.."

bin="$HOME/.local/bin/omega-desktop"
data="${XDG_DATA_HOME:-$HOME/.local/share}"
# Not Omega.desktop, the name Omarchy gives a web app called Omega.
entry="$data/applications/omega-desktop.desktop"
icons="$data/icons/hicolor"

if [ "${1:-}" = --uninstall ]; then
  rm -f "$bin" "$entry"
  for size in 32x32 64x64 128x128 256x256 512x512; do
    rm -f "$icons/$size/apps/omega-desktop.png"
  done
  echo "Uninstalled Omega"
  exit 0
fi

install -Dm755 src-tauri/target/release/omega-desktop "$bin"

# From `npm run icons`, via `tauri icon`.
icon() {
  install -Dm644 "src-tauri/icons/$1" "$icons/$2/apps/omega-desktop.png"
}
icon 32x32.png 32x32
icon 64x64.png 64x64
icon 128x128.png 128x128
icon 128x128@2x.png 256x256
icon icon.png 512x512

mkdir -p "$(dirname "$entry")"
cat > "$entry" <<EOF
[Desktop Entry]
Type=Application
Name=Omega
Comment=Calendar
Exec=$bin
Icon=omega-desktop
StartupWMClass=omega-desktop
Categories=Office;Calendar;
Terminal=false
EOF

echo "Installed Omega: $bin and $entry"
