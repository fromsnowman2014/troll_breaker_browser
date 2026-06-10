// Page preload — loaded into every WebContentsView (one tab = one instance).
// Phase 0: responders defined but main does not invoke them. Three messages only,
// opaque tokens with 120s TTL, no Node / fs / network access. See ARCHITECTURE.md §6.

import { contextBridge, ipcRenderer } from "electron";

const TOKEN_TTL_MS = 120_000;

type TokenRecord = {
  token: string;
  expiresAt: number;
  ref: WeakRef<HTMLElement>;
};

let activeToken: TokenRecord | null = null;

function mintToken(el: HTMLElement): string {
  const token = crypto.randomUUID();
  activeToken = {
    token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
    ref: new WeakRef(el),
  };
  return token;
}

function resolveToken(token: string): HTMLElement | null {
  if (!activeToken || activeToken.token !== token) return null;
  if (Date.now() > activeToken.expiresAt) {
    activeToken = null;
    return null;
  }
  const el = activeToken.ref.deref();
  return el ?? null;
}

ipcRenderer.on("page:selection:get", (_event, replyChannel: string) => {
  const sel = window.getSelection();
  const text = sel?.toString() ?? "";
  ipcRenderer.send(replyChannel, { text, url: location.href });
});

ipcRenderer.on("page:textarea:focused", (_event, replyChannel: string) => {
  const el = document.activeElement as HTMLElement | null;
  const isInput =
    !!el &&
    (el.tagName === "TEXTAREA" ||
      (el.tagName === "INPUT" && (el as HTMLInputElement).type === "text") ||
      el.isContentEditable);
  if (!isInput || !el) {
    ipcRenderer.send(replyChannel, { has_focus: false });
    return;
  }
  const token = mintToken(el);
  ipcRenderer.send(replyChannel, {
    has_focus: true,
    token,
    hint: `${el.tagName.toLowerCase()} on ${location.hostname}`,
  });
});

ipcRenderer.on(
  "page:textarea:insert",
  (_event, replyChannel: string, payload: { token: string; text: string }) => {
    const el = resolveToken(payload.token);
    if (!el) {
      ipcRenderer.send(replyChannel, { ok: false, reason: "textarea_token_stale" });
      return;
    }
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      (el as HTMLInputElement | HTMLTextAreaElement).value = payload.text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (el.isContentEditable) {
      el.textContent = payload.text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    ipcRenderer.send(replyChannel, { ok: true });
  },
);

const bridge = { __version: 1 as const };
contextBridge.exposeInMainWorld("__truthAndStrike", bridge);

console.info("[Truth & Strike] page-preload loaded");
