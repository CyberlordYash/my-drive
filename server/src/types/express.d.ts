import type { UserDoc } from '../db/models/User.js';

// Augments Express's Request.user (used by Passport) with our actual User
// document type, so `req.user` is typed everywhere instead of `any`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserDoc {}
  }
}

export {};
