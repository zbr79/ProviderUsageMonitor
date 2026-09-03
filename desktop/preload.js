const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("widget", {
  close: () => ipcRenderer.send("widget-close"),
  minimize: () => ipcRenderer.send("widget-minimize"),
  resize: (height) => ipcRenderer.send("widget-resize", height),
  onBg: (cb) => ipcRenderer.on("widget-bg", (_e, v) => cb(v)),
  onToggleExpand: (cb) => ipcRenderer.on("widget-toggle-expand", () => cb()),
});