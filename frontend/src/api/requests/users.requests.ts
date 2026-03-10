import api from '../axios.interceptor';
import { UserResponse, UpdateUsernameRequest, UpdatePasswordRequest } from '../dtos/users.dtos';

export const getUserProfile = async (): Promise<UserResponse> => {
  const { data } = await api.get<UserResponse>('/users/profile');
  return data;
};

export const updateUsername = async (
  data: UpdateUsernameRequest
): Promise<UserResponse> => {
  const { data: response } = await api.put<UserResponse>('/users/username', data);
  return response;
};

export const updatePassword = async (
  data: UpdatePasswordRequest
): Promise<{ success: boolean }> => {
  const { data: response } = await api.put<{ success: boolean }>('/users/password', data);
  return response;
};
