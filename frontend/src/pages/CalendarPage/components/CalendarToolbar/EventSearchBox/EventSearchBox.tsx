import React, { useRef, useState } from 'react';
import {
  Box,
  TextField,
  Popover,
  Typography,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { SearchCalendarEventsResultDto } from '../../../../../api/dtos/calendar-events.dtos';
import { useSearchCalendarEvents } from '../../../hooks/useSearchCalendarEvents';
import {
  EVENT_COLORS,
  DEFAULT_EVENT_COLOR_KEY,
} from '../../../constants/calendar.constants';
import styles from './EventSearchBox.module.css';

/** Minimum query length (after trimming) before the API is called. */
const MIN_SEARCH_QUERY_LENGTH = 2;

/** Shared date format for the result rows. */
const RESULT_DATE_FORMAT = 'EEE, MMM d, yyyy · h:mm a';

interface EventSearchBoxProps {
  onSearchSelect: (result: SearchCalendarEventsResultDto) => void;
}

/**
 * Desktop toolbar search box for finding events by name.
 * Debounced, keyboard-navigable dropdown listing one-time events and
 * recurring series; selecting a result notifies the parent to navigate.
 */
export const EventSearchBox: React.FC<EventSearchBoxProps> = ({
  onSearchSelect,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, isLoading, hasSearched } = useSearchCalendarEvents(query);

  const isSelectable = (result: SearchCalendarEventsResultDto): boolean =>
    result.kind === 'one-time' || result.nextInstanceId !== undefined;

  const findSelectableIndex = (
    start: number,
    direction: 1 | -1
  ): number => {
    if (results.length === 0) {
      return -1;
    }
    const lastIndex = results.length - 1;
    for (let i = 0; i <= lastIndex; i++) {
      const index = start + direction;
      if (index < 0 || index > lastIndex) {
        return -1;
      }
      if (isSelectable(results[index])) {
        return index;
      }
    }
    return -1;
  };

  const handleSelect = (result: SearchCalendarEventsResultDto): void => {
    onSearchSelect(result);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const value = event.target.value;
    setQuery(value);
    setActiveIndex(-1);
    if (value.trim().length >= MIN_SEARCH_QUERY_LENGTH) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key === 'ArrowDown' && !isOpen) {
      event.preventDefault();
      const firstSelectable = findSelectableIndex(-1, 1);
      if (firstSelectable >= 0) {
        setIsOpen(true);
        setActiveIndex(firstSelectable);
      }
      return;
    }

    if (!isOpen) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = findSelectableIndex(activeIndex, 1);
        if (nextIndex >= 0) {
          setActiveIndex(nextIndex);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const previousIndex = findSelectableIndex(activeIndex, -1);
        if (previousIndex >= 0) {
          setActiveIndex(previousIndex);
        }
        break;
      }
      case 'Enter': {
        event.preventDefault();
        const selectedIndex =
          activeIndex >= 0 ? activeIndex : findSelectableIndex(-1, 1);
        if (selectedIndex >= 0) {
          handleSelect(results[selectedIndex]);
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      }
      default:
        break;
    }
  };

  const handlePopoverClose = (): void => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleRowHover = (
    result: SearchCalendarEventsResultDto,
    index: number
  ): void => {
    if (isSelectable(result)) {
      setActiveIndex(index);
    }
  };

  const getMetaLabel = (result: SearchCalendarEventsResultDto): string => {
    if (result.kind === 'one-time') {
      return format(parseISO(result.startDate), RESULT_DATE_FORMAT);
    }
    if (result.nextInstanceId !== undefined && result.nextInstanceStartDate) {
      return `Repeats · next: ${format(
        parseISO(result.nextInstanceStartDate),
        RESULT_DATE_FORMAT
      )}`;
    }
    return 'No upcoming occurrences';
  };

  const getColor = (result: SearchCalendarEventsResultDto): string =>
    result.color ?? EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value;

  const showLoading =
    isLoading && !hasSearched && query.trim().length > 0;

  return (
    <Box ref={anchorRef} className={styles.wrapper}>
      <TextField
        inputRef={inputRef}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        size="small"
        placeholder="Search events"
        inputProps={{
          'aria-label': 'Search events',
          'aria-expanded': isOpen,
          'aria-controls': 'event-search-listbox',
        }}
        className={styles.input}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon className={styles.searchIcon} />
            </InputAdornment>
          ),
        }}
      />
      <Popover
        open={isOpen}
        anchorEl={anchorRef.current}
        onClose={handlePopoverClose}
        disableAutoFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: { className: styles.popoverPaper },
        }}
      >
        <div
          id="event-search-listbox"
          role="listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `event-search-option-${activeIndex}` : undefined
          }
          className={styles.listbox}
        >
          {showLoading ? (
            <Box className={styles.loadingRow}>
              <CircularProgress size={16} className={styles.spinner} />
              <Typography variant="body2">Searching…</Typography>
            </Box>
          ) : (
            <>
              {results.map((result, index) => {
                const selectable = isSelectable(result);
                return (
                  <div
                    key={
                      result.kind === 'one-time'
                        ? `event-${result.eventId}`
                        : `series-${result.recurringEventId}`
                    }
                    id={`event-search-option-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    aria-disabled={!selectable}
                    tabIndex={-1}
                    className={`${styles.resultRow} ${
                      activeIndex === index ? styles.activeRow : ''
                    } ${!selectable ? styles.disabledRow : ''}`}
                    onClick={
                      selectable ? () => handleSelect(result) : undefined
                    }
                    onMouseEnter={() => handleRowHover(result, index)}
                  >
                    <span
                      className={styles.colorDot}
                      style={{ backgroundColor: getColor(result) }}
                    />
                    {result.kind === 'recurring-series' && (
                      <RepeatIcon className={styles.repeatIcon} />
                    )}
                    <Box className={styles.rowText}>
                      <Typography variant="body2" className={styles.rowTitle}>
                        {result.title}
                      </Typography>
                      <Typography variant="caption" className={styles.rowMeta}>
                        {getMetaLabel(result)}
                      </Typography>
                    </Box>
                  </div>
                );
              })}
              {hasSearched && results.length === 0 && (
                <div className={styles.emptyRow}>
                  <Typography variant="body2">
                    No events found for "{query.trim()}"
                  </Typography>
                </div>
              )}
            </>
          )}
        </div>
      </Popover>
    </Box>
  );
};
