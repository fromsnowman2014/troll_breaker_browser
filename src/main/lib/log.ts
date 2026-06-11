// Minimal logger. Always logs in dev (when app.isPackaged === false), or when
// TS_DEBUG=1 in env. Production stays silent unless explicitly enabled.

import { app } from "electron";

function shouldLog(): boolean {
  if (process.env["TS_DEBUG"] === "1") return true;
  try {
    return !app.isPackaged;
  } catch {
    return true;
  }
}

const tag = "[T&S]";

export const log = {
  info(...args: unknown[]): void {
    if (shouldLog()) console.log(tag, ...args);
  },
  warn(...args: unknown[]): void {
    if (shouldLog()) console.warn(tag, ...args);
  },
  error(...args: unknown[]): void {
    console.error(tag, ...args);
  },
};
