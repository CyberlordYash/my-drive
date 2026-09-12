import { Star } from 'lucide-react';
import { useFileList } from '../hooks/useFiles';
import { useFileActions } from '../hooks/useFileActions';
import { FileGrid } from '../components/FileGrid';
import { useNavigate } from 'react-router-dom';
import type { FileDTO } from '../types';

export function Starred() {
  const { data, isLoading } = useFileList('starred');
  const { actions, dialogs } = useFileActions();
  const navigate = useNavigate();

  function onOpen(f: FileDTO) {
    if (f.kind === 'folder') navigate(`/drive/${f.id}`);
    else actions.onPreview(f);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center gap-2 text-lg text-text">
        <Star className="h-5 w-5" />
        Starred
      </div>
      {dialogs}
      {isLoading ? null : (
        <FileGrid
          files={data?.data ?? []}
          onOpen={onOpen}
          actions={actions}
          emptyTitle="No starred files"
          emptyHint="Star files and folders from the ⋮ menu to find them here quickly."
        />
      )}
    </div>
  );
}
