// js/router.js
import { qs, qsa } from "./utils.js";
import { clearGameSubscriptions } from "./state.js";

const SCREENS = [
  "screen-auth",
  "screen-main-menu",
  "screen-create-game",
  "screen-game",
  "screen-saved-games",
  "screen-previous-games",
  "screen-leaderboard",
  "screen-player-management",
];

export function showScreen(id) {
  if (id !== "screen-game") {
    // Leaving the live game screen: tear down its real-time listeners so we
    // don't keep paying for snapshots the user can no longer see.
    clearGameSubscriptions();
  }
  qsa(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
  qsa(".nav-link").forEach((el) =>
    el.classList.toggle("active", el.dataset.screen === id)
  );
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

export function currentScreen() {
  return SCREENS.find((id) => qs(`#${id}`)?.classList.contains("active"));
}
