import { Router } from 'express';
import { requireAuth } from '../../auth/requireAuth.js';
import { requireCsrf } from '../../auth/csrf.js';
import { validate } from '../../middleware/validate.js';
import { uploadLimiter } from '../../middleware/rateLimit.js';
import { uploadMiddleware } from './upload.js';
import * as controller from './controller.js';
import {
  batchDeleteSchema,
  createFolderSchema,
  deleteQuerySchema,
  idParamSchema,
  listFilesQuerySchema,
  paginationSchema,
  patchFileSchema,
  searchQuerySchema,
  uploadQuerySchema,
} from '../../schemas/files.js';
import { sharesRouter } from '../shares/routes.js';

export const filesRouter = Router();

filesRouter.use(requireAuth);

// Static/sub-collection routes MUST be declared before the '/:id' routes
// below, or Express would try to match "search"/"trash"/etc as an :id.
filesRouter.get('/search', validate({ query: searchQuerySchema }), controller.searchFiles);
filesRouter.get('/trash', validate({ query: paginationSchema }), controller.listTrash);
filesRouter.post('/trash/empty', requireCsrf, controller.emptyTrash);
filesRouter.get('/shared-with-me', validate({ query: paginationSchema }), controller.listSharedWithMe);
filesRouter.get('/starred', validate({ query: paginationSchema }), controller.listStarred);
filesRouter.get('/storage', controller.getStorageUsage);

filesRouter.post(
  '/batch/delete',
  requireCsrf,
  validate({ body: batchDeleteSchema }),
  controller.batchDelete,
);

filesRouter.post(
  '/folders',
  requireCsrf,
  validate({ body: createFolderSchema }),
  controller.createFolder,
);

filesRouter.post(
  '/upload',
  requireCsrf,
  uploadLimiter,
  validate({ query: uploadQuerySchema }),
  uploadMiddleware.array('file', 10),
  controller.uploadFiles,
);

filesRouter.get('/', validate({ query: listFilesQuerySchema }), controller.listFiles);

filesRouter.get('/:id', validate({ params: idParamSchema }), controller.getFile);
filesRouter.get('/:id/download', validate({ params: idParamSchema }), controller.downloadFile);
filesRouter.get('/:id/content', validate({ params: idParamSchema }), controller.contentFile);

filesRouter.patch(
  '/:id',
  requireCsrf,
  validate({ params: idParamSchema, body: patchFileSchema }),
  controller.patchFile,
);
filesRouter.post(
  '/:id/copy',
  requireCsrf,
  validate({ params: idParamSchema }),
  controller.copyFile,
);
filesRouter.post(
  '/:id/star',
  requireCsrf,
  validate({ params: idParamSchema }),
  controller.toggleStar,
);
filesRouter.post(
  '/:id/restore',
  requireCsrf,
  validate({ params: idParamSchema }),
  controller.restoreFile,
);
filesRouter.delete(
  '/:id',
  requireCsrf,
  validate({ params: idParamSchema, query: deleteQuerySchema }),
  controller.deleteFile,
);

// Sharing sub-routes for a given file: /files/:id/shares, /files/:id/link
filesRouter.use('/:id', sharesRouter);
