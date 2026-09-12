import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSearch } from '../hooks/useFiles';
import { useFileActions } from '../hooks/useFileActions';
import { FileGrid } from '../components/FileGrid';
import type { FileDTO } from '../types';

export function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const { data, isLoading } = useSearch(q, true);
  const { actions, dialogs } = useFileActions();
  const navigate = useNavigate();

  function onOpen(f: FileDTO) {
    if (f.kind === 'folder') navigate(`/drive/${f.id}`);
    else actions.onPreview(f);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center gap-2 text-lg text-text">
        <Search className="h-5 w-5" />
        {data ? `${data.data.length} result${data.data.length === 1 ? '' : 's'} for "${q}"` : `Searching for "${q}"`}
      </div>
      {dialogs}
      {isLoading ? null : (
        <FileGrid
          files={data?.data ?? []}
          onOpen={onOpen}
          actions={actions}
          emptyTitle="No results found"
          emptyHint="Try a different search term."
        />
      )}
    </div>
  );
}
