// js/gameSetup.js
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { BOARD_PROPERTIES, STARTING_BALANCE } from "./properties-data.js";

/**
 * @param {Object} opts
 * @param {string} opts.bankerUid
 * @param {Array<{uid:string,name:string,username:string,tokenColor:string}>} opts.players
 *        Full roster including the banker, in turn order.
 * @returns {Promise<string>} new game id
 */
export async function createGame({ bankerUid, players }) {
  if (players.length < 2 || players.length > 8) {
    throw new Error("A game needs between 2 and 8 players.");
  }
  if (!players.some((p) => p.uid === bankerUid)) {
    throw new Error("The banker must be one of the selected players.");
  }

  const gameRef = doc(collection(db, "games"));
  const batch = writeBatch(db);

  batch.set(gameRef, {
    status: "active", // active | completed
    bankerUid,
    playerUids: players.map((p) => p.uid),
    turnOrder: players.map((p) => p.uid),
    currentTurnIndex: 0,
    currentRound: 1,
    totalCompletedRounds: 0,
    createdAt: serverTimestamp(),
    lastSavedAt: serverTimestamp(),
    winner: null,
  });

  players.forEach((p) => {
    const playerRef = doc(db, "games", gameRef.id, "players", p.uid);
    batch.set(playerRef, {
      uid: p.uid,
      name: p.name,
      username: p.username,
      tokenColor: p.tokenColor,
      isBanker: p.uid === bankerUid,
      cashBalance: STARTING_BALANCE,
      income: 0,
      expenses: 0,
      loans: [],
      status: "active", // active | bankrupt
      bankruptcyRound: null,
      bankruptcyTimestamp: null,
      joinedAt: serverTimestamp(),
    });
  });

  BOARD_PROPERTIES.forEach((prop) => {
    const propRef = doc(db, "games", gameRef.id, "properties", prop.id);
    batch.set(propRef, {
      id: prop.id,
      name: prop.name,
      group: prop.group,
      price: prop.price,
      owner: null,
      mortgaged: false,
      mortgageStartRound: null,
      mortgageValue: null,
      mortgageRound: 0,
      currentInterestRate: 0,
    });
  });

  await batch.commit();
  return gameRef.id;
}
