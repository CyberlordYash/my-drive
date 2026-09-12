import { Dialog } from './Dialog';
import type { FileDTO } from '../../types';
import { contentUrl, downloadUrl } from '../../api/files';
import { fileIconFor } from '../../lib/fileIcon';

export function PreviewModal({ file, onClose }: { file: FileDTO | null; onClose: () => void }) {
  if (!file) return null;
  const { Icon, colorClass } = fileIconFor(file.mimeType, false);

  const isImage = file.mimeType?.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()} title={file.name} width="max-w-3xl">
      <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-lg bg-surface-2">
        {isImage ? (
          <img src={contentUrl(file.id)} alt={file.name} className="max-h-[65vh] object-contain" />
        ) : isPdf ? (
          <iframe src={contentUrl(file.id)} title={file.name} className="h-[65vh] w-full" />
        ) : (
          <div className="flex flex-col items-center gap-3 py-16">
            <Icon className={`h-16 w-16 ${colorClass}`} />
            <p className="text-sm text-text-muted">No preview available for this file type.</p>
            <a
              href={downloadUrl(file.id)}
              className="focus-ring rounded-full bg-accent px-4 py-2 text-sm font-medium text-[#1b1b1b]"
            >
              Download
            </a>
          </div>
        )}
      </div>
    </Dialog>
  );
}
