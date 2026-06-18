// Settings drawer — real implementation (Phase 1).
//   - LLM section: provider/model dropdown, API key input, Test connection
//   - Search section: provider, API key
//   - Vibe section: default site
//   - Privacy: clear browsing data / clear keys / reset all (each w/ confirm)
//   - About: version
//
// Keychain-unavailable banner shown when encryption_available === false.

import { useEffect, useState } from "react";
import { useUiStore } from "../state/store.js";
import { useSettingsStore } from "../state/settings.js";
import { ipc } from "../ipc.js";
import { t } from "../lib/strings.js";
import type { SettingsView } from "../../main/shared/types.js";
import { PrivacyPage } from "./PrivacyPage.js";

const SEARCH_OPTIONS = [
  { value: "brave", label: "Brave Search" },
  { value: "disabled", label: "비활성화" },
] as const;

export function SettingsDrawer() {
  const open = useUiStore((s) => s.drawerOpen);
  const setOpen = useUiStore((s) => s.setDrawerOpen);
  const view = useSettingsStore((s) => s.view);
  const setView = useSettingsStore((s) => s.set);

  useEffect(() => {
    if (open) void ipc.drawerOpen();
    else void ipc.drawerClose();
  }, [open]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={[
          "pointer-events-none fixed inset-0 z-40 bg-black/30 transition-opacity duration-150",
          open ? "pointer-events-auto opacity-100" : "opacity-0",
        ].join(" ")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("drawer_title")}
        className={[
          "fixed right-0 top-0 z-50 flex h-screen w-[360px] max-w-[90vw] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-[0_1px_2px_rgba(0,0,0,0.25)]",
          "transition-transform duration-[180ms] ease-out will-change-transform",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
          <h2 className="text-sm font-semibold">{t("drawer_title")}</h2>
          <button
            aria-label={t("drawer_close")}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {!view.encryption_available && (
            <div
              role="alert"
              className="mb-4 rounded-card border border-[var(--color-warning)] bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]"
            >
              {t("keychain_unavailable")}
            </div>
          )}

          <LlmSection view={view} onRefresh={setView} />
          <SearchSection view={view} onRefresh={setView} />
          <VibeSection view={view} onRefresh={setView} />
          <PrivacySection view={view} onRefresh={setView} />
          <AboutSection />
        </div>
      </aside>
    </>
  );
}

interface SectionProps {
  view: SettingsView;
  onRefresh: (v: SettingsView) => void;
}

function LlmSection(_props: SectionProps) {
  const [testStatus, setTestStatus] = useState<
    null | { ok: boolean; latency_ms?: number; error?: string }
  >(null);
  const [testing, setTesting] = useState(false);

  async function runTest() {
    setTesting(true);
    setTestStatus(null);
    try {
      const r = await ipc.settingsTestLlm();
      setTestStatus(r);
    } catch (err) {
      setTestStatus({ ok: false, error: (err as Error).message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Section title={t("section_llm")}>
      <div className="mb-3 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-fg-muted)]">
        <span className="font-medium text-[var(--color-fg)]">text-prime</span>
        {"  ·  "}공유 프록시 (API 키 불필요)
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void runTest()}
          disabled={testing}
          className="h-7 rounded border border-[var(--color-border)] px-3 text-xs hover:bg-white/10 disabled:opacity-50"
        >
          {testing ? "테스트 중…" : t("field_test")}
        </button>
        {testStatus && testStatus.ok && (
          <span className="text-xs text-[var(--color-success)]">
            ✓ {testStatus.latency_ms ?? 0}ms
          </span>
        )}
        {testStatus && !testStatus.ok && (
          <span className="text-xs text-[var(--color-danger)]" title={testStatus.error}>
            ✗ {testStatus.error?.slice(0, 30) ?? "실패"}
          </span>
        )}
      </div>
    </Section>
  );
}

function SearchSection({ view, onRefresh }: SectionProps) {
  const [draftKey, setDraftKey] = useState("");
  const [editing, setEditing] = useState(!view.key_present.search.present);

  async function changeProvider(p: "brave" | "disabled") {
    const updated = await ipc.settingsSet({ search: { provider: p } });
    onRefresh(updated);
  }

  async function saveKey() {
    if (!draftKey) return;
    await ipc.settingsPutKey("search", draftKey);
    setDraftKey("");
    setEditing(false);
    const v = await ipc.settingsGet();
    onRefresh(v);
  }

  async function clearKey() {
    await ipc.settingsClearKey("search");
    setEditing(true);
    const v = await ipc.settingsGet();
    onRefresh(v);
  }

  return (
    <Section title={t("section_search")}>
      <Field label={t("field_provider")}>
        <select
          value={view.search.provider}
          onChange={(e) => void changeProvider(e.target.value as "brave" | "disabled")}
          className="h-8 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm"
        >
          {SEARCH_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      {view.search.provider === "brave" && (
        <Field label={t("field_api_key")}>
          {editing ? (
            <div className="flex gap-1">
              <input
                type="password"
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="BSA..."
                className="h-8 flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm"
              />
              <button
                onClick={() => void saveKey()}
                disabled={!draftKey}
                className="h-8 rounded bg-[var(--color-accent)] px-3 text-xs text-white disabled:opacity-30"
              >
                {t("field_save")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono text-xs text-[var(--color-fg-muted)]">
                ••••{view.key_present.search.last4 ?? ""}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="h-7 rounded px-2 text-xs text-[var(--color-fg-muted)] hover:bg-white/10"
              >
                편집
              </button>
              <button
                onClick={() => void clearKey()}
                className="h-7 rounded px-2 text-xs text-[var(--color-danger)] hover:bg-white/10"
              >
                {t("field_clear")}
              </button>
            </div>
          )}
        </Field>
      )}
    </Section>
  );
}

function VibeSection({ view, onRefresh }: SectionProps) {
  async function changeDefault(site: string) {
    const updated = await ipc.settingsSet({ vibe: { default_site_id: site } });
    onRefresh(updated);
  }
  return (
    <Section title={t("section_vibe")}>
      <Field label="기본 사이트">
        <select
          value={view.vibe.default_site_id}
          onChange={(e) => void changeDefault(e.target.value)}
          className="h-8 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm"
        >
          <option value="generic_korean_cynical">일반 (한국어, 냉소)</option>
          <option value="fmkorea">에펨코리아</option>
        </select>
      </Field>
    </Section>
  );
}

function PrivacySection({ view: _view, onRefresh }: SectionProps) {
  const [confirming, setConfirming] = useState<null | "browsing" | "keys" | "all">(null);

  async function doClearBrowsing() {
    await ipc.settingsClearBrowsingData({ cookies: true, cache: true, history: true });
    setConfirming(null);
  }
  async function doClearKeys() {
    await ipc.settingsClearKey("search");
    const v = await ipc.settingsGet();
    onRefresh(v);
    setConfirming(null);
  }
  async function doResetAll() {
    const v = await ipc.settingsResetAll();
    onRefresh(v);
    setConfirming(null);
  }

  return (
    <Section title={t("section_privacy")}>
      <div className="flex flex-col gap-2">
        <DangerButton onClick={() => setConfirming("browsing")}>
          {t("clear_browsing_data")}
        </DangerButton>
        <DangerButton onClick={() => setConfirming("keys")}>
          {t("clear_stored_keys")}
        </DangerButton>
        <DangerButton onClick={() => setConfirming("all")}>
          {t("reset_all")}
        </DangerButton>
      </div>
      {confirming && (
        <div className="mt-3 rounded-card border border-[var(--color-warning)] bg-[var(--color-bg)] p-3 text-xs">
          <p className="mb-2">정말 진행하시겠습니까?</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirming === "browsing") void doClearBrowsing();
                else if (confirming === "keys") void doClearKeys();
                else void doResetAll();
              }}
              className="rounded bg-[var(--color-danger)] px-3 py-1 text-white"
            >
              확인
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="rounded border border-[var(--color-border)] px-3 py-1"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

function AboutSection() {
  const [info, setInfo] = useState<{
    version: string;
    electron: string;
    chrome: string;
    node: string;
  } | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    void ipc.aboutGet().then((i) => setInfo(i));
  }, []);

  return (
    <>
      <Section title={t("section_about")}>
        <p className="text-xs text-[var(--color-fg-muted)]">
          v{info?.version ?? "..."}
        </p>
        {info && (
          <p className="mt-1 text-[10px] text-[var(--color-fg-muted)]">
            Electron {info.electron} · Chrome {info.chrome} · Node {info.node}
          </p>
        )}
        <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
          Truth &amp; Strike — debate browser.
        </p>
        <button
          onClick={() => setPrivacyOpen(true)}
          className="mt-3 text-xs text-[var(--color-accent)] hover:underline"
        >
          개인정보 처리 방침
        </button>
        <div className="mt-1">
          <button
            onClick={() => void ipc.updaterCheck()}
            className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            업데이트 확인
          </button>
        </div>
      </Section>
      {privacyOpen && <PrivacyPage onClose={() => setPrivacyOpen(false)} />}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
        {title}
      </h3>
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
        {children}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="mb-1 block text-xs text-[var(--color-fg-muted)]">{label}</label>
      {children}
    </div>
  );
}

function DangerButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-8 rounded border border-[var(--color-border)] px-3 text-left text-xs text-[var(--color-danger)] hover:bg-white/5"
    >
      {children}
    </button>
  );
}
