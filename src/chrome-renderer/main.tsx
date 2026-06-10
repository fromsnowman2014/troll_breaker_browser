import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ChromeShell } from "./components/ChromeShell.js";
import { wireTabEvents, refreshTabList } from "./state/tabs.js";
import { useMenuRouting, useEscapeRouting } from "./lib/hotkeys.js";
import { useSettingsStore } from "./state/settings.js";
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
    void ipc.settingsGet().then((v) => useSettingsStore.getState().set(v));
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
