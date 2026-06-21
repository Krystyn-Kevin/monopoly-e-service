# Monopoly Banker

A real-time Monopoly banking app: one player is the Banker and runs the game
from a dashboard, everyone else logs into their own account to watch their
balance, properties, loans, and mortgages update live. Plain HTML/CSS/JS
(no build step) + Firebase Auth + Firestore, deployable straight to GitHub
Pages.

## 1. Firebase setup (do this first)

The code already points at your project (`monopoly-e-service`), but three
things still need to happen in the [Firebase Console](https://console.firebase.google.com/):

1. **Enable Email/Password sign-in.** Build → Authentication → Sign-in
   method → enable "Email/Password". (Players type a plain username; the app
   silently maps it to `username@monopoly.local` behind the scenes, so you
   don't need real email addresses.)
2. **Create a Firestore database.** Build → Firestore Database → Create
   database → start in production mode, pick a region close to you.
3. **Deploy the security rules.** Easiest path is the Console: Firestore
   Database → Rules tab → paste in the contents of `firestore.rules` →
   Publish. (Or use the Firebase CLI: `firebase deploy --only firestore:rules`.)
4. **Create two composite indexes.** A couple of queries (the saved/previous
   games list, and the "pick an existing player" dropdown) filter on one
   field and sort on another, which Firestore can't do without an index.
   Easiest path: just use the app — when a screen needs one, the browser
   console error includes a direct "create it here" link that pre-fills
   everything; click it, then click Create Index in the Console, and wait
   ~1-2 minutes for it to finish building. Or create them upfront in
   Firestore Database → Indexes → Composite → Add Index:
   - `games`: `playerUids` Arrays, `status` Ascending, `createdAt` Descending
   - `players`: `hidden` Ascending, `name` Ascending

   (If you use the Firebase CLI instead, `firestore.indexes.json` has both
   defined already — `firebase deploy --only firestore:indexes`.)

Optional, only needed if you want Analytics/Cloud Messaging later: open
Project Settings → General → "Your apps" → SDK setup and configuration, copy
the full config object, and replace the two placeholder fields
(`messagingSenderId`, `appId`) in `js/firebase-config.js`. Auth and Firestore
work fine without them.

## 2. Run it locally

This is a static site with ES modules, which browsers won't load over
`file://`. Serve it with any static server, e.g.:

```bash
cd monopoly-banker
python3 -m http.server 8000
# then open http://localhost:8000
```

## 3. Deploy to GitHub Pages

1. Push this folder to a GitHub repo (the contents of `monopoly-banker/`
   should be at the repo root, or in `/docs` if you prefer that Pages mode).
2. Repo Settings → Pages → Source: deploy from the branch/folder containing
   `index.html`.
3. In Firebase Console → Authentication → Settings → Authorized domains, add
   your `*.github.io` domain (and any custom domain) so sign-in works there.

## How the pieces fit together

```
index.html            single-page shell; every "screen" is a <section> toggled by js/router.js
css/styles.css         all styling — light/dark theme via CSS variables, deed-card visual language
js/firebase-config.js  Firebase init (Auth + Firestore w/ offline cache)
js/properties-data.js  the 28 standard board properties preloaded into every new game
js/state.js             tiny in-memory store + pub/sub, no framework
js/router.js            shows/hides the top-level screens
js/auth.js              signup/login/logout + the "register a player without losing my
                         own session" trick (spins up a throwaway secondary Firebase App)
js/playerManagement.js  the reusable / removable list of previously-registered players
js/gameSetup.js         writes a new game doc + its players & properties subcollections
js/banking.js           Player→Player, Player→Bank, Bank→Player transfers (atomic + logged)
js/properties.js        buy from bank, transfer/sell between players
js/mortgages.js         mortgage / redeem, plus the per-round interest tick
js/loans.js             issue / repay loans
js/bankruptcy.js        net worth, debt, and the bankruptcy formula from the spec
js/winner.js            ends the game once one active player remains, updates lifetime stats
js/rounds.js            Next Turn (skips bankrupt players) / Next Round (ticks mortgage interest)
js/leaderboard.js       lifetime stats, sortable
js/savedGames.js        list in-progress / completed games, manual "Save"
js/calculator.js        the banker's floating calculator widget
js/modal.js             one generic modal used by every banker action form
js/gameScreen.js        the live game screen: real-time listeners + all the tab UIs
js/main.js              wires up auth, main menu, the create-game wizard, and the
                         saved-games / previous-games / leaderboard / player-management screens
firestore.rules         security rules (read the comments at the top — important)
```

## Data model (Firestore)

```
players/{uid}                      global, reusable profile
  name, username, tokenColor, hidden, createdAt
  lifetimeStats: { gamesPlayed, wins, losses, bankruptcyCount, totalNetWorthEarned }

games/{gameId}
  status: "active" | "completed"
  bankerUid, playerUids[], turnOrder[]
  currentTurnIndex, currentRound, totalCompletedRounds
  winner: { uid, name, netWorth, date } | null
  createdAt, lastSavedAt, completedAt

games/{gameId}/players/{uid}       per-game financial state
  name, username, tokenColor, isBanker
  cashBalance, income, expenses
  loans: [{ id, originalAmount, balance, interestRate, issuedRound, description }]
  status: "active" | "bankrupt", bankruptcyRound, bankruptcyTimestamp

games/{gameId}/properties/{propId} one doc per board property
  name, group, price, owner (uid|null)
  mortgaged, mortgageStartRound, mortgageValue, mortgageRound, currentInterestRate

games/{gameId}/transactions/{txId} immutable ledger, newest first
  type, senderUid, receiverUid, senderName, receiverName, amount, description, round, timestamp
```

## Game rules implemented

- **Bankruptcy**: a player is flagged at risk when
  `outstanding debt > cash + asset value + income` (`js/bankruptcy.js`), matching
  the spec's formula. The Banker still makes the final call with a "Mark
  Bankrupt" button — bankrupt players keep all their history, get a red
  seal/border in the UI, and are auto-skipped by "Dice Passed."
- **Winner**: the moment only one active player is left, the game is marked
  `completed`, a Winner Table entry is written, and every participant's
  lifetime leaderboard stats update in one atomic batch.
- **Mortgages**: mortgaging pays the owner half the property's price. Every
  time the Banker clicks "Next Round," every still-mortgaged property's own
  `mortgageRound` counter ticks forward independently of the game round, and
  its interest grows by another flat 10% of principal — exactly the
  `Game Round 15 / Mortgage Round 4 / 40% interest` example in the spec.
- **Auto-save**: every transaction, mortgage, transfer, and round change
  touches `lastSavedAt` as part of the same atomic write — there's nothing to
  lose by closing the tab. "Save Game" in the header is a manual nudge of
  the same field for peace of mind.

## Known simplifications (read before using this for money you care about)

- **Player-to-player privacy is enforced in the UI, not the database.**
  Firestore rules let any participant *read* every player's financial
  subdocument (needed so the turn-order panel and ownership board can show
  everyone's name/properties); `js/gameScreen.js` simply only *displays* a
  full balance card for yourself and the Banker. If you want true
  database-level privacy, split `games/{gameId}/players/{uid}` into a public
  "roster" doc (name, token, status) and a private "wallet" doc
  (balance/loans), and tighten the rules accordingly — the rules file has a
  comment marking exactly where.
- **Asset value** (used in the bankruptcy formula) counts a property at full
  listed price whether or not it's mortgaged, rather than netting out what's
  owed. Simple and predictable; tighten it in `bankruptcy.js` if you want
  stricter enforcement.
- **Loans** are a flat balance the Banker can issue/collect against — there's
  no automatic interest accrual on loans (mortgages do accrue, per spec;
  loans weren't specified in that level of detail).
