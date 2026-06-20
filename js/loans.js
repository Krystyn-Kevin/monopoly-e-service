// js/loans.js
import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { genId } from "./utils.js";

export async function issueLoan(gameId, { playerUid, amount, interestRate = 0, description }) {
  if (amount <= 0) throw new Error("Loan amount must be greater than zero.");
  const gameRef = doc(db, "games", gameId);
  const playerRef = doc(db, "games", gameId, "players", playerUid);

  return runTransaction(db, async (tx) => {
    const [gameSnap, playerSnap] = await Promise.all([tx.get(gameRef), tx.get(playerRef)]);
    const player = playerSnap.data();
    if (player.status === "bankrupt") throw new Error(`${player.name} is bankrupt.`);

    const loan = {
      id: genId("loan"),
      originalAmount: amount,
      balance: amount,
      interestRate,
      issuedRound: gameSnap.data().currentRound,
      description: description || "",
    };

    tx.update(playerRef, {
      cashBalance: player.cashBalance + amount,
      income: (player.income || 0) + amount,
      loans: [...(player.loans || []), loan],
    });

    const txRef = doc(collection(db, "games", gameId, "transactions"));
    tx.set(txRef, {
      type: "loan_issued",
      senderUid: null,
      receiverUid: playerUid,
      senderName: "Bank",
      receiverName: player.name,
      amount,
      description: `Loan issued${description ? `: ${description}` : ""}`,
      round: gameSnap.data().currentRound,
      timestamp: serverTimestamp(),
    });
    tx.update(gameRef, { lastSavedAt: serverTimestamp() });
  });
}

export async function repayLoan(gameId, { playerUid, loanId, amount }) {
  if (amount <= 0) throw new Error("Repayment must be greater than zero.");
  const gameRef = doc(db, "games", gameId);
  const playerRef = doc(db, "games", gameId, "players", playerUid);

  return runTransaction(db, async (tx) => {
    const [gameSnap, playerSnap] = await Promise.all([tx.get(gameRef), tx.get(playerRef)]);
    const player = playerSnap.data();
    const loans = player.loans || [];
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) throw new Error("Loan not found.");
    if (player.cashBalance < amount) throw new Error(`${player.name} doesn't have $${amount}.`);

    const payment = Math.min(amount, loan.balance);
    const updatedLoans = loans
      .map((l) => (l.id === loanId ? { ...l, balance: l.balance - payment } : l))
      .filter((l) => l.balance > 0);

    tx.update(playerRef, {
      cashBalance: player.cashBalance - payment,
      expenses: (player.expenses || 0) + payment,
      loans: updatedLoans,
    });

    const txRef = doc(collection(db, "games", gameId, "transactions"));
    tx.set(txRef, {
      type: "loan_repayment",
      senderUid: playerUid,
      receiverUid: null,
      senderName: player.name,
      receiverName: "Bank",
      amount: payment,
      description: "Loan repayment",
      round: gameSnap.data().currentRound,
      timestamp: serverTimestamp(),
    });
    tx.update(gameRef, { lastSavedAt: serverTimestamp() });
  });
}

export function totalLoanBalance(player) {
  return (player.loans || []).reduce((sum, l) => sum + l.balance, 0);
}
