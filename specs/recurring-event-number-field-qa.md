# Q&A: Allow Clearing Number Fields in Recurring Event Form

**Date:** 2026-07-25
**Feature:** Allow users to clear/delete numeric input fields in recurring event creation form
**Project:** Omega (calendar)
**Reporter:** User observation during recurring event creation

---

## Problem Statement

When creating/editing recurring events, the numeric input fields ("Repeat Every" interval and "Day of Month" for monthly patterns) cannot be cleared by the user. Deleting all digits forces the value back to `1` via `|| 1` fallback logic in the onChange handlers.

**Affected files:**
- `frontend/src/pages/CalendarPage/components/RecurrencePatternForm/RecurrencePatternForm.tsx` (lines 177, 221)
- `handleIntervalChange`: `parseInt(e.target.value) || 1` → forces back to 1
- `handleDayOfMonthChange`: `parseInt(e.target.value) || 1` → forces back to 1

---

## Questions for Clarification

### 1. Which Fields Are Affected?
**Question:** Is this about the "Repeat Every" interval field, the "Day of Month" field, or both?
**Current Assumption:** Both fields are affected, but "Repeat Every" is the primary pain point since it appears for all recurrence types (DAILY, WEEKLY, MONTHLY, YEARLY).
**Impact:** Determines scope of frontend changes.
**Confidence:** Medium
Answer: Both

### 2. What Should Happen When Cleared?
**Question:** When a user deletes all digits from a number field, what should the behavior be?
**Options:**
- A) Field shows empty/blank visually, but defaults to `1` on submit (current behavior, just fix the UX)
- B) Field shows a placeholder like "1 (default)" when cleared
- C) Field becomes invalid until a number is entered (add validation error state)
- D) Field is read-only/disabled since `1` is the only valid value for recurrence
**Current Assumption:** Option A — let the user clear it visually, but the form still submits `1` as the default.
**Impact:** Frontend UX implementation approach.
**Confidence:** Low — need user preference
Answer: Option A

### 3. Is Interval=1 the Only Valid Value?
**Question:** For recurring events, does `interval` only ever mean "every 1 [unit]"? Can users set "every 2 weeks" or "every 3 months"?
**Current Assumption:** The current code enforces `Math.max(1, interval)` so interval ≥ 1 is always valid. Users CAN set 2, 3, etc. (e.g., "every 2 weeks"). The issue is only about clearing to empty.
**Impact:** If interval > 1 is valid, we need to preserve that while also allowing clear.
**Confidence:** High
Answer: Correct.

### 4. Day of Month — What About Invalid Days?
**Question:** For the "Day of Month" field (monthly recurrences), what happens if a user enters `31` but the month only has 30 days? Should we validate against actual calendar?
**Current Assumption:** No validation — the backend `rrule` library handles edge cases (e.g., Feb 30 skips that month).
**Impact:** Whether we need calendar-aware validation in the frontend.
**Confidence:** Medium
Answer: No need, rrule handle it for us.

### 5. Backend Validation Required?
**Question:** Does the backend currently reject `interval: 0` or `interval: null`, or does it accept any positive integer?
**Current Assumption:** Backend accepts any `interval ≥ 1`. The frontend `|| 1` guard is a frontend-only safety net.
**Impact:** If we allow the field to visually clear, we need to ensure the submit still sends a valid value.
**Confidence:** High
Answer: Yes

### 6. Is This Frontend-Only?
**Question:** Is this purely a frontend UX issue, or does the backend API need changes to support optional/null interval values?
**Current Assumption:** Frontend-only. The recurrence pattern semantically requires an interval (you can't have "no interval" for a recurring event). The fix is to let the field visually clear but default to `1` on submit.
**Impact:** Determines if backend changes are needed.
**Confidence:** High
Answer: Yes

### 7. Should We Also Fix the "Day of Month" Clear Behavior?
**Question:** For monthly recurrences, the "Day of Month" field has the same `|| 1` issue. Should clearing it default to `1` (first of month) or should it be treated differently?
**Current Assumption:** Same pattern — visually clearable, defaults to `1` on submit.
**Impact:** Consistency across both numeric fields.
**Confidence:** Medium
Answer: Assumption is correct 

---

## Current Code Behavior

### RecurrencePatternForm.tsx — handleIntervalChange (line 109-113)
```typescript
const handleIntervalChange = (interval: number) => {
  const newPattern = { ...pattern, interval: Math.max(1, interval) };
  setPattern(newPattern);
  notifyChange(newPattern, noEndDate, recurrenceEndDate);
};
```

**TextField JSX (line 173-182):**
```tsx
<TextField
  label="Repeat Every"
  type="number"
  value={pattern.interval}
  onChange={e => handleIntervalChange(parseInt(e.target.value) || 1)}
  inputProps={{ min: 1 }}
  ...
/>
```

**Problem:** `parseInt('')` returns `NaN`, and `NaN || 1` = `1`. So when the user backspaces to clear the field, it instantly snaps back to `1`.

### RecurrencePatternForm.tsx — handleDayOfMonthChange (line 125-129)
```typescript
const handleDayOfMonthChange = (day: number) => {
  const newPattern = { ...pattern, dayOfMonth: day };
  setPattern(newPattern);
  notifyChange(newPattern, noEndDate, recurrenceEndDate);
};
```

**TextField JSX (line 216-227):**
```tsx
<TextField
  label="Day of Month"
  type="number"
  value={pattern.dayOfMonth || ''}
  onChange={e => handleDayOfMonthChange(parseInt(e.target.value) || 1)}
  inputProps={{ min: 1, max: 31 }}
  ...
/>
```

**Problem:** Same `|| 1` snap-back behavior.

---

## Proposed Fix Approach

**Frontend-only change to RecurrencePatternForm.tsx:**

1. **Track "cleared" state separately** — use a local state to track whether the user has cleared the field
2. **On visual clear:** Show empty/placeholder, don't snap back
3. **On submit/validation:** Default to `1` if empty
4. **Alternative simpler approach:** Change `|| 1` to `?? 1` so that `0` is allowed visually, then clamp to `1` on submit. But `parseInt('')` is `NaN`, not `undefined`/`null`, so `??` doesn't help with `NaN`.

**Cleanest approach:**
```typescript
const handleIntervalChange = (rawValue: string) => {
  if (rawValue === '') {
    // Let it be visually empty — will default to 1 on submit
    const newPattern = { ...pattern, interval: 1 };
    setPattern(newPattern);
    // Don't call notifyChange with empty — keep internal state at 1
    return;
  }
  const interval = Math.max(1, parseInt(rawValue) || 1);
  const newPattern = { ...pattern, interval };
  setPattern(newPattern);
  notifyChange(newPattern, noEndDate, recurrenceEndDate);
};
```

**OR simpler:** Just accept that the field can't be cleared and make it a `<Input` with `InputProps={{ endAdornment: <IconButton onClick={() => setToDefault()}>` reset button.

---

## Files to Change

| File | Change Type | Scope |
|------|-------------|-------|
| `RecurrencePatternForm.tsx` | Fix interval/dayOfMonth clear behavior | Frontend only |
| `calendar-events.dtos.ts` | No change needed (interval is `number`, always required) | N/A |
| Backend entities | No change (interval ≥ 1 is semantically required) | N/A |

---

## Test Strategy

1. **Manual test:** Create a recurring event, clear the "Repeat Every" field, verify it doesn't snap back to 1
2. **Submit test:** Submit with cleared field, verify backend receives `interval: 1`
3. **Edit test:** Edit existing recurring event with interval > 1, clear field, verify it shows as empty but submits as 1
4. **Day of Month test:** Same behavior for monthly recurrence day field

---

## Risk Assessment

- **Low risk:** This is a frontend UX fix. The underlying data model doesn't change.
- **No breaking changes:** Interval still defaults to 1, which is the current behavior.
- **Edge case:** If user clears field and tab-away without typing, ensure onBlur doesn't cause issues.
