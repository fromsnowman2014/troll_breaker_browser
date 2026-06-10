// Chrome-renderer preload — exposes the typed IPC bridge to the React app.
// Phase 0: only the bare `invoke`/`on`/`off` surface; channels are added incrementally.

import { contextBridge, ipcRenderer } from "electron";

const bridge = {
  invoke: <T = unknown>(channel: string, payload?: unknown): Promise<T> =>
    ipcRenderer.invoke(channel, payload) as Promise<T>,

  on: (channel: string, handler: (payload: unknown) => void): (() => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown) => handler(payload);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.off(channel, wrapped);
  },
};

contextBridge.exposeInMainWorld("truthAndStrike", bridge);

export type TruthAndStrikeBridge = typeof bridge;
