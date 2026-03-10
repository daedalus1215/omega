import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type UpdateUsernameCommand = {
  userId: number;
  newUsername: string;
  currentPassword: string;
  user: AuthUser;
};
