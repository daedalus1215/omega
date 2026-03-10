# Calendar View Migration Guide

## Overview

This guide explains the changes made to the CalendarView and how to use the new architecture.

## Breaking Changes

### None!

All changes are internal refactorings. The public API remains the same.

**CalendarView Props** - No changes:
```typescript
type CalendarViewProps = {
  startDate: Date;
  endDate: Date;
  events: CalendarEventResponseDto[];
  isLoading: boolean;
  onLoadMoreDays: (direction: 'left' | 'right') => void;
  onToday: () => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement>; // NEW (optional)
};
```

## New Features

### 1. Scroll Position Preservation

**What Changed:**
- Calendar no longer jumps when loading days to the left

**How It Works:**
- `CalendarPage.tsx` now tracks scroll position before adding days
- Automatically adjusts scroll after new days are added

**No Action Required** - Works automatically!

### 2. Auto-Scroll to Current Time

**What Changed:**
- Calendar now scrolls vertically to current time on mount
- Shows 2 hours before current time by default

**Configuration:**
```typescript
// In useScrollToToday hook
const { scrollToToday } = useScrollToToday({
  containerRef: calendarGridRef,
  days,
  isMobile,
  autoScrollOnMount: true,        // Enable/disable auto-scroll
  scrollToCurrentTime: true,      // Enable/disable vertical scroll
});
```

### 3. Drag Snapping

**What Changed:**
- Events now snap to 15-minute intervals when dragging

**Configuration:**
```typescript
// Change snap interval in constants/calendar.constants.ts
export const CALENDAR_CONSTANTS = {
  DRAG_SNAP_INTERVAL: 15, // Change to 30 for 30-minute snapping
  // ...
};
```

### 4. Loading Skeletons

**What Changed:**
- Shows animated skeleton columns while loading more days

**Configuration:**
```typescript
// Number of skeleton columns shown
{isLoadingLeft &&
  Array.from({ length: 3 }).map((_, i) => (  // Change '3' to adjust count
    <SkeletonDayColumn key={`skeleton-left-${i}`} timeSlots={timeSlots} />
  ))}
```

## Customization

### Adjusting Constants

All layout values are now in one place:

```typescript
// frontend/src/pages/CalendarPage/constants/calendar.constants.ts

export const CALENDAR_CONSTANTS = {
  SLOT_HEIGHT: 60,                    // Height of each hour slot
  HEADER_HEIGHT: 60,                  // Desktop header height
  MOBILE_HEADER_HEIGHT: 55,           // Mobile header height
  DAY_WIDTH: 150,                     // Desktop day column width
  MOBILE_DAY_WIDTH: 100,              // Mobile day column width
  DAYS_TO_LOAD: 30,                   // Days loaded per infinite scroll
  SCROLL_THRESHOLD: 5,                // Days from edge to trigger loading
  DRAG_SNAP_INTERVAL: 15,             // Minutes to snap when dragging
  SCROLL_TO_NOW_OFFSET_HOURS: 2,     // Hours to show before current time
  // ...
};
```

### Using Extracted Hooks

All hooks are reusable in other components:

```typescript
// Scroll to a specific element
import { scrollToElementHorizontally } from '../utils/scroll.utils';

scrollToElementHorizontally(container, element, 'smooth');

// Get current time indicator position
import { useCurrentTimeIndicator } from '../hooks/useCurrentTimeIndicator';

const { currentTimePosition, isTodayInRange } = useCurrentTimeIndicator({
  days,
  isMobile,
});

// Track visible date range
import { useVisibleDateRange } from '../hooks/useVisibleDateRange';

const { visibleStartDate, visibleEndDate } = useVisibleDateRange({
  containerRef,
  days,
  isMobile,
});
```

## Component Architecture

### Old Structure
```
CalendarView.tsx (one large component)
  - All logic inline
  - All JSX inline
```

### New Structure
```
CalendarView.tsx (orchestrator)
  ├── TimeColumn (component)
  ├── CurrentTimeIndicator (component)
  ├── SkeletonDayColumn (component)
  ├── useScrollToToday (hook)
  ├── useCurrentTimeIndicator (hook)
  ├── useVisibleDateRange (hook)
  ├── useInfiniteScrollDays (hook)
  └── utils/scroll.utils (utilities)
```

## Testing

### What to Test

1. **Scroll Behavior**
   ```
   ✓ Scroll right → loads more days
   ✓ Scroll left → loads more days without jumping
   ✓ Today button → scrolls to today and current time
   ```

2. **Drag & Drop**
   ```
   ✓ Drag event → snaps to 15-minute intervals
   ✓ Drop event → updates in database
   ```

3. **Loading States**
   ```
   ✓ Skeleton appears when scrolling
   ✓ Skeleton disappears after loading
   ```

4. **Overlapping Events**
   ```
   ✓ Events overlap → columns assigned optimally
   ✓ Non-overlapping events → share columns
   ```

### Test Files to Create

Recommended test files (not yet implemented):

```
hooks/__tests__/
  ├── useScrollToToday.test.ts
  ├── useCurrentTimeIndicator.test.ts
  ├── useVisibleDateRange.test.ts
  └── useEventLayouts.test.ts

utils/__tests__/
  ├── scroll.utils.test.ts
  └── drag-modifiers.utils.test.ts

components/__tests__/
  ├── TimeColumn.test.tsx
  ├── CurrentTimeIndicator.test.tsx
  └── SkeletonDayColumn.test.tsx
```

## Performance

### Current Optimizations

1. **Memoization**
   - `timeSlots` array memoized
   - Day intervals memoized
   - Layout calculations memoized

2. **RequestAnimationFrame**
   - Scroll position updates
   - Visible range calculations

3. **Efficient Layout Algorithm**
   - O(n log n) with better space usage

### Future Optimizations

1. **Virtualization** (prepared but not implemented)
   ```typescript
   // Hook already created: hooks/useVirtualizedDays.ts
   // To implement:
   // 1. Use absolute positioning for DayColumn
   // 2. Render only visible columns
   // 3. Update on scroll
   ```

2. **Code Splitting**
   ```typescript
   // Lazy load modal components
   const EventDetailsModal = lazy(() => import('./EventDetailsModal'));
   const CreateEventModal = lazy(() => import('./CreateEventModal'));
   ```

## Troubleshooting

### Scroll Jumps When Loading Left

**Check:**
- Is `scrollContainerRef` passed to CalendarView?
- Is scroll position preservation logic in `handleLoadMoreDays`?

**Fix:**
```typescript
// In CalendarPage.tsx
const scrollContainerRef = useRef<HTMLDivElement>(null);

<CalendarView
  scrollContainerRef={scrollContainerRef}
  // ... other props
/>
```

### Drag Not Snapping

**Check:**
- Is `snapToTimeSlot` modifier in DndContext?

**Fix:**
```typescript
<DndContext
  modifiers={[snapToTimeSlot]}
  // ... other props
>
```

### Current Time Indicator Not Showing

**Check:**
- Is today in the visible date range?
- Is the hook calculating position correctly?

**Debug:**
```typescript
const { currentTimePosition, isTodayInRange } = useCurrentTimeIndicator({
  days,
  isMobile,
});

console.log('Today in range:', isTodayInRange);
console.log('Position:', currentTimePosition);
```

### Skeleton Loading Not Showing

**Check:**
- Is `useInfiniteScrollDays` returning loading state?
- Are skeleton components in JSX?

**Debug:**
```typescript
const { isLoadingLeft, isLoadingRight } = useInfiniteScrollDays({
  containerRef: calendarGridRef,
  onLoadMoreDays,
});

console.log('Loading left:', isLoadingLeft);
console.log('Loading right:', isLoadingRight);
```

## Rollback Plan

If issues arise, you can revert to the previous version:

```bash
git log --oneline --all | grep "Calendar"  # Find commit hash
git revert <commit-hash>
```

Or cherry-pick specific changes:
```bash
# Revert just constants
git checkout HEAD~1 -- frontend/src/pages/CalendarPage/constants/

# Revert CalendarView changes
git checkout HEAD~1 -- frontend/src/pages/CalendarPage/components/CalendarView/
```

## Support

For questions or issues:
1. Check `IMPROVEMENTS.md` for implementation details
2. Review `calendar.constants.ts` for configurable values
3. Check component JSDoc comments
4. Review hook documentation in file headers

## Future Enhancements

Planned improvements (not yet implemented):

1. **Virtualization** - Render only visible columns
2. **Multi-Day Events** - Special rendering for spanning events
3. **Event Resizing** - Drag handles on event edges
4. **Accessibility** - ARIA roles and keyboard navigation
5. **Error Boundaries** - Graceful error handling
6. **Performance Monitoring** - Metrics and analytics

See `IMPROVEMENTS.md` for full roadmap.
