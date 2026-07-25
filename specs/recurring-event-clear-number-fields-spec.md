---
title: 'Spec: Allow Clearing Number Fields in Recurrence Pattern Form'
status: implemented
project: omega
scope: frontend
component: RecurrencePatternForm
date: 2026-07-25
---

# Spec: Allow Clearing Number Fields in Recurrence Pattern Form

## Summary

Let users clear the "Repeat Every" and "Day of Month" fields in the recurring event
form without the value snapping back to `1`, so an existing value can be deleted
before typing a new one.

## Problem

Both `onChange` handlers used `parseInt(e.target.value) || 1`. Since `parseInt('')`
is `NaN` and `NaN || 1` is `1`, backspacing to empty instantly restored `1` and the
field could never appear blank.

```tsx
// Before
<TextField
  label="Repeat Every"
  type="number"
  value={pattern.interval}
  onChange={e => handleIntervalChange(parseInt(e.target.value) || 1)}
  inputProps={{ min: 1 }}
/>
```

## Solution

Each numeric field keeps its raw text in local state, separate from the semantic
value in the pattern. The text buffer holds the one thing the pattern cannot
express — that the user has cleared the box — while the pattern stays valid
throughout the edit.

Everything else stays in the parent. `CreateEventModal` owns `recurrenceData` and
passes it back down as `value`, so the component reads the pattern straight from
props and reports every edit through `onChange`. No mirrored copy, no sync effect.

Because the fields are `type="text"` (a `type="number"` box cannot display an empty
string reliably across browsers while still holding a value), the browser no longer
filters input. A shared parser rejects any keystroke that is not a plain in-range
number, so the box can never display something different from what would be
submitted:

```tsx
const parseNumericInput = (
  raw: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
): number | 'empty' | null => {
  if (raw === '') return 'empty';
  if (!/^\d+$/.test(raw)) return null;
  const parsed = parseInt(raw, 10);
  return parsed >= min && parsed <= max ? parsed : null;
};
```

Bounds mirror the backend DTO (`create-recurring-event.dto.ts`): `interval` is
`@Min(1)` with no maximum; `dayOfMonth` is `@Min(1) @Max(31)`.

## Behavior

| Field | Blank means | Rationale |
|-------|-------------|-----------|
| Repeat Every | `interval: 1` | A recurrence has no meaningful "no interval"; 1 is the identity value. |
| Day of Month | `dayOfMonth: undefined` | `rrule-pattern.utils.ts` omits `bymonthday` when unset, so the event recurs on its start date's day. |

Blank Day of Month deliberately does **not** submit `1`. Forcing the 1st would mean
an event starting Mar 15 silently recurs on the 1st, and it would make an untouched
field behave differently from a cleared one. The helper text states the fallback.

## Edge cases

| Input | Result |
|-------|--------|
| Letters, symbols, `12x` | Keystroke rejected; box unchanged |
| `-5`, `0` | Rejected (below `min`) |
| `45` in Day of Month | Rejected (above 31) |
| Cleared, then tab away | Box stays empty; pattern holds the field's blank default |
| Recurrence type switched | `handleTypeChange` resets both buffers |

## Acceptance criteria

| # | Criterion |
|---|-----------|
| 1 | Clearing either field leaves it visually empty |
| 2 | Cleared "Repeat Every" submits `interval: 1` |
| 3 | Cleared "Day of Month" submits `dayOfMonth: undefined` |
| 4 | Out-of-range and non-numeric input is rejected, never displayed |
| 5 | Values > 1 still work (e.g. "every 2 weeks") |
| 6 | Switching recurrence type resets both fields |
| 7 | `npm run build` (tsc + vite) passes |

## Decisions

Resolved with the requester before implementation:

- **Both fields** are in scope; "Repeat Every" is the primary pain point since it
  shows for every recurrence type.
- **Cleared fields stay visually blank** and fall back to a default on submit,
  rather than showing a validation error or a placeholder label.
- **`interval` > 1 is valid** ("every 2 weeks"); only the clear behavior was broken.
- **No calendar-aware Day of Month validation** — `rrule` already skips months that
  lack the requested day (e.g. Feb 30).
- **Frontend-only**; no DTO or backend changes.
- **Superseded:** an earlier round specified blank Day of Month → `1`. Changed to
  `undefined` to preserve the existing start-date fallback and keep untouched and
  cleared fields consistent.

## Files changed

| File | Change |
|------|--------|
| `frontend/src/pages/CalendarPage/components/RecurrencePatternForm/RecurrencePatternForm.tsx` | Raw-text buffers for numeric fields; component made fully controlled; input parsing/bounds added |

## Testing

Covered by manual verification and `npm run build`. The frontend has no test runner
(no vitest/jest, no test files), so there is no automated coverage — worth adding
separately.
