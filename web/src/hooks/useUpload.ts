import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as filesApi from '../api/files';
import { apiErrorMessage } from '../api/client';

export interface UploadItem {
  id: string;
  file: File;
  progress: number; // 0..1
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

const MAX_CONCURRENT = 3;

/**
 * Progress requires axios's onUploadProgress (an XHR feature) — fetch()
 * cannot report upload progress for a streaming request body. A small
 * promise pool caps concurrency at 3 so dragging in 50 files doesn't open
 * 50 simultaneous connections.
 */
export function useUpload(parentId: string | undefined) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const qc = useQueryClient();

  const patchItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const uploadOne = useCallback(
    async (item: UploadItem) => {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      patchItem(item.id, { status: 'uploading' });
      try {
        await filesApi.uploadFiles(
          [item.file],
          parentId,
          (fraction) => patchItem(item.id, { progress: fraction }),
          controller.signal,
        );
        patchItem(item.id, { status: 'done', progress: 1 });
        void qc.invalidateQueries({ queryKey: ['files'] });
        void qc.invalidateQueries({ queryKey: ['storage'] });
      } catch (err) {
        patchItem(item.id, { status: 'error', error: apiErrorMessage(err) });
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [parentId, patchItem, qc],
  );

  const enqueue = useCallback(
    (files: File[]) => {
      const newItems: UploadItem[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        progress: 0,
        status: 'pending',
      }));
      setItems((prev) => [...prev, ...newItems]);

      // Simple concurrency-capped pool: kick off up to MAX_CONCURRENT, and
      // each completion starts the next pending one.
      let index = 0;
      const runNext = () => {
        if (index >= newItems.length) return;
        const item = newItems[index]!;
        index += 1;
        void uploadOne(item).then(runNext);
      };
      for (let i = 0; i < Math.min(MAX_CONCURRENT, newItems.length); i += 1) runNext();
    },
    [uploadOne],
  );

  const cancel = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
  }, []);

  const retry = useCallback(
    (id: string) => {
      const item = items.find((it) => it.id === id);
      if (item) void uploadOne({ ...item, status: 'pending', progress: 0, error: undefined });
    },
    [items, uploadOne],
  );

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status !== 'done'));
  }, []);

  return { items, enqueue, cancel, retry, dismiss, clearFinished };
}
