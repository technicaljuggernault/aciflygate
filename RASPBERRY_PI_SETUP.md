# FlyGate ACI - Raspberry Pi Setup

Deploy FlyGate ACI on a Raspberry Pi for cockpit-embedded tablet control.

## Requirements

- Raspberry Pi 4 or newer (2GB+ RAM recommended)
- Raspberry Pi OS (64-bit recommended)
- Network connection (Wi-Fi or Ethernet)
- Node.js 20.x (installed automatically)

## Quick Install

### Option 1: Install from Pre-built Package

1. Download the deployment package to your Pi
2. Extract and install:

```bash
tar -xzf flygate-aci-YYYYMMDD.tar.gz
cd flygate-aci-YYYYMMDD
sudo ./install-pi.sh
```

### Option 2: Build from Source

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/flygate-aci.git
cd flygate-aci
```

2. Install Node.js (if not installed):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Install dependencies and build:
```bash
npm install
npm run build
```

4. Run the installer:
```bash
sudo ./scripts/install-pi.sh
```

## Access the Interface

After installation, FlyGate ACI runs at:

- `http://<pi-ip-address>:5000`
- `http://raspberrypi.local:5000` (if mDNS is enabled)

Connect your cockpit tablet browser to this address.

## Service Management

```bash
# Check status
sudo systemctl status flygate-aci

# Restart the service
sudo systemctl restart flygate-aci

# Stop the service
sudo systemctl stop flygate-aci

# View logs
sudo journalctl -u flygate-aci -f

# Disable auto-start
sudo systemctl disable flygate-aci
```

## Configuration

Edit `/opt/flygate-aci/.env` to configure:

```env
PORT=5000              # Server port
NODE_ENV=production    # Environment mode
```

Restart the service after changes:
```bash
sudo systemctl restart flygate-aci
```

## Network Configuration

### Static IP (Recommended for Cockpit Use)

Edit `/etc/dhcpcd.conf`:
```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1
```

### Firewall

If using `ufw`, allow port 5000:
```bash
sudo ufw allow 5000/tcp
```

## Auto-start on Boot

The installer automatically enables auto-start. The service starts after the network is available.

## Updating

1. Pull the latest code (or copy new deployment package)
2. Rebuild: `npm run build`
3. Restart: `sudo systemctl restart flygate-aci`

## Troubleshooting

### Service won't start
```bash
sudo journalctl -u flygate-aci -n 50 --no-pager
```

### Port already in use
```bash
sudo lsof -i :5000
sudo kill <PID>
sudo systemctl start flygate-aci
```

### Node.js version issues
```bash
node --version  # Should be 20.x
npm --version
```

## Hardware Integration

For USB iPad docking detection, the FlyGate Agent on the iPad communicates with this ACI console via the API endpoints:

- `POST /api/aci/simulate/attach/:deviceId` - Dock iPad
- `POST /api/aci/simulate/detach` - Undock iPad
- `GET /api/aci/status` - Get current state
- `GET /api/aci/capabilities` - Get available apps

In production, replace the simulate endpoints with real USB/network detection from the FlyGate iPad agent.
