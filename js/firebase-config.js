// js/firebase-config.js
// Firebase initialization for the Monopoly Banker app.
// IMPORTANT: Two values below (storageBucket, messagingSenderId, appId) are
// best-guess placeholders derived from the apiKey/authDomain you provided.
// Auth + Firestore (the two services this app actually uses) only require
// apiKey, authDomain and projectId to work, so the app will run fine even if
// you never touch the placeholders. If you later add Storage or Analytics,
// open Firebase Console -> Project Settings -> General -> "Your apps" ->
// SDK setup and configuration, and paste the exact config object shown
// there over the one below.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBGbN7aRNYnGjiZU7HfWv6o9JuSzB6mEJ8",
  authDomain: "monopoly-e-service.firebaseapp.com",
  projectId: "monopoly-e-service",
  // TODO verify in Firebase Console (Storage tab) - not required unless you
  // add file uploads.
  storageBucket: "monopoly-e-service.appspot.com",
  // TODO paste from Firebase Console if you enable Cloud Messaging.
  messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
  // TODO paste from Firebase Console - not required for Auth/Firestore.
  appId: "REPLACE_WITH_APP_ID",
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.warn("Auth persistence could not be set:", err)
);

// Firestore with offline persistence enabled so the banker dashboard keeps
// working (queued writes) through brief connectivity drops, and supports
// multiple open tabs.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
