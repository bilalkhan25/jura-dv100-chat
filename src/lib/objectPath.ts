type PathPart = string | number;

const ARRAY_INDEX_PATTERN = /\[(\d+)\]/g;

function tokenize(path: string | PathPart[]): PathPart[] {
  if (Array.isArray(path)) {
    return path;
  }

  return path
    .replace(ARRAY_INDEX_PATTERN, '.$1')
    .split('.')
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (/^\d+$/.test(segment)) {
        return Number(segment);
      }

      return segment;
    });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getAtPath<T = unknown>(obj: unknown, path: string | PathPart[]): T | undefined {
  const parts = tokenize(path);
  if (!parts.length) {
    return obj as T;
  }

  let current: unknown = obj;
  for (const part of parts) {
    if (!isObject(current) && !Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown> & unknown[])[part as keyof typeof current];

    if (current === undefined) {
      return undefined;
    }
  }

  return current as T;
}

export function setAtPath<T extends Record<string, unknown>>(
  obj: T,
  path: string | PathPart[],
  value: unknown,
): T {
  const parts = tokenize(path);
  if (!parts.length) {
    return obj;
  }

  let current: Record<string, unknown> | unknown[] = obj;

  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;

    if (isLast) {
      if (Array.isArray(current) && typeof part === 'number') {
        current[part] = value;
      } else if (isObject(current)) {
        current[part as keyof typeof current] = value as never;
      }
      return;
    }

    const nextPart = parts[index + 1];
    let nextValue: unknown;

    if (Array.isArray(current) && typeof part === 'number') {
      nextValue = current[part];

      if (nextValue === undefined || (!Array.isArray(nextValue) && !isObject(nextValue))) {
        nextValue = typeof nextPart === 'number' ? [] : {};
        current[part] = nextValue;
      }

      current = nextValue as Record<string, unknown> | unknown[];
      return;
    }

    if (isObject(current)) {
      nextValue = current[part as keyof typeof current];

      if (nextValue === undefined || (!Array.isArray(nextValue) && !isObject(nextValue))) {
        nextValue = typeof nextPart === 'number' ? [] : {};
        current[part as keyof typeof current] = nextValue as never;
      }

      current = nextValue as Record<string, unknown> | unknown[];
    }
  });

  return obj;
}
