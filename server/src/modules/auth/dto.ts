import type { UserDoc } from '../../db/models/User.js';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  storageUsed: number;
  storageQuota: number;
}

export function toUserDTO(user: UserDoc): UserDTO {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? undefined,
    storageUsed: user.storageUsed,
    storageQuota: user.storageQuota,
  };
}
