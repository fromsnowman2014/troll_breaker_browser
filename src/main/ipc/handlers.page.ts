// Page preload bridge — Phase 0 does NOT invoke any page:* channel from main.
// The preload script registers ipcRenderer.on listeners; main would normally
// call webContents.send(channel, replyChannel, payload) and await the reply.
// Phase 1 will fill this in.

export function registerPageHandlers(): void {
  // Intentionally empty in Phase 0. Listener registration in main is deferred
  // until the orchestrator needs selection/insert bridges.
}
