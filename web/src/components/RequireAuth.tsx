import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMe } from '../hooks/useMe';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useMe();

  if (isLoading) {
    // Render this state rather than a blank screen — Render's free tier
    // cold-starts in ~30-60s, so this is what turns that into a
    // deliberate UX moment instead of looking broken.
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-text-muted">Waking up the server…</p>
      </div>
    );
  }

  if (isError || !data) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
