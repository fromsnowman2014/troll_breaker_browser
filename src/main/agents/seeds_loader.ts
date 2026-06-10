// Loads bundled VibeProfile seed JSON files. In dev, seeds live next to source
// under src/main/seeds/. In production, electron-vite copies them into the
// main process output directory — but Vite by default doesn't copy non-imported
// JSON. We solve this by importing them as JSON via Vite's resolver, falling
// back to fs read in dev.
//
// Simplest robust approach: read from a known directory relative to the main
// process file. In dev (`out/main/index.js` + cwd), we point at the project
// `src/main/seeds`. In packaged builds, electron-builder's `files` glob brings
// the seeds via the source tree (we re-emit them at build via copy script —
// see below).
//
// For Phase 1, we use Vite's `import.meta.glob` with eager: true so seeds get
// bundled into the main process JS as inlined JSON.

import { VibeProfileSchema } from "../shared/schemas/agents.js";
import type { VibeProfile } from "../shared/schemas/agents.js";

// Eagerly inline every seeds/*.json into the main bundle.
const seeds = import.meta.glob<{ default: unknown }>("../seeds/*.json", {
  eager: true,
});

function siteIdFromPath(path: string): string {
  const m = /\/([^/]+)\.json$/.exec(path);
  return m?.[1] ?? "";
}

const seedMap: Map<string, VibeProfile> = new Map(
  Object.entries(seeds)
    .map(([path, mod]) => {
      const data = (mod as { default: unknown }).default;
      const parsed = VibeProfileSchema.safeParse(data);
      if (!parsed.success) return null;
      return [siteIdFromPath(path), parsed.data] as const;
    })
    .filter((x): x is [string, VibeProfile] => x !== null),
);

export function loadSeed(site_id: string): VibeProfile | null {
  return seedMap.get(site_id) ?? null;
}

export function listSeededSites(): string[] {
  return Array.from(seedMap.keys());
}
