import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/** Shared dialog chrome so every dialog in the app looks/behaves the same. */
export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  width = 'max-w-md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <RadixDialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5 shadow-xl ${width}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <RadixDialog.Title className="text-base font-medium text-text">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button type="button" className="focus-ring rounded-full p-1.5 text-text-muted hover:bg-surface-hover" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
