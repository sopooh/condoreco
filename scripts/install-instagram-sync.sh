#!/bin/bash
# Installa la sincronizzazione automatica dei post Instagram sul Mac.
# Gira ogni 15 minuti (e all'accensione) tramite launchd.
#
# Uso, dalla cartella del progetto:  bash scripts/install-instagram-sync.sh
# Per disinstallare:                  bash scripts/install-instagram-sync.sh --uninstall

set -euo pipefail

LABEL="it.condoreco.instagram-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ENV_FILE="$HOME/.condoreco-instagram-sync.env"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$HOME/Library/Logs/condoreco-instagram-sync.log"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Sincronizzazione rimossa. Le cartelle e $ENV_FILE restano dove sono."
  exit 0
fi

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "Node non trovato. Installa Node 20+ e riprova."; exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<EOF
SUPABASE_URL=https://ragltuoxnduohyqigkcg.supabase.co
# Supabase > Project Settings > API keys > service_role (secret). Resta solo su questo Mac.
SUPABASE_SERVICE_ROLE_KEY=
# Opzionali:
# LOCAL_DIR=~/Condoreco/Instagram
# DRIVE_DIR=~/Library/CloudStorage/GoogleDrive-tuo@email/My Drive/Condoreco Instagram
EOF
  chmod 600 "$ENV_FILE"
  echo "Creato $ENV_FILE: incolla la service_role key e rilancia questo script."
  open -e "$ENV_FILE" 2>/dev/null || true
  exit 0
fi

if ! grep -q '^SUPABASE_SERVICE_ROLE_KEY=.\+' "$ENV_FILE"; then
  echo "Manca SUPABASE_SERVICE_ROLE_KEY in $ENV_FILE"; exit 1
fi

(cd "$REPO_DIR" && [[ -d node_modules/@supabase/supabase-js ]] || npm install --no-audit --no-fund)

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$REPO_DIR/scripts/instagram-sync.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO_DIR</string>
  <key>StartInterval</key><integer>900</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Fatto. Prima sincronizzazione in corso, log: $LOG"
sleep 5; tail -n 3 "$LOG" 2>/dev/null || true
