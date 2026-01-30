import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aciState } from "./aci-state";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/aci/status", (_req, res) => {
    res.json(aciState.getStatus());
  });

  app.get("/api/aci/capabilities", (_req, res) => {
    res.json(aciState.getCapabilities());
  });

  app.get("/api/aci/devices", (_req, res) => {
    res.json({ devices: aciState.getTrustedDevices() });
  });

  app.get("/api/aci/nonce", (req, res) => {
    const deviceId = req.query.device_id as string | undefined;
    const result = aciState.issueNonce(deviceId);
    
    if ("error" in result) {
      return res.status(403).json({ error: result.error });
    }
    
    res.json({ nonce: result.nonce, ttl_seconds: result.ttlSeconds });
  });

  app.post("/api/aci/handshake", (req, res) => {
    const { payload, signature_b64 } = req.body;
    
    if (!payload || !signature_b64) {
      return res.status(400).json({ error: "Missing payload or signature_b64" });
    }

    const result = aciState.verifyHandshake(payload, signature_b64);
    
    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }

    res.json({
      status: "OK",
      duty_state: aciState.getStatus().dutyState,
      apps_unlocked: aciState.getStatus().activeApps,
      device_id: result.deviceId,
      device_name: result.deviceName,
    });
  });

  app.post("/api/aci/usb/attached/:deviceId", (req, res) => {
    const { deviceId } = req.params;
    const result = aciState.onUsbAttached(deviceId);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.json({ status: "OK", message: result.message, state: aciState.getStatus() });
  });

  app.post("/api/aci/usb/detached", (_req, res) => {
    const result = aciState.onUsbDetached();
    res.json({ status: "OK", message: result.message, state: aciState.getStatus() });
  });

  app.post("/api/aci/simulate/attach/:deviceId", (req, res) => {
    const { deviceId } = req.params;
    const result = aciState.simulateAttach(deviceId);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.json({ status: "OK", message: result.message, state: aciState.getStatus() });
  });

  app.post("/api/aci/simulate/detach", (_req, res) => {
    const result = aciState.simulateDetach();
    res.json({ status: "OK", message: result.message, state: aciState.getStatus() });
  });

  app.post("/api/aci/devices/register", (req, res) => {
    const { device_id, device_name, public_key_pem } = req.body;
    
    if (!device_id || !device_name) {
      return res.status(400).json({ error: "Missing device_id or device_name" });
    }

    aciState.registerTrustedDevice(device_id, device_name, public_key_pem);
    res.json({ status: "OK", message: `Device ${device_name} registered.` });
  });

  return httpServer;
}
