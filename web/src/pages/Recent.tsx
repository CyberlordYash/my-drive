import { Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listFiles } from '../api/files';
import { useFileActions } from '../hooks/useFileActions';
import { FileGrid } from '../components/FileGrid';
import { useNavigate } from 'react-router-dom';
import type { FileDTO } from '../types';

// NOTE: this lists only root-level items sorted by recency, not a true
// recursive "recently touched anywhere in Drive" view — that would need a
// dedicated backend query spanning all folders. Documented here and in the
// README's Known Limitations as a deliberate scope cut, not an oversight.
export function Recent() {
  const { data, isLoading } = useQuery({
    queryKey: ['files', 'recent'],
    queryFn: () => listFiles({ sort: 'updatedAt', order: 'desc' }),
  });
  const { actions, dialogs } = useFileActions();
  const navigate = useNavigate();

  function onOpen(f: FileDTO) {
    if (f.kind === 'folder') navigate(`/drive/${f.id}`);
    else actions.onPreview(f);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center gap-2 text-lg text-text">
        <Clock className="h-5 w-5" />
        Recent
      </div>
      {dialogs}
      {isLoading ? null : (
        <FileGrid files={data?.data ?? []} onOpen={onOpen} actions={actions} emptyTitle="Nothing recent" />
      )}
    </div>
  );
}
