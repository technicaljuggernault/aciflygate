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

  return httpServer;
}
