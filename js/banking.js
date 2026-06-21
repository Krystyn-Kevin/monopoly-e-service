// js/banking.js
import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

function assertActive(playerData, label) {
  if (!playerData) throw new Error(`${label} not found.`);
  if (playerData.status === "bankrupt") {
    throw new Error(`${playerData.name} is bankrupt and can't transact.`);
  }
}

async function logAndSave(tx, gameId, gameRef, entry, round) {
  const txRef = doc(collection(db, "games", gameId, "transactions"));
  tx.set(txRef, {
    ...entry,
    round,
    timestamp: serverTimestamp(),
  });
  tx.update(gameRef, { lastSavedAt: serverTimestamp() });
}

export async function playerToPlayer(gameId, { senderUid, receiverUid, amount, description }) {
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  const gameRef = doc(db, "games", gameId);
  const senderRef = doc(db, "games", gameId, "players", senderUid);
  const receiverRef = doc(db, "games", gameId, "players", receiverUid);

  return runTransaction(db, async (tx) => {
    const [gameSnap, senderSnap, receiverSnap] = await Promise.all([
      tx.get(gameRef),
      tx.get(senderRef),
      tx.get(receiverRef),
    ]);
    const sender = senderSnap.data();
    const receiver = receiverSnap.data();
    assertActive(sender, "Sender");
    assertActive(receiver, "Receiver");

    tx.update(senderRef, {
      cashBalance: sender.cashBalance - amount,
      expenses: (sender.expenses || 0) + amount,
    });
    tx.update(receiverRef, {
      cashBalance: receiver.cashBalance + amount,
      income: (receiver.income || 0) + amount,
    });

    await logAndSave(
      tx,
      gameId,
      gameRef,
      {
        type: "player_to_player",
        senderUid,
        receiverUid,
        senderName: sender.name,
        receiverName: receiver.name,
        amount,
        description: description || "",
      },
      gameSnap.data().currentRound
    );
  });
}

export async function playerToBank(gameId, { playerUid, amount, reason }) {
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  const gameRef = doc(db, "games", gameId);
  const playerRef = doc(db, "games", gameId, "players", playerUid);

  return runTransaction(db, async (tx) => {
    const [gameSnap, playerSnap] = await Promise.all([tx.get(gameRef), tx.get(playerRef)]);
    const player = playerSnap.data();
    assertActive(player, "Player");

    tx.update(playerRef, {
      cashBalance: player.cashBalance - amount,
      expenses: (player.expenses || 0) + amount,
    });

    await logAndSave(
      tx,
      gameId,
      gameRef,
      {
        type: "player_to_bank",
        senderUid: playerUid,
        receiverUid: null,
        senderName: player.name,
        receiverName: "Bank",
        amount,
        description: reason || "",
      },
      gameSnap.data().currentRound
    );
  });
}

export async function bankToPlayer(gameId, { playerUid, amount, reason }) {
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  const gameRef = doc(db, "games", gameId);
  const playerRef = doc(db, "games", gameId, "players", playerUid);

  return runTransaction(db, async (tx) => {
    const [gameSnap, playerSnap] = await Promise.all([tx.get(gameRef), tx.get(playerRef)]);
    const player = playerSnap.data();
    assertActive(player, "Player");

    tx.update(playerRef, {
      cashBalance: player.cashBalance + amount,
      income: (player.income || 0) + amount,
    });

    await logAndSave(
      tx,
      gameId,
      gameRef,
      {
        type: "bank_to_player",
        senderUid: null,
        receiverUid: playerUid,
        senderName: "Bank",
        receiverName: player.name,
        amount,
        description: reason || "",
      },
      gameSnap.data().currentRound
    );
  });
}
