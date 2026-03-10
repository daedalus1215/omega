import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';

export const UpdateUsernameSwagger: ProtectedActionOptions = {
  tag: 'Users',
  summary: 'Update user username',
  additionalResponses: [
    {
      status: 200,
      description: 'Username updated successfully.',
    },
    {
      status: 400,
      description: 'Invalid username format or validation failed.',
    },
    {
      status: 401,
      description: 'Unauthorized - incorrect password.',
    },
    {
      status: 409,
      description: 'Username already exists.',
    },
  ],
};
