import { CheckCircle2, File as FileIcon, RotateCcw, X } from 'lucide-react';
import type { UploadItem } from '../hooks/useUpload';

export function UploadQueue({
  items,
  onCancel,
  onRetry,
  onDismiss,
}: {
  items: UploadItem[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;

  const activeCount = items.filter((i) => i.status === 'uploading' || i.status === 'pending').length;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
      role="region"
      aria-live="polite"
      aria-label="Upload progress"
    >
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        {activeCount > 0 ? `Uploading ${activeCount} item${activeCount > 1 ? 's' : ''}…` : 'Uploads complete'}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            {item.status === 'done' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#81c995]" />
            ) : item.status === 'error' ? (
              <FileIcon className="h-5 w-5 shrink-0 text-danger" />
            ) : (
              <FileIcon className="h-5 w-5 shrink-0 text-text-muted" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{item.file.name}</div>
              {item.status === 'uploading' && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                  />
                </div>
              )}
              {item.status === 'error' && <div className="text-xs text-danger">{item.error}</div>}
            </div>
            {item.status === 'error' ? (
              <button
                type="button"
                onClick={() => onRetry(item.id)}
                className="focus-ring rounded-full p-1 text-text-muted hover:bg-surface-hover"
                aria-label={`Retry ${item.file.name}`}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (item.status === 'done' || item.status === 'error' ? onDismiss(item.id) : onCancel(item.id))}
                className="focus-ring rounded-full p-1 text-text-muted hover:bg-surface-hover"
                aria-label={`Dismiss ${item.file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
