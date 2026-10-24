import { describe, expect, it } from 'vitest';
import { createMuiTheme } from './theme';

describe('createMuiTheme', () => {
  it('keeps the ripple and MUI transitions when motion is on', () => {
    const theme = createMuiTheme('light', { motionOff: false });

    expect(theme.components?.MuiButtonBase?.defaultProps?.disableRipple).toBe(
      undefined
    );
    expect(theme.transitions.duration.standard).toBeGreaterThan(0);
    expect(
      theme.transitions.create('background-color', { duration: 300 })
    ).not.toBe('none');
  });

  it('turns off the ripple and every MUI transition when motion is off', () => {
    const theme = createMuiTheme('dark', { motionOff: true });

    expect(theme.components?.MuiButtonBase?.defaultProps?.disableRipple).toBe(
      true
    );
    expect(Object.values(theme.transitions.duration)).toEqual([
      0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(theme.transitions.create('background-color', { duration: 300 })).toBe(
      'none'
    );
  });
});
