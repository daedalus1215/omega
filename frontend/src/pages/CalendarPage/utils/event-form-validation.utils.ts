import { UpdateCalendarEventRequest } from '../../../api/dtos/calendar-events.dtos';

export type ValidationErrors = {
  title?: string;
  startDate?: string;
  endDate?: string;
};

/**
 * Validate event form data.
 * Returns validation errors object (empty if valid).
 */
export const validateEventForm = (
  formData: UpdateCalendarEventRequest
): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!formData.title.trim()) {
    errors.title = 'Title is required';
  } else if (formData.title.length > 255) {
    errors.title = 'Title cannot exceed 255 characters';
  }
  if (!formData.startDate) {
    errors.startDate = 'Start date is required';
  }
  if (!formData.endDate) {
    errors.endDate = 'End date is required';
  }
  if (formData.startDate && formData.endDate) {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (start >= end) {
      errors.endDate = 'End date must be after start date';
    }
  }
  return errors;
};

/**
 * Check if validation errors object is empty (form is valid).
 */
export const isFormValid = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length === 0;
};
