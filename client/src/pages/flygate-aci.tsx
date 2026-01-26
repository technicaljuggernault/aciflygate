import * as React from "react";
import {
  ChartNoAxesCombined,
  Compass,
  FileText,
  Fuel,
  Map,
  Radio,
  Shield,
  Wrench,
} from "lucide-react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type SessionState = "SIGNED_OUT" | "SIGNING_IN" | "AUTHENTICATED";

type Session = {
  state: SessionState;
  accessToken?: string;
  accountLabel?: string;
};

type IdentityContextValue = {
  session: Session;
  signIn: () => void;
  signOut: () => void;
  setDesiredModeAuthenticated: (desired: boolean) => void;
  desiredModeAuthenticated: boolean;
};

const IdentityContext = React.createContext<IdentityContextValue | null>(null);

function useIdentity() {
  const ctx = React.useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used within IdentityProvider");
  return ctx;
}

const STORAGE_KEY = "flygate.identity.session.v1";

function safeParseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (
      parsed &&
      (parsed.state === "SIGNED_OUT" ||
        parsed.state === "SIGNING_IN" ||
        parsed.state === "AUTHENTICATED")
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session>(() => {
    const restored = safeParseSession(
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null,
    );

    if (restored?.state === "AUTHENTICATED" && restored.accessToken) {
      return restored;
    }

    return { state: "SIGNED_OUT" };
  });

  const [desiredModeAuthenticated, setDesiredModeAuthenticated] =
    React.useState(() => session.state === "AUTHENTICATED");

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  }, [session]);

  React.useEffect(() => {
    setDesiredModeAuthenticated(session.state === "AUTHENTICATED");
  }, [session.state]);

  const signIn = React.useCallback(() => {
    setSession({ state: "SIGNING_IN" });

    window.setTimeout(() => {
      setSession({
        state: "AUTHENTICATED",
        accessToken: "mock_msft_access_token",
        accountLabel: "Microsoft Entra ID",
      });
    }, 650);
  }, []);

  const signOut = React.useCallback(() => {
    setSession({ state: "SIGNED_OUT" });
  }, []);

  const value = React.useMemo<IdentityContextValue>(
    () => ({
      session,
      signIn,
      signOut,
      desiredModeAuthenticated,
      setDesiredModeAuthenticated,
    }),
    [session, signIn, signOut, desiredModeAuthenticated],
  );

  return (
    <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
  );
}

function FlygateMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center rounded-2xl border border-white/10 bg-white/5"
      style={{ width: size, height: size }}
      data-testid="img-flygate-mark"
    >
      <div
        className="h-[55%] w-[55%] rounded-md bg-[hsl(var(--primary))]/16"
        data-testid="img-flygate-glyph"
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(56,189,248,0.10)",
        }}
        data-testid="border-flygate-mark"
      />
    </div>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const { session } = useIdentity();

  if (session.state === "SIGNING_IN") {
    return (
      <div className="min-h-screen w-full flygate-surface">
        <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col p-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FlygateMark size={40} />
              <div className="leading-tight">
                <div
                  className="text-sm font-semibold tracking-[0.10em] text-white/90"
                  style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                  data-testid="text-brand"
                >
                  Flygate
                </div>
                <div className="text-xs text-white/55" data-testid="text-subtitle">
                  Aviation Control Interface
                </div>
              </div>
            </div>
            <div
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
              data-testid="status-auth"
            >
              Signing in
            </div>
          </header>

          <div className="relative mt-6 flex flex-1 items-center justify-center">
            <div className="flygate-glass w-full max-w-xl rounded-[28px] p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div
                    className="text-lg font-semibold text-white"
                    style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                    data-testid="text-auth-title"
                  >
                    Verifying identity
                  </div>
                  <div
                    className="mt-1 text-sm text-white/60"
                    data-testid="text-auth-desc"
                  >
                    Connecting to your organization session
                  </div>
                </div>
                <div
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5"
                  data-testid="img-msft"
                >
                  <div
                    className="h-5 w-5 rounded bg-[hsl(var(--primary))]/18"
                    data-testid="img-msft-badge"
                  />
                </div>
              </div>

              <div className="mt-6">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full w-1/2 rounded-full bg-[hsl(var(--primary))] transition-all"
                    style={{
                      animation: "flygate-progress 1.0s ease-in-out infinite",
                    }}
                  />
                </div>
                <div className="mt-3 text-xs text-white/45" data-testid="text-auth-hint">
                  This is a prototype. Authentication is simulated.
                </div>
              </div>
            </div>

            <style>{
              "@keyframes flygate-progress{0%{transform:translateX(-20%)}50%{transform:translateX(60%)}100%{transform:translateX(-20%)}}"
            }</style>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

type TileId =
  | "flight-maps"
  | "flight-plan"
  | "weather"
  | "checklists"
  | "performance"
  | "comms"
  | "maintenance"
  | "security";

type Tile = {
  id: TileId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
};

const tiles: Tile[] = [
  {
    id: "flight-maps",
    title: "Flight Maps",
    subtitle: "Route + situational map",
    icon: <Map className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: "flight-plan",
    title: "Flight Plan",
    subtitle: "Dispatch, OFP, alternates",
    icon: <FileText className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: "weather",
    title: "Weather",
    subtitle: "METAR/TAF + radar",
    icon: <Compass className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: "checklists",
    title: "Checklists",
    subtitle: "Normal, abnormal, QRH",
    icon: <Shield className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: "performance",
    title: "Performance",
    subtitle: "W&B, takeoff, landing",
    icon: <ChartNoAxesCombined className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: "comms",
    title: "Comms",
    subtitle: "Radio, SELCAL, ATC",
    icon: <Radio className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: "maintenance",
    title: "Maintenance",
    subtitle: "Status, faults, logs",
    icon: <Wrench className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: "security",
    title: "Security",
    subtitle: "Cockpit mode controls",
    icon: <Fuel className="h-5 w-5" strokeWidth={1.8} />,
  },
];

function useSwipeToggle(onLeft: () => void, onRight: () => void) {
  const startX = React.useRef<number | null>(null);
  const startY = React.useRef<number | null>(null);

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
  }, []);

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (startX.current === null || startY.current === null) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      startX.current = null;
      startY.current = null;

      if (Math.abs(dx) < 24) return;
      if (Math.abs(dy) > 60) return;

      if (dx > 0) onRight();
      else onLeft();
    },
    [onLeft, onRight],
  );

  return { onPointerDown, onPointerUp };
}

function ModeSwipeToggle() {
  const {
    session,
    signIn,
    signOut,
    desiredModeAuthenticated,
    setDesiredModeAuthenticated,
  } = useIdentity();

  const authenticated = session.state === "AUTHENTICATED";

  const swipe = useSwipeToggle(
    () => {
      setDesiredModeAuthenticated(false);
      if (authenticated) signOut();
    },
    () => {
      setDesiredModeAuthenticated(true);
      if (!authenticated) signIn();
    },
  );

  const label = authenticated ? "Flight mode" : "Ground mode";

  return (
    <div
      className="flygate-mode-pill relative w-[290px] select-none rounded-full p-1"
      {...swipe}
      role="switch"
      aria-checked={authenticated}
      data-testid="switch-mode"
    >
      <div
        className="pointer-events-none absolute inset-1 rounded-full bg-white/5"
        data-testid="bg-mode-track"
      />
      <div
        className={
          "pointer-events-none absolute inset-1 w-[50%] rounded-full bg-white/10 transition-transform duration-300 ease-out " +
          (authenticated ? "translate-x-full" : "translate-x-0")
        }
        data-testid="bg-mode-thumb"
      />
      <div className="relative grid grid-cols-2 items-center text-xs">
        <div
          className={
            "px-3 py-2 text-center font-medium transition-colors " +
            (!authenticated ? "text-white" : "text-white/55")
          }
          style={{ fontFamily: "Oxanium, var(--font-sans)" }}
          data-testid="text-ground-mode"
        >
          Ground mode
        </div>
        <div
          className={
            "px-3 py-2 text-center font-medium transition-colors " +
            (authenticated ? "text-white" : "text-white/55")
          }
          style={{ fontFamily: "Oxanium, var(--font-sans)" }}
          data-testid="text-flight-mode"
        >
          Flight mode
        </div>
      </div>

      <div className="sr-only" data-testid="status-mode">
        {label}
      </div>
      <div
        className="mt-2 flex items-center justify-between px-3 text-[11px] text-white/45"
        data-testid="text-swipe-hint"
      >
        <span>Swipe left/right</span>
        <span>{session.state === "SIGNING_IN" ? "Signing in" : label}</span>
      </div>
    </div>
  );
}

function TileGrid({
  activeId,
  onSelect,
  enabled,
}: {
  activeId: TileId;
  onSelect: (id: TileId) => void;
  enabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3" data-testid="grid-flight-ops">
      {tiles.map((t) => {
        const active = t.id === activeId;
        const disabled = !enabled;
        return (
          <button
            key={t.id}
            type="button"
            className={
              "flygate-tile group relative flex h-[92px] w-full flex-col justify-between rounded-2xl p-4 text-left transition-transform duration-200 will-change-transform " +
              (disabled
                ? "cursor-not-allowed opacity-55"
                : "hover:-translate-y-0.5 active:translate-y-0")
            }
            onClick={() => {
              if (!disabled) onSelect(t.id);
            }}
            disabled={disabled}
            data-active={active ? "true" : "false"}
            data-testid={`tile-${t.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-white/85">
                <div
                  className={
                    "grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 transition-colors " +
                    (active
                      ? "border-[rgba(56,189,248,0.30)] bg-[rgba(56,189,248,0.10)]"
                      : "")
                  }
                  data-testid={`icon-${t.id}`}
                >
                  {t.icon}
                </div>
                <div className="leading-tight">
                  <div
                    className="text-[13px] font-semibold text-white"
                    style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                    data-testid={`text-tile-title-${t.id}`}
                  >
                    {t.title}
                  </div>
                  <div
                    className="text-[11px] text-white/55"
                    data-testid={`text-tile-subtitle-${t.id}`}
                  >
                    {t.subtitle}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div
                className={
                  "text-[11px] " +
                  (disabled
                    ? "text-white/35"
                    : active
                      ? "text-[hsl(var(--primary))]"
                      : "text-white/45")
                }
                data-testid={`status-tile-${t.id}`}
              >
                {disabled ? "Locked" : active ? "Active" : "Ready"}
              </div>
              <div
                className={
                  "h-1.5 w-1.5 rounded-full " +
                  (active
                    ? "bg-[hsl(var(--primary))]"
                    : disabled
                      ? "bg-white/20"
                      : "bg-white/35")
                }
                data-testid={`dot-tile-${t.id}`}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PinnedMapPanel() {
  return (
    <div
      className="h-full w-full overflow-hidden rounded-[22px] border border-white/10 bg-black/30"
      data-testid="panel-map"
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-white/80" strokeWidth={1.8} />
          <div
            className="text-sm font-semibold text-white"
            style={{ fontFamily: "Oxanium, var(--font-sans)" }}
            data-testid="text-map-title"
          >
            Flight Maps
          </div>
        </div>
        <div className="text-xs text-white/45" data-testid="text-map-badge">
          Pinned
        </div>
      </div>

      <iframe
        title="Flight Maps"
        src="https://www.openstreetmap.org/export/embed.html"
        className="h-[calc(100%-48px)] w-full"
        loading="lazy"
        referrerPolicy="no-referrer"
        data-testid="iframe-flight-maps"
      />
    </div>
  );
}

function RightPaneContent({ activeId }: { activeId: TileId }) {
  const tile = tiles.find((t) => t.id === activeId);

  return (
    <div
      className="flygate-glass h-full w-full rounded-[22px] p-5"
      data-testid="panel-active-app"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className="text-lg font-semibold text-white"
            style={{ fontFamily: "Oxanium, var(--font-sans)" }}
            data-testid="text-panel-title"
          >
            {tile?.title}
          </div>
          <div className="mt-1 text-sm text-white/60" data-testid="text-panel-subtitle">
            {tile?.subtitle}
          </div>
        </div>
        <div
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
          data-testid="status-panel"
        >
          Hard-coded mock
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div
            className="text-xs font-medium text-white/70"
            style={{ fontFamily: "Oxanium, var(--font-sans)" }}
            data-testid="text-panel-section"
          >
            Display-only surface
          </div>
          <div className="mt-2 text-sm text-white/55" data-testid="text-panel-body">
            The embedded tablet acts only as a display and input surface. All flight logic is assumed
            external.
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div
            className="text-xs font-medium text-white/70"
            style={{ fontFamily: "Oxanium, var(--font-sans)" }}
            data-testid="text-panel-section-2"
          >
            No consumer apps
          </div>
          <div className="mt-2 text-sm text-white/55" data-testid="text-panel-body-2">
            Notifications, mail, app store, and customization are intentionally unavailable.
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingScreen({ onEnter }: { onEnter: () => void }) {
  const { session } = useIdentity();
  const authed = session.state === "AUTHENTICATED";

  return (
    <div className="min-h-screen w-full flygate-surface">
      <div className="pointer-events-none absolute inset-0 flygate-grid" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1200px] flex-col p-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FlygateMark size={44} />
            <div className="leading-tight">
              <div
                className="text-sm font-semibold tracking-[0.10em] text-white"
                style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                data-testid="text-title"
              >
                Flygate
              </div>
              <div className="text-xs text-white/55" data-testid="text-context">
                Aviation Control Interface
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ModeSwipeToggle />
            <div
              className={
                "rounded-full border px-3 py-1 text-xs " +
                (authed
                  ? "border-[rgba(56,189,248,0.22)] bg-[rgba(56,189,248,0.08)] text-white/80"
                  : "border-white/10 bg-white/5 text-white/55")
              }
              data-testid="status-session"
            >
              {authed ? "AUTHENTICATED" : session.state}
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-4">
          <div
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            data-testid="panel-status"
          >
            <div className="flex items-center gap-2 text-white/70">
              <div
                className="text-xs font-medium"
                style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                data-testid="text-status"
              >
                Cockpit Control Interface
              </div>
              <div className="text-xs text-white/45" data-testid="text-status-sub">
                Embedded tablet · Display + input only
              </div>
            </div>
            <div
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55"
              data-testid="status-ready"
            >
              Ready
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-2xl">
            <div className="flygate-glass rounded-[32px] p-8">
              <div className="mb-6 text-center">
                <div
                  className="text-2xl font-semibold text-white"
                  style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                  data-testid="text-welcome"
                >
                  Flygate Cockpit Control
                </div>
                <div className="mt-2 text-sm text-white/60" data-testid="text-welcome-sub">
                  Aviation-focused application control interface
                </div>
              </div>

              <div className="mb-8 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div
                    className="mb-1 text-xs font-medium text-white/70"
                    style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                    data-testid="text-feature-1"
                  >
                    8 Fixed Flight Operations Tiles
                  </div>
                  <div className="text-xs text-white/50" data-testid="text-feature-1-desc">
                    Flight Maps · Flight Plan · Weather · Checklists · Performance · Comms · Maintenance · Security
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div
                    className="mb-1 text-xs font-medium text-white/70"
                    style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                    data-testid="text-feature-2"
                  >
                    Pinned Split-Screen Map View
                  </div>
                  <div className="text-xs text-white/50" data-testid="text-feature-2-desc">
                    Flight Maps remain visible while selecting other tiles
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div
                    className="mb-1 text-xs font-medium text-white/70"
                    style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                    data-testid="text-feature-3"
                  >
                    Cockpit-Safe Design
                  </div>
                  <div className="text-xs text-white/50" data-testid="text-feature-3-desc">
                    No notifications · No mail apps · No customization
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={onEnter}
                  disabled={!authed}
                  className={
                    "w-full rounded-2xl border px-6 py-4 text-sm font-semibold transition-all duration-200 " +
                    (authed
                      ? "border-[rgba(56,189,248,0.30)] bg-[rgba(56,189,248,0.12)] text-white hover:border-[rgba(56,189,248,0.45)] hover:bg-[rgba(56,189,248,0.18)] active:scale-[0.98]"
                      : "cursor-not-allowed border-white/10 bg-white/5 text-white/35")
                  }
                  style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                  data-testid="button-enter-flight-ops"
                >
                  {authed ? "Enter Flight Operations Mode" : "Sign in to enter Flight Operations Mode"}
                </button>
                {!authed && (
                  <div className="text-center text-xs text-white/45" data-testid="text-auth-hint">
                    Swipe the mode control to the right to authenticate
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-auto pt-5">
          <div
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            data-testid="footer"
          >
            <div className="text-xs text-white/45" data-testid="text-footer-left">
              Embedded cockpit tablet · Display + input only
            </div>
            <div className="text-xs text-white/55" data-testid="text-footer-right">
              Flygate ACI · Prototype
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FlyGateACIScreen() {
  const { session } = useIdentity();
  const authed = session.state === "AUTHENTICATED";

  const [activeId, setActiveId] = React.useState<TileId>("flight-maps");
  const [inFlightOps, setInFlightOps] = React.useState(false);
  const mapPinned = true;

  if (!inFlightOps) {
    return <LandingScreen onEnter={() => setInFlightOps(true)} />;
  }

  return (
    <div className="min-h-screen w-full flygate-surface">
      <div className="pointer-events-none absolute inset-0 flygate-grid" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col p-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FlygateMark size={44} />
            <div className="leading-tight">
              <div
                className="text-sm font-semibold tracking-[0.10em] text-white"
                style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                data-testid="text-title"
              >
                Flygate
              </div>
              <div className="text-xs text-white/55" data-testid="text-context">
                Flight Operations · ACI
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ModeSwipeToggle />
            <div
              className={
                "rounded-full border px-3 py-1 text-xs " +
                (authed
                  ? "border-[rgba(56,189,248,0.22)] bg-[rgba(56,189,248,0.08)] text-white/80"
                  : "border-white/10 bg-white/5 text-white/55")
              }
              data-testid="status-session"
            >
              {authed ? "AUTHENTICATED" : session.state}
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-4">
          <div
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            data-testid="panel-header"
          >
            <div className="flex items-center gap-2 text-white/70">
              <div
                className="text-xs font-medium"
                style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                data-testid="text-safety"
              >
                Cockpit-safe UI
              </div>
              <div className="text-xs text-white/45" data-testid="text-safety-sub">
                No notifications · No consumer apps · Fixed tiles
              </div>
            </div>
            <div
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55"
              data-testid="status-map-pinned"
            >
              Map pinned
            </div>
          </div>

          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[640px] w-full rounded-[28px]"
            data-testid="layout-split"
          >
            <ResizablePanel defaultSize={44} minSize={32}>
              <div className="h-full w-full rounded-[28px] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div
                      className="text-xs font-medium text-white/70"
                      style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                      data-testid="text-left-title"
                    >
                      Flight Operations
                    </div>
                    <div className="text-xs text-white/45" data-testid="text-left-sub">
                      8 fixed tiles · always visible
                    </div>
                  </div>
                  <div
                    className={
                      "text-xs " +
                      (authed ? "text-[hsl(var(--primary))]" : "text-white/45")
                    }
                    data-testid="status-tiles-enabled"
                  >
                    {authed ? "Tiles enabled" : "Sign in to enable"}
                  </div>
                </div>

                <TileGrid activeId={activeId} onSelect={setActiveId} enabled={authed} />

                {!authed && (
                  <div
                    className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                    data-testid="callout-auth"
                  >
                    <div
                      className="text-xs font-medium text-white/70"
                      style={{ fontFamily: "Oxanium, var(--font-sans)" }}
                      data-testid="text-callout-title"
                    >
                      Ground mode
                    </div>
                    <div className="mt-2 text-sm text-white/55" data-testid="text-callout-body">
                      Swipe the mode control to the right to sign in and enable Flight Operations.
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={56} minSize={36}>
              <div className="h-full w-full rounded-[28px] p-4">
                {mapPinned ? (
                  <ResizablePanelGroup
                    direction="vertical"
                    className="h-full"
                    data-testid="stack-right"
                  >
                    <ResizablePanel defaultSize={58} minSize={40}>
                      <PinnedMapPanel />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={42} minSize={28}>
                      <RightPaneContent activeId={activeId} />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : (
                  <RightPaneContent activeId={activeId} />
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <footer className="mt-auto pt-5">
          <div
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            data-testid="footer"
          >
            <div className="text-xs text-white/45" data-testid="text-footer-left">
              Embedded cockpit tablet · display + input only
            </div>
            <div className="text-xs text-white/55" data-testid="text-footer-right">
              Flygate ACI · Prototype
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function FlyGateACI() {
  return (
    <IdentityProvider>
      <AuthShell>
        <FlyGateACIScreen />
      </AuthShell>
    </IdentityProvider>
  );
}
