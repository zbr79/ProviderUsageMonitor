const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("widget", {
  close: () => ipcRenderer.send("widget-close"),
  minimize: () => ipcRenderer.send("widget-minimize"),
  resize: (height) => ipcRenderer.send("widget-resize", height),
});