// Updater module test. We mock electron + electron-updater to verify that
// initUpdater wires the autoUpdater event handlers as expected.

import { describe, expect, it, vi, beforeEach } from "vitest";

const broadcastedEvents: string[] = [];

vi.mock("electron", () => ({
  app: {
    isPackaged: true,
    getVersion: () => "0.1.0",
  },
  BrowserWindow: {
    getFocusedWindow: () => ({
      isDestroyed: () => false,
      webContents: { send: (_ch: string, status: { kind: string }) => broadcastedEvents.push(status.kind) },
    }),
    getAllWindows: () => [],
  },
}));

const handlers = new Map<string, (...args: unknown[]) => void>();

vi.mock("electron-updater", () => ({
  autoUpdater: {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    on: (ev: string, fn: (...args: unknown[]) => void) => {
      handlers.set(ev, fn);
    },
    checkForUpdates: () => Promise.resolve(undefined),
    quitAndInstall: () => undefined,
  },
}));

beforeEach(() => {
  broadcastedEvents.length = 0;
  handlers.clear();
  vi.resetModules();
});

describe("updater", () => {
  it("wires all expected events when packaged", async () => {
    const { initUpdater } = await import("../src/main/lib/updater.js");
    initUpdater();
    // Trigger each handler
    handlers.get("checking-for-update")?.();
    handlers.get("update-available")?.({ version: "0.2.0" });
    handlers.get("update-not-available")?.();
    handlers.get("download-progress")?.({ percent: 42 });
    handlers.get("update-downloaded")?.({ version: "0.2.0" });
    handlers.get("error")?.(new Error("boom"));

    expect(broadcastedEvents).toContain("checking");
    expect(broadcastedEvents).toContain("available");
    expect(broadcastedEvents).toContain("not_available");
    expect(broadcastedEvents).toContain("downloading");
    expect(broadcastedEvents).toContain("ready");
    expect(broadcastedEvents).toContain("error");
  });
});
