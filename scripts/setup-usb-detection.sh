#!/bin/bash
# FlyGate ACI - USB Detection Setup
# Run this after install-pi.sh to enable automatic iPad detection

set -e

INSTALL_DIR="${INSTALL_DIR:-/opt/flygate-aci}"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "========================================="
echo "  FlyGate ACI - USB Detection Setup"
echo "========================================="
echo ""

echo "[1/4] Installing USB monitor script..."
mkdir -p "$INSTALL_DIR/scripts"
cp scripts/usb-monitor.sh "$INSTALL_DIR/scripts/"
chmod +x "$INSTALL_DIR/scripts/usb-monitor.sh"

echo ""
echo "[2/4] Installing udev rules..."
cp scripts/99-flygate-ipad.rules /etc/udev/rules.d/

echo ""
echo "[3/4] Creating log file..."
touch /var/log/flygate-usb.log
chmod 666 /var/log/flygate-usb.log

echo ""
echo "[4/4] Reloading udev rules..."
udevadm control --reload-rules
udevadm trigger

echo ""
echo "========================================="
echo "  USB Detection Setup Complete!"
echo "========================================="
echo ""
echo "When you connect an iPad via USB, FlyGate ACI will:"
echo "  1. Detect the connection automatically"
echo "  2. Issue a nonce for the FlyGate agent"
echo "  3. Transition to FLIGHT_MODE after handshake"
echo ""
echo "View USB events: tail -f /var/log/flygate-usb.log"
echo ""
