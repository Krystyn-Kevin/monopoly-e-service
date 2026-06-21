// js/gameScreen.js
import {
  doc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { state, setState, isBankerOfCurrentGame, myPlayerDoc } from "./state.js";
import { showScreen } from "./router.js";
import { qs, qsa, formatMoney, formatDateTime, escapeHtml, showToast, showError } from "./utils.js";
import { openModal, closeModal } from "./modal.js";
import { GROUP_LABELS } from "./properties-data.js";
import * as banking from "./banking.js";
import * as propertyActions from "./properties.js";
import * as mortgages from "./mortgages.js";
import * as loans from "./loans.js";
import * as bankruptcy from "./bankruptcy.js";
import * as rounds from "./rounds.js";
import * as winner from "./winner.js";
import { manualSave } from "./savedGames.js";
import { initCalculator, toggleCalculator } from "./calculator.js";

let activeTab = "overview";

export function openGame(gameId) {
  setState({ currentGameId: gameId });
  showScreen("screen-game");
  activeTab = "overview";

  const unsubs = [];

  unsubs.push(
    onSnapshot(doc(db, "games", gameId), (snap) => {
      if (!snap.exists()) return;
      setState({ currentGame: { id: snap.id, ...snap.data() } });
      renderAll();
    })
  );

  unsubs.push(
    onSnapshot(collection(db, "games", gameId, "players"), (snap) => {
      setState({ currentGamePlayers: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
      renderAll();
    })
  );

  unsubs.push(
    onSnapshot(collection(db, "games", gameId, "properties"), (snap) => {
      setState({ currentGameProperties: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
      renderAll();
    })
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, "games", gameId, "transactions"), orderBy("timestamp", "desc"), limit(100)),
      (snap) => {
        setState({ currentGameTransactions: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
        renderAll();
      }
    )
  );

  setState({ unsubscribers: unsubs });
  initCalculator();
  bindStaticControls();
}

function bindStaticControls() {
  const root = qs("#screen-game");
  if (root.dataset.bound) return;
  root.dataset.bound = "true";

  qs("#game-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    activeTab = btn.dataset.tab;
    renderAll();
  });

  qs("#btn-next-turn").addEventListener("click", async () => {
    try {
      await rounds.advanceTurn(state.currentGameId, state.currentGamePlayers);
    } catch (e) {
      showError(e);
    }
  });

  qs("#btn-next-round").addEventListener("click", async () => {
    try {
      await rounds.advanceRound(state.currentGameId);
      showToast("Advanced to the next round.");
    } catch (e) {
      showError(e);
    }
  });

  qs("#btn-save-game").addEventListener("click", async () => {
    try {
      await manualSave(state.currentGameId);
      showToast("Game saved.");
    } catch (e) {
      showError(e);
    }
  });

  qs("#btn-leave-game").addEventListener("click", () => {
    showScreen("screen-main-menu");
  });

  qs("#calc-toggle").addEventListener("click", toggleCalculator);

  // Delegated clicks for everything rendered inside the tab content.
  qs("#game-tab-content").addEventListener("click", handleTabContentClick);
}

function renderAll() {
  if (!state.currentGame) return;
  renderHeader();
  renderTurnOrder();
  renderTabBar();
  renderTabContent();
}

function renderHeader() {
  const game = state.currentGame;
  qs("#game-round-badge").textContent = `Round ${game.currentRound}`;
  qs("#game-role-badge").textContent = isBankerOfCurrentGame() ? "You're the Banker" : "Player view";
  qs("#game-role-badge").classList.toggle("badge-banker", isBankerOfCurrentGame());

  const winnerBanner = qs("#winner-banner");
  if (game.status === "completed" && game.winner) {
    winnerBanner.hidden = false;
    winnerBanner.innerHTML = `🏆 <strong>${escapeHtml(game.winner.name)}</strong> won the game after ${game.totalCompletedRounds} rounds with a net worth of ${formatMoney(game.winner.netWorth)}.`;
  } else {
    winnerBanner.hidden = true;
  }

  const isBanker = isBankerOfCurrentGame();
  const gameOver = game.status === "completed";
  qs("#btn-next-turn").disabled = !isBanker || gameOver;
  qs("#btn-next-round").disabled = !isBanker || gameOver;
}

function renderTurnOrder() {
  const game = state.currentGame;
  const players = state.currentGamePlayers;
  const el = qs("#turn-order-panel");
  const items = game.turnOrder
    .map((uid, idx) => {
      const p = players.find((pl) => pl.id === uid);
      if (!p) return "";
      const isCurrent = idx === game.currentTurnIndex && game.status === "active";
      const bankrupt = p.status === "bankrupt";
      return `
        <li class="turn-item ${isCurrent ? "current" : ""} ${bankrupt ? "bankrupt" : ""}">
          <span class="token-dot" style="background:${tokenHex(p.tokenColor)}"></span>
          <span class="turn-name">${escapeHtml(p.name)}${p.isBanker ? " (Banker)" : ""}</span>
          ${bankrupt ? '<span class="mini-stamp">OUT</span>' : ""}
        </li>`;
    })
    .join("");
  el.innerHTML = `<h3>Turn Order</h3><ol class="turn-order-list">${items}</ol>`;
}

const TOKEN_HEX = {
  red: "#B33A3A", blue: "#3B5BA5", green: "#2F7D4F", gold: "#C99A2E",
  purple: "#7A4FA0", teal: "#2E8C8C", orange: "#D27D2D", slate: "#5B6B73",
};
function tokenHex(id) {
  return TOKEN_HEX[id] || "#5B6B73";
}

function renderTabBar() {
  const isBanker = isBankerOfCurrentGame();
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "players", label: "Players" },
    { id: "properties", label: "Properties" },
    { id: "transactions", label: "Transactions" },
  ];
  if (isBanker) tabs.push({ id: "loans", label: "Loans" });
  qs("#game-tabs").innerHTML = tabs
    .map(
      (t) =>
        `<button class="tab-btn ${activeTab === t.id ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`
    )
    .join("");
}

function renderTabContent() {
  const el = qs("#game-tab-content");
  if (activeTab === "overview") el.innerHTML = renderOverviewTab();
  else if (activeTab === "players") el.innerHTML = renderPlayersTab();
  else if (activeTab === "properties") el.innerHTML = renderPropertiesTab();
  else if (activeTab === "transactions") el.innerHTML = renderTransactionsTab();
  else if (activeTab === "loans") el.innerHTML = renderLoansTab();
}

// ---------- Overview ----------
function renderOverviewTab() {
  const me = myPlayerDoc();
  const isBanker = isBankerOfCurrentGame();
  const properties = state.currentGameProperties;

  if (!isBanker && me) {
    const nw = bankruptcy.netWorth(me, properties);
    const debt = bankruptcy.outstandingDebt(me, properties);
    const owned = properties.filter((p) => p.owner === me.id);
    return `
      <div class="card-grid">
        <div class="stat-card"><span class="stat-label">Cash Balance</span><span class="stat-value">${formatMoney(me.cashBalance)}</span></div>
        <div class="stat-card"><span class="stat-label">Net Worth</span><span class="stat-value">${formatMoney(nw)}</span></div>
        <div class="stat-card"><span class="stat-label">Properties Owned</span><span class="stat-value">${owned.length}</span></div>
        <div class="stat-card"><span class="stat-label">Outstanding Debt</span><span class="stat-value">${formatMoney(debt)}</span></div>
      </div>
      ${me.status === "bankrupt" ? `<div class="alert alert-danger">You were declared bankrupt on round ${me.bankruptcyRound}. Your records remain visible for the rest of the game.</div>` : ""}
    `;
  }

  // Banker overview: game-wide snapshot
  const players = state.currentGamePlayers;
  const totalCash = players.reduce((s, p) => s + p.cashBalance, 0);
  const activeCount = players.filter((p) => p.status !== "bankrupt").length;
  const mortgagedCount = properties.filter((p) => p.mortgaged).length;
  const atRisk = players.filter((p) => p.status !== "bankrupt" && bankruptcy.isAtRiskOfBankruptcy(p, properties));

  return `
    <div class="card-grid">
      <div class="stat-card"><span class="stat-label">Cash in Play</span><span class="stat-value">${formatMoney(totalCash)}</span></div>
      <div class="stat-card"><span class="stat-label">Active Players</span><span class="stat-value">${activeCount} / ${players.length}</span></div>
      <div class="stat-card"><span class="stat-label">Mortgaged Properties</span><span class="stat-value">${mortgagedCount}</span></div>
      <div class="stat-card"><span class="stat-label">Total Rounds</span><span class="stat-value">${state.currentGame.totalCompletedRounds}</span></div>
    </div>
    ${atRisk.length ? `<div class="alert alert-warning">Bankruptcy risk: ${atRisk.map((p) => escapeHtml(p.name)).join(", ")} — debts exceed cash + assets + income.</div>` : ""}
    <div class="quick-actions">
      <button class="btn" data-action="open-transfer">Player → Player</button>
      <button class="btn" data-action="open-deposit">Player → Bank</button>
      <button class="btn" data-action="open-withdraw">Bank → Player</button>
    </div>
  `;
}

// ---------- Players ----------
function renderPlayersTab() {
  const isBanker = isBankerOfCurrentGame();
  const players = state.currentGamePlayers;
  const properties = state.currentGameProperties;
  const meUid = state.authUser?.uid;

  return `<div class="player-card-grid">${players
    .map((p) => {
      const mine = p.id === meUid;
      const canSeeFinancials = isBanker || mine;
      const nw = bankruptcy.netWorth(p, properties);
      const owned = properties.filter((pr) => pr.owner === p.id);
      return `
        <div class="player-card ${p.status === "bankrupt" ? "is-bankrupt" : ""}">
          ${p.status === "bankrupt" ? '<div class="bankrupt-seal">BANKRUPT</div>' : ""}
          <div class="player-card-head">
            <span class="token-dot lg" style="background:${tokenHex(p.tokenColor)}"></span>
            <div>
              <div class="player-name">${escapeHtml(p.name)}${p.isBanker ? " 🏦" : ""}</div>
              <div class="player-username">@${escapeHtml(p.username)}</div>
            </div>
          </div>
          ${
            canSeeFinancials
              ? `
            <div class="player-card-stats">
              <div><span>Cash</span><strong>${formatMoney(p.cashBalance)}</strong></div>
              <div><span>Net Worth</span><strong>${formatMoney(nw)}</strong></div>
              <div><span>Properties</span><strong>${owned.length}</strong></div>
              <div><span>Loans Owed</span><strong>${formatMoney(loans.totalLoanBalance(p))}</strong></div>
            </div>`
              : `<p class="muted">Only ${escapeHtml(p.name)} and the Banker can see this player's balance.</p>`
          }
          ${
            isBanker && p.status !== "bankrupt"
              ? `
            <div class="player-card-actions">
              <button class="btn btn-sm" data-action="pay-player" data-uid="${p.id}">Pay</button>
              <button class="btn btn-sm" data-action="bank-deposit" data-uid="${p.id}">Deposit</button>
              <button class="btn btn-sm" data-action="bank-withdraw" data-uid="${p.id}">Withdraw</button>
              <button class="btn btn-sm btn-danger" data-action="mark-bankrupt" data-uid="${p.id}">Mark Bankrupt</button>
            </div>`
              : ""
          }
        </div>`;
    })
    .join("")}</div>`;
}

// ---------- Properties ----------
function renderPropertiesTab() {
  const isBanker = isBankerOfCurrentGame();
  const properties = state.currentGameProperties;
  const players = state.currentGamePlayers;
  const groups = [...new Set(properties.map((p) => p.group))];

  return groups
    .map((g) => {
      const tiles = properties
        .filter((p) => p.group === g)
        .map((p) => {
          const owner = players.find((pl) => pl.id === p.owner);
          return `
          <div class="property-tile group-${g} ${p.mortgaged ? "mortgaged" : ""}">
            <div class="property-name">${escapeHtml(p.name)}</div>
            <div class="property-price">${formatMoney(p.price)}</div>
            <div class="property-owner">${owner ? `Owned by ${escapeHtml(owner.name)}` : "Unowned"}</div>
            ${p.mortgaged ? `<div class="property-mortgage">Mortgage rd ${p.mortgageRound} · ${p.currentInterestRate}% interest</div>` : ""}
            ${
              isBanker
                ? `<div class="property-actions">
                    ${!p.owner ? `<button class="btn btn-xs" data-action="buy-property" data-pid="${p.id}">Buy for…</button>` : ""}
                    ${p.owner && !p.mortgaged ? `<button class="btn btn-xs" data-action="mortgage-property" data-pid="${p.id}">Mortgage</button>` : ""}
                    ${p.mortgaged ? `<button class="btn btn-xs" data-action="redeem-property" data-pid="${p.id}">Redeem</button>` : ""}
                    ${p.owner ? `<button class="btn btn-xs" data-action="transfer-property" data-pid="${p.id}">Transfer</button>` : ""}
                  </div>`
                : ""
            }
          </div>`;
        })
        .join("");
      return `<div class="property-group"><h4>${GROUP_LABELS[g]}</h4><div class="property-tile-row">${tiles}</div></div>`;
    })
    .join("");
}

// ---------- Transactions ----------
function renderTransactionsTab() {
  const isBanker = isBankerOfCurrentGame();
  const meUid = state.authUser?.uid;
  const rows = state.currentGameTransactions.filter(
    (t) => isBanker || t.senderUid === meUid || t.receiverUid === meUid
  );
  if (!rows.length) return `<p class="muted">No transactions yet.</p>`;
  return `
    <table class="data-table">
      <thead><tr><th>When</th><th>Round</th><th>From</th><th>To</th><th>Amount</th><th>Note</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (t) => `
          <tr>
            <td>${formatDateTime(t.timestamp)}</td>
            <td>${t.round}</td>
            <td>${escapeHtml(t.senderName || "—")}</td>
            <td>${escapeHtml(t.receiverName || "—")}</td>
            <td>${formatMoney(t.amount)}</td>
            <td>${escapeHtml(t.description || "")}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

// ---------- Loans (banker only tab) ----------
function renderLoansTab() {
  const players = state.currentGamePlayers.filter((p) => p.status !== "bankrupt");
  return `
    <div class="quick-actions"><button class="btn" data-action="issue-loan">Issue Loan</button></div>
    <div class="player-card-grid">
      ${players
        .map((p) => {
          const list = p.loans || [];
          return `
          <div class="player-card">
            <div class="player-name">${escapeHtml(p.name)}</div>
            ${
              list.length
                ? list
                    .map(
                      (l) => `
                <div class="loan-row">
                  <span>${formatMoney(l.balance)} owed (of ${formatMoney(l.originalAmount)})</span>
                  <button class="btn btn-xs" data-action="repay-loan" data-uid="${p.id}" data-loan="${l.id}">Repay</button>
                </div>`
                    )
                    .join("")
                : `<p class="muted">No active loans.</p>`
            }
          </div>`;
        })
        .join("")}
    </div>`;
}

// ---------- Action dispatch ----------
function playerOptions(excludeUid = null, activeOnly = true) {
  return state.currentGamePlayers
    .filter((p) => p.id !== excludeUid && (!activeOnly || p.status !== "bankrupt"))
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");
}

function handleTabContentClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const uid = btn.dataset.uid;
  const pid = btn.dataset.pid;
  const loanId = btn.dataset.loan;

  const gameId = state.currentGameId;

  if (action === "pay-player") {
    openModal({
      title: "Pay another player",
      bodyHtml: `
        <label>From<input type="text" value="${escapeHtml(state.currentGamePlayers.find((p) => p.id === uid)?.name || "")}" disabled></label>
        <label>To<select name="receiverUid">${playerOptions(uid)}</select></label>
        <label>Amount<input type="number" name="amount" min="1" required></label>
        <label>Note<input type="text" name="description" placeholder="Rent, fine, etc."></label>`,
      submitLabel: "Send",
      onSubmit: async (fd) => {
        try {
          await banking.playerToPlayer(gameId, {
            senderUid: uid,
            receiverUid: fd.get("receiverUid"),
            amount: Number(fd.get("amount")),
            description: fd.get("description"),
          });
          closeModal();
          showToast("Payment sent.");
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "open-transfer") {
    openModal({
      title: "Player → Player",
      bodyHtml: `
        <label>From<select name="senderUid">${playerOptions()}</select></label>
        <label>To<select name="receiverUid">${playerOptions()}</select></label>
        <label>Amount<input type="number" name="amount" min="1" required></label>
        <label>Note<input type="text" name="description"></label>`,
      submitLabel: "Send",
      onSubmit: async (fd) => {
        try {
          await banking.playerToPlayer(gameId, {
            senderUid: fd.get("senderUid"),
            receiverUid: fd.get("receiverUid"),
            amount: Number(fd.get("amount")),
            description: fd.get("description"),
          });
          closeModal();
          showToast("Payment sent.");
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "bank-deposit" || action === "open-deposit") {
    openModal({
      title: "Player → Bank",
      bodyHtml: `
        <label>Player<select name="playerUid">${uid ? `<option value="${uid}">${escapeHtml(state.currentGamePlayers.find((p) => p.id === uid)?.name)}</option>` : playerOptions()}</select></label>
        <label>Amount<input type="number" name="amount" min="1" required></label>
        <label>Reason<input type="text" name="reason" placeholder="Tax, fine, rent to bank…"></label>`,
      submitLabel: "Deposit",
      onSubmit: async (fd) => {
        try {
          await banking.playerToBank(gameId, {
            playerUid: fd.get("playerUid"),
            amount: Number(fd.get("amount")),
            reason: fd.get("reason"),
          });
          closeModal();
          showToast("Deposited to bank.");
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "bank-withdraw" || action === "open-withdraw") {
    openModal({
      title: "Bank → Player",
      bodyHtml: `
        <label>Player<select name="playerUid">${uid ? `<option value="${uid}">${escapeHtml(state.currentGamePlayers.find((p) => p.id === uid)?.name)}</option>` : playerOptions()}</select></label>
        <label>Amount<input type="number" name="amount" min="1" required></label>
        <label>Reason<input type="text" name="reason" placeholder="Salary, Chance card…"></label>`,
      submitLabel: "Pay Out",
      onSubmit: async (fd) => {
        try {
          await banking.bankToPlayer(gameId, {
            playerUid: fd.get("playerUid"),
            amount: Number(fd.get("amount")),
            reason: fd.get("reason"),
          });
          closeModal();
          showToast("Paid from bank.");
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "mark-bankrupt") {
    const p = state.currentGamePlayers.find((pl) => pl.id === uid);
    openModal({
      title: `Mark ${p?.name} bankrupt?`,
      bodyHtml: `<p>This keeps all of ${escapeHtml(p?.name)}'s history visible but removes them from the turn rotation and blocks further transactions for them. This can't be undone in-app.</p>`,
      submitLabel: "Confirm Bankruptcy",
      onSubmit: async () => {
        try {
          await bankruptcy.markBankrupt(gameId, uid);
          const freshPlayers = await refetchPlayers(gameId);
          await winner.checkAndDeclareWinner(gameId, freshPlayers, state.currentGameProperties);
          closeModal();
          showToast(`${p?.name} marked bankrupt.`);
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "buy-property") {
    const prop = state.currentGameProperties.find((p) => p.id === pid);
    openModal({
      title: `Buy ${prop?.name}`,
      bodyHtml: `
        <p>Listed price: ${formatMoney(prop?.price)}</p>
        <label>Buyer<select name="buyerUid">${playerOptions()}</select></label>`,
      submitLabel: "Buy",
      onSubmit: async (fd) => {
        try {
          await propertyActions.buyPropertyFromBank(gameId, { propertyId: pid, buyerUid: fd.get("buyerUid") });
          closeModal();
          showToast(`${prop?.name} purchased.`);
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "transfer-property") {
    const prop = state.currentGameProperties.find((p) => p.id === pid);
    openModal({
      title: `Transfer ${prop?.name}`,
      bodyHtml: `
        <label>New owner<select name="toUid">${playerOptions(prop?.owner)}</select></label>
        <label>Price paid (optional)<input type="number" name="price" min="0" value="0"></label>
        <label>Note<input type="text" name="description"></label>`,
      submitLabel: "Transfer",
      onSubmit: async (fd) => {
        try {
          await propertyActions.transferProperty(gameId, {
            propertyId: pid,
            toUid: fd.get("toUid"),
            price: Number(fd.get("price")) || 0,
            description: fd.get("description"),
          });
          closeModal();
          showToast(`${prop?.name} transferred.`);
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "mortgage-property") {
    const prop = state.currentGameProperties.find((p) => p.id === pid);
    openModal({
      title: `Mortgage ${prop?.name}?`,
      bodyHtml: `<p>The bank will pay the owner ${formatMoney(Math.round(prop?.price / 2))} immediately. Interest grows 10% every round it stays mortgaged.</p>`,
      submitLabel: "Mortgage It",
      onSubmit: async () => {
        try {
          await mortgages.mortgageProperty(gameId, pid);
          closeModal();
          showToast(`${prop?.name} mortgaged.`);
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "redeem-property") {
    const prop = state.currentGameProperties.find((p) => p.id === pid);
    const payoff = mortgages.payoffAmount(prop);
    openModal({
      title: `Redeem ${prop?.name}?`,
      bodyHtml: `<p>Payoff amount (principal + interest): <strong>${formatMoney(payoff)}</strong></p>`,
      submitLabel: "Pay & Redeem",
      onSubmit: async () => {
        try {
          await mortgages.redeemMortgage(gameId, pid);
          closeModal();
          showToast(`${prop?.name} redeemed.`);
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "issue-loan") {
    openModal({
      title: "Issue a loan",
      bodyHtml: `
        <label>Player<select name="playerUid">${playerOptions()}</select></label>
        <label>Amount<input type="number" name="amount" min="1" required></label>
        <label>Note<input type="text" name="description"></label>`,
      submitLabel: "Issue Loan",
      onSubmit: async (fd) => {
        try {
          await loans.issueLoan(gameId, {
            playerUid: fd.get("playerUid"),
            amount: Number(fd.get("amount")),
            description: fd.get("description"),
          });
          closeModal();
          showToast("Loan issued.");
        } catch (err) {
          showError(err);
        }
      },
    });
  } else if (action === "repay-loan") {
    const p = state.currentGamePlayers.find((pl) => pl.id === uid);
    const loan = (p?.loans || []).find((l) => l.id === loanId);
    openModal({
      title: `Repay loan — ${p?.name}`,
      bodyHtml: `<p>Balance: ${formatMoney(loan?.balance)}</p><label>Repayment amount<input type="number" name="amount" min="1" max="${loan?.balance}" value="${loan?.balance}" required></label>`,
      submitLabel: "Repay",
      onSubmit: async (fd) => {
        try {
          await loans.repayLoan(gameId, { playerUid: uid, loanId, amount: Number(fd.get("amount")) });
          closeModal();
          showToast("Loan repayment recorded.");
        } catch (err) {
          showError(err);
        }
      },
    });
  }
}

async function refetchPlayers(gameId) {
  const snap = await getDocs(collection(db, "games", gameId, "players"));
  const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  setState({ currentGamePlayers: players });
  return players;
}
