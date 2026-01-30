#!/bin/bash
set -e

echo "========================================="
echo "  FlyGate ACI - Build for Raspberry Pi"
echo "========================================="
echo ""

echo "[1/4] Installing dependencies..."
npm install

echo ""
echo "[2/4] Building application..."
npm run build

echo ""
echo "[3/4] Creating deployment package..."
DIST_NAME="flygate-aci-$(date +%Y%m%d)"
mkdir -p "deploy/$DIST_NAME"

cp -r dist "deploy/$DIST_NAME/"
cp package.json "deploy/$DIST_NAME/"
cp .env.local "deploy/$DIST_NAME/.env" 2>/dev/null || echo "PORT=5000" > "deploy/$DIST_NAME/.env"
cp scripts/install-pi.sh "deploy/$DIST_NAME/"
cp scripts/flygate-aci.service "deploy/$DIST_NAME/"

echo ""
echo "[4/4] Installing production dependencies..."
cd "deploy/$DIST_NAME"
npm install --omit=dev
cd ../..

echo ""
echo "[5/5] Creating tarball..."
cd deploy
tar -czf "$DIST_NAME.tar.gz" "$DIST_NAME"
cd ..

echo ""
echo "========================================="
echo "  Build Complete!"
echo "========================================="
echo ""
echo "Deployment package created:"
echo "  deploy/$DIST_NAME.tar.gz"
echo ""
echo "To deploy on Raspberry Pi:"
echo "  1. Copy the tarball to your Pi"
echo "  2. Extract: tar -xzf $DIST_NAME.tar.gz"
echo "  3. Run: cd $DIST_NAME && sudo ./install-pi.sh"
echo ""
