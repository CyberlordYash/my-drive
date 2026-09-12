import { Users } from 'lucide-react';
import { useFileList } from '../hooks/useFiles';
import { useFileActions } from '../hooks/useFileActions';
import { FileGrid } from '../components/FileGrid';
import type { FileDTO } from '../types';

export function SharedWithMe() {
  const { data, isLoading } = useFileList('shared');
  const { actions, dialogs } = useFileActions();

  function onOpen(f: FileDTO) {
    actions.onPreview(f);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center gap-2 text-lg text-text">
        <Users className="h-5 w-5" />
        Shared with me
      </div>
      {dialogs}
      {isLoading ? null : (
        <FileGrid
          files={data?.data ?? []}
          onOpen={onOpen}
          actions={actions}
          showOwnerColumn
          emptyTitle="Nothing shared with you yet"
          emptyHint="Files and folders other people share with you will show up here."
        />
      )}
    </div>
  );
}
