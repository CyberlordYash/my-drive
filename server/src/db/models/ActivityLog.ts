import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const ACTIVITY_ACTIONS = [
  'upload',
  'rename',
  'move',
  'copy',
  'delete',
  'restore',
  'share',
  'unshare',
  'download',
  'star',
  'unstar',
] as const;

const activityLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileId: { type: Schema.Types.ObjectId, ref: 'FileNode', required: true },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ fileId: 1, createdAt: -1 });
activityLogSchema.index({ actorId: 1, createdAt: -1 });

export type ActivityLogDoc = HydratedDocument<InferSchemaType<typeof activityLogSchema>>;

export const ActivityLog = model('ActivityLog', activityLogSchema);
