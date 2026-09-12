import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from './Dialog';
import type { FileDTO } from '../../types';
import * as filesApi from '../../api/files';
import { apiErrorCode, apiErrorMessage } from '../../api/client';

export function ShareDialog({ file, onClose }: { file: FileDTO | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [error, setError] = useState<string | null>(null);

  const sharesQuery = useQuery({
    queryKey: ['shares', file?.id],
    queryFn: () => filesApi.listShares(file!.id),
    enabled: !!file,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['shares', file?.id] });

  const addShare = useMutation({
    mutationFn: () => filesApi.createShare(file!.id, email.trim(), role),
    onSuccess: () => {
      setEmail('');
      setError(null);
      invalidate();
    },
    onError: (err) => {
      setError(
        apiErrorCode(err) === 'ALREADY_SHARED'
          ? 'Already shared with that person.'
          : apiErrorCode(err) === 'CANNOT_SHARE_WITH_SELF'
            ? 'You cannot share with yourself.'
            : apiErrorMessage(err),
      );
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role: r }: { userId: string; role: 'viewer' | 'editor' }) =>
      filesApi.updateShareRole(file!.id, userId, r),
    onSuccess: invalidate,
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => filesApi.revokeShare(file!.id, userId),
    onSuccess: invalidate,
  });

  const createLink = useMutation({
    mutationFn: () => filesApi.createPublicLink(file!.id),
    onSuccess: async (link) => {
      await navigator.clipboard.writeText(link.url).catch(() => {});
      toast.success('Link copied to clipboard');
      void qc.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const revokeLink = useMutation({
    mutationFn: () => filesApi.revokePublicLink(file!.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['files'] }),
  });

  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()} title={`Share "${file.name}"`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) addShare.mutate();
        }}
        className="flex gap-2"
      >
        <input
          type="email"
          required
          placeholder="Add people by email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-ring flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
          className="focus-ring rounded-lg border border-border bg-surface-2 px-2 text-sm text-text"
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button
          type="submit"
          disabled={addShare.isPending}
          className="focus-ring rounded-full bg-accent px-4 py-2 text-sm font-medium text-[#1b1b1b] disabled:opacity-50"
        >
          Share
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-4 max-h-56 overflow-y-auto">
        {sharesQuery.data?.length ? (
          sharesQuery.data.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg px-1 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate">{s.email}</div>
                {!s.userId && <div className="text-xs text-text-muted">Pending — not signed up yet</div>}
              </div>
              <select
                value={s.role}
                disabled={!s.userId}
                onChange={(e) =>
                  s.userId && updateRole.mutate({ userId: s.userId, role: e.target.value as 'viewer' | 'editor' })
                }
                className="focus-ring rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                type="button"
                onClick={() => s.userId && revoke.mutate(s.userId)}
                disabled={!s.userId}
                className="focus-ring rounded-full p-1.5 text-text-muted hover:bg-surface-hover"
                aria-label={`Remove ${s.email}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <p className="py-3 text-sm text-text-muted">Not shared with anyone yet.</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4 text-text-muted" />
          {file.hasPublicLink ? 'Anyone with the link can view' : 'Restricted — only shared people can open'}
        </div>
        {file.hasPublicLink ? (
          <button
            type="button"
            onClick={() => revokeLink.mutate()}
            className="focus-ring rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-hover"
          >
            Remove link
          </button>
        ) : (
          <button
            type="button"
            onClick={() => createLink.mutate()}
            className="focus-ring rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-hover"
          >
            Get link
          </button>
        )}
      </div>
    </Dialog>
  );
}
