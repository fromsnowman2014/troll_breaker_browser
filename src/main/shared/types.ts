// Pure-TS types derived from zod schemas. Renderer imports from here so it
// doesn't pull zod runtime into the chrome-renderer bundle unnecessarily
// (though the schemas are small enough that it's fine if it does).

export type {
  Settings,
  SettingsView,
} from "./schemas/settings.js";

export type {
  TabSummary,
  DefenseRequest,
  AttackRequest,
  RefineRequest,
} from "./schemas/ipc.js";

export type { AppError, AppErrorCode } from "./errors.js";
