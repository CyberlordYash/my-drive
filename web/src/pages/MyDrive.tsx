import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronRight, HardDrive } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useFileList } from '../hooks/useFiles';
import { useFileActions } from '../hooks/useFileActions';
import { FileGrid } from '../components/FileGrid';
import { getFile } from '../api/files';
import type { FileDTO } from '../types';

export function MyDrive() {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useFileList('mine', folderId);
  const { actions, dialogs } = useFileActions();

  const breadcrumbsQuery = useQuery({
    queryKey: ['breadcrumbs', folderId],
    queryFn: () => getFile(folderId!),
    enabled: !!folderId,
  });

  function onOpen(f: FileDTO) {
    if (f.kind === 'folder') navigate(`/drive/${f.id}`);
    else actions.onPreview(f);
  }

  const breadcrumbs = breadcrumbsQuery.data?.breadcrumbs ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center gap-1 text-lg text-text">
        <Link to="/drive" className="focus-ring flex items-center gap-2 rounded-lg px-1 hover:bg-surface-hover">
          <HardDrive className="h-5 w-5" />
          My Drive
        </Link>
        {breadcrumbs.map((b) => (
          <span key={b.id} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-text-muted" />
            <Link to={`/drive/${b.id}`} className="focus-ring rounded-lg px-1 hover:bg-surface-hover">
              {b.name}
            </Link>
          </span>
        ))}
        {breadcrumbsQuery.data && (
          <span className="flex items-center gap-1 font-medium">
            <ChevronRight className="h-4 w-4 text-text-muted" />
            {breadcrumbsQuery.data.name}
          </span>
        )}
      </div>

      {dialogs}

      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <FileGrid
          files={data?.data ?? []}
          onOpen={onOpen}
          actions={actions}
          emptyTitle="No files yet"
          emptyHint="Drag and drop files here, or use New to upload or create a folder."
        />
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-2" />
      ))}
    </div>
  );
}
