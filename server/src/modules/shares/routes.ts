import { Router } from 'express';
import { requireCsrf } from '../../auth/csrf.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './controller.js';
import {
  createShareSchema,
  idParamSchema,
  patchShareSchema,
  publicLinkSchema,
  shareParamSchema,
} from '../../schemas/files.js';

// Mounted at /api/files/:id — mergeParams so :id from the parent router is
// visible here (needed for both the /shares and /link sub-resources).
export const sharesRouter = Router({ mergeParams: true });

sharesRouter.get('/shares', validate({ params: idParamSchema }), controller.listShares);
sharesRouter.post(
  '/shares',
  requireCsrf,
  validate({ params: idParamSchema, body: createShareSchema }),
  controller.createShare,
);
sharesRouter.patch(
  '/shares/:userId',
  requireCsrf,
  validate({ params: shareParamSchema, body: patchShareSchema }),
  controller.updateShare,
);
sharesRouter.delete(
  '/shares/:userId',
  requireCsrf,
  validate({ params: shareParamSchema }),
  controller.deleteShare,
);

sharesRouter.post(
  '/link',
  requireCsrf,
  validate({ params: idParamSchema, body: publicLinkSchema }),
  controller.createLink,
);
sharesRouter.delete('/link', requireCsrf, validate({ params: idParamSchema }), controller.deleteLink);
