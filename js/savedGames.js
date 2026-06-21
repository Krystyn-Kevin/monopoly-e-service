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
  const [byParticipant, byCreator] = await Promise.all([
    getDocs(
      query(
        collection(db, "games"),
        where("playerUids", "array-contains", uid),
        where("status", "==", status),
        orderBy("createdAt", "desc")
      )
    ),
    getDocs(
      query(
        collection(db, "games"),
        where("createdBy", "==", uid),
        where("status", "==", status),
        orderBy("createdAt", "desc")
      )
    ),
  ]);
  // A creator who's also playing would otherwise show up in both result
  // sets — dedupe by game id.
  const byId = new Map();
  byParticipant.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
  byCreator.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
  return Array.from(byId.values()).sort(
    (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
  );
}

export const listMyActiveGames = (uid) => listMyGames(uid, "active");
export const listMyCompletedGames = (uid) => listMyGames(uid, "completed");

export function manualSave(gameId) {
  return updateDoc(doc(db, "games", gameId), { lastSavedAt: serverTimestamp() });
}
