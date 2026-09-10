const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("settingsWindow", {
  close: () => ipcRenderer.send("settings-close"),
});