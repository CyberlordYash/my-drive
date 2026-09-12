/**
 * Seeds two demo users, a small folder tree, a few files, and one
 * cross-user share — so a reviewer opening the app sees a populated UI
 * instead of an empty state.
 *
 * Run with: npm run seed -- --demo
 * The --demo flag is required so this can never accidentally run against
 * real user data — it also fakes storageUsed to reproduce the Figma
 * screenshot's "94% full" meter without uploading gigabytes of real bytes.
 */
import { connectDb, disconnectDb } from '../db/connect.js';
import { User } from '../db/models/User.js';
import { FileNode } from '../db/models/FileNode.js';
import { logger } from '../config/logger.js';

async function seed() {
  if (!process.argv.includes('--demo')) {
    // eslint-disable-next-line no-console
    console.error('Refusing to run without --demo (this seeds fake data, never run in prod).');
    process.exit(1);
  }

  await connectDb();

  const alice = await User.findOneAndUpdate(
    { googleId: 'demo-google-id-alice' },
    {
      googleId: 'demo-google-id-alice',
      email: 'alice@example.com',
      name: 'Alice Demo',
      storageQuota: 16_106_127_360, // 15 GiB
      storageUsed: Math.round(16_106_127_360 * 0.94), // reproduces the Figma "94% full"
    },
    { upsert: true, new: true },
  );

  const bob = await User.findOneAndUpdate(
    { googleId: 'demo-google-id-bob' },
    { googleId: 'demo-google-id-bob', email: 'bob@example.com', name: 'Bob Demo' },
    { upsert: true, new: true },
  );

  const projectsFolder = await FileNode.findOneAndUpdate(
    { ownerId: alice._id, parentId: null, name: 'Projects' },
    {
      kind: 'folder',
      name: 'Projects',
      nameLower: 'projects',
      ownerId: alice._id,
      parentId: null,
      ancestorIds: [],
    },
    { upsert: true, new: true },
  );

  await FileNode.findOneAndUpdate(
    { ownerId: alice._id, parentId: projectsFolder._id, name: 'quarterly-report.pdf' },
    {
      kind: 'file',
      name: 'quarterly-report.pdf',
      nameLower: 'quarterly-report.pdf',
      ownerId: alice._id,
      parentId: projectsFolder._id,
      ancestorIds: [projectsFolder._id],
      storageKey: `u/${alice._id.toString()}/demo-quarterly-report.pdf`,
      storageDriver: 'local',
      size: 1_048_576,
      mimeType: 'application/pdf',
      sharedWith: [
        { userId: bob._id, email: bob.email, role: 'viewer', sharedAt: new Date(), sharedBy: alice._id },
      ],
      aclUserIds: [alice._id, bob._id],
    },
    { upsert: true, new: true },
  );

  logger.info(
    { alice: alice.email, bob: bob.email },
    'Seed complete. Note: seeded files reference storage keys with no real blob behind them — only for exercising list/search/share UI, not download.',
  );

  await disconnectDb();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
