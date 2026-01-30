import crypto from "crypto";
import fs from "fs";
import path from "path";

export type DutyState = "OFF_DUTY" | "ON_DUTY" | "FLIGHT_MODE";

export type AppCapability = {
  appId: string;
  displayName: string;
  icon: string;
  intentIds: string[];
};

export type ACIStateData = {
  dutyState: DutyState;
  trustedDeviceAttached: boolean;
  trustedDeviceId: string | null;
  trustedDeviceName: string | null;
  lastTransitionEpoch: number;
  activeApps: string[];
  lastHandshakeOk: boolean;
  lastError: string | null;
};

export type TrustedDevice = {
  deviceId: string;
  deviceName: string;
  publicKeyPem?: string;
};

const NONCE_TTL_SECONDS = 30;

const trustedDevices: TrustedDevice[] = [
  {
    deviceId: "FlyGateAgent-iPad-0001",
    deviceName: "Pilot iPad (FlyGate)",
  },
  {
    deviceId: "FlyGateAgent-iPad-0002",
    deviceName: "Co-Pilot iPad (FlyGate)",
  },
];

const onDutyApps: AppCapability[] = [
  { appId: "com.ops.general", displayName: "Ops", icon: "FileText", intentIds: ["open_doc"] },
  { appId: "com.docs.viewer", displayName: "Docs", icon: "Shield", intentIds: ["open_doc"] },
  { appId: "com.comms.general", displayName: "Comms", icon: "Radio", intentIds: ["call"] },
  { appId: "com.maint.viewer", displayName: "Maintenance", icon: "Wrench", intentIds: ["view_status"] },
  { appId: "com.weather.ground", displayName: "Weather", icon: "Cloud", intentIds: ["view_weather"] },
];

const flightModeApps: AppCapability[] = [
  { appId: "com.flight.ops", displayName: "Flight Ops", icon: "FileText", intentIds: ["open_checklist", "show_status"] },
  { appId: "com.flight.nav", displayName: "Navigation", icon: "Map", intentIds: ["route_summary", "wx_overlay"] },
  { appId: "com.flight.checklists", displayName: "Checklists", icon: "Shield", intentIds: ["open_checklist"] },
  { appId: "com.flight.performance", displayName: "Performance", icon: "ChartNoAxesCombined", intentIds: ["calc_perf"] },
  { appId: "com.flight.comms", displayName: "Comms", icon: "Radio", intentIds: ["freq_tune", "call"] },
  { appId: "com.flight.weather", displayName: "Weather", icon: "Cloud", intentIds: ["view_weather", "wx_radar"] },
  { appId: "com.flight.maps", displayName: "Flight Maps", icon: "Map", intentIds: ["show_map"] },
  { appId: "com.flight.security", displayName: "Security", icon: "Shield", intentIds: ["threat_assess"] },
];

class ACIState {
  private state: ACIStateData = {
    dutyState: "ON_DUTY",
    trustedDeviceAttached: false,
    trustedDeviceId: null,
    trustedDeviceName: null,
    lastTransitionEpoch: Date.now(),
    activeApps: onDutyApps.map((a) => a.appId),
    lastHandshakeOk: false,
    lastError: null,
  };

  private currentNonce: string | null = null;
  private nonceIssuedAt: number = 0;
  private pendingDeviceId: string | null = null;

  getStatus(): ACIStateData {
    return { ...this.state };
  }

  getCapabilities(): { dutyState: DutyState; apps: AppCapability[] } {
    if (this.state.dutyState === "FLIGHT_MODE") {
      return { dutyState: this.state.dutyState, apps: flightModeApps };
    }
    return { dutyState: this.state.dutyState, apps: onDutyApps };
  }

  issueNonce(deviceId?: string): { nonce: string; ttlSeconds: number } | { error: string } {
    if (deviceId) {
      const trusted = trustedDevices.find((d) => d.deviceId === deviceId);
      if (!trusted) {
        return { error: "Unknown device_id" };
      }
      this.pendingDeviceId = deviceId;
    }

    this.currentNonce = crypto.randomBytes(24).toString("base64url");
    this.nonceIssuedAt = Date.now();

    return { nonce: this.currentNonce, ttlSeconds: NONCE_TTL_SECONDS };
  }

  verifyHandshake(payload: {
    nonce: string;
    ts: number;
    device_id: string;
  }, signatureB64: string): { success: true; deviceId: string; deviceName: string } | { success: false; error: string } {
    if (!this.currentNonce) {
      this.state.lastError = "No nonce issued";
      return { success: false, error: "No nonce issued. Call /nonce first." };
    }

    if (payload.nonce !== this.currentNonce) {
      this.state.lastError = "Invalid nonce";
      return { success: false, error: "Invalid nonce" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - payload.ts) > NONCE_TTL_SECONDS) {
      this.state.lastError = "Stale timestamp";
      return { success: false, error: "Stale timestamp" };
    }

    const trusted = trustedDevices.find((d) => d.deviceId === payload.device_id);
    if (!trusted) {
      this.state.lastError = "Untrusted device_id";
      return { success: false, error: "Untrusted device_id" };
    }

    if (trusted.publicKeyPem) {
      try {
        const payloadJson = JSON.stringify(payload, Object.keys(payload).sort(), 0)
          .replace(/\s/g, "");
        const signature = Buffer.from(signatureB64, "base64url");
        const verify = crypto.createVerify("RSA-SHA256");
        verify.update(payloadJson);
        const isValid = verify.verify(trusted.publicKeyPem, signature);
        
        if (!isValid) {
          this.state.lastError = "Bad signature";
          return { success: false, error: "Signature verification failed" };
        }
      } catch (e) {
        this.state.lastError = "Signature error";
        return { success: false, error: "Signature verification error" };
      }
    }

    this.currentNonce = null;
    this.state.trustedDeviceAttached = true;
    this.state.trustedDeviceId = trusted.deviceId;
    this.state.trustedDeviceName = trusted.deviceName;
    this.state.dutyState = "FLIGHT_MODE";
    this.state.activeApps = flightModeApps.map((a) => a.appId);
    this.state.lastTransitionEpoch = Date.now();
    this.state.lastHandshakeOk = true;
    this.state.lastError = null;

    return { success: true, deviceId: trusted.deviceId, deviceName: trusted.deviceName };
  }

  onUsbAttached(deviceId: string): { success: boolean; message: string } {
    const trusted = trustedDevices.find((d) => d.deviceId === deviceId);
    if (!trusted) {
      return { success: false, message: "Unknown device_id" };
    }

    this.pendingDeviceId = deviceId;
    this.issueNonce(deviceId);
    
    return {
      success: true,
      message: `USB device detected: ${trusted.deviceName}. Nonce issued, awaiting handshake.`,
    };
  }

  onUsbDetached(): { success: boolean; message: string } {
    this.state.trustedDeviceAttached = false;
    this.state.trustedDeviceId = null;
    this.state.trustedDeviceName = null;
    this.state.dutyState = "ON_DUTY";
    this.state.activeApps = onDutyApps.map((a) => a.appId);
    this.state.lastTransitionEpoch = Date.now();
    this.state.lastHandshakeOk = false;
    this.state.lastError = null;
    this.currentNonce = null;
    this.pendingDeviceId = null;

    return { success: true, message: "Device detached. Back to ON_DUTY." };
  }

  simulateAttach(deviceId: string): { success: boolean; message: string } {
    const trusted = trustedDevices.find((d) => d.deviceId === deviceId);
    if (!trusted) {
      return { success: false, message: "Unknown device_id" };
    }

    this.state.trustedDeviceAttached = true;
    this.state.trustedDeviceId = trusted.deviceId;
    this.state.trustedDeviceName = trusted.deviceName;
    this.state.dutyState = "FLIGHT_MODE";
    this.state.activeApps = flightModeApps.map((a) => a.appId);
    this.state.lastTransitionEpoch = Date.now();
    this.state.lastHandshakeOk = true;
    this.state.lastError = null;

    return {
      success: true,
      message: `Trusted device ${trusted.deviceName} attached. Flight Mode enabled.`,
    };
  }

  simulateDetach(): { success: boolean; message: string } {
    return this.onUsbDetached();
  }

  getTrustedDevices() {
    return trustedDevices.map(d => ({ deviceId: d.deviceId, deviceName: d.deviceName }));
  }

  registerTrustedDevice(deviceId: string, deviceName: string, publicKeyPem?: string): boolean {
    const existing = trustedDevices.find(d => d.deviceId === deviceId);
    if (existing) {
      existing.deviceName = deviceName;
      if (publicKeyPem) existing.publicKeyPem = publicKeyPem;
      return true;
    }
    trustedDevices.push({ deviceId, deviceName, publicKeyPem });
    return true;
  }
}

export const aciState = new ACIState();
