import { Router } from 'express';
import { passport } from '../../config/passport.js';
import { env, isProd } from '../../config/env.js';
import { issueCsrfCookie, clearCsrfCookie, requireCsrf } from '../../auth/csrf.js';
import { requireAuth } from '../../auth/requireAuth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import type { UserDoc } from '../../db/models/User.js';
import { toUserDTO } from './dto.js';

export const authRouter = Router();

authRouter.get(
  '/google',
  authLimiter,
  passport.authenticate('google', { scope: ['openid', 'email', 'profile'] }),
);

authRouter.get(
  '/google/callback',
  authLimiter,
  passport.authenticate('google', {
    failureRedirect: `${env.WEB_ORIGIN}/login?error=oauth_failed`,
    session: true,
  }),
  (req, res) => {
    // Passport's session login is complete; now issue the CSRF cookie the
    // SPA needs for its first mutating request.
    issueCsrfCookie(res);
    res.redirect(env.WEB_ORIGIN);
  },
);

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(toUserDTO(req.user as UserDoc));
});

authRouter.post('/logout', requireAuth, requireCsrf, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((sessionErr) => {
      if (sessionErr) return next(sessionErr);
      clearCsrfCookie(res);
      res.clearCookie(isProd ? '__Secure-drive.sid' : 'drive.sid', {
        domain: env.COOKIE_DOMAIN || undefined,
        path: '/',
      });
      res.status(204).send();
    });
  });
});
