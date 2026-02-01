import crypto from "crypto";
import { EventEmitter } from "events";

export type LockState = "LOCKED" | "UNLOCKED";

export interface AciState {
  aci_id: string;
  lock_state: LockState;
  last_verified_at: string | null;
  last_error: string | null;
  flygate: {
    reachable: boolean;
    last_seen_at: string | null;
  };
}

export interface DutyAssertion {
  aci_id: string;
  nonce: string;
  issued_at: string;
  ttl_seconds: number;
  device_id: string;
  user: { id: string; role: string };
  duty_state: "OFF_DUTY" | "ON_DUTY";
  signature: string;
}

export interface GatekeeperConfig {
  aciId: string;
  flygateBaseUrl: string;
  sharedSecret: string;
  pollIntervalMs: number;
  dutyTtlMaxSeconds: number;
}

function computeHmacSignature(
  aciId: string,
  nonce: string,
  issuedAt: string,
  ttlSeconds: number,
  deviceId: string,
  userId: string,
  userRole: string,
  dutyState: string,
  secret: string
): string {
  const canonical = `${aciId}|${nonce}|${issuedAt}|${ttlSeconds}|${deviceId}|${userId}|${userRole}|${dutyState}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(canonical);
  return hmac.digest("base64");
}

class Gatekeeper extends EventEmitter {
  private state: AciState;
  private config: GatekeeperConfig;
  private pollTimer: NodeJS.Timeout | null = null;
  private enabled: boolean = false;

  constructor() {
    super();
    const aciId = process.env.ACI_ID || "aci-pi4-001";
    
    this.config = {
      aciId,
      flygateBaseUrl: process.env.FLYGATE_BASE_URL || "http://flygate.local:5000",
      sharedSecret: process.env.FLYGATE_ACI_SHARED_SECRET || "",
      pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "2000", 10),
      dutyTtlMaxSeconds: parseInt(process.env.DUTY_TTL_MAX_SECONDS || "60", 10),
    };

    const hasSecret = !!this.config.sharedSecret;
    
    this.state = {
      aci_id: aciId,
      lock_state: hasSecret ? "LOCKED" : "UNLOCKED",
      last_verified_at: hasSecret ? null : new Date().toISOString(),
      last_error: hasSecret ? null : "Gatekeeper disabled - no shared secret configured",
      flygate: {
        reachable: false,
        last_seen_at: null,
      },
    };
  }

  getState(): AciState {
    return { ...this.state };
  }

  getConfig(): Omit<GatekeeperConfig, "sharedSecret"> {
    return {
      aciId: this.config.aciId,
      flygateBaseUrl: this.config.flygateBaseUrl,
      pollIntervalMs: this.config.pollIntervalMs,
      dutyTtlMaxSeconds: this.config.dutyTtlMaxSeconds,
    };
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  start(): void {
    if (this.pollTimer) {
      return;
    }

    if (!this.config.sharedSecret) {
      console.log("[gatekeeper] No FLYGATE_ACI_SHARED_SECRET configured - gatekeeper disabled");
      this.enabled = false;
      return;
    }

    this.enabled = true;
    console.log(`[gatekeeper] Starting polling FlyGate at ${this.config.flygateBaseUrl} every ${this.config.pollIntervalMs}ms`);
    
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), this.config.pollIntervalMs);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.enabled = false;
    console.log("[gatekeeper] Stopped polling");
  }

  private async poll(): Promise<void> {
    const nonce = crypto.randomBytes(16).toString("hex");

    try {
      const url = new URL("/api/duty", this.config.flygateBaseUrl);
      url.searchParams.set("nonce", nonce);
      url.searchParams.set("aci_id", this.config.aciId);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const assertion = (await response.json()) as DutyAssertion;
      
      this.state.flygate.reachable = true;
      this.state.flygate.last_seen_at = new Date().toISOString();

      const validationResult = this.validateAssertion(assertion, nonce);
      
      if (validationResult.valid) {
        const previousState = this.state.lock_state;
        this.state.lock_state = "UNLOCKED";
        this.state.last_verified_at = new Date().toISOString();
        this.state.last_error = null;
        
        if (previousState !== "UNLOCKED") {
          this.emit("stateChange", this.state);
        }
      } else {
        this.setLocked(validationResult.error || "Validation failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.state.flygate.reachable = false;
      this.setLocked(`FlyGate unreachable: ${errorMessage}`);
    }
  }

  private validateAssertion(assertion: DutyAssertion, expectedNonce: string): { valid: boolean; error?: string } {
    if (assertion.nonce !== expectedNonce) {
      return { valid: false, error: "Nonce mismatch" };
    }

    if (assertion.aci_id !== this.config.aciId) {
      return { valid: false, error: "ACI ID mismatch" };
    }

    const issuedAt = new Date(assertion.issued_at).getTime();
    const now = Date.now();
    const ageSeconds = (now - issuedAt) / 1000;

    if (ageSeconds > assertion.ttl_seconds) {
      return { valid: false, error: "TTL expired" };
    }

    if (ageSeconds > this.config.dutyTtlMaxSeconds) {
      return { valid: false, error: "Assertion too old" };
    }

    const expectedSignature = computeHmacSignature(
      assertion.aci_id,
      assertion.nonce,
      assertion.issued_at,
      assertion.ttl_seconds,
      assertion.device_id,
      assertion.user.id,
      assertion.user.role,
      assertion.duty_state,
      this.config.sharedSecret
    );

    if (assertion.signature !== expectedSignature) {
      return { valid: false, error: "Invalid HMAC signature" };
    }

    if (assertion.duty_state !== "ON_DUTY") {
      return { valid: false, error: `Duty state is ${assertion.duty_state}, not ON_DUTY` };
    }

    return { valid: true };
  }

  private setLocked(error: string): void {
    const previousState = this.state.lock_state;
    this.state.lock_state = "LOCKED";
    this.state.last_error = error;
    
    if (previousState !== "LOCKED") {
      this.emit("stateChange", this.state);
    }
  }

  manualUnlock(): void {
    this.state.lock_state = "UNLOCKED";
    this.state.last_verified_at = new Date().toISOString();
    this.state.last_error = null;
    this.emit("stateChange", this.state);
  }

  manualLock(): void {
    this.setLocked("Manually locked");
  }
}

export const gatekeeper = new Gatekeeper();
