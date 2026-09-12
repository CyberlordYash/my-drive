import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  ExternalLink,
  Download,
  Pencil,
  Copy,
  Share2,
  FolderInput,
  Info,
  WifiOff,
  Trash2,
  ChevronRight,
  Star,
  Link2,
} from 'lucide-react';
import type { FileDTO } from '../types';

export interface FileContextMenuActions {
  onPreview: (f: FileDTO) => void;
  onDownload: (f: FileDTO) => void;
  onRename: (f: FileDTO) => void;
  onCopy: (f: FileDTO) => void;
  onShare: (f: FileDTO) => void;
  onCopyLink: (f: FileDTO) => void;
  onMove: (f: FileDTO) => void;
  onToggleStar: (f: FileDTO) => void;
  onDetails: (f: FileDTO) => void;
  onTrash: (f: FileDTO) => void;
}

const itemClass =
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none hover:bg-surface-hover data-[highlighted]:bg-surface-hover data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent';

/**
 * The context menu transcribed item-for-item from the Figma screenshot:
 * four divider-separated groups, "Make available offline" rendered
 * visibly disabled exactly as the design shows it (it has no meaning for a
 * browser-based clone), and "Open with" / "File information" / "Organize"
 * as submenus.
 */
export function FileContextMenuContent({
  file,
  actions,
  canManage,
}: {
  file: FileDTO;
  actions: FileContextMenuActions;
  canManage: boolean;
}) {
  return (
    <DropdownMenu.Content
      align="start"
      sideOffset={4}
      className="z-50 min-w-64 rounded-xl border border-border bg-surface p-1 text-sm text-text shadow-lg"
    >
      {/* Group 1 */}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger className={itemClass}>
          <ExternalLink className="h-4 w-4" />
          <span className="flex-1">Open with</span>
          <ChevronRight className="h-4 w-4 text-text-muted" />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.Portal>
          <DropdownMenu.SubContent
            className="min-w-48 rounded-xl border border-border bg-surface p-1 shadow-lg"
            sideOffset={4}
          >
            <DropdownMenu.Item onSelect={() => actions.onPreview(file)} className={itemClass}>
              Preview
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>

      <DropdownMenu.Item onSelect={() => actions.onDownload(file)} className={itemClass}>
        <Download className="h-4 w-4" />
        Download
      </DropdownMenu.Item>
      <DropdownMenu.Item
        onSelect={() => actions.onRename(file)}
        disabled={!canManage}
        className={itemClass}
      >
        <Pencil className="h-4 w-4" />
        Rename
      </DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => actions.onCopy(file)} className={itemClass}>
        <Copy className="h-4 w-4" />
        <span className="flex-1">Make a copy</span>
        <span className="text-xs text-text-muted">⌘C ⌘V</span>
      </DropdownMenu.Item>

      <DropdownMenu.Separator className="my-1 h-px bg-border" />

      {/* Group 2 */}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger className={itemClass} data-disabled={!canManage || undefined}>
          <Share2 className="h-4 w-4" />
          <span className="flex-1">Share</span>
          <ChevronRight className="h-4 w-4 text-text-muted" />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.Portal>
          <DropdownMenu.SubContent
            className="min-w-48 rounded-xl border border-border bg-surface p-1 shadow-lg"
            sideOffset={4}
          >
            <DropdownMenu.Item
              onSelect={() => actions.onShare(file)}
              disabled={!canManage}
              className={itemClass}
            >
              Share with people
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => actions.onCopyLink(file)}
              disabled={!canManage}
              className={itemClass}
            >
              <Link2 className="h-4 w-4" />
              Copy link
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>

      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger className={itemClass}>
          <FolderInput className="h-4 w-4" />
          <span className="flex-1">Organize</span>
          <ChevronRight className="h-4 w-4 text-text-muted" />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.Portal>
          <DropdownMenu.SubContent
            className="min-w-48 rounded-xl border border-border bg-surface p-1 shadow-lg"
            sideOffset={4}
          >
            <DropdownMenu.Item
              onSelect={() => actions.onMove(file)}
              disabled={!canManage}
              className={itemClass}
            >
              Move to folder
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => actions.onToggleStar(file)} className={itemClass}>
              <Star className="h-4 w-4" />
              {file.isStarred ? 'Remove from Starred' : 'Add to Starred'}
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>

      <DropdownMenu.Separator className="my-1 h-px bg-border" />

      {/* Group 3 */}
      <DropdownMenu.Item onSelect={() => actions.onDetails(file)} className={itemClass}>
        <Info className="h-4 w-4" />
        File information
      </DropdownMenu.Item>
      <DropdownMenu.Item disabled className={itemClass} title="Not applicable — browser-based storage has no offline mode">
        <WifiOff className="h-4 w-4" />
        Make available offline
      </DropdownMenu.Item>

      <DropdownMenu.Separator className="my-1 h-px bg-border" />

      {/* Group 4 */}
      <DropdownMenu.Item
        onSelect={() => actions.onTrash(file)}
        disabled={!canManage}
        className={itemClass}
      >
        <Trash2 className="h-4 w-4" />
        Move to trash
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  );
}
