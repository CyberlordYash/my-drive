import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { publicLimiter } from '../../middleware/rateLimit.js';
import { publicTokenParamSchema } from '../../schemas/files.js';
import * as sharesService from '../shares/service.js';
import { streamOrRedirect } from '../files/download.js';
import { pathParam } from '../../lib/pathParam.js';

export const publicRouter = Router();

publicRouter.use(publicLimiter);
// A public link is by definition indexable-looking but must never be —
// keep it out of search engines even if someone links to it externally.
publicRouter.use((_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  next();
});

publicRouter.get('/:token', validate({ params: publicTokenParamSchema }), async (req, res) => {
  const node = await sharesService.getByPublicToken(pathParam(req, 'token'));
  // Owner identity is deliberately withheld from an unauthenticated caller.
  res.json({
    id: node._id.toString(),
    kind: node.kind,
    name: node.name,
    size: node.size,
    mimeType: node.mimeType,
  });
});

publicRouter.get(
  '/:token/download',
  validate({ params: publicTokenParamSchema }),
  async (req, res) => {
    const node = await sharesService.getByPublicToken(pathParam(req, 'token'));
    await streamOrRedirect(node, res, { inline: false, rangeHeader: req.headers.range });
  },
);
