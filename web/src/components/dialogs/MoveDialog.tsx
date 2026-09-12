import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Folder, HardDrive } from 'lucide-react';
import { Dialog } from './Dialog';
import type { FileDTO } from '../../types';
import * as filesApi from '../../api/files';
import { apiErrorMessage } from '../../api/client';

export function MoveDialog({
  file,
  onClose,
  onMove,
}: {
  file: FileDTO | null;
  onClose: () => void;
  onMove: (id: string, parentId: string | null) => Promise<unknown>;
}) {
  const [stack, setStack] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'My Drive' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const current = stack[stack.length - 1]!;

  const foldersQuery = useQuery({
    queryKey: ['move-folders', current.id],
    queryFn: () => filesApi.listFiles({ parentId: current.id ?? undefined, kind: 'folder' }),
    enabled: !!file,
  });

  async function moveHere() {
    if (!file) return;
    setError(null);
    try {
      await onMove(file.id, current.id);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!file) return null;

  return (
    <Dialog
      open={!!file}
      onOpenChange={(o) => {
        if (!o) {
          setStack([{ id: null, name: 'My Drive' }]);
          onClose();
        }
      }}
      title={`Move "${file.name}"`}
    >
      <div className="mb-2 flex items-center gap-2 text-sm text-text-muted">
        {stack.length > 1 && (
          <button
            type="button"
            onClick={() => setStack((s) => s.slice(0, -1))}
            className="focus-ring rounded-full p-1 hover:bg-surface-hover"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <span className="truncate">{stack.map((s) => s.name).join(' / ')}</span>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
        {foldersQuery.data?.data.length ? (
          foldersQuery.data.data
            .filter((f) => f.id !== file.id)
            .map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setStack((s) => [...s, { id: folder.id, name: folder.name }])}
                className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover"
              >
                <Folder className="h-4 w-4 text-accent" />
                {folder.name}
              </button>
            ))
        ) : (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-text-muted">
            <HardDrive className="h-4 w-4" />
            No subfolders here
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="focus-ring rounded-full px-4 py-2 text-sm hover:bg-surface-hover">
          Cancel
        </button>
        <button
          type="button"
          onClick={moveHere}
          disabled={current.id === file.parentId}
          className="focus-ring rounded-full bg-accent px-4 py-2 text-sm font-medium text-[#1b1b1b] disabled:opacity-50"
        >
          Move here
        </button>
      </div>
    </Dialog>
  );
}
