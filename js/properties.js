// js/properties.js
import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

/** Buy a property straight from the bank at its listed price. */
export async function buyPropertyFromBank(gameId, { propertyId, buyerUid }) {
  const gameRef = doc(db, "games", gameId);
  const propRef = doc(db, "games", gameId, "properties", propertyId);
  const buyerRef = doc(db, "games", gameId, "players", buyerUid);

  return runTransaction(db, async (tx) => {
    const [gameSnap, propSnap, buyerSnap] = await Promise.all([
      tx.get(gameRef),
      tx.get(propRef),
      tx.get(buyerRef),
    ]);
    const prop = propSnap.data();
    const buyer = buyerSnap.data();
    if (prop.owner) throw new Error(`${prop.name} is already owned.`);
    if (buyer.status === "bankrupt") throw new Error(`${buyer.name} is bankrupt.`);
    if (buyer.cashBalance < prop.price) {
      throw new Error(`${buyer.name} can't afford ${prop.name} ($${prop.price}).`);
    }

    tx.update(propRef, { owner: buyerUid });
    tx.update(buyerRef, {
      cashBalance: buyer.cashBalance - prop.price,
      expenses: (buyer.expenses || 0) + prop.price,
    });

    const txRef = doc(collection(db, "games", gameId, "transactions"));
    tx.set(txRef, {
      type: "property_purchase",
      senderUid: buyerUid,
      receiverUid: null,
      senderName: buyer.name,
      receiverName: "Bank",
      amount: prop.price,
      description: `Purchased ${prop.name}`,
      round: gameSnap.data().currentRound,
      timestamp: serverTimestamp(),
    });
    tx.update(gameRef, { lastSavedAt: serverTimestamp() });
  });
}

/**
 * Record a transfer of a property to another player — a trade, gift, or
 * banker correction. If `price` is provided, that amount moves from the new
 * owner to the previous owner (or to the bank if it had no owner) as part
 * of the same atomic write.
 */
export async function transferProperty(gameId, { propertyId, toUid, price = 0, description }) {
  const gameRef = doc(db, "games", gameId);
  const propRef = doc(db, "games", gameId, "properties", propertyId);
  const toRef = doc(db, "games", gameId, "players", toUid);

  return runTransaction(db, async (tx) => {
    const [gameSnap, propSnap, toSnap] = await Promise.all([
      tx.get(gameRef),
      tx.get(propRef),
      tx.get(toRef),
    ]);
    const prop = propSnap.data();
    const toPlayer = toSnap.data();
    if (toPlayer.status === "bankrupt") throw new Error(`${toPlayer.name} is bankrupt.`);

    let fromRef = null;
    let fromPlayer = null;
    if (prop.owner) {
      fromRef = doc(db, "games", gameId, "players", prop.owner);
      const fromSnap = await tx.get(fromRef);
      fromPlayer = fromSnap.data();
    }

    if (price > 0) {
      if (toPlayer.cashBalance < price) {
        throw new Error(`${toPlayer.name} doesn't have $${price}.`);
      }
      tx.update(toRef, {
        cashBalance: toPlayer.cashBalance - price,
        expenses: (toPlayer.expenses || 0) + price,
      });
      if (fromRef) {
        tx.update(fromRef, {
          cashBalance: fromPlayer.cashBalance + price,
          income: (fromPlayer.income || 0) + price,
        });
      }
    }

    tx.update(propRef, { owner: toUid });

    const txRef = doc(collection(db, "games", gameId, "transactions"));
    tx.set(txRef, {
      type: "property_transfer",
      senderUid: toUid,
      receiverUid: prop.owner || null,
      senderName: toPlayer.name,
      receiverName: fromPlayer ? fromPlayer.name : "Bank",
      amount: price,
      description: description || `${prop.name} transferred to ${toPlayer.name}`,
      round: gameSnap.data().currentRound,
      timestamp: serverTimestamp(),
    });
    tx.update(gameRef, { lastSavedAt: serverTimestamp() });
  });
}
