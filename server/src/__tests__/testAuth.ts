import type { Express } from 'express';
import request from 'supertest';
import { User, type UserDoc } from '../db/models/User.js';

/**
 * Test-only helper that mints a real, logged-in session cookie for a seeded
 * user by hitting a hidden test-login route — NOT by mocking requireAuth
 * itself. We want the actual session/passport/CSRF middleware exercised in
 * every integration test, just without needing a real Google OAuth
 * round-trip in CI.
 */
export async function createTestUser(overrides: Partial<{ email: string; name: string }> = {}) {
  const email = overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const user = await User.create({
    googleId: `test-${Math.random().toString(36).slice(2)}`,
    email,
    name: overrides.name ?? 'Test User',
  });
  return user;
}

export interface AuthedAgent {
  agent: ReturnType<typeof request.agent>;
  user: UserDoc;
  csrfToken: string;
}

export async function loginAs(app: Express, user: UserDoc): Promise<AuthedAgent> {
  const agent = request.agent(app);
  const res = await agent.post('/__test__/login').send({ userId: user._id.toString() });
  if (res.status !== 200) {
    throw new Error(`Test login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const csrfToken = res.body.csrfToken as string;
  return { agent, user, csrfToken };
}
