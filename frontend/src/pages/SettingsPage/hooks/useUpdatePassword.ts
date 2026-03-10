import { useMutation } from '@tanstack/react-query';
import { updatePassword } from '../../../api/requests/users.requests';
import { UpdatePasswordRequest } from '../../../api/dtos/users.dtos';

export const useUpdatePassword = () => {
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: UpdatePasswordRequest) => {
      return await updatePassword(data);
    },
  });

  const handleUpdatePassword = async (data: UpdatePasswordRequest) => {
    return updatePasswordMutation.mutateAsync(data);
  };

  return {
    updatePassword: handleUpdatePassword,
    isUpdating: updatePasswordMutation.isPending,
    error: updatePasswordMutation.error?.message || null,
  };
};
