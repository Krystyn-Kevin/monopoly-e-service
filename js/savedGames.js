// js/savedGames.js
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export async function listMyGames(uid, status) {
  const q = query(
    collection(db, "games"),
    where("playerUids", "array-contains", uid),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export const listMyActiveGames = (uid) => listMyGames(uid, "active");
export const listMyCompletedGames = (uid) => listMyGames(uid, "completed");

export function manualSave(gameId) {
  return updateDoc(doc(db, "games", gameId), { lastSavedAt: serverTimestamp() });
}
