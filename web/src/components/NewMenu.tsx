import { useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FolderPlus, Plus, Upload } from 'lucide-react';

const itemClass =
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none hover:bg-surface-hover data-[highlighted]:bg-surface-hover';

export function NewMenu({
  onCreateFolder,
  onUploadFiles,
}: {
  onCreateFolder: () => void;
  onUploadFiles: (files: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="focus-ring flex items-center gap-3 rounded-2xl bg-surface px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-surface-hover"
          >
            <Plus className="h-5 w-5" />
            New
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="z-50 min-w-56 rounded-xl border border-border bg-surface p-1 text-sm shadow-lg"
          >
            <DropdownMenu.Item onSelect={onCreateFolder} className={itemClass}>
              <FolderPlus className="h-4 w-4" />
              New folder
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item onSelect={() => fileInputRef.current?.click()} className={itemClass}>
              <Upload className="h-4 w-4" />
              File upload
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => folderInputRef.current?.click()} className={itemClass}>
              <FolderPlus className="h-4 w-4" />
              Folder upload
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) onUploadFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
      {/* Folder upload relies on the non-standard webkitdirectory attribute
          (supported in all major browsers despite the prefix) to let the
          picker select a whole directory tree. */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        hidden
        // @ts-expect-error non-standard attribute, no TS typing
        webkitdirectory=""
        onChange={(e) => {
          if (e.target.files) onUploadFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
    </>
  );
}
