// js/rounds.js
import { doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { tickMortgageInterestForNewRound } from "./mortgages.js";

function nextActiveIndex(turnOrder, players, fromIndex) {
  const n = turnOrder.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    const uid = turnOrder[idx];
    const player = players.find((p) => p.id === uid);
    if (player && player.status !== "bankrupt") return idx;
  }
  return fromIndex; // nobody else is active
}

/** "Dice Passed" / Next Turn: move the indicator to the next active player. */
export async function advanceTurn(gameId, players) {
  const gameRef = doc(db, "games", gameId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    const game = snap.data();
    const idx = nextActiveIndex(game.turnOrder, players, game.currentTurnIndex);
    tx.update(gameRef, { currentTurnIndex: idx, lastSavedAt: serverTimestamp() });
  });
}

/** Next Round: bumps the independent game-round counter and ticks mortgage interest. */
export async function advanceRound(gameId) {
  const gameRef = doc(db, "games", gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    const game = snap.data();
    tx.update(gameRef, {
      currentRound: game.currentRound + 1,
      totalCompletedRounds: game.totalCompletedRounds + 1,
      lastSavedAt: serverTimestamp(),
    });
  });
  await tickMortgageInterestForNewRound(gameId);
}
