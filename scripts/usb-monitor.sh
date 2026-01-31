#!/bin/bash
# FlyGate ACI - USB Monitor Script
# Triggered by udev when iPad is connected/disconnected

ACI_URL="${ACI_URL:-http://localhost:8080}"
LOG_FILE="/var/log/flygate-usb.log"
DEVICE_ID="${1:-FlyGateAgent-iPad-0001}"
ACTION="${2:-attach}"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

case "$ACTION" in
    attach|add)
        log "iPad attached - Device ID: $DEVICE_ID"
        response=$(curl -s -X POST "$ACI_URL/api/aci/usb/attached/$DEVICE_ID" 2>&1)
        log "ACI Response: $response"
        ;;
    detach|remove)
        log "iPad detached"
        response=$(curl -s -X POST "$ACI_URL/api/aci/usb/detached" 2>&1)
        log "ACI Response: $response"
        ;;
    *)
        log "Unknown action: $ACTION"
        ;;
esac
