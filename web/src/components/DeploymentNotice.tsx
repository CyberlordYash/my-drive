import { AlertTriangle } from 'lucide-react';

/**
 * Honest disclosure for the current "single Render service, local-disk
 * storage" deployment: Render's free tier wipes its filesystem on restart
 * and redeploy, so uploaded files are NOT durable there yet. Gated behind
 * an env var (set only for this deploy) so flipping to S3 later is a
 * one-line removal, not a code change hunt.
 */
export function DeploymentNotice() {
  if (import.meta.env.VITE_EPHEMERAL_STORAGE_NOTICE !== 'true') return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-[#3d3520] px-4 py-2 text-center text-xs text-[#fdd663]">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      Demo deployment on Render's free tier — files are stored on a temporary
      disk and may be lost if the service restarts or redeploys. Not backed by
      S3 yet.
    </div>
  );
}
