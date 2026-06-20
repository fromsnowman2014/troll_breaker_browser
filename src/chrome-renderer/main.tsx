import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChromeShell } from "./components/ChromeShell.js";
import { WelcomePage, needsOnboarding } from "./components/WelcomePage.js";
import { wireTabEvents, refreshTabList } from "./state/tabs.js";
import { useMenuRouting, useEscapeRouting } from "./lib/hotkeys.js";
import { useSettingsStore } from "./state/settings.js";
import { useAgentStore } from "./state/agent.js";
import { useChatStore } from "./state/chat.js";
import { ipc } from "./ipc.js";
import type { DefenseRequest } from "../main/shared/types.js";
import "./styles/tailwind.css";
import "./styles/globals.css";

function App() {
  const [onboarding, setOnboarding] = useState(needsOnboarding);
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
    const offFromSel = ipc.onAgentFromSelection(async (evt) => {
      const agent = useAgentStore.getState();
      const chat = useChatStore.getState();
      try {
        if (evt.kind === "attack") {
          const { request_id } = await ipc.agentAttack({
            draft: evt.selected_text,
            page_url: evt.page_url,
          });
          agent.start("attack", request_id);
          chat.setPrior(request_id);
        } else {
          const req: DefenseRequest = {
            claim: evt.selected_text,
            page_url: evt.page_url,
          };
          if (evt.kind === "fact-check") req.pipeline_hint = "fast";
          const { request_id } = await ipc.agentDefense(req);
          agent.start("defense", request_id);
          chat.setPrior(request_id);
        }
      } catch (err) {
        const e = err as Error & { code?: string };
        agent.start(evt.kind === "attack" ? "attack" : "defense", "preflight");
        agent.setError({ code: (e.code as never) ?? "unknown", message: e.message });
      }
    });
    return () => {
      offProgress();
      offResult();
      offError();
      offFromSel();
    };
  }, []);

  return (
    <>
      <ChromeShell />
      {onboarding && <WelcomePage onDone={() => setOnboarding(false)} />}
    </>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("root element missing");
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
