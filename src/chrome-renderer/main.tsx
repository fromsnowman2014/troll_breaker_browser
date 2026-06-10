import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ChromeShell } from "./components/ChromeShell.js";
import { wireTabEvents, refreshTabList } from "./state/tabs.js";
import { useMenuRouting, useEscapeRouting } from "./lib/hotkeys.js";
import { useSettingsStore } from "./state/settings.js";
import { useAgentStore } from "./state/agent.js";
import { ipc } from "./ipc.js";
import "./styles/tailwind.css";
import "./styles/globals.css";

function App() {
  useMenuRouting();
  useEscapeRouting();

  useEffect(() => {
    const off = wireTabEvents();
    void refreshTabList();
    return off;
  }, []);

  useEffect(() => {
    // Hydrate settings view from main.
    void ipc.settingsGet().then((v) => useSettingsStore.getState().set(v));
  }, []);

  useEffect(() => {
    // Wire agent events into the agent store.
    const offProgress = ipc.onAgentProgress((evt) => {
      const cur = useAgentStore.getState().session;
      if (!cur || cur.request_id !== evt.request_id) return;
      useAgentStore.getState().setStage(evt.stage, evt.label);
    });
    const offResult = ipc.onAgentResult((evt) => {
      const cur = useAgentStore.getState().session;
      if (!cur || cur.request_id !== evt.request_id) return;
      useAgentStore.getState().setResult(evt.payload);
    });
    const offError = ipc.onAgentError((evt) => {
      const cur = useAgentStore.getState().session;
      if (!cur || cur.request_id !== evt.request_id) return;
      useAgentStore.getState().setError(evt.error);
    });
    return () => {
      offProgress();
      offResult();
      offError();
    };
  }, []);

  return <ChromeShell />;
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("root element missing");
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
