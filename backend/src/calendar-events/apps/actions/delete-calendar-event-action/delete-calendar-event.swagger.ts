import { ProtectedActionOptions } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';

/**
 * Swagger configuration for delete calendar event endpoint.
 */
export const DeleteCalendarEventSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Delete a calendar event',
  additionalResponses: [
    {
      status: 200,
      description: 'The calendar event has been successfully deleted.',
    },
    {
      status: 404,
      description: 'Calendar event not found or does not belong to the user.',
    },
  ],
};
