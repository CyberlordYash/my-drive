import { useState } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { UploadDropzone } from './UploadDropzone';
import { UploadQueue } from './UploadQueue';
import { CreateFolderDialog } from './dialogs/CreateFolderDialog';
import { DeploymentNotice } from './DeploymentNotice';
import { useUpload } from '../hooks/useUpload';
import { createFolder as createFolderApi } from '../api/files';
import { apiErrorCode, apiErrorMessage } from '../api/client';

/**
 * The three-column-plus-topbar layout from the Figma screenshot: sidebar,
 * inset content panel, and a decorative right app rail. Upload state and
 * the "New" menu live here (not per-page) so drag-and-drop and the upload
 * queue work identically no matter which view is showing — the current
 * folder id is read from the route when we're inside My Drive, and
 * defaults to the root elsewhere.
 */
export function AppShell() {
  const params = useParams<{ folderId?: string }>();
  const location = useLocation();
  const isInDrive = location.pathname.startsWith('/drive');
  const currentParentId = isInDrive ? params.folderId : undefined;

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const qc = useQueryClient();
  const upload = useUpload(currentParentId);

  async function handleCreateFolder(name: string) {
    await createFolderApi(name, currentParentId);
    void qc.invalidateQueries({ queryKey: ['files'] });
  }

  function handleUploadFiles(files: File[]) {
    upload.enqueue(files);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DeploymentNotice />
      <Topbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar onCreateFolder={() => setCreateFolderOpen(true)} onUploadFiles={handleUploadFiles} />

        <UploadDropzone onFiles={handleUploadFiles}>
          <main className="m-2 ml-0 flex flex-1 flex-col overflow-y-auto rounded-2xl bg-surface p-6">
            <Outlet />
          </main>
        </UploadDropzone>

        {/* Decorative right app rail from the design — purely visual. */}
        <div className="hidden w-12 shrink-0 flex-col items-center gap-3 py-4 lg:flex">
          <div className="mt-auto pb-2">
            <button type="button" className="focus-ring rounded-full p-1.5 text-text-muted hover:bg-surface-hover" aria-label="Expand">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <CreateFolderDialog
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onCreate={async (name) => {
          try {
            await handleCreateFolder(name);
          } catch (err) {
            toast.error(
              apiErrorCode(err) === 'NAME_CONFLICT'
                ? 'A file or folder with that name already exists here.'
                : apiErrorMessage(err),
            );
            throw err;
          }
        }}
      />

      <UploadQueue
        items={upload.items}
        onCancel={upload.cancel}
        onRetry={upload.retry}
        onDismiss={upload.dismiss}
      />
    </div>
  );
}
