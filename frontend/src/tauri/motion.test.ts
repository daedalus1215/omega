import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyMotionSetting, isMotionOff } from './motion';

// The module under test reads `window` and `document` as globals; under Node
// neither exists, so the tests stub them with `vi.stubGlobal`.
const stubDocument = (dataset: Record<string, string>): void => {
  vi.stubGlobal('document', { documentElement: { dataset } });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isMotionOff', () => {
  it('is off only in the Tauri app', () => {
    vi.stubGlobal('window', {});
    expect(isMotionOff()).toBe(false);

    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    expect(isMotionOff()).toBe(true);
  });
});

describe('applyMotionSetting', () => {
  it('sets data-motion="off" on <html> in the Tauri app', () => {
    const dataset: Record<string, string> = {};
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    stubDocument(dataset);

    applyMotionSetting();

    expect(dataset).toEqual({ motion: 'off' });
  });

  it('leaves the web app untouched', () => {
    const dataset: Record<string, string> = {};
    vi.stubGlobal('window', {});
    stubDocument(dataset);

    applyMotionSetting();

    expect(dataset).toEqual({});
  });
});
