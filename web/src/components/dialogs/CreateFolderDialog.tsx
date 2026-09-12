import { useState } from 'react';
import { Dialog } from './Dialog';
import { apiErrorCode, apiErrorMessage } from '../../api/client';

export function CreateFolderDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<unknown>;
}) {
  const [name, setName] = useState('Untitled folder');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(name.trim());
      setName('Untitled folder');
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="New folder">
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
            Create
          </button>
        </div>
      </form>
    </Dialog>
  );
}
