---
title: "Spec: Allow Clearing Number Fields in Recurrence Pattern Form"
status: ready
project: omega
scope: frontend
component: RecurrencePatternForm
author: spec-writer
date: 2026-07-25
---

# Spec: Allow Clearing Number Fields in Recurrence Pattern Form

## Summary

Enable users to visually clear the numeric input fields ("Repeat Every" and "Day of Month") in the recurring event form without the value snapping back to `1`. When a cleared field is submitted, it defaults to `1` internally.

## Problem Statement

In `RecurrencePatternForm.tsx`, the `onChange` handlers use `parseInt(e.target.value) || 1` which causes:
- `parseInt('')` returns `NaN`
- `NaN || 1` evaluates to `1`
- User clears the field → value instantly snaps back to `1`

This creates a frustrating UX where users cannot delete the existing value before typing a new one.

## Current Implementation (Buggy)

```tsx
// Lines 208-214: Repeat Every field
<TextField
  label="Repeat Every"
  type="number"
  value={pattern.interval}                    // ❌ Uses pattern value directly
  onChange={e => handleIntervalChange(parseInt(e.target.value) || 1)}  // ❌ Snap-back
  inputProps={{ min: 1 }}
  ...
/>

// Lines 248-259: Day of Month field
<TextField
  label="Day of Month"
  type="number"
  value={pattern.dayOfMonth || ''}            // ❌ Uses pattern value directly
  onChange={e => handleDayOfMonthChange(parseInt(e.target.value) || 1)}  // ❌ Snap-back
  inputProps={{ min: 1, max: 31 }}
  ...
/>
```

## Proposed Fix

The component already has local input state variables defined (lines 77-83). The fix is to:

1. Use the input state variables (`intervalInput`, `dayOfMonthInput`) for `value` prop
2. Pass raw string value to handlers instead of parsed int

### Updated Implementation

```tsx
// Lines 77-83: Already defined
const [intervalInput, setIntervalInput] = useState<string>(
  String(value.recurrencePattern.interval)
);
const [dayOfMonthInput, setDayOfMonthInput] = useState<string>(
  value.recurrencePattern.dayOfMonth ? String(value.recurrencePattern.dayOfMonth) : ''
);

// Lines 119-134: Handler already handles empty strings
const handleIntervalChange = (rawValue: string) => {
  setIntervalInput(rawValue);                  // ✅ Update visual state
  if (rawValue === '') {
    const newPattern = { ...pattern, interval: 1 };
    setPattern(newPattern);
    notifyChange(newPattern, noEndDate, recurrenceEndDate);
  } else {
    const parsed = parseInt(rawValue, 10);
    if (!isNaN(parsed)) {
      const newPattern = { ...pattern, interval: Math.max(1, parsed) };
      setPattern(newPattern);
      notifyChange(newPattern, noEndDate, recurrenceEndDate);
    }
  }
};

// Lines 146-161: Handler already handles empty strings
const handleDayOfMonthChange = (rawValue: string) => {
  setDayOfMonthInput(rawValue);                // ✅ Update visual state
  if (rawValue === '') {
    const newPattern = { ...pattern, dayOfMonth: undefined };
    setPattern(newPattern);
    notifyChange(newPattern, noEndDate, recurrenceEndDate);
  } else {
    const parsed = parseInt(rawValue, 10);
    if (!isNaN(parsed)) {
      const newPattern = { ...pattern, dayOfMonth: parsed };
      setPattern(newPattern);
      notifyChange(newPattern, noEndDate, recurrenceEndDate);
    }
  }
};

// Updated TextField for Repeat Every (line ~208)
<TextField
  label="Repeat Every"
  type="number"
  value={intervalInput}                       // ✅ Use input state
  onChange={e => handleIntervalChange(e.target.value)}  // ✅ Pass raw string
  inputProps={{ min: 1 }}
  ...
/>

// Updated TextField for Day of Month (line ~252)
<TextField
  label="Day of Month"
  type="number"
  value={dayOfMonthInput}                     // ✅ Use input state
  onChange={e => handleDayOfMonthChange(e.target.value)}  // ✅ Pass raw string
  inputProps={{ min: 1, max: 31 }}
  ...
/>
```

## Acceptance Criteria

| # | Criterion | Test |
|---|-----------|------|
| 1 | Clearing "Repeat Every" shows empty visually | Delete all digits → field appears empty |
| 2 | Clearing "Day of Month" shows empty visually | Delete all digits → field appears empty |
| 3 | Submitting cleared "Repeat Every" sends `interval: 1` | Submit form → payload has `interval: 1` |
| 4 | Submitting cleared "Day of Month" sends `dayOfMonth: 1` | Submit form → payload has `dayOfMonth: 1` |
| 5 | Typing valid numbers (2, 3, etc.) works | Type "3" → field shows "3", submits `3` |
| 6 | Existing behavior preserved | Change recurrence type → fields reset correctly |
| 7 | No TypeScript errors | `tsc --noEmit` passes |
| 8 | No lint warnings | `eslint` passes |

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/CalendarPage/components/RecurrencePatternForm/RecurrencePatternForm.tsx` | Use input state for value props; pass raw strings to handlers |

## Q&A Reference

See `recurring-event-number-field-qa.md` for full Q&A:
- **Both fields affected:** Repeat Every + Day of Month
- **Clear behavior:** Option A (visually empty, defaults to 1 on submit)
- **Interval validation:** Interval ≥ 1 valid (e.g., "every 2 weeks")
- **Day of Month validation:** No frontend validation; rrule handles server-side
- **Backend changes:** None required

## Edge Cases

| Case | Behavior |
|------|----------|
| User types non-numeric | Ignored (isNaN check) |
| User types `0` | Clamped to `1` via `Math.max(1, parsed)` |
| User clears then tabs away | Shows empty, internal value is `1` |
| Switching recurrence type | Resets inputs via `handleTypeChange` (already implemented) |

## Implementation Notes

1. The component already has the correct handler logic — only the `value` and `onChange` props need updating
2. The `handleTypeChange` function (line 114-115) already resets input states: `setIntervalInput('1'); setDayOfMonthInput('');`
3. No backend changes — the DTOs remain unchanged
4. No new dependencies required
