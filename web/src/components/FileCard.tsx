import { MoreVertical, Star } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import type { FileDTO } from '../types';
import { fileIconFor } from '../lib/fileIcon';
import { contentUrl } from '../api/files';
import { FileContextMenuContent, type FileContextMenuActions } from './FileContextMenu';

export function FileCard({
  file,
  selected,
  onOpen,
  onSelect,
  actions,
}: {
  file: FileDTO;
  selected: boolean;
  onOpen: (f: FileDTO) => void;
  onSelect: (f: FileDTO, additive: boolean) => void;
  actions: FileContextMenuActions;
}) {
  const { Icon, colorClass } = fileIconFor(file.mimeType, file.kind === 'folder');
  const canManage = file.myRole === 'owner' || file.myRole === 'editor';
  const showThumbnail = file.kind === 'file' && file.mimeType?.startsWith('image/');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => onSelect(file, e.metaKey || e.ctrlKey || e.shiftKey)}
      onDoubleClick={() => onOpen(file)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(file)}
      className={clsx(
        'focus-ring group flex flex-col overflow-hidden rounded-2xl border transition-colors',
        selected ? 'border-accent bg-surface-hover' : 'border-transparent bg-surface hover:bg-surface-hover',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon className={clsx('h-5 w-5 shrink-0', colorClass)} />
        <span className="flex-1 truncate text-sm">{file.name}</span>
        {file.isStarred && <Star className="h-3.5 w-3.5 shrink-0 fill-current text-[#fdd663]" />}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="focus-ring rounded-full p-1 text-text-muted opacity-0 hover:bg-surface-2 group-hover:opacity-100 data-[state=open]:opacity-100"
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
      <div className="flex h-32 items-center justify-center bg-surface-2">
        {showThumbnail ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={contentUrl(file.id)} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <Icon className={clsx('h-10 w-10 opacity-30', colorClass)} />
        )}
      </div>
    </div>
  );
}
