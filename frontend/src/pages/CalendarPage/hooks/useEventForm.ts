import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { CalendarEventResponseDto } from '../../../api/dtos/calendar-events.dtos';
import { UpdateCalendarEventRequest } from '../../../api/dtos/calendar-events.dtos';
import {
  validateEventForm,
  ValidationErrors,
  isFormValid,
} from '../utils/event-form-validation.utils';

type UseEventFormOptions = {
  event: CalendarEventResponseDto | undefined;
  onUpdate: (data: UpdateCalendarEventRequest) => Promise<void>;
  onSuccess?: () => void;
};

/**
 * Hook for managing event form state, validation, and submission.
 * Handles form data initialization, validation, and update submission.
 *
 * @param options - Hook options
 * @param options.event - The event to edit (undefined for new events)
 * @param options.onUpdate - Callback to handle form submission
 * @param options.onSuccess - Optional callback after successful update
 * @returns Form state and handlers
 */
export const useEventForm = ({
  event,
  onUpdate,
  onSuccess,
}: UseEventFormOptions) => {
  const [formData, setFormData] = useState<UpdateCalendarEventRequest>({
    title: '',
    description: '',
    color: undefined,
    startDate: '',
    endDate: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        color: event.color,
        startDate: format(new Date(event.startDate), "yyyy-MM-dd'T'HH:mm"),
        endDate: format(new Date(event.endDate), "yyyy-MM-dd'T'HH:mm"),
      });
      setValidationErrors({});
    }
  }, [event]);

  const updateField = useCallback(
    (field: keyof UpdateCalendarEventRequest, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (validationErrors[field as keyof ValidationErrors]) {
        setValidationErrors(prev => ({
          ...prev,
          [field]: undefined,
        }));
      }
      if (
        field === 'startDate' &&
        validationErrors.endDate &&
        formData.endDate
      ) {
        const start = new Date(value);
        const end = new Date(formData.endDate);
        if (start < end) {
          setValidationErrors(prev => ({
            ...prev,
            endDate: undefined,
          }));
        }
      }
    },
    [validationErrors, formData.endDate]
  );

  const resetForm = useCallback(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        color: event.color,
        startDate: format(new Date(event.startDate), "yyyy-MM-dd'T'HH:mm"),
        endDate: format(new Date(event.endDate), "yyyy-MM-dd'T'HH:mm"),
      });
    }
    setValidationErrors({});
  }, [event]);

  const validate = useCallback((): boolean => {
    const errors = validateEventForm(formData);
    setValidationErrors(errors);
    return isFormValid(errors);
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) {
        return;
      }
      setIsSubmitting(true);
      try {
        await onUpdate({
          title: formData.title,
          description: formData.description || undefined,
          color: formData.color,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
        });
        resetForm();
        onSuccess?.();
      } catch (error) {
        console.error('Error updating calendar event:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, onUpdate, onSuccess, resetForm]
  );

  return {
    formData,
    validationErrors,
    isSubmitting,
    updateField,
    resetForm,
    handleSubmit,
  };
};
