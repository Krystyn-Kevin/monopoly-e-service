// js/mortgages.js
import {
  doc,
  collection,
  getDocs,
  query,
  where,
  runTransaction,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const INTEREST_STEP_PERCENT = 10; // +10% of mortgage value per mortgage round

export function payoffAmount(property) {
  if (!property.mortgaged) return 0;
  const interest = property.mortgageValue * (property.currentInterestRate / 100);
  return Math.round(property.mortgageValue + interest);
}

/** Mortgage an owned property: bank pays the owner half its price immediately. */
export async function mortgageProperty(gameId, propertyId) {
  const gameRef = doc(db, "games", gameId);
  const propRef = doc(db, "games", gameId, "properties", propertyId);

  return runTransaction(db, async (tx) => {
    const [gameSnap, propSnap] = await Promise.all([tx.get(gameRef), tx.get(propRef)]);
    const prop = propSnap.data();
    if (!prop.owner) throw new Error(`${prop.name} has no owner to mortgage it for.`);
    if (prop.mortgaged) throw new Error(`${prop.name} is already mortgaged.`);

    const ownerRef = doc(db, "games", gameId, "players", prop.owner);
    const ownerSnap = await tx.get(ownerRef);
    const owner = ownerSnap.data();
    const mortgageValue = Math.round(prop.price / 2);

    tx.update(propRef, {
      mortgaged: true,
      mortgageStartRound: gameSnap.data().currentRound,
      mortgageValue,
      mortgageRound: 0,
      currentInterestRate: 0,
    });
    tx.update(ownerRef, {
      cashBalance: owner.cashBalance + mortgageValue,
      income: (owner.income || 0) + mortgageValue,
    });

    const txRef = doc(collection(db, "games", gameId, "transactions"));
    tx.set(txRef, {
      type: "mortgage",
      senderUid: null,
      receiverUid: prop.owner,
      senderName: "Bank",
      receiverName: owner.name,
      amount: mortgageValue,
      description: `Mortgaged ${prop.name}`,
      round: gameSnap.data().currentRound,
      timestamp: serverTimestamp(),
    });
    tx.update(gameRef, { lastSavedAt: serverTimestamp() });
  });
}

/** Pay off a mortgage (principal + accrued interest) and lift it. */
export async function redeemMortgage(gameId, propertyId) {
  const gameRef = doc(db, "games", gameId);
  const propRef = doc(db, "games", gameId, "properties", propertyId);

  return runTransaction(db, async (tx) => {
    const [gameSnap, propSnap] = await Promise.all([tx.get(gameRef), tx.get(propRef)]);
    const prop = propSnap.data();
    if (!prop.mortgaged) throw new Error(`${prop.name} isn't mortgaged.`);

    const ownerRef = doc(db, "games", gameId, "players", prop.owner);
    const ownerSnap = await tx.get(ownerRef);
    const owner = ownerSnap.data();
    const payoff = payoffAmount(prop);
    if (owner.cashBalance < payoff) {
      throw new Error(`${owner.name} needs $${payoff} to redeem ${prop.name}.`);
    }

    tx.update(propRef, {
      mortgaged: false,
      mortgageStartRound: null,
      mortgageValue: null,
      mortgageRound: 0,
      currentInterestRate: 0,
    });
    tx.update(ownerRef, {
      cashBalance: owner.cashBalance - payoff,
      expenses: (owner.expenses || 0) + payoff,
    });

    const txRef = doc(collection(db, "games", gameId, "transactions"));
    tx.set(txRef, {
      type: "mortgage_redeemed",
      senderUid: prop.owner,
      receiverUid: null,
      senderName: owner.name,
      receiverName: "Bank",
      amount: payoff,
      description: `Redeemed mortgage on ${prop.name}`,
      round: gameSnap.data().currentRound,
      timestamp: serverTimestamp(),
    });
    tx.update(gameRef, { lastSavedAt: serverTimestamp() });
  });
}

/**
 * Called once whenever the banker advances the overall game round. Every
 * still-mortgaged property ticks its OWN mortgage-round counter forward by
 * one (independent of the game round) and its interest grows by another
 * fixed 10%-of-principal step.
 */
export async function tickMortgageInterestForNewRound(gameId) {
  const propsSnap = await getDocs(
    query(collection(db, "games", gameId, "properties"), where("mortgaged", "==", true))
  );
  if (propsSnap.empty) return;

  const batch = writeBatch(db);
  propsSnap.docs.forEach((d) => {
    const prop = d.data();
    const nextMortgageRound = (prop.mortgageRound || 0) + 1;
    batch.update(d.ref, {
      mortgageRound: nextMortgageRound,
      currentInterestRate: nextMortgageRound * INTEREST_STEP_PERCENT,
    });
  });
  await batch.commit();
}
