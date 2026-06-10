// request_id → AbortController. Phase 1 fills cancel routing; the shape
// is locked here so handlers can already wire ui:agent:cancel through.

const controllers = new Map<string, AbortController>();

export function registerRequest(id: string): AbortController {
  const c = new AbortController();
  controllers.set(id, c);
  return c;
}

export function abortRequest(id: string): boolean {
  const c = controllers.get(id);
  if (!c) return false;
  c.abort();
  controllers.delete(id);
  return true;
}

export function clearRequest(id: string): void {
  controllers.delete(id);
}
