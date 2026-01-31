#!/bin/bash
set -e

echo "========================================="
echo "  FlyGate ACI - Raspberry Pi Installer"
echo "========================================="
echo ""

INSTALL_DIR="${INSTALL_DIR:-/opt/flygate-aci}"
SERVICE_USER="${SERVICE_USER:-pi}"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "[1/7] Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "Node.js already installed: $(node --version)"
fi

echo ""
echo "[2/7] Creating installation directory..."
mkdir -p "$INSTALL_DIR"

echo ""
echo "[3/7] Copying application files..."
cp -r dist "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"
cp package-lock.json "$INSTALL_DIR/" 2>/dev/null || true
cp .env.local "$INSTALL_DIR/.env" 2>/dev/null || echo "PORT=8080" > "$INSTALL_DIR/.env"

echo ""
echo "[4/7] Installing production dependencies on target..."
cd "$INSTALL_DIR"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev
cd -

echo ""
echo "[5/7] Setting ownership..."
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

echo ""
echo "[6/7] Installing systemd service..."
cat > /etc/systemd/system/flygate-aci.service << EOF
[Unit]
Description=FlyGate ACI - Aviation Control Interface
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/dist/index.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable flygate-aci

echo ""
echo "[7/7] Starting FlyGate ACI service..."
systemctl start flygate-aci

echo ""
echo "========================================="
echo "  Installation Complete!"
echo "========================================="
echo ""
echo "FlyGate ACI is now running at:"
echo "  http://$(hostname -I | awk '{print $1}'):8080"
echo "  http://$(hostname).local:8080"
echo ""
echo "Commands:"
echo "  sudo systemctl status flygate-aci   # Check status"
echo "  sudo systemctl restart flygate-aci  # Restart"
echo "  sudo systemctl stop flygate-aci     # Stop"
echo "  sudo journalctl -u flygate-aci -f   # View logs"
echo ""
