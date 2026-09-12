import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
import type { FileDTO } from '../../types';
import { apiErrorCode, apiErrorMessage } from '../../api/client';

export function RenameDialog({
  file,
  onClose,
  onRename,
}: {
  file: FileDTO | null;
  onClose: () => void;
  onRename: (id: string, name: string) => Promise<unknown>;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (file) {
      setName(file.name);
      setError(null);
    }
  }, [file]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onRename(file.id, name.trim());
      onClose();
    } catch (err) {
      setError(
        apiErrorCode(err) === 'NAME_CONFLICT'
          ? 'A file or folder with that name already exists here.'
          : apiErrorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()} title="Rename">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          className="focus-ring rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focus-ring rounded-full px-4 py-2 text-sm hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="focus-ring rounded-full bg-accent px-4 py-2 text-sm font-medium text-[#1b1b1b] disabled:opacity-50"
          >
            Rename
          </button>
        </div>
      </form>
    </Dialog>
  );
}
