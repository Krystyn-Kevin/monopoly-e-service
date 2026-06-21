// js/leaderboard.js
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export async function fetchLeaderboard() {
  const snap = await getDocs(collection(db, "players"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      const stats = data.lifetimeStats || {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        bankruptcyCount: 0,
        totalNetWorthEarned: 0,
      };
      const winPercentage = stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0;
      return { id: d.id, name: data.name, username: data.username, tokenColor: data.tokenColor, ...stats, winPercentage };
    })
    .filter((p) => p.gamesPlayed > 0 || p.wins > 0); // only show players who've actually played
}

export const SORT_FIELDS = [
  { key: "wins", label: "Wins" },
  { key: "winPercentage", label: "Win %" },
  { key: "gamesPlayed", label: "Games Played" },
  { key: "losses", label: "Losses" },
  { key: "bankruptcyCount", label: "Bankruptcies" },
  { key: "totalNetWorthEarned", label: "Net Worth Earned" },
];

export function sortLeaderboard(rows, key, dir = "desc") {
  const sorted = [...rows].sort((a, b) => (a[key] || 0) - (b[key] || 0));
  return dir === "desc" ? sorted.reverse() : sorted;
}
