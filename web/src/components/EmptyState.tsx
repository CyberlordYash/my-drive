import type { ComponentType } from 'react';

export function EmptyState({
  Icon,
  title,
  hint,
}: {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <Icon className="h-16 w-16 text-text-muted opacity-40" />
      <div className="text-lg text-text">{title}</div>
      {hint && <div className="max-w-sm text-sm text-text-muted">{hint}</div>}
    </div>
  );
}
