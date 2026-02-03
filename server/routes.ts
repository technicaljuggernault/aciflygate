import type { Express } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { aciState } from "./aci-state";
import { gatekeeper, type AciState } from "./gatekeeper";

const wsClients: Set<WebSocket> = new Set();

function broadcastState(state: AciState): void {
  const message = JSON.stringify({
    type: "state_change",
    data: state,
  });
  
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    wsClients.add(ws);
    console.log("[websocket] Client connected");

    ws.send(JSON.stringify({
      type: "state_change",
      data: gatekeeper.getState(),
    }));

    ws.on("close", () => {
      wsClients.delete(ws);
      console.log("[websocket] Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("[websocket] Error:", error);
      wsClients.delete(ws);
    });
  });

  gatekeeper.on("stateChange", (state: AciState) => {
    broadcastState(state);
  });

  gatekeeper.start();

  app.get("/api/aci/health", (_req, res) => {
    res.json({ 
      status: "OK", 
      service: "FlyGate ACI Console",
      version: "1.0.0",
      timestamp: Date.now(),
      ready: true
    });
  });

  app.get("/api/state", (_req, res) => {
    res.json(gatekeeper.getState());
  });

  app.get("/api/gatekeeper/config", (_req, res) => {
    res.json({
      ...gatekeeper.getConfig(),
      enabled: gatekeeper.isEnabled(),
    });
  });

  app.post("/api/gatekeeper/unlock", (_req, res) => {
    gatekeeper.manualUnlock();
    res.json({ status: "OK", message: "Manually unlocked", state: gatekeeper.getState() });
  });

  app.post("/api/gatekeeper/lock", (_req, res) => {
    gatekeeper.manualLock();
    res.json({ status: "OK", message: "Manually locked", state: gatekeeper.getState() });
  });

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
    
    if (!deviceId) {
      return res.status(400).json({ error: "Missing device_id query parameter" });
    }
    
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

  app.post("/api/aci/devices/register", (req, res) => {
    const { device_id, device_name, public_key_pem, public_key_base64, public_key_jwk } = req.body;
    
    if (!device_id || !device_name) {
      return res.status(400).json({ error: "Missing device_id or device_name" });
    }
    
    let finalPem = public_key_pem;
    
    if (!finalPem && public_key_base64) {
      finalPem = `-----BEGIN PUBLIC KEY-----\n${public_key_base64}\n-----END PUBLIC KEY-----`;
    }
    
    if (!finalPem && public_key_jwk) {
      return res.status(400).json({ 
        error: "JWK format not yet supported. Please provide public_key_pem or public_key_base64" 
      });
    }
    
    if (!finalPem) {
      return res.status(400).json({ 
        error: "Missing public key. Provide public_key_pem (PEM format) or public_key_base64 (base64 DER)" 
      });
    }

    const success = aciState.registerTrustedDevice(device_id, device_name, finalPem);
    if (!success) {
      return res.status(400).json({ error: "Failed to register device" });
    }
    res.json({ status: "OK", message: `Device ${device_name} registered.`, device_id });
  });

  return httpServer;
}
