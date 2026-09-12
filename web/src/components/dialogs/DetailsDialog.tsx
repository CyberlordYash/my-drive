import { Dialog } from './Dialog';
import type { FileDTO } from '../../types';
import { formatBytes, formatDate } from '../../lib/format';
import { fileIconFor } from '../../lib/fileIcon';

export function DetailsDialog({ file, onClose }: { file: FileDTO | null; onClose: () => void }) {
  if (!file) return null;
  const { Icon, colorClass } = fileIconFor(file.mimeType, file.kind === 'folder');

  const rows: Array<[string, string]> = [
    ['Type', file.kind === 'folder' ? 'Folder' : file.mimeType || 'Unknown'],
    ['Size', file.size ? formatBytes(file.size) : '—'],
    ['Owner', file.myRole === 'owner' ? 'me' : 'shared with you'],
    ['Modified', formatDate(file.updatedAt)],
    ['Created', formatDate(file.createdAt)],
    ['Your access', file.myRole ?? 'none'],
  ];

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()} title="File information">
      <div className="mb-4 flex items-center gap-3">
        <Icon className={`h-8 w-8 ${colorClass}`} />
        <div className="truncate font-medium">{file.name}</div>
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-text-muted">{label}</dt>
            <dd className="truncate text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
