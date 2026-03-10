import { ProtectedActionOptions } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';

/**
 * Swagger configuration for delete recurring event endpoint.
 */
export const DeleteRecurringEventSwagger: ProtectedActionOptions = {
  tag: 'Recurring Events',
  summary: 'Delete a recurring event',
  additionalResponses: [
    {
      status: 200,
      description:
        'The recurring event and all its instances have been successfully deleted.',
    },
    {
      status: 404,
      description: 'Recurring event not found or does not belong to the user.',
    },
  ],
};
