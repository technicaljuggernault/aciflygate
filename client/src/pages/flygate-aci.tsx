import * as React from "react";
import {
  ChartNoAxesCombined,
  Cloud,
  FileText,
  Map,
  Plane,
  Radio,
  Settings,
  Shield,
  Wrench,
  ChevronLeft,
} from "lucide-react";

type DutyState = "OFF_DUTY" | "ON_DUTY" | "FLIGHT_MODE";

type ACIState = {
  dutyState: DutyState;
  trustedDeviceAttached: boolean;
  trustedDeviceId: string | null;
  trustedDeviceName: string | null;
};

type ACIContextValue = {
  state: ACIState;
  simulateDock: () => void;
  simulateUndock: () => void;
};

const ACIContext = React.createContext<ACIContextValue | null>(null);

function useACI() {
  const ctx = React.useContext(ACIContext);
  if (!ctx) throw new Error("useACI must be used within ACIProvider");
  return ctx;
}

const STORAGE_KEY = "flygate.aci.state.v1";

function loadState(): ACIState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.dutyState) return parsed;
    }
  } catch {}
  return {
    dutyState: "ON_DUTY",
    trustedDeviceAttached: false,
    trustedDeviceId: null,
    trustedDeviceName: null,
  };
}

function saveState(state: ACIState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function ACIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ACIState>(loadState);

  React.useEffect(() => {
    saveState(state);
  }, [state]);

  const simulateDock = React.useCallback(() => {
    setState({
      dutyState: "FLIGHT_MODE",
      trustedDeviceAttached: true,
      trustedDeviceId: "FlyGateAgent-iPad-0001",
      trustedDeviceName: "Pilot iPad (FlyGate)",
    });
  }, []);

  const simulateUndock = React.useCallback(() => {
    setState({
      dutyState: "ON_DUTY",
      trustedDeviceAttached: false,
      trustedDeviceId: null,
      trustedDeviceName: null,
    });
  }, []);

  const value = React.useMemo<ACIContextValue>(
    () => ({ state, simulateDock, simulateUndock }),
    [state, simulateDock, simulateUndock],
  );

  return <ACIContext.Provider value={value}>{children}</ACIContext.Provider>;
}

type AppTile = {
  id: string;
  icon: React.ReactNode;
  label: string;
};

const onDutyApps: AppTile[] = [
  { id: "ops", icon: <FileText className="h-7 w-7" strokeWidth={1.5} />, label: "Ops" },
  { id: "docs", icon: <Shield className="h-7 w-7" strokeWidth={1.5} />, label: "Docs" },
  { id: "comms", icon: <Radio className="h-7 w-7" strokeWidth={1.5} />, label: "Comms" },
  { id: "maintenance", icon: <Wrench className="h-7 w-7" strokeWidth={1.5} />, label: "Maint" },
  { id: "weather", icon: <Cloud className="h-7 w-7" strokeWidth={1.5} />, label: "Weather" },
];

const flightModeApps: AppTile[] = [
  { id: "flight-ops", icon: <FileText className="h-7 w-7" strokeWidth={1.5} />, label: "Flight Ops" },
  { id: "nav", icon: <Map className="h-7 w-7" strokeWidth={1.5} />, label: "Navigation" },
  { id: "checklists", icon: <Shield className="h-7 w-7" strokeWidth={1.5} />, label: "Checklists" },
  { id: "performance", icon: <ChartNoAxesCombined className="h-7 w-7" strokeWidth={1.5} />, label: "Perf" },
  { id: "comms", icon: <Radio className="h-7 w-7" strokeWidth={1.5} />, label: "Comms" },
  { id: "weather", icon: <Cloud className="h-7 w-7" strokeWidth={1.5} />, label: "Weather" },
];

type Screen = "launcher" | "settings" | "inflight";

function AppTileButton({
  tile,
  active,
  onClick,
}: {
  tile: AppTile;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group relative flex h-[72px] w-[110px] flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-200 " +
        (active
          ? "border-[rgba(56,189,248,0.45)] bg-[rgba(56,189,248,0.15)]"
          : "border-white/12 bg-white/5 hover:border-white/20 hover:bg-white/8")
      }
      data-testid={`tile-${tile.id}`}
    >
      <div className="text-white/85">{tile.icon}</div>
    </button>
  );
}

function SettingsTileButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-[72px] w-[110px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 transition-all duration-200 hover:border-white/20 hover:bg-white/8"
      data-testid="tile-settings"
    >
      <Settings className="h-7 w-7 text-white/85" strokeWidth={1.5} />
    </button>
  );
}

function LauncherScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { state, simulateDock, simulateUndock } = useACI();
  const isFlightMode = state.dutyState === "FLIGHT_MODE";
  const apps = isFlightMode ? flightModeApps : onDutyApps;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden flygate-surface">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Plane className="h-6 w-6 text-[hsl(var(--primary))]" strokeWidth={1.8} />
          <div
            className="text-lg font-semibold tracking-wide text-white"
            style={{ fontFamily: "Oxanium, var(--font-sans)" }}
            data-testid="text-title"
          >
            FlyGate ACI
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isFlightMode ? simulateUndock : simulateDock}
            className={
              "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors " +
              (isFlightMode
                ? "border-[rgba(56,189,248,0.30)] bg-[rgba(56,189,248,0.12)] text-white hover:bg-[rgba(56,189,248,0.18)]"
                : "border-white/15 bg-white/8 text-white/70 hover:bg-white/12")
            }
            data-testid="button-dock-toggle"
          >
            {isFlightMode ? "Undock iPad" : "Dock iPad"}
          </button>
          <div
            className={
              "rounded-full border px-3 py-1 text-xs " +
              (isFlightMode
                ? "border-[rgba(56,189,248,0.25)] bg-[rgba(56,189,248,0.10)] text-white/90"
                : "border-white/12 bg-white/5 text-white/60")
            }
            data-testid="status-mode"
          >
            {isFlightMode ? "Flight Mode" : "Ground Mode"}
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-6">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {apps.map((tile) => (
            <AppTileButton key={tile.id} tile={tile} onClick={() => {}} />
          ))}
          <SettingsTileButton onClick={onOpenSettings} />
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden flygate-surface">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-[hsl(var(--primary))]" strokeWidth={1.8} />
          <div
            className="text-lg font-semibold tracking-wide text-white"
            style={{ fontFamily: "Oxanium, var(--font-sans)" }}
            data-testid="text-settings-title"
          >
            Settings
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/12"
          data-testid="button-back"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-6">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            className="flex h-[72px] w-[140px] items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:bg-white/8"
            data-testid="button-network-config"
          >
            Network Config
          </button>
          <button
            type="button"
            className="flex h-[72px] w-[140px] items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:bg-white/8"
            data-testid="button-date-time"
          >
            Date / Time
          </button>
          <button
            type="button"
            className="flex h-[72px] w-[140px] items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:bg-white/8"
            data-testid="button-logs"
          >
            Logs
          </button>
        </div>
      </div>
    </div>
  );
}

function InflightScreen() {
  const { state, simulateUndock } = useACI();
  const [activeApp, setActiveApp] = React.useState<string>("flight-ops");

  const apps = flightModeApps.slice(0, 2);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden flygate-surface">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Plane className="h-6 w-6 text-[hsl(var(--primary))]" strokeWidth={1.8} />
          <div
            className="text-lg font-semibold tracking-wide text-white"
            style={{ fontFamily: "Oxanium, var(--font-sans)" }}
            data-testid="text-inflight-title"
          >
            Inflight Mode
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={simulateUndock}
            className="rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/12"
            data-testid="button-exit-inflight"
          >
            Exit Inflight
          </button>
          <div
            className="rounded-full border border-[rgba(56,189,248,0.25)] bg-[rgba(56,189,248,0.10)] px-3 py-1 text-xs text-white/90"
            data-testid="status-inflight"
          >
            {state.trustedDeviceName || "iPad Connected"}
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-4 px-6 pb-6">
        <div className="flex w-[140px] flex-col gap-3">
          {apps.map((tile) => (
            <AppTileButton
              key={tile.id}
              tile={tile}
              active={activeApp === tile.id}
              onClick={() => setActiveApp(tile.id)}
            />
          ))}
        </div>

        <div className="flex-1 overflow-hidden rounded-2xl border border-white/12 bg-black/30">
          <iframe
            title="Flight Map"
            src="https://www.openstreetmap.org/export/embed.html"
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer"
            data-testid="iframe-flight-map"
          />
        </div>
      </div>

      <div className="flex gap-3 px-6 pb-6">
        <button
          type="button"
          className="flex-1 rounded-2xl border border-white/12 bg-white/5 py-3 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:bg-white/8"
          data-testid="button-flight-map"
        >
          Flight Map
        </button>
        <button
          type="button"
          className="flex-1 rounded-2xl border border-white/12 bg-white/5 py-3 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:bg-white/8"
          data-testid="button-weather-radar"
        >
          Weather Radar
        </button>
      </div>
    </div>
  );
}

function FlyGateACIApp() {
  const { state } = useACI();
  const [screen, setScreen] = React.useState<Screen>("launcher");

  React.useEffect(() => {
    if (state.dutyState === "FLIGHT_MODE") {
      setScreen("inflight");
    } else if (screen === "inflight") {
      setScreen("launcher");
    }
  }, [state.dutyState, screen]);

  if (screen === "settings") {
    return <SettingsScreen onBack={() => setScreen("launcher")} />;
  }

  if (screen === "inflight" || state.dutyState === "FLIGHT_MODE") {
    return <InflightScreen />;
  }

  return <LauncherScreen onOpenSettings={() => setScreen("settings")} />;
}

export default function FlyGateACI() {
  return (
    <ACIProvider>
      <FlyGateACIApp />
    </ACIProvider>
  );
}
