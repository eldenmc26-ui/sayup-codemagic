// src/store/useStore.ts
// Stato globale dell'app con un piccolo external store compatibile web/native

import { useSyncExternalStore } from 'react';
import type { SayUpUser } from './authService';

interface AppState {
  // Auth
  user: SayUpUser | null;
  loading: boolean;

  // Actions
  setUser: (user: SayUpUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

type StoreState = {
  user: SayUpUser | null;
  loading: boolean;
};

let state: StoreState = {
  user: null,
  loading: true,
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setState(partial: Partial<StoreState>) {
  state = { ...state, ...partial };
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getState() {
  return state;
}

export function useStore(): AppState {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);

  return {
    ...snapshot,
    setUser: (user) => setState({ user }),
    setLoading: (loading) => setState({ loading }),
    logout: () => setState({ user: null }),
  };
}
