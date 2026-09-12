import { useState } from 'react';
import { toast } from 'sonner';
import type { FileDTO } from '../types';
import { useFileMutations } from './useFiles';
import { downloadUrl } from '../api/files';
import { apiErrorMessage } from '../api/client';
import type { FileContextMenuActions } from '../components/FileContextMenu';
import { RenameDialog } from '../components/dialogs/RenameDialog';
import { ShareDialog } from '../components/dialogs/ShareDialog';
import { MoveDialog } from '../components/dialogs/MoveDialog';
import { DetailsDialog } from '../components/dialogs/DetailsDialog';
import { PreviewModal } from '../components/dialogs/PreviewModal';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';

/**
 * Centralizes every file-row action (from the kebab/context menu) into one
 * place: dialog open state + the mutation call it triggers. Every list page
 * (My Drive, Shared with me, Starred, Search) renders the same dialogs and
 * wires the same actions object into FileGrid, so behavior can't drift
 * between views.
 */
export function useFileActions() {
  const mutations = useFileMutations();

  const [renameTarget, setRenameTarget] = useState<FileDTO | null>(null);
  const [shareTarget, setShareTarget] = useState<FileDTO | null>(null);
  const [moveTarget, setMoveTarget] = useState<FileDTO | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<FileDTO | null>(null);
  const [previewTarget, setPreviewTarget] = useState<FileDTO | null>(null);
  const [trashTarget, setTrashTarget] = useState<FileDTO | null>(null);

  const actions: FileContextMenuActions = {
    onPreview: setPreviewTarget,
    onDownload: (f) => {
      window.location.href = downloadUrl(f.id);
    },
    onRename: setRenameTarget,
    onCopy: (f) => {
      mutations.copy.mutate(f.id, {
        onSuccess: () => toast.success(`Copied "${f.name}"`),
        onError: (err) => toast.error(apiErrorMessage(err)),
      });
    },
    onShare: setShareTarget,
    onCopyLink: async (f) => {
      // Reuses ShareDialog's "Get link" mutation logic by just opening it —
      // copying directly here would duplicate the create-vs-reuse-link
      // decision that already lives in ShareDialog.
      setShareTarget(f);
    },
    onMove: setMoveTarget,
    onToggleStar: (f) => {
      mutations.star.mutate(f.id, {
        onError: (err) => toast.error(apiErrorMessage(err)),
      });
    },
    onDetails: setDetailsTarget,
    onTrash: setTrashTarget,
  };

  const dialogs = (
    <>
      <RenameDialog
        file={renameTarget}
        onClose={() => setRenameTarget(null)}
        onRename={(id, name) => mutations.rename.mutateAsync({ id, name })}
      />
      <ShareDialog file={shareTarget} onClose={() => setShareTarget(null)} />
      <MoveDialog
        file={moveTarget}
        onClose={() => setMoveTarget(null)}
        onMove={(id, parentId) => mutations.move.mutateAsync({ id, parentId })}
      />
      <DetailsDialog file={detailsTarget} onClose={() => setDetailsTarget(null)} />
      <PreviewModal file={previewTarget} onClose={() => setPreviewTarget(null)} />
      <ConfirmDialog
        open={!!trashTarget}
        title="Move to trash"
        description={`"${trashTarget?.name}" will be moved to trash. You can restore it within 30 days.`}
        confirmLabel="Move to trash"
        danger
        onCancel={() => setTrashTarget(null)}
        onConfirm={() => {
          if (!trashTarget) return;
          mutations.trash.mutate(trashTarget.id, {
            onSuccess: () => toast.success(`Moved "${trashTarget.name}" to trash`),
            onError: (err) => toast.error(apiErrorMessage(err)),
          });
          setTrashTarget(null);
        }}
      />
    </>
  );

  return { actions, dialogs, mutations };
}
