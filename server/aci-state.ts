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

const trustedDevices = [
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

  getStatus(): ACIStateData {
    return { ...this.state };
  }

  getCapabilities(): { dutyState: DutyState; apps: AppCapability[] } {
    if (this.state.dutyState === "FLIGHT_MODE") {
      return { dutyState: this.state.dutyState, apps: flightModeApps };
    }
    return { dutyState: this.state.dutyState, apps: onDutyApps };
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
    this.state.trustedDeviceAttached = false;
    this.state.trustedDeviceId = null;
    this.state.trustedDeviceName = null;
    this.state.dutyState = "ON_DUTY";
    this.state.activeApps = onDutyApps.map((a) => a.appId);
    this.state.lastTransitionEpoch = Date.now();
    this.state.lastHandshakeOk = false;
    this.state.lastError = null;

    return { success: true, message: "Device detached. Back to ON_DUTY." };
  }

  getTrustedDevices() {
    return trustedDevices;
  }
}

export const aciState = new ACIState();
