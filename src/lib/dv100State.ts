import schema from '../data/dv100Schema.json';

export const initialDv100Data = structuredClone(schema);

const STORAGE_KEYS = {
  data: 'dv100Chat_data',
  messages: 'dv100Chat_messages',
  step: 'dv100Chat_step',
} as const;

export type Dv100Data = typeof initialDv100Data;

export interface PersistedState {
  data: Dv100Data;
  messages: unknown[];
  step: string | null;
}

function getDefaultState(): PersistedState {
  return {
    data: structuredClone(initialDv100Data),
    messages: [],
    step: null,
  };
}

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadState(): PersistedState {
  const defaultState = getDefaultState();

  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultState;
  }

  return {
    data: readFromStorage<Dv100Data>(STORAGE_KEYS.data, defaultState.data),
    messages: readFromStorage<unknown[]>(STORAGE_KEYS.messages, []),
    step: readFromStorage<string | null>(STORAGE_KEYS.step, null),
  };
}

export function saveState(state: PersistedState): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(state.data));
  window.localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(state.messages));
  window.localStorage.setItem(STORAGE_KEYS.step, JSON.stringify(state.step));
}
