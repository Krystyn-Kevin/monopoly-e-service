// js/playerManagement.js
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export async function listReusablePlayers() {
  const q = query(
    collection(db, "players"),
    where("hidden", "==", false),
    orderBy("name")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllPlayerProfiles() {
  const snap = await getDocs(query(collection(db, "players"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function removeFromReusableList(uid) {
  return updateDoc(doc(db, "players", uid), { hidden: true });
}

export function restoreToReusableList(uid) {
  return updateDoc(doc(db, "players", uid), { hidden: false });
}

export function updatePlayerProfile(uid, patch) {
  return updateDoc(doc(db, "players", uid), patch);
}
