import { useStorageUsage } from '../hooks/useFiles';
import { formatBytes } from '../lib/format';

export function StorageMeter() {
  const { data } = useStorageUsage();
  if (!data) return null;

  const fraction = data.quota > 0 ? data.used / data.quota : 0;
  const percent = Math.min(100, Math.round(fraction * 100));
  const isDanger = fraction >= 0.9;

  return (
    <div className="px-3 py-3 text-xs">
      <div className="mb-1.5 text-text-muted">Storage ({percent}% full)</div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${percent}%`,
            backgroundColor: isDanger ? 'var(--danger)' : 'var(--accent)',
          }}
        />
      </div>
      <div className="mt-1.5 text-text-muted">
        {formatBytes(data.used)} of {formatBytes(data.quota)} used
      </div>
      <button
        type="button"
        className="focus-ring mt-3 w-full rounded-full border border-border px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
        disabled
        title="Not applicable — this is a take-home project, not a real storage product"
      >
        Get more storage
      </button>
    </div>
  );
}
