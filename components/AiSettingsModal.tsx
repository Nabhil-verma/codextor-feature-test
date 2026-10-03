import { useEffect, useRef, useState } from "react";
import {
  loadAiSettings,
  saveAiSettings,
  type AiSettings,
  type AiProvider,
} from "../lib/ai";

const inputCls =
  "w-full rounded-xl border border-paper-300 bg-paper-50 px-4 py-2.5 text-sm text-ink-950 outline-none transition placeholder:text-ink-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/25";

export default function AiSettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings);
  const [saved, setSaved] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = (patch: Partial<AiSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = () => {
    saveAiSettings(settings);
    setSaved(true);
  };

  const hasKey = (p: AiProvider) => !!(p && settings.keys[p]?.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
        className="w-full max-w-lg rounded-2xl border border-paper-200 bg-paper-50 p-8 shadow-lift"
      >
        <p className="eyebrow">settings</p>
        <h2
          id="ai-settings-title"
          className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-950"
        >
          AI Tutor Settings
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          The Socratic tutor is 100% optional. If you want guided help, bring your own
          API key for Google Gemini or Anthropic Claude. Keys stay in your browser and are
          sent only to the provider you choose.
        </p>

        {/* Provider toggle */}
        <div className="mt-6 space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            provider
          </p>
          <div className="flex gap-3">
            {(["gemini", "claude"] as AiProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update({ provider: settings.provider === p ? null : p })}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition ${
                  settings.provider === p
                    ? "border-gold-400 bg-gold-400/10 ring-2 ring-gold-400/25"
                    : "border-paper-200 hover:border-ink-300"
                }`}
              >
                <span className="block font-display text-lg font-semibold text-ink-950">
                  {p === "gemini" ? "Google Gemini" : "Anthropic Claude"}
                </span>
                <span className="mt-0.5 block text-xs text-ink-600">
                  {hasKey(p) ? "key saved" : "no key"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* API key inputs */}
        {settings.provider && (
          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-ink-500">
                {settings.provider === "gemini"
                  ? "Gemini API Key"
                  : "Claude API Key"}
              </label>
              <input
                ref={firstRef}
                type="password"
                value={settings.keys[settings.provider] ?? ""}
                onChange={(e) =>
                  update({
                    keys: { ...settings.keys, [settings.provider!]: e.target.value },
                  })
                }
                className={inputCls}
                placeholder={
                  settings.provider === "gemini"
                    ? "AIza..."
                    : "sk-ant-..."
                }
              />
              <p className="mt-1 text-[11px] text-ink-500">
                {settings.provider === "gemini"
                  ? "Get a key at aistudio.google.com"
                  : "Get a key at console.anthropic.com"}
              </p>
            </div>
          </div>
        )}

        {/* Tutor name */}
        <div className="mt-5">
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-ink-500">
            Your name (optional, for the tutor)
          </label>
          <input
            value={settings.tutorName}
            onChange={(e) => update({ tutorName: e.target.value })}
            className={inputCls}
            placeholder="e.g. Ada"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-sm text-ink-600 hover:text-ink-950"
          >
            close
          </button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="font-mono text-xs text-green-600">
                saved!
              </span>
            )}
            <button type="button" onClick={handleSave} className="btn-gold !px-5">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
