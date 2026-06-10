// Cookie-aware HTML fetch via Electron's net module. The default session is
// used so user-logged-in sessions can read protected community pages
// (e.g. fmkorea best list while logged in).
//
// Falls back to plain fetch when net is unavailable (e.g. in unit tests).

import { net, session as electronSession } from "electron";

interface FetchOpts {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function fetchPage(url: string, opts: FetchOpts = {}): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const ok = (text: string) => {
      if (settled) return;
      settled = true;
      resolve(text);
    };

    const timer = setTimeout(() => fail(new Error("timeout")), timeoutMs);
    const onAbort = () => fail(new Error("cancelled"));
    if (opts.signal) {
      if (opts.signal.aborted) {
        clearTimeout(timer);
        fail(new Error("cancelled"));
        return;
      }
      opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      const request = net.request({
        method: "GET",
        url,
        session: electronSession.defaultSession,
        useSessionCookies: true,
        redirect: "follow",
      });
      request.setHeader(
        "User-Agent",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      );
      request.setHeader("Accept", "text/html,application/xhtml+xml");

      request.on("response", (resp) => {
        const chunks: Buffer[] = [];
        resp.on("data", (chunk) => {
          chunks.push(chunk);
        });
        resp.on("end", () => {
          clearTimeout(timer);
          opts.signal?.removeEventListener("abort", onAbort);
          if (resp.statusCode >= 400) {
            fail(new Error(`HTTP ${resp.statusCode}`));
            return;
          }
          ok(Buffer.concat(chunks).toString("utf-8"));
        });
        resp.on("error", (err) => {
          clearTimeout(timer);
          opts.signal?.removeEventListener("abort", onAbort);
          fail(err instanceof Error ? err : new Error(String(err)));
        });
      });
      request.on("error", (err) => {
        clearTimeout(timer);
        opts.signal?.removeEventListener("abort", onAbort);
        fail(err instanceof Error ? err : new Error(String(err)));
      });
      request.end();
    } catch (err) {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
      fail(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
