import { Dialog } from './Dialog';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()} title={title}>
      <p className="text-sm text-text-muted">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="focus-ring rounded-full px-4 py-2 text-sm hover:bg-surface-hover">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`focus-ring rounded-full px-4 py-2 text-sm font-medium ${
            danger ? 'bg-danger text-[#1b1b1b]' : 'bg-accent text-[#1b1b1b]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
