import { initialDv100Data } from './dv100State';

type PathMap = Record<string, string>;

function buildPathMap(
  value: unknown,
  path: string[] = [],
  map: PathMap = {},
): PathMap {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      buildPathMap(item, [...path, String(index)], map);
    });
    return map;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const nextPath = [...path, key];
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        buildPathMap(child, nextPath, map);
      } else {
        const joined = nextPath.join('.');
        if (!map[key]) {
          map[key] = joined;
        }
        map[joined] = joined;
      }
    });
    return map;
  }

  if (path.length) {
    const joined = path.join('.');
    map[joined] = joined;
  }

  return map;
}

const PATH_MAP: PathMap = buildPathMap(initialDv100Data);

export function resolveSchemaPath(fieldId: string): string | undefined {
  if (!fieldId) {
    return undefined;
  }

  if (PATH_MAP[fieldId]) {
    return PATH_MAP[fieldId];
  }

  const normalized = fieldId.replace(/\[(\d+)\]/g, '.$1');
  return PATH_MAP[normalized];
}

export function getAllSchemaPaths(): PathMap {
  return { ...PATH_MAP };
}
