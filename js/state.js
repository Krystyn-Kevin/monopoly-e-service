// js/state.js
// A deliberately small state container. No framework: screens subscribe to
// the keys they care about and re-render themselves when notified.

const listeners = new Map(); // key -> Set<fn>

export const state = {
  authUser: null, // Firebase Auth user object
  profile: null, // players/{uid} document data
  currentGameId: null,
  currentGame: null, // live game doc data
  currentGamePlayers: [], // live players subcollection
  currentGameProperties: [], // live properties subcollection
  currentGameTransactions: [], // live transactions subcollection (latest first)
  theme: localStorage.getItem("monopoly-theme") || "light",
  unsubscribers: [], // active onSnapshot unsubscribe functions for the open game
};

export function setState(patch) {
  Object.assign(state, patch);
  Object.keys(patch).forEach((key) => emit(key));
}

export function on(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key)?.delete(fn);
}

function emit(key) {
  listeners.get(key)?.forEach((fn) => fn(state[key]));
}

export function clearGameSubscriptions() {
  state.unsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch (e) {
      /* noop */
    }
  });
  setState({
    unsubscribers: [],
    currentGameId: null,
    currentGame: null,
    currentGamePlayers: [],
    currentGameProperties: [],
    currentGameTransactions: [],
  });
}

export function isBankerOfCurrentGame() {
  return (
    !!state.currentGame &&
    !!state.authUser &&
    state.currentGame.bankerUid === state.authUser.uid
  );
}

export function myPlayerDoc() {
  return state.currentGamePlayers.find((p) => p.id === state.authUser?.uid) || null;
}
