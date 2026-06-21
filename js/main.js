// js/main.js
import { state, setState } from "./state.js";
import { showScreen } from "./router.js";
import { qs, qsa, escapeHtml, formatMoney, formatDate, showToast, showError, TOKEN_COLORS } from "./utils.js";
import * as authMod from "./auth.js";
import * as playerMgmt from "./playerManagement.js";
import * as gameSetupMod from "./gameSetup.js";
import { openGame } from "./gameScreen.js";
import { listMyActiveGames, listMyCompletedGames } from "./savedGames.js";
import { fetchLeaderboard, sortLeaderboard, SORT_FIELDS } from "./leaderboard.js";
import { initModal } from "./modal.js";

initModal();
initTheme();
initAuthScreen();
initStaticNav();
initMainMenu();
initCreateGameWizard();

authMod.watchAuthState((user, profile) => {
  if (!user) {
    resetAuthTabs();
    showScreen("screen-auth");
    qs("#user-chip").hidden = true;
    return;
  }
  qs("#user-chip").hidden = false;
  qs("#user-chip-name").textContent = profile?.name || user.email;
  qs("#welcome-name").textContent = profile?.name ? `, ${profile.name}` : "";
  showScreen("screen-main-menu");
});

// ===================== Theme =====================
function initTheme() {
  document.body.dataset.theme = state.theme;
  qs("#theme-toggle").textContent = state.theme === "dark" ? "☀️" : "🌙";
  qs("#theme-toggle").addEventListener("click", () => {
    const next = state.theme === "dark" ? "light" : "dark";
    setState({ theme: next });
    document.body.dataset.theme = next;
    localStorage.setItem("monopoly-theme", next);
    qs("#theme-toggle").textContent = next === "dark" ? "☀️" : "🌙";
  });
}

// ===================== Static nav (back buttons, logout) =====================
function initStaticNav() {
  qsa("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => showScreen(el.dataset.nav));
  });
  qs("#btn-logout").addEventListener("click", () => authMod.logOut());
}

// ===================== Auth screen =====================
function resetAuthTabs() {
  qsa(".auth-tab").forEach((t) => t.classList.toggle("active", t.dataset.authTab === "login"));
  qsa(".auth-form").forEach((f) => f.classList.toggle("active", f.id === "login-form"));
  qs("#login-form")?.reset();
  qs("#signup-form")?.reset();
}

function initAuthScreen() {
  qsa(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      qsa(".auth-tab").forEach((t) => t.classList.toggle("active", t === tab));
      qsa(".auth-form").forEach((f) =>
        f.classList.toggle("active", f.id === `${tab.dataset.authTab}-form`)
      );
    });
  });

  renderTokenPicker(qs("#signup-token-picker"));

  qs("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await authMod.logIn(fd.get("username"), fd.get("password"));
    } catch (err) {
      showError(err);
    }
  });

  qs("#signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await authMod.signUpAndLogIn({
        name: fd.get("name"),
        username: fd.get("username"),
        password: fd.get("password"),
        tokenColor: qs("#signup-token-picker").dataset.selected,
      });
    } catch (err) {
      showError(err);
    }
  });
}

function renderTokenPicker(container, defaultColor = TOKEN_COLORS[0].id) {
  container.innerHTML = TOKEN_COLORS.map(
    (c) =>
      `<button type="button" class="token-swatch ${c.id === defaultColor ? "selected" : ""}" data-color="${c.id}" style="background:${c.hex}" title="${c.label}"></button>`
  ).join("");
  container.dataset.selected = defaultColor;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".token-swatch");
    if (!btn) return;
    container.querySelectorAll(".token-swatch").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    container.dataset.selected = btn.dataset.color;
  });
}

// ===================== Main menu =====================
function initMainMenu() {
  qs("#menu-continue").addEventListener("click", async () => {
    showScreen("screen-saved-games");
    await renderSavedGames();
  });
  qs("#menu-previous").addEventListener("click", async () => {
    showScreen("screen-previous-games");
    await renderPreviousGames();
  });
  qs("#menu-leaderboard").addEventListener("click", async () => {
    showScreen("screen-leaderboard");
    await renderLeaderboard("wins");
  });
  qs("#menu-player-mgmt").addEventListener("click", async () => {
    showScreen("screen-player-management");
    await renderPlayerManagement();
  });
}

async function renderSavedGames() {
  const el = qs("#saved-games-list");
  el.innerHTML = `<p class="muted">Loading…</p>`;
  try {
    const games = await listMyActiveGames(state.authUser.uid);
    if (!games.length) {
      el.innerHTML = `<div class="empty-state">No games in progress yet. Start one from the main menu.</div>`;
      return;
    }
    el.innerHTML = games
      .map(
        (g) => `
      <div class="game-list-row" data-game="${g.id}">
        <div>
          <strong>Game started ${formatDate(g.createdAt)}</strong>
          <div class="meta">${g.playerUids.length} players · Round ${g.currentRound}</div>
        </div>
        <button class="btn btn-sm">Resume →</button>
      </div>`
      )
      .join("");
    el.querySelectorAll(".game-list-row").forEach((row) =>
      row.addEventListener("click", () => openGame(row.dataset.game))
    );
  } catch (err) {
    showError(err);
  }
}

async function renderPreviousGames() {
  const el = qs("#previous-games-list");
  el.innerHTML = `<p class="muted">Loading…</p>`;
  try {
    const games = await listMyCompletedGames(state.authUser.uid);
    if (!games.length) {
      el.innerHTML = `<div class="empty-state">No completed games yet.</div>`;
      return;
    }
    el.innerHTML = games
      .map(
        (g) => `
      <div class="game-list-row" data-game="${g.id}">
        <div>
          <strong>🏆 ${escapeHtml(g.winner?.name || "Unknown")}</strong>
          <div class="meta">${formatDate(g.createdAt)} · ${g.totalCompletedRounds} rounds · Net worth ${formatMoney(g.winner?.netWorth || 0)}</div>
        </div>
        <button class="btn btn-sm btn-ghost">View →</button>
      </div>`
      )
      .join("");
    el.querySelectorAll(".game-list-row").forEach((row) =>
      row.addEventListener("click", () => openGame(row.dataset.game))
    );
  } catch (err) {
    showError(err);
  }
}

async function renderLeaderboard(sortKey) {
  const controls = qs("#leaderboard-sort-controls");
  controls.innerHTML = SORT_FIELDS.map(
    (f) => `<button class="btn btn-sm ${f.key === sortKey ? "" : "btn-ghost"}" data-sort="${f.key}">${f.label}</button>`
  ).join("");
  controls.querySelectorAll("[data-sort]").forEach((btn) =>
    btn.addEventListener("click", () => renderLeaderboard(btn.dataset.sort))
  );

  const table = qs("#leaderboard-table");
  table.innerHTML = `<tr><td class="muted">Loading…</td></tr>`;
  try {
    const rows = sortLeaderboard(await fetchLeaderboard(), sortKey);
    if (!rows.length) {
      table.innerHTML = `<tr><td class="empty-state">No completed games yet — play one to populate the leaderboard.</td></tr>`;
      return;
    }
    table.innerHTML = `
      <thead><tr><th>#</th><th>Player</th><th>Games</th><th>Wins</th><th>Losses</th><th>Win %</th><th>Bankruptcies</th><th>Net Worth Earned</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${r.gamesPlayed}</td>
            <td>${r.wins}</td>
            <td>${r.losses}</td>
            <td>${r.winPercentage.toFixed(0)}%</td>
            <td>${r.bankruptcyCount}</td>
            <td>${formatMoney(r.totalNetWorthEarned)}</td>
          </tr>`
          )
          .join("")}
      </tbody>`;
  } catch (err) {
    showError(err);
  }
}

async function renderPlayerManagement() {
  const el = qs("#player-management-list");
  el.innerHTML = `<p class="muted">Loading…</p>`;
  try {
    const players = await playerMgmt.listAllPlayerProfiles();
    el.innerHTML = players
      .map(
        (p) => `
      <div class="roster-row">
        <span class="token-dot" style="background:${tokenHex(p.tokenColor)}"></span>
        <span class="roster-name">${escapeHtml(p.name)} <span class="roster-meta">@${escapeHtml(p.username)}</span></span>
        <button class="btn btn-sm ${p.hidden ? "" : "btn-ghost"}" data-uid="${p.id}" data-hidden="${!!p.hidden}">
          ${p.hidden ? "Restore to list" : "Remove from list"}
        </button>
      </div>`
      )
      .join("");
    el.querySelectorAll("[data-uid]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        try {
          if (btn.dataset.hidden === "true") await playerMgmt.restoreToReusableList(btn.dataset.uid);
          else await playerMgmt.removeFromReusableList(btn.dataset.uid);
          await renderPlayerManagement();
        } catch (err) {
          showError(err);
        }
      })
    );
  } catch (err) {
    showError(err);
  }
}

const TOKEN_HEX = Object.fromEntries(TOKEN_COLORS.map((c) => [c.id, c.hex]));
function tokenHex(id) {
  return TOKEN_HEX[id] || "#5B6B73";
}

// ===================== Create Game wizard =====================
const wizard = { players: [], bankerUid: null, maxCount: 4 };

function resetWizard() {
  wizard.players = [];
  wizard.bankerUid = null;
  wizard.maxCount = Number(qs("#setup-player-count").value) || 4;
  qs("#wizard-step-1").style.display = "block";
  qs("#wizard-step-2").style.display = "none";
  qs("#wizard-step-3").style.display = "none";
  setWizardStepUI(1);
  renderTokenPicker(qs("#new-player-token-picker"));
  renderSetupRoster();
}

function setWizardStepUI(activeStep) {
  qsa(".wizard-step").forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle("active", n === activeStep);
    el.classList.toggle("done", n < activeStep);
  });
}

function initCreateGameWizard() {
  qs('[data-nav="screen-create-game"]')?.addEventListener("click", resetWizard);

  qs("#btn-wizard-1-next").addEventListener("click", () => {
    const count = Number(qs("#setup-player-count").value);
    if (count < 2 || count > 8) return showToast("Choose between 2 and 8 players.", "error");
    wizard.maxCount = count;
    qs("#wizard-step-1").style.display = "none";
    qs("#wizard-step-2").style.display = "block";
    setWizardStepUI(2);
    loadReusablePlayerPicker();
  });

  qs("#btn-wizard-2-back").addEventListener("click", () => {
    qs("#wizard-step-2").style.display = "none";
    qs("#wizard-step-1").style.display = "block";
    setWizardStepUI(1);
  });

  qs("#btn-wizard-2-next").addEventListener("click", () => {
    if (wizard.players.length < 2) return showToast("Add at least 2 players.", "error");
    if (wizard.players.length !== wizard.maxCount) {
      return showToast(`You chose ${wizard.maxCount} players — currently have ${wizard.players.length}.`, "error");
    }
    qs("#wizard-step-2").style.display = "none";
    qs("#wizard-step-3").style.display = "block";
    setWizardStepUI(3);
    renderBankerPicker();
  });

  qs("#btn-wizard-3-back").addEventListener("click", () => {
    qs("#wizard-step-3").style.display = "none";
    qs("#wizard-step-2").style.display = "block";
    setWizardStepUI(2);
  });

  qs("#new-player-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (wizard.players.length >= wizard.maxCount) return showToast("Roster is already full.", "error");
    const fd = new FormData(e.target);
    try {
      const player = await authMod.registerNewPlayerProfile({
        name: fd.get("name"),
        username: fd.get("username"),
        password: fd.get("password"),
        tokenColor: qs("#new-player-token-picker").dataset.selected,
      });
      wizard.players.push(player);
      renderSetupRoster();
      e.target.reset();
      renderTokenPicker(qs("#new-player-token-picker"));
      showToast(`${player.name} added.`);
    } catch (err) {
      showError(err);
    }
  });

  qs("#btn-start-game").addEventListener("click", async () => {
    if (!wizard.bankerUid) return showToast("Choose who's banking this game.", "error");
    try {
      const gameId = await gameSetupMod.createGame({ bankerUid: wizard.bankerUid, players: wizard.players });
      showToast("Game created!");
      openGame(gameId);
    } catch (err) {
      showError(err);
    }
  });
}

async function loadReusablePlayerPicker() {
  const el = qs("#reusable-player-picker");
  el.innerHTML = `<span class="muted">Loading…</span>`;
  try {
    const list = await playerMgmt.listReusablePlayers();
    if (!list.length) {
      el.innerHTML = `<span class="muted">No previously registered players yet — add one below.</span>`;
      return;
    }
    el.innerHTML = list
      .map(
        (p) =>
          `<button type="button" class="picker-chip ${wizard.players.some((w) => w.uid === p.id) ? "selected" : ""}" data-uid="${p.id}">${escapeHtml(p.name)}</button>`
      )
      .join("");
    el.querySelectorAll("[data-uid]").forEach((chip) =>
      chip.addEventListener("click", () => {
        const uid = chip.dataset.uid;
        const already = wizard.players.find((w) => w.uid === uid);
        if (already) {
          wizard.players = wizard.players.filter((w) => w.uid !== uid);
          chip.classList.remove("selected");
        } else {
          if (wizard.players.length >= wizard.maxCount) return showToast("Roster is already full.", "error");
          const profile = list.find((p) => p.id === uid);
          wizard.players.push({ uid, name: profile.name, username: profile.username, tokenColor: profile.tokenColor });
          chip.classList.add("selected");
        }
        renderSetupRoster();
      })
    );
  } catch (err) {
    showError(err);
  }
}

function renderSetupRoster() {
  const el = qs("#setup-roster-list");
  if (!wizard.players.length) {
    el.innerHTML = `<p class="muted">No players added yet (${wizard.maxCount} needed).</p>`;
    return;
  }
  el.innerHTML = wizard.players
    .map(
      (p) => `
    <div class="roster-row">
      <span class="token-dot" style="background:${tokenHex(p.tokenColor)}"></span>
      <span class="roster-name">${escapeHtml(p.name)}</span>
      <span class="roster-meta">@${escapeHtml(p.username)}</span>
      <button class="btn btn-sm btn-ghost" data-remove="${p.uid}">Remove</button>
    </div>`
    )
    .join("") + `<p class="muted">${wizard.players.length} / ${wizard.maxCount} added</p>`;
  el.querySelectorAll("[data-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      wizard.players = wizard.players.filter((p) => p.uid !== btn.dataset.remove);
      renderSetupRoster();
      loadReusablePlayerPicker();
    })
  );
}

function renderBankerPicker() {
  const el = qs("#banker-picker");
  el.innerHTML = wizard.players
    .map(
      (p) =>
        `<button type="button" class="picker-chip ${wizard.bankerUid === p.uid ? "selected" : ""}" data-uid="${p.uid}">${escapeHtml(p.name)}</button>`
    )
    .join("");
  el.querySelectorAll("[data-uid]").forEach((chip) =>
    chip.addEventListener("click", () => {
      wizard.bankerUid = chip.dataset.uid;
      el.querySelectorAll(".picker-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
    })
  );
}
