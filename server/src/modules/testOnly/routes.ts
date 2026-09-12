import { Router } from 'express';
import { z } from 'zod';
import { User } from '../../db/models/User.js';
import { issueCsrfCookie } from '../../auth/csrf.js';
import { AppError } from '../../lib/AppError.js';

/**
 * A real-session test login route — establishes an actual passport session
 * (not a mocked req.user), so integration tests exercise the real
 * requireAuth/session/CSRF middleware chain end to end instead of trusting
 * a fake. ONLY mounted when NODE_ENV === 'test' (see app.ts) — never
 * reachable in dev or prod builds.
 */
export const testOnlyRouter = Router();

const bodySchema = z.object({ userId: z.string() });

testOnlyRouter.post('/login', async (req, res, next) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return next(AppError.badRequest('INVALID_BODY', 'userId required'));

  const user = await User.findById(parsed.data.userId);
  if (!user) return next(AppError.notFound('USER_NOT_FOUND'));

  req.login(user, (err) => {
    if (err) return next(err);
    const csrfToken = issueCsrfCookie(res);
    res.json({ ok: true, csrfToken });
  });
});
