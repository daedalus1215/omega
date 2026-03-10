import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type UpdatePasswordCommand = {
  userId: number;
  currentPassword: string;
  newPassword: string;
  user: AuthUser;
};
