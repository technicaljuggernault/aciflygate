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

### Environment Variables

Create a systemd override file to configure the ACI:

```bash
sudo mkdir -p /etc/systemd/system/flygate-aci.service.d
sudo nano /etc/systemd/system/flygate-aci.service.d/override.conf
```

Add the following:

```ini
[Service]
Environment="FLYGATE_BASE_URL=http://10.0.0.2:5000"
Environment="FLYGATE_ACI_SHARED_SECRET=your-shared-secret-here"
Environment="ACI_ID=aci-pi4-001"
Environment="POLL_INTERVAL_MS=2000"
Environment="DUTY_TTL_MAX_SECONDS=60"
```

| Variable | Description | Default |
|----------|-------------|---------|
| `FLYGATE_BASE_URL` | URL of the FlyGate Duty service (iPad) | `http://flygate.local:5000` |
| `FLYGATE_ACI_SHARED_SECRET` | HMAC shared secret for signature validation | (required) |
| `ACI_ID` | Unique identifier for this ACI instance | `aci-pi4-001` |
| `POLL_INTERVAL_MS` | How often to poll FlyGate in milliseconds | `2000` |
| `DUTY_TTL_MAX_SECONDS` | Maximum age of duty assertions | `60` |

Apply changes:
```bash
sudo systemctl daemon-reload
sudo systemctl restart flygate-aci
```

## Network Configuration (iPad USB-Ethernet Connection)

For direct iPad-to-Pi connection via USB-C Ethernet adapter:

### Step 1: Configure Pi Static IP

Create netplan config:
```bash
sudo nano /etc/netplan/99-ethernet-static.yaml
```

Add:
```yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 10.0.0.1/24
      dhcp4: false
```

Apply and fix permissions:
```bash
sudo chmod 600 /etc/netplan/99-ethernet-static.yaml
sudo netplan apply
```

### Step 2: Configure iPad Static IP

1. Connect USB-C Ethernet adapter to iPad
2. Go to Settings → Ethernet
3. Tap the Ethernet network → Configure IP → Manual
4. Set:
   - IP Address: `10.0.0.2`
   - Subnet Mask: `255.255.255.0`
   - Router: (leave blank)

### Step 3: Verify Connection

From Pi terminal:
```bash
ping 10.0.0.2
```

### Alternative: Traditional Network Static IP

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

## API Endpoints

### Gatekeeper State
- `GET /api/state` - Get current gatekeeper lock state
- `GET /api/gatekeeper/config` - Get gatekeeper configuration
- `POST /api/gatekeeper/unlock` - Manual unlock (development only)
- `POST /api/gatekeeper/lock` - Manual lock
- `WS /ws` - WebSocket for real-time lock state updates

### Status & Capabilities
- `GET /api/aci/health` - Health check endpoint
- `GET /api/aci/status` - Get current ACI state
- `GET /api/aci/capabilities` - Get available apps for current duty state
- `GET /api/aci/devices` - List trusted devices

### Device Management
- `POST /api/aci/devices/register` - Register new trusted device with public key

## FlyGate Duty Service Integration

The ACI uses a Gatekeeper that polls the FlyGate Duty service for duty assertions. The FlyGate Duty service (running on iPad or elsewhere) must implement:

### Required Endpoint

```
GET /api/duty?nonce=<nonce>&aci_id=<aci_id>
```

Response (DutyAssertion):
```json
{
  "aci_id": "aci-pi4-001",
  "nonce": "<echoed_nonce>",
  "issued_at": "2026-02-01T00:00:00.000Z",
  "ttl_seconds": 30,
  "device_id": "ios-device-hash",
  "user": { "id": "crew123", "role": "pilot" },
  "duty_state": "ON_DUTY",
  "signature": "<base64_hmac_signature>"
}
```

### HMAC Signature

Both ACI and FlyGate must use the same shared secret (`FLYGATE_ACI_SHARED_SECRET`).

**Canonical string** (pipe-delimited, exact order):
```
aci_id|nonce|issued_at|ttl_seconds|device_id|user.id|user.role|duty_state
```

**Signature**: `base64(HMAC-SHA256(shared_secret, canonical_string))`

### Lock/Unlock Rules

**ACI is LOCKED if:**
- Cannot reach FlyGate
- Signature invalid
- TTL expired
- `duty_state` is not `ON_DUTY`

**ACI is UNLOCKED if:**
- Valid duty assertion received
- Signature matches
- Within TTL
- `duty_state` is `ON_DUTY`

### Generate Shared Secret

```bash
openssl rand -base64 32
```

Use the same secret on both the Pi (`FLYGATE_ACI_SHARED_SECRET` env var) and the FlyGate Duty service.
