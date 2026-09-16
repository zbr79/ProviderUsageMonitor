const { contextBridge, ipcRenderer } = require("electron");

const secret = ipcRenderer.sendSync("get-usage-secret") ?? "";

contextBridge.exposeInMainWorld("settingsWindow", {
  secret,
  close: () => ipcRenderer.send("settings-close"),
});
