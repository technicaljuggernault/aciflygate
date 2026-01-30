export type DutyState = "OFF_DUTY" | "ON_DUTY" | "FLIGHT_MODE";

export type ACIStatus = {
  dutyState: DutyState;
  trustedDeviceAttached: boolean;
  trustedDeviceId: string | null;
  trustedDeviceName: string | null;
  lastTransitionEpoch: number;
  activeApps: string[];
  lastHandshakeOk: boolean;
  lastError: string | null;
};

export type AppCapability = {
  appId: string;
  displayName: string;
  icon: string;
  intentIds: string[];
};

export type CapabilitiesResponse = {
  dutyState: DutyState;
  apps: AppCapability[];
};

export type TrustedDevice = {
  deviceId: string;
  deviceName: string;
};

export async function fetchStatus(): Promise<ACIStatus> {
  const res = await fetch("/api/aci/status");
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

export async function fetchCapabilities(): Promise<CapabilitiesResponse> {
  const res = await fetch("/api/aci/capabilities");
  if (!res.ok) throw new Error("Failed to fetch capabilities");
  return res.json();
}

export async function fetchDevices(): Promise<{ devices: TrustedDevice[] }> {
  const res = await fetch("/api/aci/devices");
  if (!res.ok) throw new Error("Failed to fetch devices");
  return res.json();
}

export async function simulateAttach(deviceId: string): Promise<{ status: string; message: string; state: ACIStatus }> {
  const res = await fetch(`/api/aci/simulate/attach/${encodeURIComponent(deviceId)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to attach device");
  return res.json();
}

export async function simulateDetach(): Promise<{ status: string; message: string; state: ACIStatus }> {
  const res = await fetch("/api/aci/simulate/detach", {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to detach device");
  return res.json();
}
