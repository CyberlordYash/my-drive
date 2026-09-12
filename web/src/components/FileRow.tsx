import { MoreVertical, Star } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import type { FileDTO } from '../types';
import { fileIconFor } from '../lib/fileIcon';
import { formatBytes, formatDate } from '../lib/format';
import { FileContextMenuContent, type FileContextMenuActions } from './FileContextMenu';

export function FileRow({
  file,
  selected,
  onOpen,
  onSelect,
  actions,
  ownerLabel,
}: {
  file: FileDTO;
  selected: boolean;
  onOpen: (f: FileDTO) => void;
  onSelect: (f: FileDTO, additive: boolean) => void;
  actions: FileContextMenuActions;
  ownerLabel?: string;
}) {
  const { Icon, colorClass } = fileIconFor(file.mimeType, file.kind === 'folder');
  const canManage = file.myRole === 'owner' || file.myRole === 'editor';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => onSelect(file, e.metaKey || e.ctrlKey || e.shiftKey)}
      onDoubleClick={() => onOpen(file)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(file)}
      className={clsx(
        'focus-ring group grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-lg px-3 py-2 text-sm',
        selected ? 'bg-surface-hover' : 'hover:bg-surface-hover',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={clsx('h-5 w-5 shrink-0', colorClass)} />
        <span className="truncate">{file.name}</span>
        {file.isStarred && <Star className="h-3.5 w-3.5 shrink-0 fill-current text-[#fdd663]" />}
      </div>
      <span className="w-32 truncate text-text-muted">{ownerLabel ?? 'me'}</span>
      <span className="w-24 text-right text-text-muted">{file.size ? formatBytes(file.size) : '—'}</span>
      <div className="flex w-32 items-center justify-end gap-2 text-text-muted">
        {formatDate(file.updatedAt)}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="focus-ring rounded-full p-1 opacity-0 hover:bg-surface-2 group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Options for ${file.name}`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <FileContextMenuContent file={file} actions={actions} canManage={canManage} />
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
