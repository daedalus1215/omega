export type UserResponse = {
  id: number;
  username: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateUsernameRequest = {
  newUsername: string;
  currentPassword: string;
};

export type UpdatePasswordRequest = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
