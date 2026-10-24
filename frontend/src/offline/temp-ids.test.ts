import { describe, expect, it } from 'vitest';
import {
  isTempId,
  newTempId,
  replaceIds,
  rewriteJsonIds,
  rewriteUrlIds,
  tempIdsIn,
} from './temp-ids';

describe('temp ids', () => {
  it('hands out distinct ids that never look like server ids', () => {
    const ids = Array.from({ length: 50 }, newTempId);

    expect(new Set(ids).size).toBe(50);
    expect(ids.every(isTempId)).toBe(true);
    expect([1, 42, -1, 0, 2 ** 31].some(isTempId)).toBe(false);
  });

  it('stays unique and in range across a tight loop', () => {
    const ids = Array.from({ length: 1000 }, newTempId);

    expect(new Set(ids).size).toBe(1000);
    expect(ids.every(isTempId)).toBe(true);
  });

  it('rewrites mapped ids in path segments only', () => {
    const temp = newTempId();
    const ids = new Map([[temp, 42]]);

    expect(rewriteUrlIds(`/api/notes/detail/${temp}`, ids)).toBe(
      '/api/notes/detail/42'
    );
    expect(rewriteUrlIds(`/api/notes/${temp}/timestamp`, ids)).toBe(
      '/api/notes/42/timestamp'
    );
    expect(rewriteUrlIds(`/api/notes?cursor=${temp}`, ids)).toBe(
      `/api/notes?cursor=${temp}`
    );
  });

  it('deep-replaces mapped ids in bodies', () => {
    const temp = newTempId();
    const ids = new Map([[temp, 42]]);

    expect(
      replaceIds({ noteId: temp, nested: [{ id: temp }], other: 3 }, ids)
    ).toEqual({ noteId: 42, nested: [{ id: 42 }], other: 3 });
    expect(rewriteJsonIds(JSON.stringify({ noteId: temp }), ids)).toBe(
      '{"noteId":42}'
    );
    expect(rewriteJsonIds('not json', ids)).toBe('not json');
  });

  it('finds temp ids referenced by a request', () => {
    const a = newTempId();
    const b = newTempId();

    expect(
      tempIdsIn(`/api/notes/${a}`, JSON.stringify({ noteId: b, minutes: 5 }))
    ).toEqual(new Set([a, b]));
    expect(tempIdsIn('/api/notes/5', '{"sortOrder":-1}')).toEqual(new Set());
  });
});
