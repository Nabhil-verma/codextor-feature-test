import { translateError } from "../lib/errors";

/**
 * Plain-English explanation of a sandbox error, rendered above the raw
 * console output so beginners get an actionable next step first.
 */
export default function ErrorNote({ raw }: { raw: string }) {
  const t = translateError(raw);
  return (
    <div className="mb-3 rounded-xl border border-gold-400/40 bg-gold-400/5 px-4 py-3 text-sm leading-relaxed">
      <p className="font-semibold text-ink-950">
        <span className="mr-2 text-gold-600">✦</span>
        {t.title}
      </p>
      <p className="mt-1 text-ink-700">{t.plain}</p>
      <p className="mt-1 text-ink-600">
        <span className="font-semibold text-ink-800">Try this: </span>
        {t.fix}
      </p>
    </div>
  );
}
