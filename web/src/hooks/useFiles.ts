import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as filesApi from '../api/files';
import type { ListView } from '../api/files';

export function filesQueryKey(view: ListView, parentId?: string) {
  return ['files', view, parentId ?? null] as const;
}

function invalidateAllFileLists(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['files'] });
  void qc.invalidateQueries({ queryKey: ['storage'] });
  void qc.invalidateQueries({ queryKey: ['search'] });
}

export function useFileList(view: ListView, parentId?: string) {
  return useQuery({
    queryKey: filesQueryKey(view, parentId),
    queryFn: () => {
      switch (view) {
        case 'mine':
          return filesApi.listFiles({ parentId });
        case 'shared':
          return filesApi.listSharedWithMe();
        case 'trash':
          return filesApi.listTrash();
        case 'starred':
          return filesApi.listStarred();
      }
    },
  });
}

export function useSearch(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => filesApi.searchFiles(q),
    enabled: enabled && q.trim().length > 0,
  });
}

export function useStorageUsage() {
  return useQuery({ queryKey: ['storage'], queryFn: filesApi.getStorageUsage });
}

export function useFileMutations() {
  const qc = useQueryClient();
  const onSuccess = () => invalidateAllFileLists(qc);

  return {
    createFolder: useMutation({
      mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
        filesApi.createFolder(name, parentId),
      onSuccess,
    }),
    rename: useMutation({
      mutationFn: ({ id, name }: { id: string; name: string }) => filesApi.renameFile(id, name),
      onSuccess,
    }),
    move: useMutation({
      mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
        filesApi.moveFile(id, parentId),
      onSuccess,
    }),
    copy: useMutation({ mutationFn: (id: string) => filesApi.copyFile(id), onSuccess }),
    star: useMutation({ mutationFn: (id: string) => filesApi.toggleStar(id), onSuccess }),
    trash: useMutation({ mutationFn: (id: string) => filesApi.trashFile(id), onSuccess }),
    restore: useMutation({ mutationFn: (id: string) => filesApi.restoreFile(id), onSuccess }),
    permanentDelete: useMutation({
      mutationFn: (id: string) => filesApi.permanentlyDeleteFile(id),
      onSuccess,
    }),
    emptyTrash: useMutation({ mutationFn: filesApi.emptyTrash, onSuccess }),
  };
}
