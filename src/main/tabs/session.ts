// userData/session.json — atomic tmp+rename write, schema-validated read.
// Malformed files are backed up to session.json.bak.

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const SessionStateSchema = z.object({
  tabs: z.array(z.object({ url: z.string(), title: z.string() })),
  active_index: z.number().int().nonnegative(),
  written_at: z.string(),
});

export type SessionState = z.infer<typeof SessionStateSchema>;

const FILENAME = "session.json";
const BACKUP = "session.json.bak";

export async function loadSession(userDataDir: string): Promise<SessionState | null> {
  const path = join(userDataDir, FILENAME);
  let raw: string;
  try {
    raw = await fs.readFile(path, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await backup(userDataDir, raw);
    return null;
  }
  const result = SessionStateSchema.safeParse(parsed);
  if (!result.success) {
    await backup(userDataDir, raw);
    return null;
  }
  return result.data;
}

export async function saveSession(userDataDir: string, state: Omit<SessionState, "written_at">): Promise<void> {
  const tmp = join(userDataDir, `${FILENAME}.tmp`);
  const final = join(userDataDir, FILENAME);
  const data: SessionState = { ...state, written_at: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  await fs.mkdir(userDataDir, { recursive: true });
  await fs.writeFile(tmp, json, "utf-8");
  await fs.rename(tmp, final);
}

async function backup(userDataDir: string, content: string): Promise<void> {
  try {
    await fs.writeFile(join(userDataDir, BACKUP), content, "utf-8");
  } catch {
    // best-effort
  }
}
