import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile } from 'passport-google-oauth20';
import { env } from './env.js';
import { User } from '../db/models/User.js';
import { claimPendingShares } from '../auth/claimPendingShares.js';
import { logger } from './logger.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Deliberately built from PUBLIC_URL/env rather than derived from the
      // request — behind Render's proxy a request-derived URL comes out
      // http:// and mismatches the URI registered with Google.
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['openid', 'email', 'profile'],
    },
    (_accessToken, _refreshToken, profile: Profile, done) => {
      void (async () => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('Google account has no email'));
          }

          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.create({
              googleId: profile.id,
              email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
              lastLoginAt: new Date(),
            });
            // Fill in access for any file shared to this email before they
            // ever signed up.
            await claimPendingShares(user);
          } else {
            user.lastLoginAt = new Date();
            user.name = profile.displayName;
            user.avatarUrl = profile.photos?.[0]?.value ?? user.avatarUrl;
            await user.save();
          }

          done(null, user);
        } catch (err) {
          logger.error({ err }, 'Google OAuth verify callback failed');
          done(err as Error);
        }
      })();
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser((id: string, done) => {
  void User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err as Error));
});

export { passport };
