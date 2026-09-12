import { toast } from 'sonner';
import { Trash2, RotateCcw, XCircle } from 'lucide-react';
import { useFileList, useFileMutations } from '../hooks/useFiles';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';
import { useState } from 'react';
import { fileIconFor } from '../lib/fileIcon';
import { formatDate } from '../lib/format';
import { apiErrorMessage } from '../api/client';

export function Trash() {
  const { data, isLoading } = useFileList('trash');
  const mutations = useFileMutations();
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);

  const items = data?.data ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg text-text">
          <Trash2 className="h-5 w-5" />
          Trash
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setEmptyConfirmOpen(true)}
            className="focus-ring rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-hover"
          >
            Empty trash
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-text-muted">Items in trash are permanently deleted after 30 days.</p>

      {isLoading ? null : items.length === 0 ? (
        <EmptyState Icon={Trash2} title="Trash is empty" hint="Files you delete appear here for 30 days before being permanently removed." />
      ) : (
        <div className="flex flex-col gap-0.5">
          {items.map((f) => {
            const { Icon, colorClass } = fileIconFor(f.mimeType, f.kind === 'folder');
            return (
              <div key={f.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg px-3 py-2 text-sm hover:bg-surface-hover">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
                  <span className="truncate">{f.name}</span>
                </div>
                <span className="text-text-muted">Trashed {formatDate(f.updatedAt)}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      mutations.restore.mutate(f.id, {
                        onSuccess: () => toast.success(`Restored "${f.name}"`),
                        onError: (err) => toast.error(apiErrorMessage(err)),
                      })
                    }
                    className="focus-ring rounded-full p-1.5 text-text-muted hover:bg-surface-hover"
                    aria-label={`Restore ${f.name}`}
                    title="Restore"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      mutations.permanentDelete.mutate(f.id, {
                        onSuccess: () => toast.success(`Permanently deleted "${f.name}"`),
                        onError: (err) => toast.error(apiErrorMessage(err)),
                      })
                    }
                    className="focus-ring rounded-full p-1.5 text-text-muted hover:bg-surface-hover"
                    aria-label={`Delete ${f.name} forever`}
                    title="Delete forever"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={emptyConfirmOpen}
        title="Empty trash"
        description="All items in trash will be permanently deleted. This cannot be undone."
        confirmLabel="Delete forever"
        danger
        onCancel={() => setEmptyConfirmOpen(false)}
        onConfirm={() => {
          mutations.emptyTrash.mutate(undefined, {
            onSuccess: (res) => toast.success(`Deleted ${res.deleted} item${res.deleted === 1 ? '' : 's'}`),
            onError: (err) => toast.error(apiErrorMessage(err)),
          });
          setEmptyConfirmOpen(false);
        }}
      />
    </div>
  );
}
