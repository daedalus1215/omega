import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';

export const UpdatePasswordSwagger: ProtectedActionOptions = {
  tag: 'Users',
  summary: 'Update user password',
  additionalResponses: [
    {
      status: 200,
      description: 'Password updated successfully.',
      type: Object,
    },
    {
      status: 400,
      description:
        'Invalid request data, validation failed, or passwords do not match.',
    },
    {
      status: 401,
      description: 'Unauthorized - incorrect current password.',
    },
  ],
};
