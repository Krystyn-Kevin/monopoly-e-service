// js/bankruptcy.js
import {
  doc,
  writeBatch,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { totalLoanBalance } from "./loans.js";
import { payoffAmount } from "./mortgages.js";

/** Sum of listed prices for everything a player owns (simplification: full
 *  price counted regardless of mortgage state — see README for rationale). */
export function assetValue(player, allProperties) {
  return allProperties
    .filter((p) => p.owner === player.id || p.owner === player.uid)
    .reduce((sum, p) => sum + p.price, 0);
}

/** Loan balances + what it would cost right now to redeem every mortgage
 *  the player is carrying. */
export function outstandingDebt(player, allProperties) {
  const loanDebt = totalLoanBalance(player);
  const mortgageDebt = allProperties
    .filter((p) => (p.owner === player.id || p.owner === player.uid) && p.mortgaged)
    .reduce((sum, p) => sum + payoffAmount(p), 0);
  return loanDebt + mortgageDebt;
}

export function netWorth(player, allProperties) {
  return player.cashBalance + assetValue(player, allProperties) - outstandingDebt(player, allProperties);
}

/** PRD rule: bankrupt when Outstanding Debt > (Cash + Assets + Income). */
export function isAtRiskOfBankruptcy(player, allProperties) {
  const debt = outstandingDebt(player, allProperties);
  const buffer = player.cashBalance + assetValue(player, allProperties) + (player.income || 0);
  return debt > buffer;
}

export async function markBankrupt(gameId, playerUid) {
  const gameRef = doc(db, "games", gameId);
  const playerRef = doc(db, "games", gameId, "players", playerUid);
  const profileRef = doc(db, "players", playerUid);

  const batch = writeBatch(db);
  batch.update(playerRef, {
    status: "bankrupt",
  });
  // bankruptcyRound / bankruptcyTimestamp set with a follow-up so we can
  // read the current round first (writeBatch can't read).
  await batch.commit();

  const { getDoc, updateDoc } = await import(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js"
  );
  const gameSnap = await getDoc(gameRef);
  await updateDoc(playerRef, {
    bankruptcyRound: gameSnap.data().currentRound,
    bankruptcyTimestamp: serverTimestamp(),
  });
  await updateDoc(profileRef, {
    "lifetimeStats.bankruptcyCount": increment(1),
  });
  await updateDoc(gameRef, { lastSavedAt: serverTimestamp() });
}
