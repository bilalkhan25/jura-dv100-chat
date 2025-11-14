import { useMemo, useState } from 'react';
import { loadState, saveState, initialDv100Data, type Dv100Data } from '../lib/dv100State';
import { validateAll } from '../lib/validation';
import { applyDerivedFields } from '../lib/derived';
import { fillDv100Pdf } from '../lib/pdfMapper';

type PreviewProps = {
  onBack: () => void;
};

type GroupEntry = {
  key: string;
  label: string;
  value: string;
};

type PreviewGroup = {
  key: string;
  title: string;
  entries: GroupEntry[];
};

const SCHEMA_GROUP_KEYS = Object.keys(initialDv100Data);

function humanize(key: string): string {
  return key
    .replace(/[_#]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'Not provided';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? 'Not provided' : String(value);
  }
  if (typeof value === 'string') {
    return value.trim() === '' ? 'Not provided' : value;
  }
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatValue(item)).join(', ') : 'Not provided';
  }
  return 'Not provided';
}

function collectEntries(value: unknown, path: string[]): GroupEntry[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectEntries(item, [...path, String(index)]));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => collectEntries(child, [...path, key]));
  }

  const label = humanize(path[path.length - 1] ?? '');
  return [
    {
      key: path.join('.'),
      label: label || '(Field)',
      value: formatValue(value),
    },
  ];
}

function buildGroups(data: Dv100Data): PreviewGroup[] {
  return SCHEMA_GROUP_KEYS.map((groupKey) => {
    const entries = collectEntries(data[groupKey as keyof Dv100Data], [groupKey]);
    return {
      key: groupKey,
      title: humanize(groupKey),
      entries,
    };
  }).filter((group) => group.entries.length > 0);
}

function mergeDerived(data: Dv100Data, derived: Record<string, unknown>): Dv100Data {
  const clone = structuredClone(data);

  function assign(target: Record<string, unknown>, source: Record<string, unknown>) {
    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        assign(target[key] as Record<string, unknown>, value as Record<string, unknown>);
      } else {
        target[key] = value as never;
      }
    });
  }

  assign(clone as Record<string, unknown>, derived);
  return clone;
}

function findIssuePath(result: ReturnType<typeof validateAll> | null): string | null {
  if (!result) {
    return null;
  }

  const firstMissing = result.required.missing[0];
  if (firstMissing) {
    return firstMissing.path;
  }

  const conflict = result.oneOf.results.find((group) => !group.ok);
  if (conflict) {
    const filled = conflict.conflicts?.filled ?? [];
    return filled[0] ?? conflict.group.fields[0] ?? null;
  }

  return null;
}

export function Preview({ onBack }: PreviewProps) {
  const [persistedState, setPersistedState] = useState(() => loadState());
  const [downloading, setDownloading] = useState(false);
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateAll> | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const derived = useMemo(() => applyDerivedFields(persistedState.data).derived, [persistedState.data]);
  const mergedData = useMemo(() => mergeDerived(persistedState.data, derived), [persistedState.data, derived]);
  const groups = useMemo(() => buildGroups(mergedData), [mergedData]);

  const handleDownload = async () => {
    const latestState = loadState();
    setPersistedState(latestState);

    const validation = validateAll(latestState.data);
    setValidationResult(validation);

    if (!validation.ok) {
      return;
    }

    setDownloadError(null);
    setDownloading(true);
    try {
      const derivedData = applyDerivedFields(latestState.data).derived;
      const blob = await fillDv100Pdf(latestState.data, derivedData);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'DV-100-filled.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Failed to generate DV-100 PDF', error);
      setDownloadError('Unable to generate the DV-100 PDF right now. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleGoFix = () => {
    const latestState = loadState();
    const nextStep = findIssuePath(validationResult) ?? latestState.step ?? null;
    saveState({ ...latestState, step: nextStep });
    onBack();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">Preview</p>
          <h1 className="text-3xl font-bold text-white">DV-100 Summary</h1>
          <p className="text-sm text-slate-300">
            Read-only record of everything captured so far. Fix any missing answers before downloading.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {downloadError && <p className="text-xs text-rose-300">{downloadError}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={onBack}
            >
              Back to Chat
            </button>
            <button
              type="button"
              className="rounded-full bg-[#f9f9f9] px-6 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? 'Preparing…' : 'Download DV-100'}
            </button>
          </div>
        </div>
      </div>

      {validationResult && !validationResult.ok && (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-semibold">Fix these items before downloading:</p>
            <button
              type="button"
              onClick={handleGoFix}
              className="rounded-full border border-rose-200/40 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-rose-50 transition hover:bg-rose-300/20"
            >
              Go Fix
            </button>
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {validationResult.required.missing.map((item) => (
              <li key={item.path}>{item.label}</li>
            ))}
            {validationResult.oneOf.results
              .filter((group) => !group.ok)
              .map((group) => {
                const filled = group.conflicts?.filled ?? [];
                return (
                  <li key={group.group.name}>
                    Resolve {group.group.name} ({group.group.rule}) — conflicting fields:{' '}
                    {filled.length ? filled.join(', ') : 'none'}.
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      <div className="grid gap-4">
        {groups.map((group) => (
          <section
            key={group.key}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white shadow-inner backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{group.title}</h2>
              <span className="text-xs uppercase tracking-widest text-slate-300">
                {group.entries.length} field{group.entries.length === 1 ? '' : 's'}
              </span>
            </div>
            <dl className="grid gap-3 md:grid-cols-2">
              {group.entries.map((entry) => (
                <div key={entry.key} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                  <dt className="text-xs uppercase tracking-widest text-slate-400">{entry.label}</dt>
                  <dd className="mt-2 whitespace-pre-line break-words text-base font-medium text-white">
                    {entry.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

export default Preview;
