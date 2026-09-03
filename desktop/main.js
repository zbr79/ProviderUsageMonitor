const { app, BrowserWindow, Menu, ipcMain, screen, desktopCapturer } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const APP_ROOT = path.resolve(__dirname, "..");
const WIDGET_URL = "http://localhost:3000/widget";
const WIDTH = 238;
const CONFIG_PATH = path.join(app.getPath("userData"), "widget-config.json");

let win = null;

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
    return null;
  }
}

function savePos() {
  if (!win) return;
  const b = win.getBounds();
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height }));
  } catch {
    // ignore
  }
}

function startServer() {
  const child = spawn("cmd.exe", ["/c", "npm run start"], {
    cwd: APP_ROOT,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

async function waitForServer(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch("http://localhost:3000/widget", {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
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

  win.webContents.on("context-menu", () => {
    Menu.buildFromTemplate([
      {
        label: "Toggle Expand / Collapse",
        click: () => win.webContents.send("widget-toggle-expand"),
      },
      { label: "Refresh", click: () => win.reload() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]).popup({ window: win });
  });

  win.on("closed", () => {
    win = null;
  });
}

ipcMain.on("widget-close", () => app.quit());
ipcMain.on("widget-minimize", () => {
  if (win) win.minimize();
});
ipcMain.on("widget-resize", (_e, height) => {
  if (!win) return;
  const disp = screen.getDisplayMatching(win.getBounds());
  const maxH = disp.workArea.height - 8;
  const h = Math.max(100, Math.min(Math.round(height), maxH));
  win.setSize(WIDTH, h);
});

function startBgSampler() {
  setInterval(async () => {
    if (!win || win.isDestroyed()) return;
    try {
      const display = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 240, height: 135 },
      });
      const src = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
      if (!src) return;
      const size = src.thumbnail.getSize();
      const buffer = src.thumbnail.toBitmap();
      let sum = 0;
      let count = 0;
      for (let i = 0; i + 3 < buffer.length; i += 12) {
        sum += buffer[i] + buffer[i + 1] + buffer[i + 2];
        count += 3;
      }
      const avg = count ? sum / count / 255 : 0.5;
      win.webContents.send("widget-bg", avg);
    } catch {
      // ignore sampling errors
    }
  }, 1000);
}

app.whenReady().then(async () => {
  startServer();
  const ok = await waitForServer();
  if (ok) {
    createWindow();
    startBgSampler();
  } else {
    console.error("Server did not start in time");
    app.quit();
  }
});

app.on("window-all-closed", () => app.quit());