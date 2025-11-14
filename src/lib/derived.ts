import derivedMapJson from '../data/derivedFields.json';
import { getAtPath, setAtPath } from './objectPath';

export const derivedMap: Record<string, string> = derivedMapJson as Record<string, string>;

export function applyDerivedFields(
  dv100Data: Record<string, unknown>,
  map: Record<string, string> = derivedMap,
) {
  const derived: Record<string, unknown> = {};

  for (const [targetPath, sourcePath] of Object.entries(map)) {
    const value = getAtPath(dv100Data, sourcePath);
    if (value !== undefined && value !== null && value !== '') {
      setAtPath(dv100Data, targetPath, value);
      setAtPath(derived, targetPath, value);
    }
  }

  return { derived };
}
