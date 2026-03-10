import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsObject,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  IsBoolean,
  ArrayMinSize,
  MaxLength,
  Max,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'isEndDateAfterStartDate', async: false })
export class IsEndDateAfterStartDateConstraint
  implements ValidatorConstraintInterface
{
  validate(endDate: string, args: ValidationArguments): boolean {
    const startDate = (args.object as CreateRecurringEventRequestDto).startDate;
    if (!startDate || !endDate) {
      return true;
    }
    return new Date(endDate) > new Date(startDate);
  }

  defaultMessage(): string {
    return 'End date must be after start date';
  }
}

export const IsEndDateAfterStartDate = (
  validationOptions?: ValidationOptions
) => {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEndDateAfterStartDateConstraint,
    });
  };
};

@ValidatorConstraint({ name: 'isMutuallyExclusiveRecurrenceEnd', async: false })
export class IsMutuallyExclusiveRecurrenceEndConstraint
  implements ValidatorConstraintInterface
{
  validate(
    recurrenceEndDate: string | undefined,
    args: ValidationArguments
  ): boolean {
    const noEndDate = (args.object as CreateRecurringEventRequestDto).noEndDate;
    if (noEndDate && recurrenceEndDate) {
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'Cannot specify both recurrenceEndDate and noEndDate';
  }
}

export const IsMutuallyExclusiveRecurrenceEnd = (
  validationOptions?: ValidationOptions
) => {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMutuallyExclusiveRecurrenceEndConstraint,
    });
  };
};

export class RecurrencePatternDto {
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

  @IsInt()
  @Min(1)
  interval: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @ArrayMinSize(1)
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  monthOfYear?: number;
}

export class CreateRecurringEventRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsEndDateAfterStartDate()
  endDate: string;

  @IsObject()
  @ValidateNested()
  @Type(() => RecurrencePatternDto)
  recurrencePattern: RecurrencePatternDto;

  @IsOptional()
  @IsDateString()
  @IsMutuallyExclusiveRecurrenceEnd()
  recurrenceEndDate?: string;

  @IsBoolean()
  noEndDate: boolean;
}
