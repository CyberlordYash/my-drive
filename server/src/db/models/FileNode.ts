import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';

const shareSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['viewer', 'editor'], required: true },
    sharedAt: { type: Date, default: () => new Date() },
    sharedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: true },
);

const publicLinkSchema = new Schema(
  {
    token: { type: String, required: true },
    role: { type: String, enum: ['viewer'], default: 'viewer' },
    expiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const fileNodeSchema = new Schema(
  {
    kind: { type: String, enum: ['file', 'folder'], required: true },
    name: { type: String, required: true },
    nameLower: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'FileNode', default: null },
    // Materialized path of every ancestor, root-first. Lets us answer
    // "does user X have access via ANY ancestor folder share" and
    // "give me the whole subtree" in a single indexed query instead of
    // walking parentId one hop at a time.
    ancestorIds: [{ type: Schema.Types.ObjectId, ref: 'FileNode' }],

    // file-only fields
    storageKey: { type: String },
    storageDriver: { type: String, enum: ['local', 's3'] },
    size: { type: Number },
    mimeType: { type: String },
    checksumSha256: { type: String },
    thumbnailKey: { type: String },

    // sharing — see access/resolveAccess.ts for how these are consumed.
    // aclUserIds is a denormalized copy of [ownerId, ...sharedWith.userId]
    // so a single multikey index covers both "can this user see this file"
    // and "list everything shared with this user" with no $or fan-out.
    sharedWith: { type: [shareSchema], default: [] },
    aclUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    publicLink: { type: publicLinkSchema, default: null },

    isStarred: { type: Boolean, default: false },

    isTrashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
    trashedFrom: { type: Schema.Types.ObjectId, ref: 'FileNode', default: null },
  },
  { timestamps: true },
);

fileNodeSchema.index({ ownerId: 1, parentId: 1, isTrashed: 1, kind: 1, nameLower: 1 });
fileNodeSchema.index(
  { ownerId: 1, parentId: 1, nameLower: 1 },
  { unique: true, partialFilterExpression: { isTrashed: false } },
);
fileNodeSchema.index({ aclUserIds: 1, isTrashed: 1, updatedAt: -1 });
fileNodeSchema.index({ ownerId: 1, nameLower: 1 });
fileNodeSchema.index({ ownerId: 1, isStarred: 1, isTrashed: 1 });
fileNodeSchema.index({ 'publicLink.token': 1 }, { unique: true, sparse: true });
fileNodeSchema.index({ ancestorIds: 1 });
fileNodeSchema.index({ trashedAt: 1 });

// Keep nameLower and aclUserIds[0] (owner) in sync automatically so callers
// never have to remember to set them by hand.
fileNodeSchema.pre('save', function preSave(next) {
  if (this.isModified('name')) {
    this.nameLower = this.name.toLowerCase();
  }
  if (this.isNew) {
    const ids = new Set<string>([this.ownerId.toString()]);
    for (const share of this.sharedWith) {
      if (share.userId) ids.add(share.userId.toString());
    }
    this.aclUserIds = Array.from(ids).map((id) => new Types.ObjectId(id));
  }
  next();
});

export type FileNodeDoc = HydratedDocument<InferSchemaType<typeof fileNodeSchema>>;

export const FileNode = model('FileNode', fileNodeSchema);
