import { useMutation } from '@tanstack/react-query';
import { updateUsername } from '../../../api/requests/users.requests';
import { UpdateUsernameRequest } from '../../../api/dtos/users.dtos';
import { useAuth } from '../../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';

export const useUpdateUsername = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const updateUsernameMutation = useMutation({
    mutationFn: async (data: UpdateUsernameRequest) => {
      return await updateUsername(data);
    },
    onSuccess: () => {
      // Username changed - JWT contains username, so user must re-authenticate
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });

  const handleUpdateUsername = async (data: UpdateUsernameRequest) => {
    return updateUsernameMutation.mutateAsync(data);
  };

  return {
    updateUsername: handleUpdateUsername,
    isUpdating: updateUsernameMutation.isPending,
    error: updateUsernameMutation.error?.message || null,
  };
};
