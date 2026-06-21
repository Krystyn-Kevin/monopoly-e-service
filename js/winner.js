// js/winner.js
import {
  doc,
  writeBatch,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { netWorth } from "./bankruptcy.js";

/**
 * Call after any bankruptcy. If exactly one active (non-bankrupt) player is
 * left, ends the game, records the Winner Table entry, and folds final net
 * worth + win/loss into every participant's lifetime leaderboard stats.
 * No-ops if 2+ players are still active.
 */
export async function checkAndDeclareWinner(gameId, players, properties) {
  const active = players.filter((p) => p.status !== "bankrupt");
  if (active.length !== 1 || players.length < 2) return false;

  const winnerPlayer = active[0];
  const gameRef = doc(db, "games", gameId);
  const batch = writeBatch(db);

  // We need the current round; players[] callers always pass it in via the
  // game doc separately, so accept it as part of the player record context.
  batch.update(gameRef, {
    status: "completed",
    winner: {
      uid: winnerPlayer.id,
      name: winnerPlayer.name,
      netWorth: netWorth(winnerPlayer, properties),
      date: serverTimestamp(),
    },
    completedAt: serverTimestamp(),
    lastSavedAt: serverTimestamp(),
  });

  players.forEach((p) => {
    const profileRef = doc(db, "players", p.id);
    const isWinner = p.id === winnerPlayer.id;
    batch.update(profileRef, {
      "lifetimeStats.gamesPlayed": increment(1),
      "lifetimeStats.wins": increment(isWinner ? 1 : 0),
      "lifetimeStats.losses": increment(isWinner ? 0 : 1),
      "lifetimeStats.totalNetWorthEarned": increment(Math.max(0, netWorth(p, properties))),
    });
  });

  await batch.commit();
  return true;
}
