import { ProtectedActionOptions } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';

/**
 * Swagger configuration for create recurring calendar event endpoint.
 */
export const CreateRecurringEventSwagger: ProtectedActionOptions = {
  tag: 'Recurring Events',
  summary: 'Create a recurring calendar event',
  additionalResponses: [
    {
      status: 201,
      description: 'Recurring event created successfully',
    },
    {
      status: 400,
      description: 'Invalid request data',
    },
  ],
};
