# FlyGate ACI - Raspberry Pi Setup

Deploy FlyGate ACI on a Raspberry Pi for cockpit-embedded tablet control.

## Requirements

- Raspberry Pi 4 or newer (2GB+ RAM recommended)
- Raspberry Pi OS (64-bit recommended)
- Network connection (Wi-Fi or Ethernet)
- Node.js 20.x (installed automatically)

## Quick Install

### Option 1: Install from Deployment Package

The deployment package contains the pre-built frontend/backend but **installs dependencies directly on your Pi** to ensure ARM compatibility.

1. Download the deployment package to your Pi
2. Extract and install:

```bash
tar -xzf flygate-aci-YYYYMMDD.tar.gz
cd flygate-aci-YYYYMMDD
sudo ./install-pi.sh
```

> **Note:** The installer runs `npm install` on the Pi to ensure native modules are compiled for ARM architecture.

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

- `http://<pi-ip-address>:8080`
- `http://raspberrypi.local:8080` (if mDNS is enabled)

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
PORT=8080              # Server port
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

If using `ufw`, allow port 8080:
```bash
sudo ufw allow 8080/tcp
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
sudo lsof -i :8080
sudo kill <PID>
sudo systemctl start flygate-aci
```

### Node.js version issues
```bash
node --version  # Should be 20.x
npm --version
```

## USB Detection Setup

Enable automatic iPad detection via USB:

```bash
sudo ./scripts/setup-usb-detection.sh
```

This installs udev rules that trigger when an iPad is connected/disconnected.

### How It Works

1. **iPad connects via USB** → udev triggers `usb-monitor.sh`
2. **ACI issues nonce** → `POST /api/aci/usb/attached/:deviceId`
3. **FlyGate agent receives nonce** → Signs it with private key
4. **Agent posts handshake** → `POST /api/aci/handshake`
5. **ACI verifies signature** → Transitions to FLIGHT_MODE

### View USB Events

```bash
tail -f /var/log/flygate-usb.log
```

## API Endpoints

### Status & Capabilities
- `GET /api/aci/status` - Get current state
- `GET /api/aci/capabilities` - Get available apps for current duty state
- `GET /api/aci/devices` - List trusted devices

### Handshake Protocol (Production)
- `GET /api/aci/nonce?device_id=...` - Get nonce for handshake
- `POST /api/aci/handshake` - Verify signed payload, transition to FLIGHT_MODE

### USB Events (Called by udev)
- `POST /api/aci/usb/attached/:deviceId` - iPad connected via USB
- `POST /api/aci/usb/detached` - iPad disconnected

### Simulation (Testing)
- `POST /api/aci/simulate/attach/:deviceId` - Simulate dock
- `POST /api/aci/simulate/detach` - Simulate undock

### Device Management
- `POST /api/aci/devices/register` - Register new trusted device with public key

## FlyGate Agent Integration

The FlyGate iPad agent should:

1. Listen for USB connection to ACI console
2. Request nonce: `GET /api/aci/nonce?device_id=FlyGateAgent-iPad-0001`
3. Create canonical payload JSON (keys sorted alphabetically, no whitespace):
   ```
   {"device_id":"FlyGateAgent-iPad-0001","nonce":"<received_nonce>","ts":<unix_timestamp>}
   ```
4. Sign the canonical JSON with RSA-SHA256 private key
5. Encode signature as base64url (URL-safe base64, no padding)
6. Post handshake: `POST /api/aci/handshake`
   ```json
   {
     "payload": { "device_id": "...", "nonce": "...", "ts": ... },
     "signature_b64": "<base64url_signature>"
   }
   ```

### Security Notes

- **Nonce TTL**: Nonces expire after 30 seconds
- **Device binding**: Nonce is bound to the device_id that requested it
- **Signature required**: All trusted devices must have a registered public key
- **Canonical JSON**: Payload must be serialized with sorted keys, no whitespace

### Testing Without Signatures

For development/testing, set environment variable:
```bash
SKIP_SIGNATURE_VERIFY=true
```

**Warning**: Never use this in production - it bypasses authentication!

On successful handshake, ACI transitions to FLIGHT_MODE and unlocks flight apps.
