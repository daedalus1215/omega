// Entities created offline get a temporary id until the server assigns a
// real one. Temp ids are negative (server ids are positive serials) and many
// orders of magnitude beyond any real value, so search-and-replace over URLs
// and JSON bodies can't hit an unrelated number.
const TEMP_ID_CEILING = -1e12;

let lastTempId = 0;

/**
 * Next temp id, strictly decreasing per tab: two entities in one tab must
 * never share a temp id, even if Date.now() repeats (a backwards clock
 * step) — a shared id would make id rewrites hit both of them.
 * The random low part keeps two tabs that create in the same millisecond
 * from handing out the same temp id.
 */
export const newTempId = (): number => {
  const candidate = -(Date.now() * 1000 + Math.floor(Math.random() * 1000));
  lastTempId = candidate < lastTempId ? candidate : lastTempId - 1;
  return lastTempId;
};

export const isTempId = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value <= TEMP_ID_CEILING;

export type IdMap = ReadonlyMap<number, number>;

const PATH_ID = /\/(-\d+)(?=[/?#]|$)/g;

/** Swaps temp ids in a URL's path segments for their mapped real ids. */
export const rewriteUrlIds = (url: string, ids: IdMap): string =>
  url.replace(PATH_ID, (segment, raw: string) => {
    const real = ids.get(Number(raw));
    return real === undefined ? segment : `/${real}`;
  });

/** Deep-replaces temp ids anywhere in a JSON-compatible value. */
export const replaceIds = (value: unknown, ids: IdMap): unknown => {
  if (typeof value === 'number') {
    return ids.get(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map(item => replaceIds(item, ids));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceIds(item, ids)])
    );
  }
  return value;
};

/** Rewrites temp ids inside a serialized JSON body; non-JSON is untouched. */
export const rewriteJsonIds = (
  json: string | undefined,
  ids: IdMap
): string | undefined => {
  if (json === undefined || ids.size === 0) {
    return json;
  }
  try {
    return JSON.stringify(replaceIds(JSON.parse(json), ids));
  } catch {
    return json;
  }
};

const collectTempIds = (value: unknown, found: Set<number>): void => {
  if (isTempId(value)) {
    found.add(value);
  } else if (Array.isArray(value)) {
    value.forEach(item => collectTempIds(item, found));
  } else if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(item => collectTempIds(item, found));
  }
};

/** Every temp id referenced by a request's URL path or JSON body. */
export const tempIdsIn = (url: string, json?: string): Set<number> => {
  const found = new Set<number>();
  for (const [, raw] of url.matchAll(PATH_ID)) {
    collectTempIds(Number(raw), found);
  }
  if (json !== undefined) {
    try {
      collectTempIds(JSON.parse(json), found);
    } catch {
      // Not JSON; nothing to find.
    }
  }
  return found;
};
