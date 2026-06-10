// ui:tab:* handlers — delegate to TabManager. The router has already
// zod-validated the payload before this handler runs.

import { register } from "./router.js";
import { IPC } from "../shared/ipc-channels.js";
import { makeError, IpcError } from "../shared/errors.js";
import {
  TabIdSchema,
  TabOpenReqSchema,
  TabNavigateReqSchema,
  TabReloadReqSchema,
  TabFindStartReqSchema,
  TabFindNextReqSchema,
  TabChromeBoundsReqSchema,
  EmptyReqSchema,
} from "../shared/schemas/ipc.js";
import type { TabSummary } from "../shared/schemas/ipc.js";
import type { TabManager } from "../tabs/tab_manager.js";

function ensure(tm: TabManager | null): asserts tm is TabManager {
  if (!tm) {
    throw new IpcError(makeError("unknown", "TabManager not ready"));
  }
}

export function registerTabHandlers(getTm: () => TabManager | null): void {
  register<{ url?: string }, { tab_id: string }>(
    IPC.UI_TAB_OPEN,
    TabOpenReqSchema,
    (req) => {
      const tm = getTm();
      ensure(tm);
      const summary = tm.openTab(req.url);
      return { tab_id: summary.tab_id };
    },
  );

  register<{ tab_id: string }, { ok: true }>(IPC.UI_TAB_CLOSE, TabIdSchema, (req) => {
    const tm = getTm();
    ensure(tm);
    tm.closeTab(req.tab_id);
    return { ok: true };
  });

  register<{ tab_id: string }, { ok: true }>(IPC.UI_TAB_SWITCH, TabIdSchema, (req) => {
    const tm = getTm();
    ensure(tm);
    tm.switchTab(req.tab_id);
    return { ok: true };
  });

  register<{ tab_id: string; url: string }, { ok: true }>(
    IPC.UI_TAB_NAVIGATE,
    TabNavigateReqSchema,
    (req) => {
      const tm = getTm();
      ensure(tm);
      tm.navigate(req.tab_id, req.url);
      return { ok: true };
    },
  );

  register<{ tab_id: string; hard?: boolean }, { ok: true }>(
    IPC.UI_TAB_RELOAD,
    TabReloadReqSchema,
    (req) => {
      const tm = getTm();
      ensure(tm);
      tm.reload(req.tab_id, req.hard === true);
      return { ok: true };
    },
  );

  register<{ tab_id: string }, { ok: true }>(IPC.UI_TAB_BACK, TabIdSchema, (req) => {
    const tm = getTm();
    ensure(tm);
    tm.back(req.tab_id);
    return { ok: true };
  });

  register<{ tab_id: string }, { ok: true }>(IPC.UI_TAB_FORWARD, TabIdSchema, (req) => {
    const tm = getTm();
    ensure(tm);
    tm.forward(req.tab_id);
    return { ok: true };
  });

  register<undefined, TabSummary[]>(IPC.UI_TAB_LIST, EmptyReqSchema.optional(), () => {
    const tm = getTm();
    ensure(tm);
    return tm.list();
  });

  register<{ tab_id: string; text: string }, { ok: true }>(
    IPC.UI_TAB_FIND_START,
    TabFindStartReqSchema,
    (req) => {
      const tm = getTm();
      ensure(tm);
      tm.findStart(req.tab_id, req.text);
      return { ok: true };
    },
  );

  register<{ tab_id: string; forward: boolean }, { ok: true }>(
    IPC.UI_TAB_FIND_NEXT,
    TabFindNextReqSchema,
    (req) => {
      const tm = getTm();
      ensure(tm);
      tm.findNext(req.tab_id, req.forward);
      return { ok: true };
    },
  );

  register<{ tab_id: string }, { ok: true }>(IPC.UI_TAB_FIND_STOP, TabIdSchema, (req) => {
    const tm = getTm();
    ensure(tm);
    tm.findStop(req.tab_id);
    return { ok: true };
  });

  register<{ top: number }, { ok: true }>(
    IPC.UI_TAB_CHROME_BOUNDS,
    TabChromeBoundsReqSchema,
    (req) => {
      const tm = getTm();
      ensure(tm);
      tm.setChromeTopInset(req.top);
      return { ok: true };
    },
  );
}
