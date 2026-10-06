import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests up to 50MB (handles large audits)
  app.use(express.json({ limit: "50mb" }));

  const DATA_DIR = path.join(process.cwd(), "data_store");
  const DATA_FILE = path.join(DATA_DIR, "shared_audit_data.json");
  const INVENTORY_FILE = path.join(DATA_DIR, "shared_inventory_data.json");
  const FLEET_FILE = path.join(DATA_DIR, "shared_fleet_data.json");
  const PALLETS_FILE = path.join(DATA_DIR, "shared_pallets_data.json");
  const AUTH_FILE = path.join(DATA_DIR, "auth_config.json");
  const BACKUP_AUDIT_FILE = path.join(DATA_DIR, "shared_audit_data_backup.json");
  const BACKUP_INVENTORY_FILE = path.join(DATA_DIR, "shared_inventory_data_backup.json");
  const BACKUP_FLEET_FILE = path.join(DATA_DIR, "shared_fleet_data_backup.json");
  const BACKUP_PALLETS_FILE = path.join(DATA_DIR, "shared_pallets_data_backup.json");

  const PUBLIC_DATA_DIR = path.join(process.cwd(), "public", "data");
  const PUBLIC_DATA_FILE = path.join(PUBLIC_DATA_DIR, "shared_audit_data.json");
  const PUBLIC_INVENTORY_FILE = path.join(PUBLIC_DATA_DIR, "shared_inventory_data.json");
  const PUBLIC_FLEET_FILE = path.join(PUBLIC_DATA_DIR, "shared_fleet_data.json");
  const PUBLIC_PALLETS_FILE = path.join(PUBLIC_DATA_DIR, "shared_pallets_data.json");
  const PUBLIC_AUTH_FILE = path.join(PUBLIC_DATA_DIR, "auth_config.json");

  const DIST_DATA_DIR = path.join(process.cwd(), "dist", "data");
  const DIST_DATA_FILE = path.join(DIST_DATA_DIR, "shared_audit_data.json");
  const DIST_INVENTORY_FILE = path.join(DIST_DATA_DIR, "shared_inventory_data.json");
  const DIST_FLEET_FILE = path.join(DIST_DATA_DIR, "shared_fleet_data.json");
  const DIST_PALLETS_FILE = path.join(DIST_DATA_DIR, "shared_pallets_data.json");
  const DIST_AUTH_FILE = path.join(DIST_DATA_DIR, "auth_config.json");

  // Ensure data store directories exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Helper to read first existing file from candidate paths
  const readFirstExisting = (filePaths: string[]) => {
    for (const f of filePaths) {
      if (fs.existsSync(f)) {
        try {
          const content = fs.readFileSync(f, "utf-8");
          const parsed = JSON.parse(content);
          if (parsed) return parsed;
        } catch (e) {
          console.error(`Error reading ${f}:`, e);
        }
      }
    }
    return null;
  };

  // Helper to write to all target persistence locations
  const writeToAllLocations = (targetFilePaths: string[], data: any) => {
    const jsonStr = JSON.stringify(data, null, 2);
    for (const filePath of targetFilePaths) {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, jsonStr, "utf-8");
      } catch (err) {
        console.error(`Error writing to ${filePath}:`, err);
      }
    }
  };

  // GET corporate access password configuration (default 'stolok' until changed)
  app.get("/api/auth/password", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const authData = readFirstExisting([AUTH_FILE, PUBLIC_AUTH_FILE, DIST_AUTH_FILE]);
      if (authData && typeof authData.password === "string" && authData.password.trim()) {
        return res.json({ password: authData.password.trim(), isCustom: authData.isCustom || false });
      }
      return res.json({ password: "stolok", isCustom: false });
    } catch (err: any) {
      return res.json({ password: "stolok", isCustom: false });
    }
  });

  // POST update corporate access password configuration (only this new password will be admitted from now on)
  app.post("/api/auth/password", (req, res) => {
    try {
      const { password } = req.body;
      if (!password || typeof password !== "string" || password.trim().length < 3) {
        return res.status(400).json({ error: "Contraseña inválida (mínimo 3 caracteres)" });
      }
      const clean = password.trim();
      const payload = {
        password: clean,
        isCustom: clean.toLowerCase() !== "stolok",
        updatedAt: new Date().toISOString(),
      };
      writeToAllLocations([AUTH_FILE, PUBLIC_AUTH_FILE, DIST_AUTH_FILE], payload);
      console.log(`[STOL API] Clave de acceso actualizada a '${clean}'. Solo se admitirá esta clave hasta nuevo cambio.`);
      return res.json({ success: true, password: clean });
    } catch (err: any) {
      console.error("Error saving auth config:", err);
      return res.status(500).json({ error: "No se pudo guardar la clave" });
    }
  });

  // GET shared records (retrieves ONLY the single latest hosted audit file)
  app.get("/api/records", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const currentEnv = process.env.NODE_ENV === "production" ? "published" : "pre_publish";
      const data = readFirstExisting([DATA_FILE, PUBLIC_DATA_FILE, DIST_DATA_FILE, BACKUP_AUDIT_FILE]);
      if (data) {
        return res.json({
          ...data,
          environment: data.environment || currentEnv,
          isUserUploaded: data.isUserUploaded !== undefined ? Boolean(data.isUserUploaded) : (data.source === "excel_upload"),
          serverTimestamp: new Date().toISOString(),
        });
      }
      return res.json({ records: null, fileName: null, updatedAt: null, isUserUploaded: false, environment: currentEnv });
    } catch (err: any) {
      console.error("Error reading shared data file:", err);
      return res.status(500).json({ error: "No se pudo leer la data compartida" });
    }
  });

  // POST shared records (conserves ONLY the single latest hosted file, replacing previous data completely)
  app.post("/api/records", (req, res) => {
    try {
      const { records, user, source, fileName, fileSize, updatedAt, sourceMode, isUserUploaded } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: "El cuerpo debe incluir un arreglo 'records'" });
      }

      const currentEnv = process.env.NODE_ENV === "production" ? "published" : "pre_publish";
      const effectiveUpdatedAt = updatedAt && !isNaN(new Date(updatedAt).getTime())
        ? updatedAt
        : new Date().toISOString();

      const payload = {
        fileName: fileName || "Auditoria_Pockets_Actualizada.xlsx",
        fileSize: fileSize || null,
        totalRecords: records.length,
        records,
        updatedAt: effectiveUpdatedAt,
        updatedBy: user || "Usuario Autorizado",
        source: source || "excel_upload",
        isUserUploaded: isUserUploaded !== undefined ? Boolean(isUserUploaded) : true,
        environment: sourceMode || currentEnv,
        isLatest: true,
      };

      writeToAllLocations([DATA_FILE, PUBLIC_DATA_FILE, DIST_DATA_FILE, BACKUP_AUDIT_FILE], payload);
      console.log(`[STOL API] Conservando ÚNICAMENTE el último archivo alojado (${payload.environment}): ${payload.fileName} (${records.length} registros, fecha: ${payload.updatedAt}, userUploaded: ${payload.isUserUploaded})`);
      return res.json({
        success: true,
        count: records.length,
        fileName: payload.fileName,
        updatedAt: payload.updatedAt,
        isUserUploaded: payload.isUserUploaded,
        environment: payload.environment,
      });
    } catch (err: any) {
      console.error("Error writing shared data file:", err);
      return res.status(500).json({ error: "No se pudo guardar la data compartida" });
    }
  });

  // GET shared pocket inventory items (conserves ONLY the single latest hosted inventory file)
  app.get("/api/inventory", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const currentEnv = process.env.NODE_ENV === "production" ? "published" : "pre_publish";
      const data = readFirstExisting([INVENTORY_FILE, PUBLIC_INVENTORY_FILE, DIST_INVENTORY_FILE, BACKUP_INVENTORY_FILE]);
      if (data) {
        return res.json({
          ...data,
          environment: data.environment || currentEnv,
          isUserUploaded: data.isUserUploaded !== undefined ? Boolean(data.isUserUploaded) : (data.source === "excel_inventory_upload"),
          serverTimestamp: new Date().toISOString(),
        });
      }
      return res.json({ inventory: null, fileName: null, updatedAt: null, isUserUploaded: false, environment: currentEnv });
    } catch (err: any) {
      console.error("Error reading shared inventory file:", err);
      return res.status(500).json({ error: "No se pudo leer el inventario compartido" });
    }
  });

  // POST shared pocket inventory items (conserves ONLY the single latest hosted inventory file)
  app.post("/api/inventory", (req, res) => {
    try {
      const { inventory, user, source, fileName, fileSize, updatedAt, sourceMode, isUserUploaded } = req.body;
      if (!Array.isArray(inventory)) {
        return res.status(400).json({ error: "El cuerpo debe incluir un arreglo 'inventory'" });
      }

      const currentEnv = process.env.NODE_ENV === "production" ? "published" : "pre_publish";
      const effectiveUpdatedAt = updatedAt && !isNaN(new Date(updatedAt).getTime())
        ? updatedAt
        : new Date().toISOString();

      const payload = {
        fileName: fileName || "Inventario_Pockets_Actualizado.xlsx",
        fileSize: fileSize || null,
        totalItems: inventory.length,
        inventory,
        updatedAt: effectiveUpdatedAt,
        updatedBy: user || "Usuario Autorizado",
        source: source || "excel_inventory_upload",
        isUserUploaded: isUserUploaded !== undefined ? Boolean(isUserUploaded) : true,
        environment: sourceMode || currentEnv,
        isLatest: true,
      };

      writeToAllLocations([INVENTORY_FILE, PUBLIC_INVENTORY_FILE, DIST_INVENTORY_FILE, BACKUP_INVENTORY_FILE], payload);
      console.log(`[STOL API] Conservando ÚNICAMENTE el último inventario alojado (${payload.environment}): ${payload.fileName} (${inventory.length} equipos, fecha: ${payload.updatedAt}, userUploaded: ${payload.isUserUploaded})`);
      return res.json({
        success: true,
        count: inventory.length,
        fileName: payload.fileName,
        updatedAt: payload.updatedAt,
        isUserUploaded: payload.isUserUploaded,
        environment: payload.environment,
      });
    } catch (err: any) {
      console.error("Error writing shared inventory file:", err);
      return res.status(500).json({ error: "No se pudo guardar el inventario compartido" });
    }
  });

  // GET shared fleet dashboard data
  app.get("/api/fleet", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const candidatePaths = [FLEET_FILE, PUBLIC_FLEET_FILE, DIST_FLEET_FILE, BACKUP_FLEET_FILE];
      const data = readFirstExisting(candidatePaths);

      if (data) {
        return res.json({
          success: true,
          fileName: data.fileName || "DATA_DASHBOARD_EJECUTIVO.xlsx",
          totalEquipos: data.totalEquipos || data.data?.equipos?.length || 0,
          totalIncidencias: data.totalIncidencias || data.data?.incidencias?.length || 0,
          data: data.data || null,
          updatedAt: data.updatedAt || null,
          updatedBy: data.updatedBy || null,
          isUserUploaded: data.isUserUploaded || false,
          environment: data.environment || "pre_publish",
        });
      }
      return res.json({
        success: true,
        data: null,
        fileName: null,
        updatedAt: null,
      });
    } catch (err: any) {
      console.error("Error reading shared fleet data:", err);
      return res.status(500).json({ error: "No se pudo leer la data de flota compartida" });
    }
  });

  // POST shared fleet data
  app.post("/api/fleet", (req, res) => {
    try {
      const {
        data: fleetPayload,
        fileName,
        fileSize,
        user,
        source,
        isUserUploaded,
        updatedAt,
        sourceMode,
      } = req.body;

      if (!fleetPayload || !fleetPayload.equipos) {
        return res.status(400).json({ error: "El cuerpo debe incluir un objeto 'data' con equipos" });
      }

      const currentEnv = process.env.NODE_ENV === "production" ? "published" : "pre_publish";
      const effectiveUpdatedAt = updatedAt && !isNaN(new Date(updatedAt).getTime())
        ? updatedAt
        : new Date().toISOString();

      const payload = {
        fileName: fileName || "DATA_DASHBOARD_EJECUTIVO.xlsx",
        fileSize: fileSize || null,
        totalEquipos: fleetPayload.equipos.length,
        totalIncidencias: fleetPayload.incidencias ? fleetPayload.incidencias.length : 0,
        data: fleetPayload,
        updatedAt: effectiveUpdatedAt,
        updatedBy: user || "Usuario Autorizado",
        source: source || "excel_fleet_upload",
        isUserUploaded: isUserUploaded !== undefined ? Boolean(isUserUploaded) : true,
        environment: sourceMode || currentEnv,
        isLatest: true,
      };

      writeToAllLocations([FLEET_FILE, PUBLIC_FLEET_FILE, DIST_FLEET_FILE, BACKUP_FLEET_FILE], payload);
      console.log(`[STOL API] Conservando datos de FLOTA (${payload.environment}): ${payload.fileName} (${payload.totalEquipos} equipos, fecha: ${payload.updatedAt})`);
      return res.json({
        success: true,
        totalEquipos: payload.totalEquipos,
        totalIncidencias: payload.totalIncidencias,
        fileName: payload.fileName,
        updatedAt: payload.updatedAt,
        isUserUploaded: payload.isUserUploaded,
        environment: payload.environment,
      });
    } catch (err: any) {
      console.error("Error writing shared fleet data file:", err);
      return res.status(500).json({ error: "No se pudo guardar la data de flota compartida" });
    }
  });

  // GET shared pallets data
  app.get("/api/pallets", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const palletData = readFirstExisting([PALLETS_FILE, PUBLIC_PALLETS_FILE, DIST_PALLETS_FILE, BACKUP_PALLETS_FILE]);
      if (palletData && Array.isArray(palletData.records)) {
        return res.json({
          records: palletData.records,
          fileName: palletData.fileName || "CONTROL_PALLETS_OBSERVADOS.xlsx",
          updatedAt: palletData.updatedAt || null,
          updatedBy: palletData.updatedBy || null,
          isUserUploaded: Boolean(palletData.isUserUploaded),
          environment: palletData.environment || "pre_publish",
        });
      }

      return res.json({
        records: null,
        fileName: null,
        updatedAt: null,
      });
    } catch (err: any) {
      console.error("Error reading shared pallets data:", err);
      return res.status(500).json({ error: "No se pudo leer la data de pallets compartida" });
    }
  });

  // POST shared pallets data
  app.post("/api/pallets", (req, res) => {
    try {
      const {
        records,
        fileName,
        user,
        source,
        isUserUploaded,
        updatedAt,
        sourceMode,
      } = req.body;

      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: "El cuerpo debe incluir un arreglo 'records'" });
      }

      const currentEnv = process.env.NODE_ENV === "production" ? "published" : "pre_publish";
      const effectiveUpdatedAt = updatedAt && !isNaN(new Date(updatedAt).getTime())
        ? updatedAt
        : new Date().toISOString();

      const payload = {
        fileName: fileName || "CONTROL_PALLETS_OBSERVADOS.xlsx",
        totalPallets: records.length,
        records,
        updatedAt: effectiveUpdatedAt,
        updatedBy: user || "Usuario Autorizado",
        source: source || "excel_pallets_upload",
        isUserUploaded: isUserUploaded !== undefined ? Boolean(isUserUploaded) : true,
        environment: sourceMode || currentEnv,
        isLatest: true,
      };

      writeToAllLocations([PALLETS_FILE, PUBLIC_PALLETS_FILE, DIST_PALLETS_FILE, BACKUP_PALLETS_FILE], payload);
      console.log(`[STOL API] Conservando datos de PALLETS (${payload.environment}): ${payload.fileName} (${payload.totalPallets} pallets, fecha: ${payload.updatedAt})`);
      return res.json({
        success: true,
        totalPallets: payload.totalPallets,
        fileName: payload.fileName,
        updatedAt: payload.updatedAt,
        isUserUploaded: payload.isUserUploaded,
        environment: payload.environment,
      });
    } catch (err: any) {
      console.error("Error writing shared pallets data file:", err);
      return res.status(500).json({ error: "No se pudo guardar la data de pallets compartida" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`STOL Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
