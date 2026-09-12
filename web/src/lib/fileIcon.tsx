import { FileText, FileImage, FileVideo, FileAudio, FileArchive, FileSpreadsheet, File, Folder } from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Maps a mime type to an icon + tint, matching the design's colored
 * file-type icons (blue doc, red PDF, etc).
 */
export function fileIconFor(mimeType: string | undefined, isFolder: boolean): {
  Icon: ComponentType<{ className?: string }>;
  colorClass: string;
} {
  if (isFolder) return { Icon: Folder, colorClass: 'text-accent' };
  if (!mimeType) return { Icon: File, colorClass: 'text-text-muted' };

  if (mimeType === 'application/pdf') return { Icon: FileText, colorClass: 'text-[#f28b82]' };
  if (mimeType.startsWith('image/')) return { Icon: FileImage, colorClass: 'text-[#81c995]' };
  if (mimeType.startsWith('video/')) return { Icon: FileVideo, colorClass: 'text-[#c58af9]' };
  if (mimeType.startsWith('audio/')) return { Icon: FileAudio, colorClass: 'text-[#fdd663]' };
  if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    return { Icon: FileArchive, colorClass: 'text-[#fcad70]' };
  }
  if (mimeType.includes('sheet') || mimeType.includes('csv')) {
    return { Icon: FileSpreadsheet, colorClass: 'text-[#81c995]' };
  }
  if (mimeType.startsWith('text/') || mimeType.includes('document')) {
    return { Icon: FileText, colorClass: 'text-accent' };
  }
  return { Icon: File, colorClass: 'text-text-muted' };
}
