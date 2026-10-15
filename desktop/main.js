const { app, BrowserWindow, Menu, ipcMain, screen, desktopCapturer, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRestartPolicy, appendRotatedLog } = require("./restart-policy");

const APP_ROOT = path.resolve(__dirname, "..");
const WIDGET_URL = "http://127.0.0.1:3100/widget";
const WIDTH = 238;
const CONFIG_PATH = path.join(app.getPath("userData"), "widget-config.json");
const LOG_DIR = path.join(app.getPath("userData"), "logs");
const LOG_PATH = path.join(LOG_DIR, "main.log");
const SECRET_PATH = path.join(APP_ROOT, "data", ".api-secret");

let win = null;
let settingsWin = null;
let dragOffset = null;
let serverChild = null;
let spawnedServer = false;
let quitting = false;
let restartTimer = null;
let usageSecret = "";

const restartPolicy = createRestartPolicy();

function writeLog(level, message) {
  const line = `${new Date().toISOString()} [${level}] ${message}`;
  appendRotatedLog(LOG_PATH, line);
}

process.on("uncaughtException", (err) => {
  writeLog("ERROR", `uncaughtException: ${err?.stack || err}`);
});

process.on("unhandledRejection", (reason) => {
  writeLog("ERROR", `unhandledRejection: ${reason?.stack || reason}`);
});

function loadPos() {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    if (typeof c.x !== "number" || typeof c.y !== "number") return null;
    const visible = screen.getAllDisplays().some((d) => {
      const a = d.workArea;
      return (
        c.x + 40 < a.x + a.width &&
        c.x + WIDTH - 40 > a.x &&
        c.y + 40 < a.y + a.height &&
        c.y + 40 > a.y
      );
    });
    return visible ? { x: c.x, y: c.y } : null;
  } catch {
    // Expected when widget-config.json has not been created yet
    return null;
  }
}

function savePos() {
  if (!win) return;
  const b = win.getBounds();
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height }));
  } catch (err) {
    writeLog("WARN", `Failed to save window position: ${err?.message || err}`);
  }
}

function ensureSecret() {
  try {
    fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true });
    if (fs.existsSync(SECRET_PATH)) {
      const existing = fs.readFileSync(SECRET_PATH, "utf8").trim();
      if (existing) {
        usageSecret = existing;
        return;
      }
    }
    usageSecret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(SECRET_PATH, usageSecret, { encoding: "utf8", mode: 0o600 });
  } catch (err) {
    writeLog("WARN", `Failed to persist API secret, using in-memory fallback: ${err?.message || err}`);
    usageSecret = crypto.randomBytes(32).toString("hex");
  }
}

async function serverIsUp() {
  try {
    const res = await fetch(WIDGET_URL, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    // Expected while server is still starting up
    return false;
  }
}

function pipeStreamToLog(stream, label) {
  if (!stream) return;
  stream.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (!text) return;
    for (const line of text.split(/\r?\n/)) {
      writeLog(label, line);
    }
  });
}

function scheduleServerRestart(reason) {
  if (quitting || restartTimer) return;
  const decision = restartPolicy.recordExit();
  if (!decision.shouldRestart) {
    writeLog(
      "ERROR",
      `Server exited (${reason}); ${decision.crashesInWindow} crashes in 5m, giving up automatic restart`,
    );
    if (win && !win.isDestroyed()) {
      win.webContents.send("widget-server-status", {
        state: "stopped",
        crashes: decision.crashesInWindow,
      });
    }
    return;
  }
  writeLog(
    "WARN",
    `Server exited (${reason}); restarting in ${decision.delayMs}ms (attempt ${decision.crashesInWindow})`,
  );
  if (win && !win.isDestroyed()) {
    win.webContents.send("widget-server-status", {
      state: "restarting",
      delayMs: decision.delayMs,
      attempt: decision.crashesInWindow,
    });
  }
  restartTimer = setTimeout(async () => {
    restartTimer = null;
    if (quitting) return;
    if (!(await serverIsUp())) {
      startServer();
    }
    const ok = await waitForServer(30000);
    if (ok) {
      restartPolicy.reset();
      writeLog("INFO", "Server recovered after restart");
      if (win && !win.isDestroyed()) {
        win.webContents.send("widget-server-status", { state: "online" });
        win.loadURL(WIDGET_URL);
      }
    }
  }, decision.delayMs);
}

function startServer() {
  writeLog("INFO", "Spawning local Next.js server on 127.0.0.1:3100");
  const child = spawn("cmd.exe", ["/c", "npm run start"], {
    cwd: APP_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  serverChild = child;
  spawnedServer = true;

  pipeStreamToLog(child.stdout, "SERVER");
  pipeStreamToLog(child.stderr, "SERVER_ERR");

  child.on("error", (err) => {
    writeLog("ERROR", `Failed to spawn server process: ${err?.message || err}`);
  });

  child.on("exit", (code, signal) => {
    if (serverChild === child) {
      serverChild = null;
      spawnedServer = false;
    }
    if (quitting) return;
    scheduleServerRestart(`code=${code ?? "null"} signal=${signal ?? "null"}`);
  });
}

function stopServer() {
  quitting = true;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  if (!spawnedServer || !serverChild) return;
  const pid = serverChild.pid;
  serverChild = null;
  spawnedServer = false;
  if (!pid) return;
  try {
    spawn("taskkill", ["/pid", String(pid), "/f", "/t"], {
      windowsHide: true,
      stdio: "ignore",
    });
  } catch (err) {
    writeLog("WARN", `Failed to stop server process ${pid}: ${err?.message || err}`);
  }
}

async function waitForServer(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await serverIsUp()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function recoverWindow(reason) {
  if (quitting || !win || win.isDestroyed()) return;
  writeLog("WARN", `Recovering widget window after ${reason}`);
  if (!(await serverIsUp())) {
    if (!serverChild && !restartTimer) {
      scheduleServerRestart(reason);
      return;
    }
    const ok = await waitForServer(20000);
    if (!ok) return;
  }
  if (win && !win.isDestroyed()) {
    win.loadURL(WIDGET_URL);
  }
}

function createWindow() {
  const pos = loadPos();
  win = new BrowserWindow({
    x: pos?.x,
    y: pos?.y,
    width: WIDTH,
    height: 150,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    icon: path.join(APP_ROOT, "app-icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMinimumSize(WIDTH, 150);
  win.setMaximumSize(WIDTH, 8000);

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadURL(WIDGET_URL);

  let saveTimer = null;
  win.on("move", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(savePos, 300);
  });

  win.webContents.on("context-menu", (e) => {
    e.preventDefault();
    showMenu();
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    writeLog("ERROR", `Renderer process gone: reason=${details?.reason} exitCode=${details?.exitCode}`);
    setTimeout(() => recoverWindow(`render-process-gone (${details?.reason})`), 1000);
  });

  win.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // ERR_ABORTED during reload
    writeLog("WARN", `did-fail-load: code=${errorCode} (${errorDescription}) url=${validatedURL}`);
    setTimeout(() => recoverWindow(`did-fail-load (${errorCode})`), 1500);
  });

  win.on("unresponsive", () => {
    writeLog("WARN", "Widget window became unresponsive");
    setTimeout(() => recoverWindow("window-unresponsive"), 2000);
  });

  win.on("closed", () => {
    win = null;
  });
}

function openSettingsOverlay() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }
  const disp = win && !win.isDestroyed() ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay();
  const wa = disp.workArea;
  settingsWin = new BrowserWindow({
    x: wa.x,
    y: wa.y,
    width: wa.width,
    height: wa.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "settings-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.setAlwaysOnTop(true, "screen-saver");
  settingsWin.loadURL("http://127.0.0.1:3100/settings");
  settingsWin.on("closed", () => {
    settingsWin = null;
    if (win && !win.isDestroyed()) win.webContents.send("widget-settings-changed");
  });
}

function openLogFolder() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    shell.openPath(LOG_DIR);
  } catch (err) {
    writeLog("WARN", `Failed to open log folder: ${err?.message || err}`);
  }
}

function showMenu() {
  if (!win) return;
  Menu.buildFromTemplate([
    {
      label: "Toggle Expand / Collapse",
      accelerator: "E",
      click: () => win.webContents.send("widget-toggle-expand"),
    },
    {
      label: "Refresh",
      accelerator: "R",
      click: () => recoverWindow("manual-refresh"),
    },
    {
      label: "Settings",
      accelerator: "CmdOrCtrl+,",
      click: () => openSettingsOverlay(),
    },
    {
      label: "Open log folder",
      click: () => openLogFolder(),
    },
    { type: "separator" },
    {
      label: "Quit",
      accelerator: "CmdOrCtrl+Q",
      click: () => app.quit(),
    },
  ]).popup({ window: win });
}

ipcMain.on("settings-close", () => {
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
});
ipcMain.on("get-usage-secret", (e) => {
  e.returnValue = usageSecret;
});

ipcMain.on("widget-close", () => app.quit());
ipcMain.on("widget-minimize", () => {
  if (win) win.minimize();
});
ipcMain.on("widget-open-settings", () => openSettingsOverlay());
ipcMain.on("widget-show-menu", () => showMenu());
ipcMain.on("widget-drag-start", (_e, sx, sy) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  dragOffset = { dx: sx - x, dy: sy - y };
});
ipcMain.on("widget-drag-move", (_e, sx, sy) => {
  if (!win || !dragOffset) return;
  win.setPosition(Math.round(sx - dragOffset.dx), Math.round(sy - dragOffset.dy));
});
ipcMain.on("widget-drag-end", () => {
  dragOffset = null;
  savePos();
});
ipcMain.on("widget-resize", (_e, width, height) => {
  if (!win) return;
  const disp = screen.getDisplayMatching(win.getBounds());
  const maxH = disp.workArea.height - 8;
  const h = Math.max(100, Math.min(Math.round(height), maxH));
  win.setSize(Math.round(width), h);
});

function startBgSampler() {
  const SETTINGS_FILE = path.join(APP_ROOT, "data", "settings.json");
  async function loop() {
    while (!quitting) {
      let mode = "auto";
      try {
        const s = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
        if (s?.themeMode === "light" || s?.themeMode === "dark" || s?.themeMode === "white") {
          mode = s.themeMode;
        }
      } catch {
        // Expected when settings.json has not been saved yet; default to auto
      }
      if (mode === "auto") {
        try {
          if (win && !win.isDestroyed() && !win.isMinimized() && win.isVisible()) {
            const display = screen.getPrimaryDisplay();
            const sources = await desktopCapturer.getSources({
              types: ["screen"],
              thumbnailSize: { width: 160, height: 90 },
            });
            const src = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
            if (src) {
              const buffer = src.thumbnail.toBitmap();
              let sum = 0;
              let count = 0;
              for (let i = 0; i + 3 < buffer.length; i += 12) {
                sum += buffer[i] + buffer[i + 1] + buffer[i + 2];
                count += 3;
              }
              const avg = count ? sum / count / 255 : 0.5;
              win.webContents.send("widget-bg", avg);
            }
          }
        } catch (err) {
          writeLog("WARN", `Screen brightness sample failed: ${err?.message || err}`);
        }
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
  loop();
}

app.whenReady().then(async () => {
  writeLog("INFO", "Widget starting up");
  ensureSecret();
  if (!(await serverIsUp())) {
    startServer();
  }
  const ok = await waitForServer();
  if (!usageSecret) ensureSecret();
  if (ok) {
    restartPolicy.reset();
    writeLog("INFO", "Server is ready; creating widget window");
    createWindow();
    startBgSampler();
  } else {
    writeLog("ERROR", "Server did not start within 60s timeout");
    console.error("Server did not start in time");
    app.quit();
  }
});

app.on("before-quit", () => stopServer());
app.on("window-all-closed", () => app.quit());
