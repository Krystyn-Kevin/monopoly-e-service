// js/utils.js

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function formatMoney(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
}

export function formatDate(tsOrDate) {
  if (!tsOrDate) return "—";
  const date = tsOrDate.toDate ? tsOrDate.toDate() : new Date(tsOrDate);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(tsOrDate) {
  if (!tsOrDate) return "—";
  const date = tsOrDate.toDate ? tsOrDate.toDate() : new Date(tsOrDate);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Firebase Auth needs an email-shaped identifier. Players only ever type a
// plain username, so we map it to a fixed pseudo-domain behind the scenes.
export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@monopoly.local`;
}

export function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let toastTimer = null;
export function showToast(message, variant = "info") {
  const el = qs("#toast");
  if (!el) return;
  el.textContent = message;
  el.dataset.variant = variant;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 3200);
}

export function showError(err, fallback = "Something went wrong.") {
  console.error(err);
  const message = err?.code
    ? humanizeFirebaseError(err.code)
    : err?.message || fallback;
  showToast(message, "error");
}

function humanizeFirebaseError(code) {
  const map = {
    "auth/email-already-in-use": "That username is already taken.",
    "auth/invalid-email": "That username isn't valid.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/wrong-password": "Incorrect username or password.",
    "auth/invalid-credential": "Incorrect username or password.",
    "auth/user-not-found": "Incorrect username or password.",
    "auth/too-many-requests": "Too many attempts. Try again in a moment.",
    "permission-denied": "You don't have permission to do that.",
  };
  return map[code] || code;
}

export function genId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const TOKEN_COLORS = [
  { id: "red", label: "Red", hex: "#B33A3A" },
  { id: "blue", label: "Blue", hex: "#3B5BA5" },
  { id: "green", label: "Green", hex: "#2F7D4F" },
  { id: "gold", label: "Gold", hex: "#C99A2E" },
  { id: "purple", label: "Purple", hex: "#7A4FA0" },
  { id: "teal", label: "Teal", hex: "#2E8C8C" },
  { id: "orange", label: "Orange", hex: "#D27D2D" },
  { id: "slate", label: "Slate", hex: "#5B6B73" },
];

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
