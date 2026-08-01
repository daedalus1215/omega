# Spec: Allow Clearing Number Fields in Recurring Event Form

---
title: Allow Clearing Number Fields in Recurring Event Form
status: implemented
scope: frontend-only
parent: t_c39ab6f6
task: t_dc77b4c3
---

## Problem

The "Repeat Every" (interval) and "Day of Month" (dayOfMonth) number input fields in the recurrence pattern form could not be visually cleared. When users deleted the value, the field immediately snapped back to `1` due to the `|| 1` fallback logic.

### Root Cause

The `onChange` handlers used `parseInt(e.target.value) || 1`, which:
1. `parseInt('')` returns `NaN`
2. `NaN || 1` evaluates to `1`
3. Field never shows as empty

```typescript
// Line 177 - Before
onChange={e => handleIntervalChange(parseInt(e.target.value) || 1)}

// Line 221 - Before
onChange={e => handleDayOfMonthChange(parseInt(e.target.value) || 1)}
```

## Solution

Introduced local raw-string state for each field to decouple visual display from internal value:

1. **Visual input state** tracks what the user sees (can be empty string)
2. **Internal pattern state** tracks the actual value (defaults to `1` when visual is empty)
3. **On submit**, the internal value is used

### Implementation Details

#### State Variables

```typescript
const [intervalInput, setIntervalInput] = useState<string>(
  pattern.interval?.toString() || '1'
);
const [dayOfMonthInput, setDayOfMonthInput] = useState<string>(
  pattern.dayOfMonth?.toString() || '1'
);
```

#### Change Handlers

```typescript
const handleIntervalChange = (value: string) => {
  setIntervalInput(value);
  const numValue = value === '' ? 1 : parseInt(value, 10);
  if (!isNaN(numValue) && numValue > 0) {
    onChange({ ...pattern, interval: numValue });
  }
};

const handleDayOfMonthChange = (value: string) => {
  setDayOfMonthInput(value);
  const numValue = value === '' ? 1 : parseInt(value, 10);
  if (!isNaN(numValue) && numValue >= 1 && numValue <= 31) {
    onChange({ ...pattern, dayOfMonth: numValue });
  }
};
```

#### Input Rendering

```typescript
<TextField
  type="number"
  value={intervalInput}
  onChange={e => handleIntervalChange(e.target.value)}
  // ... other props
/>
```

#### Sync on External Changes

```typescript
useEffect(() => {
  setIntervalInput(pattern.interval?.toString() || '1');
}, [pattern.interval]);

useEffect(() => {
  setDayOfMonthInput(pattern.dayOfMonth?.toString() || '1');
}, [pattern.dayOfMonth]);
```

## Constraints

| Constraint | Status |
|------------|--------|
| Frontend-only change | ✓ |
| No backend changes | ✓ |
| No validation errors on clear | ✓ |
| Preserve interval > 1 functionality | ✓ |
| Visual empty, default to `1` on submit | ✓ |

## Files Modified

- `frontend/src/pages/CalendarPage/components/RecurrencePatternForm/RecurrencePatternForm.tsx`

## Verification

- TypeScript compilation passes with no errors
- Fields can be visually cleared without snapping back
- Empty values default to `1` internally
- Existing functionality for values > 1 is preserved
