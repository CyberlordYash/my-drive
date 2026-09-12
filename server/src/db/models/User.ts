import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { env } from '../../config/env.js';

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    storageUsed: { type: Number, default: 0, min: 0 },
    storageQuota: { type: Number, default: () => env.USER_QUOTA_BYTES },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model('User', userSchema);
