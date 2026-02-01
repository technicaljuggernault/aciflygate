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
  Loader2,
  Lock,
  Unlock,
  WifiOff,
  Wifi,
} from "lucide-react";
import {
  fetchStatus,
  fetchCapabilities,
  simulateAttach,
  simulateDetach,
  type ACIStatus,
  type AppCapability,
} from "@/lib/aci-api";
import { useGatekeeperState } from "@/lib/gatekeeper-ws";

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-7 w-7" strokeWidth={1.5} />,
  Shield: <Shield className="h-7 w-7" strokeWidth={1.5} />,
  Radio: <Radio className="h-7 w-7" strokeWidth={1.5} />,
  Wrench: <Wrench className="h-7 w-7" strokeWidth={1.5} />,
  Cloud: <Cloud className="h-7 w-7" strokeWidth={1.5} />,
  Map: <Map className="h-7 w-7" strokeWidth={1.5} />,
  ChartNoAxesCombined: <ChartNoAxesCombined className="h-7 w-7" strokeWidth={1.5} />,
};

type ACIContextValue = {
  status: ACIStatus | null;
  apps: AppCapability[];
  loading: boolean;
  error: string | null;
  dockDevice: (deviceId: string) => Promise<void>;
  undockDevice: () => Promise<void>;
  refresh: () => Promise<void>;
};

const ACIContext = React.createContext<ACIContextValue | null>(null);

function useACI() {
  const ctx = React.useContext(ACIContext);
  if (!ctx) throw new Error("useACI must be used within ACIProvider");
  return ctx;
}

function ACIProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<ACIStatus | null>(null);
  const [apps, setApps] = React.useState<AppCapability[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const [statusData, capsData] = await Promise.all([
        fetchStatus(),
        fetchCapabilities(),
      ]);
      setStatus(statusData);
      setApps(capsData.apps);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    }
  }, []);

  React.useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const dockDevice = React.useCallback(async (deviceId: string) => {
    setLoading(true);
    try {
      await simulateAttach(deviceId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to dock");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const undockDevice = React.useCallback(async () => {
    setLoading(true);
    try {
      await simulateDetach();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to undock");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const value = React.useMemo<ACIContextValue>(
    () => ({ status, apps, loading, error, dockDevice, undockDevice, refresh }),
    [status, apps, loading, error, dockDevice, undockDevice, refresh],
  );

  return <ACIContext.Provider value={value}>{children}</ACIContext.Provider>;
}

type Screen = "launcher" | "settings" | "inflight";

function AppTileButton({
  app,
  active,
  onClick,
}: {
  app: AppCapability;
  active?: boolean;
  onClick: () => void;
}) {
  const icon = iconMap[app.icon] || <FileText className="h-7 w-7" strokeWidth={1.5} />;

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
      data-testid={`tile-${app.appId}`}
    >
      <div className="text-white/85">{icon}</div>
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
  const { status, apps, loading, dockDevice, undockDevice } = useACI();
  const isFlightMode = status?.dutyState === "FLIGHT_MODE";

  const handleDockToggle = async () => {
    if (isFlightMode) {
      await undockDevice();
    } else {
      await dockDevice("FlyGateAgent-iPad-0001");
    }
  };

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
            onClick={handleDockToggle}
            disabled={loading}
            className={
              "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors " +
              (isFlightMode
                ? "border-[rgba(56,189,248,0.30)] bg-[rgba(56,189,248,0.12)] text-white hover:bg-[rgba(56,189,248,0.18)]"
                : "border-white/15 bg-white/8 text-white/70 hover:bg-white/12")
            }
            data-testid="button-dock-toggle"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
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
        {loading && apps.length === 0 ? (
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {apps.map((app) => (
              <AppTileButton key={app.appId} app={app} onClick={() => {}} />
            ))}
            <SettingsTileButton onClick={onOpenSettings} />
          </div>
        )}
      </div>

      {status?.trustedDeviceAttached && (
        <div className="px-6 pb-4">
          <div className="rounded-xl border border-[rgba(56,189,248,0.20)] bg-[rgba(56,189,248,0.08)] px-4 py-2 text-center text-xs text-white/70">
            Connected: {status.trustedDeviceName} ({status.trustedDeviceId})
          </div>
        </div>
      )}
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
  const { status, apps, undockDevice, loading } = useACI();
  const [activeApp, setActiveApp] = React.useState<string | null>(null);

  const sideApps = apps.filter((a) => a.appId !== "com.flight.maps").slice(0, 2);

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
            onClick={undockDevice}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/12"
            data-testid="button-exit-inflight"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            Exit Inflight
          </button>
          <div
            className="rounded-full border border-[rgba(56,189,248,0.25)] bg-[rgba(56,189,248,0.10)] px-3 py-1 text-xs text-white/90"
            data-testid="status-inflight"
          >
            {status?.trustedDeviceName || "iPad Connected"}
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-4 px-6 pb-6">
        <div className="flex w-[140px] flex-col gap-3">
          {sideApps.map((app) => (
            <AppTileButton
              key={app.appId}
              app={app}
              active={activeApp === app.appId}
              onClick={() => setActiveApp(app.appId)}
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

function LockScreen() {
  const { state, connected, manualUnlock } = useGatekeeperState();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center overflow-hidden flygate-surface">
      <div className="flex flex-col items-center gap-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/20 bg-white/5">
          <Lock className="h-12 w-12 text-white/60" strokeWidth={1.5} />
        </div>

        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-wide text-white"
            style={{ fontFamily: "Oxanium, var(--font-sans)" }}
            data-testid="text-lock-title"
          >
            CONNECT FLYGATE + SET ON DUTY
          </h1>
          <p className="mt-2 text-sm text-white/50" data-testid="text-lock-subtitle">
            Waiting for FlyGate duty assertion...
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {state?.flygate.reachable ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            <span className="text-xs text-white/60">
              FlyGate: {state?.flygate.reachable ? "Reachable" : "Unreachable"}
            </span>
          </div>

          {state?.last_error && (
            <div className="max-w-md rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-xs text-red-300" data-testid="text-lock-error">
              {state.last_error}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
            WebSocket: {connected ? "Connected" : "Disconnected"}
          </div>
        </div>

        <button
          type="button"
          onClick={manualUnlock}
          className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/15"
          data-testid="button-manual-unlock"
        >
          <Unlock className="h-4 w-4" />
          Manual Unlock (Dev)
        </button>
      </div>

      <div className="absolute bottom-6 text-center text-xs text-white/30">
        ACI ID: {state?.aci_id || "Loading..."}
      </div>
    </div>
  );
}

function FlyGateACIApp() {
  const { status } = useACI();
  const { isLocked, state } = useGatekeeperState();
  const [screen, setScreen] = React.useState<Screen>("launcher");

  React.useEffect(() => {
    if (status?.dutyState === "FLIGHT_MODE") {
      setScreen("inflight");
    } else if (screen === "inflight") {
      setScreen("launcher");
    }
  }, [status?.dutyState, screen]);

  if (isLocked && state !== null) {
    return <LockScreen />;
  }

  if (screen === "settings") {
    return <SettingsScreen onBack={() => setScreen("launcher")} />;
  }

  if (screen === "inflight" || status?.dutyState === "FLIGHT_MODE") {
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
