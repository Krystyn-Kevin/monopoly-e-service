// js/auth.js
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword as fbUpdatePassword,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { app, auth, db } from "./firebase-config.js";
import { setState } from "./state.js";
import { usernameToEmail } from "./utils.js";

const firebaseConfig = app.options;

/**
 * Create a brand-new player profile (Auth account + Firestore doc) WITHOUT
 * disturbing whoever is currently signed in. This is what lets a Banker
 * register three other players from the same device during game setup.
 * It works by spinning up a short-lived secondary Firebase App instance,
 * doing the signup there, then tearing it down.
 */
export async function registerNewPlayerProfile({ name, username, password, tokenColor }) {
  const secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  try {
    const email = usernameToEmail(username);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;

    await setDoc(doc(db, "players", uid), {
      uid,
      name,
      username: username.trim().toLowerCase(),
      tokenColor,
      createdAt: serverTimestamp(),
      hidden: false,
      lifetimeStats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        bankruptcyCount: 0,
        totalNetWorthEarned: 0,
      },
    });

    return { uid, name, username, tokenColor };
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondary).catch(() => {});
  }
}

export async function signUpAndLogIn({ name, username, password, tokenColor }) {
  const email = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, "players", uid), {
    uid,
    name,
    username: username.trim().toLowerCase(),
    tokenColor,
    createdAt: serverTimestamp(),
    hidden: false,
    lifetimeStats: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      bankruptcyCount: 0,
      totalNetWorthEarned: 0,
    },
  });
  return cred.user;
}

export async function logIn(username, password) {
  const email = usernameToEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export function logOut() {
  return signOut(auth);
}

export function changePassword(newPassword) {
  if (!auth.currentUser) throw new Error("Not signed in");
  return fbUpdatePassword(auth.currentUser, newPassword);
}

export async function fetchMyProfile(uid) {
  const snap = await getDoc(doc(db, "players", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function watchAuthState(onChange) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setState({ authUser: null, profile: null });
      onChange(null);
      return;
    }
    setState({ authUser: user });
    let profile = null;
    try {
      profile = await fetchMyProfile(user.uid);
    } catch (err) {
      // Don't let a flaky/blocked Firestore connection strand the user on
      // the login screen — they're authenticated either way. Surface it
      // instead of swallowing it silently.
      console.error("Couldn't load player profile from Firestore:", err);
    }
    setState({ profile });
    onChange(user, profile);
  });
}
