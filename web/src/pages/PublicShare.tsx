import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { api } from '../api/client';
import { fileIconFor } from '../lib/fileIcon';
import { formatBytes } from '../lib/format';

interface PublicFile {
  id: string;
  kind: 'file' | 'folder';
  name: string;
  size?: number;
  mimeType?: string;
}

export function PublicShare() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public', token],
    queryFn: async () => {
      const { data } = await api.get<PublicFile>(`/api/public/${token}`);
      return data;
    },
  });

  const status = (error as { response?: { status?: number } } | null)?.response?.status;

  return (
    <div className="flex h-screen items-center justify-center bg-bg px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center">
        {isLoading && <p className="text-sm text-text-muted">Loading…</p>}

        {isError && (
          <>
            <p className="text-lg text-text">
              {status === 410 ? 'This link has expired' : 'Link not found'}
            </p>
            <p className="text-sm text-text-muted">Ask the owner to share a new link.</p>
          </>
        )}

        {data && (
          <>
            <PublicIcon mimeType={data.mimeType} isFolder={data.kind === 'folder'} />
            <div>
              <div className="break-all text-base text-text">{data.name}</div>
              {data.size !== undefined && (
                <div className="mt-1 text-sm text-text-muted">{formatBytes(data.size)}</div>
              )}
            </div>
            <a
              href={`${api.defaults.baseURL ?? ''}/api/public/${token}/download`}
              className="focus-ring flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-[#1b1b1b]"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function PublicIcon({ mimeType, isFolder }: { mimeType?: string; isFolder: boolean }) {
  const { Icon, colorClass } = fileIconFor(mimeType, isFolder);
  return <Icon className={`h-16 w-16 ${colorClass}`} />;
}
