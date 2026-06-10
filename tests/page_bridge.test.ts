// page_bridge.invokePage round-trip with a mocked WebContents + ipcMain.

import { describe, expect, it, vi, beforeEach } from "vitest";

// We need to mock electron's ipcMain before importing page_bridge.
const replyHandlers = new Map<string, (event: unknown, data: unknown) => void>();

vi.mock("electron", () => {
  return {
    ipcMain: {
      once: vi.fn((ch: string, h: (event: unknown, data: unknown) => void) => {
        replyHandlers.set(ch, h);
      }),
      removeAllListeners: vi.fn((ch: string) => {
        if (ch) replyHandlers.delete(ch);
      }),
    },
  };
});

import { invokePage } from "../src/main/ipc/page_bridge.js";

beforeEach(() => {
  replyHandlers.clear();
});

function makeWc() {
  return {
    send: vi.fn((_ch: string, _replyCh: string) => undefined),
  };
}

describe("invokePage", () => {
  it("resolves when preload replies", async () => {
    const wc = makeWc();
    const p = invokePage<{ ok: boolean }>(
      wc as unknown as Electron.WebContents,
      "page:textarea:focused",
    );
    // Find the reply channel used by send + fire it.
    const sendCalls = wc.send.mock.calls;
    expect(sendCalls.length).toBe(1);
    const replyCh = sendCalls[0]?.[1] as string;
    expect(replyCh.startsWith("page:reply:")).toBe(true);
    const handler = replyHandlers.get(replyCh)!;
    handler({}, { ok: true });
    expect(await p).toEqual({ ok: true });
  });

  it("rejects on timeout", async () => {
    const wc = makeWc();
    await expect(
      invokePage(
        wc as unknown as Electron.WebContents,
        "page:textarea:focused",
        undefined,
        { timeoutMs: 30 },
      ),
    ).rejects.toThrow(/page_preload_unavailable/);
  });

  it("forwards payload as 3rd arg", async () => {
    const wc = makeWc();
    const p = invokePage(
      wc as unknown as Electron.WebContents,
      "page:textarea:insert",
      { token: "t", text: "hi" },
    );
    const sendCalls = wc.send.mock.calls;
    expect(sendCalls[0]?.[2]).toEqual({ token: "t", text: "hi" });
    const replyCh = sendCalls[0]?.[1] as string;
    replyHandlers.get(replyCh)!({}, { ok: true });
    await p;
  });
});
