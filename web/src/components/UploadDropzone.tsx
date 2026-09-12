import { useState, type DragEvent, type ReactNode } from 'react';
import { UploadCloud } from 'lucide-react';

export function UploadDropzone({
  onFiles,
  children,
}: {
  onFiles: (files: File[]) => void;
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  let dragCounter = 0;

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    dragCounter += 1;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  }
  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter -= 1;
    if (dragCounter <= 0) setDragging(false);
  }
  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      className="relative flex flex-1 flex-col"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent bg-accent/10">
          <UploadCloud className="h-12 w-12 text-accent" />
          <p className="text-lg text-text">Drop files to upload</p>
        </div>
      )}
    </div>
  );
}
