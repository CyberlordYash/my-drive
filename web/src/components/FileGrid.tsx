import { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import type { FileDTO } from '../types';
import { FileCard } from './FileCard';
import { FileRow } from './FileRow';
import { EmptyState } from './EmptyState';
import type { FileContextMenuActions } from './FileContextMenu';
import { FolderOpen } from 'lucide-react';

export function FileGrid({
  files,
  onOpen,
  actions,
  emptyTitle = 'No files here',
  emptyHint,
  showOwnerColumn = false,
}: {
  files: FileDTO[];
  onOpen: (f: FileDTO) => void;
  actions: FileContextMenuActions;
  emptyTitle?: string;
  emptyHint?: string;
  showOwnerColumn?: boolean;
}) {
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function onSelect(file: FileDTO, additive: boolean) {
    setSelectedIds((prev) => {
      const next = additive ? new Set(prev) : new Set<string>();
      if (next.has(file.id) && additive) next.delete(file.id);
      else next.add(file.id);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <FilterChip label="Type" />
          <FilterChip label="People" />
          <FilterChip label="Modified" />
        </div>
        <div className="flex overflow-hidden rounded-full border border-border">
          <button
            type="button"
            onClick={() => setMode('grid')}
            className={`focus-ring p-2 ${mode === 'grid' ? 'bg-surface-hover' : ''}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMode('list')}
            className={`focus-ring p-2 ${mode === 'list' ? 'bg-surface-hover' : ''}`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <EmptyState Icon={FolderOpen} title={emptyTitle} hint={emptyHint} />
      ) : mode === 'grid' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {files.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              selected={selectedIds.has(f.id)}
              onOpen={onOpen}
              onSelect={onSelect}
              actions={actions}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 py-2 text-xs text-text-muted">
            <span>Name</span>
            <span className="w-32">Owner</span>
            <span className="w-24 text-right">Size</span>
            <span className="w-32 text-right">Modified</span>
          </div>
          {files.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              selected={selectedIds.has(f.id)}
              onOpen={onOpen}
              onSelect={onSelect}
              actions={actions}
              ownerLabel={showOwnerColumn ? undefined : 'me'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="focus-ring flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
    >
      {label}
    </button>
  );
}
