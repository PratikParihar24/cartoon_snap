# Technical Retrospective: Cartoon Snap

## 1. Project Summary
Cartoon Snap is a high-speed, real-time multiplayer card game built to test players' reflexes. Two players connect via WebSockets to join a room, where they take turns playing cards from their hands to a central pile and race to hit the "SNAP!" button when two matching character cards are played consecutively. The game runs as a single-page application (SPA) designed with a lightweight, framework-free frontend and a Node.js/Socket.io backend.

## 2. Problem / Motivation
Based on `Theory.md`, `UserJourney.md`, and the commit history, this project was built to showcase and master raw WebSockets, game loop matchmaking, and client-server synchronization under latency constraints. It serves as an engineering portfolio piece showing how to build highly responsive, multiplayer experiences without heavy frontend frameworks (like React or Vue) while addressing real-time challenges like lag compensation (optimistic UI), false-snap validation race conditions, and heavy network payload reduction.

## 3. Tech Stack
All technologies are verified from the repository's configuration and dependency manifests:
* **Runtime Environment:** Node.js (Engine: `>=14.x`)
* **Backend Web Framework:** Express.js (v4.18.2)
* **Real-Time WebSocket Engine:** Socket.io (v4.7.2)
* **Asset Optimization & Pipeline:** Sharp (v0.35.1)
* **Server-Side Compression Middleware:** compression (v1.8.1)
* **Frontend Technologies:** Vanilla HTML5, Vanilla CSS3, Vanilla ES6 JavaScript (No frameworks)
* **Client-Side Libraries:** canvas-confetti (v1.6.0 via jsDelivr CDN)
* **Deployment/Configuration:** vercel.json (supporting redirection redirects)

## 4. Architecture Overview
Cartoon Snap follows a client-server architecture with a clean separation between state verification (authoritative server) and visual rendering (client).

### Directory Structure
* **`server/`**: Contains backend server logic.
  * `server.js`: Configures the Express server, Socket.io connection listeners, Brotli/Gzip compression middleware, and handles routing `/ping`.
  * `gamelogic.js`: Implements room matchmaking, turn-taking, snap validation, penalty timers/logic, and rematch coordination. Acts as the "Hotel Registry" storing game state in a global in-memory object.
  * `classes/Deck.js`: Encapsulates a standard 52-card deck containing 13 cartoon characters across 4 visual styles, along with Fischer-Yates shuffle algorithms.
* **`public/`**: Static frontend assets served directly by Express.
  * `index.html`: Houses the SPA structure, including landing screen, lobby, waiting room, game board, drawer menu, and lazy-loaded modal modules.
  * `script.js`: Handles DOM manipulation, event listeners, WebSocket triggers, optimistic local rendering, audio playback, client-side lag prediction, and confetti effects.
  * `style.css`: Contains CSS variables, animations (pulsing, shaking, sliding), layout configurations, and media queries.
  * `assets/`: Pre-processed WebP card textures, sound effects (flip, snap, victory), and SVG avatars generated dynamically via DiceBear API.
* **`raw_cards/`**: Source folder for raw high-resolution PNG/JPG graphics (processed and removed by the build pipeline).
* **`compress.js` & `cleanup.js`**: Node scripts for recursively compressing images to WebP format and purging large legacy files.

### Data Flow Diagram
```
                     +---------------------------------------+
                     |                Client                 |
                     +-------------------+-------------------+
                                         |
                       [1] Socket Action | [4] State Update / Flash Event
                      (Packed Array Data) | (Optimistic UI Reconciliation)
                                         v
                     +-------------------+-------------------+
                     |          Socket.io Gateway            |
                     +-------------------+-------------------+
                                         |
                                         |
                                         v
                     +-------------------+-------------------+
                     |         server/gamelogic.js           |
                     |  (Authoritative State Validation)     |
                     +-------------------+-------------------+
                                         |
                                         | Reads/Mutates Deck State
                                         v
                     +-------------------+-------------------+
                     |         server/classes/Deck.js        |
                     |     (Deck initialization/shuffling)   |
                     +---------------------------------------+
```

## 5. Key Features Implemented
* **Authoritative Multiplayer Lobby:** Custom room-aware matching logic where players can generate a room ID (`generateRoomId()`) or join an active 6-letter room code.
* **Network Event Data Packing:** Custom array-based protocols mapping events to packed IDs (e.g., `Actions.PLAY = 1`, `Actions.SNAP = 2`) to minimize JSON serialization overhead.
* **Optimistic Client-Side UI:** Immediate local state rendering (playing a card, triggering flips, switching visual turn overlays) before server verification to make the game feel latency-free.
* **Recursive Image Pipeline (`sharp`):** Compresses high-resolution card graphics to lightweight `400px` WebP formats at `80%` quality, reducing the visual payload by ~90%.
* **Silent Asset Preloader:** Background loader in `script.js` that pulls standard cards into browser memory during the menu/lobby phase to eliminate in-game loading hiccups.
* **Server-Side False Snap Penalty:** Mechanics that penalize players for false snaps by transferring one card from their deck to their opponent's, with UI visual overrides (shaking screen and red flash).
* **Rematch Consensus Protocol:** Dynamic logic to allow restarting games without recreating rooms, requiring consensus from both players while handling partial restart requests.
* **Dynamic Bottts Avatars:** Uses the DiceBear API (`https://api.dicebear.com/7.x/bottts/svg`) to generate unique, robot SVG avatars using player usernames as seeds.

## 6. Hard Numbers
* **Total Commits:** 32 commits (counted from git history).
* **Code Size / Statistics (Approximate):**
  * Javascript Code: `script.js` (984 lines), `gamelogic.js` (350 lines), `server.js` (91 lines), `Deck.js` (46 lines), `compress.js` (44 lines), `cleanup.js` (32 lines).
  * CSS Code: `style.css` (1,591 lines).
  * HTML Code: `index.html` (260 lines).
* **Dependencies Count:** 4 production dependencies in `package.json` (`compression`, `express`, `sharp`, `socket.io`).
* **Game Deck Composition:** 52 cards (13 cartoon characters: *Doraemon, Jiyaan, Nobita, Sizuka, Sunio, Ninja Hattori, Oggy, Jack, Tom, Jerry, Himawari, Cinderella, Shinchan* across 4 visual styles: *Ghibli, Sketch, Pixar, Standard*).
* **Asset Payload Optimization:** Converted ~300MB of raw images down to WebP assets. Standard assets like `flip.wav` (239.7 KB), `win.mp3` (259.1 KB), and WebP files typically range between 6KB and 56KB.
* **Performance Scores (README claim):** 95/100 Google Lighthouse Performance Score, ~90% visual network payload reduction, ~75% text payload reduction via Brotli compression, and ~70% WebSocket bandwidth savings.

## 7. Notable Technical Decisions
* **Brotli/Gzip Compression Integration:** `compression()` middleware is registered directly in Express (`server.js`) before static folder resolution, optimizing text payloads.
* **Authoritative Server / Client Reconciliation:** Real-time state verification happens strictly on the backend (`gamelogic.js`). The client uses an `expectedServerConfirmations` counter in `script.js` to reconcile optimistic predictions with incoming server state frames, preventing double-play glitches.
* **Packed Socket Actions:** Instead of communicating via heavy JSON keys, socket updates for player actions are sent using integer enum codes in an array format `[ActionCode, RoomId]` (e.g., `socket.emit('game_action', [1, roomId])`), drastically trimming packet sizes.
* **No Frontend Frameworks:** The developer chose native DOM APIs and vanilla selectors to minimize library footprint, maintaining a fast Time-To-Interactive (TTI).
* **Room Matchmaking Isolation:** Sockets join specific room keys (`socket.join(roomId)`) and communication is routed selectively (`io.to(roomId).emit`) to prevent cross-room packet leakage.

## 8. Observed Weaknesses / Technical Debt
* **Lack of Automated Testing:** The repository has zero unit, integration, or E2E tests, exposing the game to regressions during state refactoring.
* **In-Memory State Vulnerability:** The game state (`rooms` object in `gamelogic.js`) is stored completely in-memory on the active Node.js thread. If the server crashes or restarts, all active matches, room codes, and scores are lost.
* **Global Variable Dependency:** The client side in `script.js` relies extensively on mutable global states (`myHand`, `isMyTurn`, `isMatchActive`, `isGameOver`, `expectedServerConfirmations`). This makes async logic hard to track and increases susceptibility to race conditions.
* **No Reconnection Handshake:** If a user loses internet connection momentarily and reconnects, their socket ID changes on the server, which destroys the room or triggers an `opponent_left` crash because the server does not map user identities beyond socket IDs.
* **Lack of Validation Security:** `gamelogic.js` accepts client-side commands without checking if the sender is actually in their active room for that state phase, which could allow socket manipulation cheats.

## 9. Timeline
* **First Commit:** Sat Dec 27 17:53:46 2025 (`feat: Complete V1 Logic with 52-card deck`)
* **Last Commit:** Sun Jun 28 20:21:27 2026 (`Merge pull request #4 from PratikParihar24/landing-page`)
* **Total Commit Count:** 32 commits
* **Active Development Duration:** ~6 months (from late December 2025 to late June 2026).

## 10. Open Questions for the Engineer
* Was this project deployed in a live environment, and if so, how did the Brotli compression and Socket.io protocol adjustments perform under actual network latency?
* Why did you choose to keep the game state purely in-memory rather than utilizing a lightweight cache like Redis or a database?
* How would you redesign the socket matchmaking layer to support reconnecting players without terminating active game sessions?
* What specific real-world performance benchmarks or Lighthouse audits did you perform to measure the reported 95/100 score?
