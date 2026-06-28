# 🃏 Cartoon Snap — The Complete Project Handbook

> **The single source of truth** for understanding how every pixel, packet, and function works in Cartoon Snap — a real-time multiplayer card game built with Node.js and Socket.io.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture at a Glance](#2-architecture-at-a-glance)
3. [Directory Structure Explained](#3-directory-structure-explained)
4. [The Full User Journey (Screen by Screen)](#4-the-full-user-journey-screen-by-screen)
5. [The Data Journey (Function by Function)](#5-the-data-journey-function-by-function)
6. [Server-Side Deep Dive](#6-server-side-deep-dive)
7. [Client-Side Deep Dive](#7-client-side-deep-dive)
8. [The Card System & Asset Pipeline](#8-the-card-system--asset-pipeline)
9. [Real-Time Communication: Socket Events Map](#9-real-time-communication-socket-events-map)
10. [UI/UX System & Animations](#10-uiux-system--animations)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Complete Flow Diagrams](#12-complete-flow-diagrams)

---

## 1. Project Overview

### What is Cartoon Snap?

Cartoon Snap is a **real-time, two-player, multiplayer card game** inspired by the classic "Snap!" game. Players take turns flipping cards onto a center pile. When two consecutive cards show the **same cartoon character** (regardless of art style), both players race to hit the "SNAP!" button. The first to click wins the entire pile. The player who collects all 52 cards wins.

### In Plain English

Think of it like a digital version of the card game "Snap" — but with cartoon characters (Doraemon, Shinchan, Tom & Jerry, etc.) drawn in four different art styles (Ghibli, Pixar, Sketch, Standard). Two friends open the website, one creates a room and shares the code, the other joins. They flip cards, race to spot matches, and the fastest finger wins.

### Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Server Runtime** | Node.js (≥14.x) | JavaScript server execution |
| **HTTP Framework** | Express.js 4.18 | Serves static files & health endpoint |
| **Real-Time Layer** | Socket.io 4.7 | WebSocket-based bi-directional communication |
| **Frontend** | Vanilla JS + HTML5 + CSS3 | No frameworks — raw DOM manipulation |
| **Image Processing** | Sharp 0.35 | Compresses raw PNG/JPG → optimized WebP |
| **Compression** | compression (npm) | Gzip compression for HTTP responses |
| **Hosting** | Render.com | Primary deployment target |
| **CDN** | Vercel (redirect) | Domain redirect → Render |
| **External APIs** | DiceBear Avatars, Canvas Confetti | Player avatars & victory effects |

---

## 2. Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│   index.html ─── style.css ─── script.js                        │
│       │              │             │                            │
│   Structure      Styling     Game Logic + Socket.io Client      │
│                              (Vanilla JS, ~984 lines)           │
│                                                                 │
│   Assets: /assets/{ghibli,pixar,sketch,standard}/*.webp         │
│           /assets/backs/{default,blue,modern}.webp              │
│           /assets/audio/{flip.wav, snap.mp3, win.mp3}           │
└────────────────────────┬────────────────────────────────────────┘
                         │ WebSocket (Socket.io)
                         │ + HTTP (Static Files)
┌────────────────────────┴────────────────────────────────────────┐
│                        SERVER (Node.js)                         │
│                                                                 │
│   server.js ──── gamelogic.js ──── classes/Deck.js              │
│       │               │                │                        │
│   Express +       Room Mgmt        52-Card Deck                 │
│   Socket.io       Game State        (13 chars × 4 styles)       │
│   Setup           Turn Logic        Fisher-Yates Shuffle        │
│                   Snap Detect       Even Deal                   │
│                   Penalty Sys                                   │
│                   Rematch Sys                                   │
│                                                                 │
│   In-Memory Store: const rooms = {};                            │
│   Format: { "A1B2C3": { players[], centerPile[], deck, ... } }  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions
- **No Database**: All game state lives in server memory (`const rooms = {}`). Games are ephemeral — when the server restarts, all rooms are lost.
- **No Frontend Framework**: Pure vanilla JS. No React, no Vue. Direct DOM manipulation for maximum control and zero bundle size.
- **Room-Based Multiplayer**: Each game lives in its own isolated "room" with a unique 6-character code.
- **Server-Authoritative**: The server is the single source of truth for game state. Clients send actions; the server validates and broadcasts results.

---

## 3. Directory Structure Explained

```
cartoon_snap/
│
├── server/                          # 🖥️ BACKEND (Node.js)
│   ├── server.js                    #   Express + Socket.io setup, event routing
│   ├── gamelogic.js                 #   Core game engine (rooms, turns, snap, penalties)
│   └── classes/
│       ├── Deck.js                  #   52-card deck class (build, shuffle, deal)
│       └── Player.js                #   Empty file (player data is inline objects)
│
├── public/                          # 🌐 FRONTEND (Served as static files)
│   ├── index.html                   #   Single-page app (all screens in one file)
│   ├── script.js                    #   Client-side game logic (~984 lines)
│   ├── style.css                    #   Full styling (~1581 lines, "Candy UI" theme)
│   └── assets/                      #   Optimized game assets
│       ├── game_logo.webp           #   Game logo (compressed)
│       ├── standard/                #   13 character cards (standard art style)
│       ├── ghibli/                  #   13 character cards (Ghibli art style)
│       ├── pixar/                   #   13 character cards (Pixar art style)
│       ├── sketch/                  #   13 character cards (Sketch art style)
│       ├── backs/                   #   3 card back skins (default, blue, modern)
│       └── audio/                   #   3 sound effects (flip, snap, win)
│
├── raw_cards/                       # 🎨 ORIGINAL ASSETS (not deployed, in .gitignore)
│   ├── game_logo.png                #   Uncompressed logo
│   ├── audio/                       #   Source audio files
│   ├── backs/                       #   Source card back images (PNG)
│   ├── ghibli/                      #   Source Ghibli-style cards
│   ├── pixar/                       #   Source Pixar-style cards
│   ├── sketch/                      #   Source Sketch-style cards
│   └── standard/                    #   Source Standard-style cards
│
├── compress.js                      # 🗜️ BUILD TOOL: raw PNG → optimized WebP
├── cleanup.js                       # 🧹 BUILD TOOL: deletes old PNG/JPG from /public
├── package.json                     #   Dependencies & scripts
├── vercel.json                      #   Vercel redirect config → Render
├── .gitignore                       #   Excludes node_modules, raw_cards, .env
└── README.md                        #   Project overview
```

### What each file does (one-liner)

| File | Role |
|---|---|
| `server/server.js` | The "reception desk" — boots up the server, routes all socket events |
| `server/gamelogic.js` | The "game engine" — all room, turn, snap, penalty, restart, disconnect logic |
| `server/classes/Deck.js` | The "card factory" — creates 52 cards, shuffles, and deals them evenly |
| `public/index.html` | The "building" — every screen (landing, lobby, waiting, game, modals) in one HTML file |
| `public/script.js` | The "nervous system" — handles all client-side state, socket events, and DOM updates |
| `public/style.css` | The "paint job" — Candy Crush-inspired UI with animations, responsive design |
| `compress.js` | Dev-only — batch-converts raw assets to optimized WebP using Sharp |
| `cleanup.js` | Dev-only — removes old PNG/JPG files after compression |

---

## 4. The Full User Journey (Screen by Screen)

### Screen 1: 🏠 Landing Page

**What the user sees:** A vibrant landing page with the game title "Cartoon Snap!", a subtitle, and a single "Play Game" button. Floating animated shapes drift upward in the background. A sticky navigation bar shows: How to Play, About the Dev, Feedback, Settings.

**What happens behind the scenes:**
1. Browser loads `index.html`, which loads `style.css` and `script.js`.
2. `script.js` immediately calls `io()` to open a WebSocket connection to the server.
3. While connecting, the "Play Game" button says "Connecting to Server..." and is **disabled**.
4. In the background, `preloadGameAssets()` silently pre-caches all 13 standard character images by creating off-screen `Image()` objects.
5. When the socket `connect` event fires, the button becomes "Play Game" and is **enabled**.

**Code path:**
```
script.js:3     → const socket = io()           (WebSocket connection initiated)
script.js:17-42 → preloadGameAssets()            (Background asset caching)
script.js:167   → socket.on('connect', ...)      (Button enabled)
script.js:177   → playGameBtn.click → hide landing, show lobby
```

**Navigation bar modals:**
- "How to Play" → Shows rules (matching, snapping, penalties)
- "About the Dev" → Developer bio
- "Feedback" → Text form (not connected to backend — UI-only)
- "Settings" → Sound toggle + Dark Mode toggle (UI-only toggles)

---

### Screen 2: 🎮 Lobby Screen

**What the user sees:** A centered card with an input field for their name, a "Create New Game" button, an "OR" divider, a room code input, and a "Join Game" button.

**User Action A — Create a Game:**
1. User types their name (max 12 characters).
2. Clicks "Create New Game".
3. Client validates the name isn't empty (shows custom alert modal if it is).
4. Emits `create_room` socket event with `{ name: "Pratik" }`.

**User Action B — Join a Game:**
1. User types their name + a 6-character room code.
2. Clicks "Join Game".
3. Client validates both fields aren't empty.
4. Emits `join_room` socket event with `{ roomId: "A1B2C3", name: "Friend" }`.

**Code path (Create):**
```
script.js:267  → createBtn.click
script.js:276  → socket.emit('create_room', { name })
server.js:35   → socket.on('create_room') → calls gamelogic.createRoom()
gamelogic.js:23 → createRoom() creates room object, adds player, emits 'room_created'
script.js:299  → socket.on('room_created') → shows waiting screen
```

**Code path (Join):**
```
script.js:280  → joinBtn.click
script.js:295  → socket.emit('join_room', { roomId, name })
server.js:41   → socket.on('join_room') → calls gamelogic.joinRoom()
gamelogic.js:45 → joinRoom() validates room, adds player, calls startGame() if 2 players
```

---

### Screen 3: ⏳ Waiting Room (Creator Only)

**What the user sees:** "Room Created!" heading, the 6-character room code in a large dashed box, a Copy button, a WhatsApp Share button, a "Cancel & Back to Lobby" button, and blinking "Waiting for opponent..." text.

**Features:**
- **Copy Button:** Copies the room code to clipboard via `navigator.clipboard.writeText()`. Shows "✅ Copied!" for 2 seconds.
- **WhatsApp Share:** Opens WhatsApp with a pre-filled message containing the room code and game URL.
- **Cancel Button:** Emits `leave_room` to the server, navigates back to lobby, resets `currentRoomId`.

**Code path:**
```
script.js:299-314  → room_created handler → shows waiting screen, sets up share link
script.js:318-323  → copyBtn.click → clipboard + temporary "Copied!" text
script.js:972-984  → cancel-room-btn.click → socket.emit('leave_room'), back to lobby
gamelogic.js:287   → leaveRoom() → removes player, deletes empty room
```

---

### Screen 4: 🎴 Game Board (Both Players)

**What the user sees:** A vertical layout with three zones:

```
┌──────────────────────────┐
│   [☰ Menu]               │  ← Menu toggle (top right)
│                           │
│   👤 Opponent Name        │  ← Avatar + name + card count
│   [Card Back]             │  ← Opponent's deck (face down)
│                           │
│   STATUS TEXT             │  ← "YOUR TURN!" / "Waiting..."
│   ┌─────────┐             │
│   │ Center  │             │  ← Center pile (played cards)
│   │  Pile   │             │
│   └─────────┘             │
│   [SNAP! ⚡] (hidden)     │  ← Appears on match
│                           │
│   [Card Back]             │  ← Your deck (clickable)
│   👤 Your Name (YOU)      │  ← Avatar + name + card count
└──────────────────────────┘
```

**When the game starts (`game_start` event):**
1. Both players receive their 26-card hand, turn info, room ID, and both player names.
2. UI transitions: hide lobby/waiting, show game board.
3. Player names appear with DiceBear-generated robot avatars.
4. Card counts show 26 each.
5. Status shows "YOUR TURN!" (Player 1) or "Opponent's Turn" (Player 2).
6. Card back skins are applied to face-down decks.

---

### Gameplay Loop

#### Step A: Playing a Card (Your Turn)

**What happens when you click your deck:**

1. **Client-side validation** (instantly):
   - Is the game over? → Return silently.
   - Is there an active match? → Shake the SNAP button to guide the user.
   - Is it not your turn? → Shake the deck, flash "❌ WAIT YOUR TURN!" for 1 second.
   - Is your hand empty? → Return silently.

2. **Optimistic UI** (instant, before server confirms):
   - Pop the top card from `myHand[]` locally.
   - Render the card image in the center pile immediately.
   - Play the `flip.wav` sound.
   - Lock your turn locally (`isMyTurn = false`).
   - Increment `expectedServerConfirmations` counter.

3. **Send to server:**
   - Emit `game_action` with packed array `[1, roomId]` (Action code 1 = PLAY).

4. **Server processes** (`gamelogic.js:playCard()`):
   - Validates room exists and is ACTIVE.
   - Finds the player by `socket.id`.
   - Pops a card from the player's hand, pushes to `centerPile[]`.
   - Determines next player's turn.
   - Checks if top two center pile cards match by `character` name.
   - Broadcasts `card_played` event to the room with: card data, whose turn, match status, both player counts.
   - If player hand is empty AND no match → calls `finishGame()`.

5. **Client receives `card_played`:**
   - **Reconciliation**: If the client already rendered this optimistically, skip re-rendering. Otherwise (opponent's play), show the card and play the flip sound.
   - Update card counts for both players.
   - If `isMatch` → Show SNAP button, set `isMatchActive = true`, shake the button.
   - If not a match → Hide SNAP button, update turn text.

**Code path:**
```
script.js:433  → myDeck.click → validation checks
script.js:463  → Optimistic: pop card, render, play sound
script.js:482  → socket.emit('game_action', [1, roomId])
server.js:52   → socket.on('game_action') → playCard()
gamelogic.js:116 → playCard() → move card, check match, broadcast
script.js:487  → socket.on('card_played') → reconcile + update UI
```

#### Step B: SNAP! (Match Detected)

**When two consecutive center pile cards share the same character:**

Both players see:
- The SNAP button appears with a "pop" animation (`popCover` keyframe).
- Status text changes to "🔥 SNAP! CLICK IT! 🔥" (shaking, red, large).
- Deck border turns red.

**First player to click SNAP (or the center pile):**

1. Client plays `snap.mp3`, hides SNAP button.
2. Emits `game_action` with `[2, roomId]` (Action code 2 = SNAP).
3. Server (`handleSnap()`) validates:
   - Are the top two cards a match? If YES → **Valid Snap**.
   - If NO → **False Snap (Penalty)**.

**Valid Snap:**
- Player's hand absorbs the entire center pile (`unshift(...centerPile)`).
- Center pile is cleared.
- Server emits `snap_success` (confetti + flash message) and `game_update` (new counts).
- If opponent has 0 cards → `finishGame()`.

**False Snap (Penalty):**
- Player loses one card from their hand to the opponent.
- Server emits `game_update` (new counts) and `penalty_flash`:
  - To snapper: "FALSE SNAP! -1 Card" (red flash + screen shake).
  - To opponent: "OPPONENT MISSED! +1 Card".
- If the snapper has 0 cards → `finishGame()`.

**Code path:**
```
script.js:543  → snapBtn.click → emit [2, roomId]
script.js:555  → centerPile.click → also emits snap attempt (spam-penalty mechanic)
gamelogic.js:171 → handleSnap() → validate match
gamelogic.js:222 → Valid: absorb pile, emit snap_success
gamelogic.js:192 → Invalid: penalty card transfer, emit penalty_flash
```

#### Step C: Last Card Survival Mechanic

**An important edge case:** If a player plays their **last card** and it creates a match, the game does NOT end immediately. The player stays alive to attempt a Snap. If they snap successfully, they regain cards. If the opponent snaps, the player loses (0 cards, no match to save them).

```
gamelogic.js:161 → if (player.hand.length === 0 && !isMatch) → finishGame()
                   // Only dies if hand is empty AND there's no match
```

---

### Screen 5: 🏆 Game Over Modal

**What the user sees:**
- **Winner:** "🏆 VICTORY!" (gold text), "You are the Snap Champion!", confetti explosion, win sound.
- **Loser:** "💀 DEFEAT" (red text), "Better luck next time..."
- Two buttons: "🔄 Rematch" and "🚪 Exit to Lobby".

**Rematch Flow (Voting System):**
1. Player A clicks "Rematch" → button changes to "⏳ Waiting for Opponent...", disabled.
2. Server registers Player A's vote in `room.rematchVotes` (a `Set`).
3. Server notifies Player B: `opponent_wants_rematch` → Player B sees a flash message, menu button pulses red, restart button turns orange "⚠️ Accept Restart".
4. Player B clicks "Rematch" (from modal or menu) → vote registered.
5. **Consensus (2/2 votes):** Server clears votes, emits `rematch_success`, then calls `startGame()` again.
6. Both clients hide the game-over modal, reset all UI artifacts, and start fresh.

**Exit Flow:**
- Clicking "🚪 Exit to Lobby" simply reloads the page (`window.location.reload()`), which resets all client state and returns to the landing screen.

**Code path:**
```
script.js:855  → rematchBtn.click → disable btn, emit 'request_restart'
gamelogic.js:309 → restartGame() → register vote, check consensus
gamelogic.js:336 → emit 'rematch_success', call startGame()
script.js:931  → on 'rematch_success' → hide modal, reset button
script.js:354  → on 'game_start' → full UI reset + new game
```

---

### Screen 6: ☰ In-Game Menu

**Opened by clicking the hamburger (☰) button during gameplay.**

**Contents:**
| Button | Action |
|---|---|
| ▶ Resume Game | Closes the menu |
| 🔊 Sound: ON/OFF | Toggles `isMuted` flag; all `playSound()` calls check this |
| Card Style Selector | Three card back skin previews (default, blue, modern) — applies instantly via `updateCardBacks()` |
| 🔄 Restart Game | Emits `request_restart` (same voting system as rematch) |
| 🚪 Leave Room | Shows confirmation view ("⚠️ You will forfeit the game.") → Yes reloads page |

---

### Edge Cases: Disconnection & Errors

**Opponent Disconnects:**
```
server.js:80   → socket.on('disconnect') → removePlayer()
gamelogic.js:249 → removePlayer() → finds player's room, notifies survivor, deletes room
script.js:722  → on 'opponent_left' → shows alert "Your opponent fled the battle!"
```

**Room Expired (Server Restart):**
```
gamelogic.js:313 → restartGame() → if room is null, emit 'init_error'
script.js:842  → on 'init_error' → show alert, reload page
```

**Room Not Found (Bad Code):**
```
gamelogic.js:48 → joinRoom() → if (!room) → emit 'error', "Room not found!"
```

**Room Full (Third Player Tries to Join):**
```
gamelogic.js:52 → joinRoom() → if (players.length >= 2) → emit 'error', "Room is full!"
```

---

## 5. The Data Journey (Function by Function)

### Journey 1: Creating a Room

```
User clicks "Create New Game"
│
├─ [CLIENT] script.js:267 → createBtn.click listener
│   └─ Validates name is not empty
│   └─ socket.emit('create_room', { name: "Pratik" })
│
├─ [NETWORK] Socket.io WebSocket → server
│
├─ [SERVER] server.js:35 → socket.on('create_room')
│   └─ Calls gamelogic.createRoom(socket, io, "Pratik")
│
├─ [GAME ENGINE] gamelogic.js:23 → createRoom()
│   ├─ generateRoomId() → "X7K2F9" (random 6-char uppercase)
│   ├─ rooms["X7K2F9"] = { id, players: [], deck: null, centerPile: [], gameStatus: 'WAITING' }
│   ├─ player1 = { id: socket.id, name: "Pratik", hand: [] }
│   ├─ rooms["X7K2F9"].players.push(player1)
│   ├─ socket.join("X7K2F9")  ← Socket.io room system
│   └─ socket.emit('room_created', { roomId: "X7K2F9" })
│
├─ [NETWORK] Socket.io WebSocket → client
│
└─ [CLIENT] script.js:299 → socket.on('room_created')
    ├─ currentRoomId = "X7K2F9"
    ├─ Hide lobby, show waiting screen
    ├─ Display room code "X7K2F9"
    └─ Setup WhatsApp share link
```

### Journey 2: Joining & Game Start

```
Friend clicks "Join Game" with code "X7K2F9"
│
├─ [CLIENT] socket.emit('join_room', { roomId: "X7K2F9", name: "Friend" })
│
├─ [SERVER] gamelogic.js:45 → joinRoom()
│   ├─ Validates: room exists? room not full?
│   ├─ player2 = { id: socket.id, name: "Friend", hand: [] }
│   ├─ room.players.push(player2)
│   ├─ socket.join("X7K2F9")
│   └─ room.players.length === 2 → startGame(io, "X7K2F9")
│
├─ [GAME ENGINE] gamelogic.js:72 → startGame()
│   ├─ room.gameStatus = 'ACTIVE'
│   ├─ room.centerPile = []
│   ├─ Clear rematch votes (safety)
│   ├─ new Deck() → Deck.js constructor:
│   │   └─ 13 characters × 4 styles = 52 cards
│   │       Each card: { character: "Doraemon", style: "Ghibli", id: "Ghibli_Doraemon" }
│   ├─ deck.shuffle() → Fisher-Yates in-place shuffle
│   ├─ deck.deal() → split at midpoint: 26 cards each
│   │   └─ { player1Hand: [...26], player2Hand: [...26] }
│   ├─ room.players[0].hand = player1Hand
│   ├─ room.players[1].hand = player2Hand
│   │
│   ├─ io.to(player1.id).emit('game_start', {
│   │       hand: player1Hand (full card objects),
│   │       opponentCardCount: 26,
│   │       isMyTurn: true,        ← Player 1 always goes first
│   │       roomId: "X7K2F9",
│   │       myName: "Pratik",
│   │       oppName: "Friend"
│   │   })
│   │
│   └─ io.to(player2.id).emit('game_start', {
│           hand: player2Hand,
│           opponentCardCount: 26,
│           isMyTurn: false,       ← Player 2 waits
│           roomId: "X7K2F9",
│           myName: "Friend",
│           oppName: "Pratik"
│       })
│
└─ [CLIENT] Both clients: script.js:327 + :354 → game_start handler
    ├─ myHand = data.hand (full 26 cards — ONLY your own cards)
    ├─ isMyTurn = data.isMyTurn
    ├─ currentRoomId = data.roomId
    ├─ Show player names + DiceBear avatars
    ├─ Update card counts (26 each)
    ├─ Reset all game state flags
    └─ Show game board, hide lobby/waiting/modals
```

### Journey 3: Playing a Card

```
Player clicks their deck
│
├─ [CLIENT] script.js:433 → myDeck.click
│   ├─ Guards: isGameOver? isMatchActive? !isMyTurn? hand empty?
│   ├─ OPTIMISTIC UI:
│   │   ├─ playedCard = myHand.pop()    ← Remove from local array
│   │   ├─ Render card image in center pile
│   │   ├─ playSound(audioFlip)
│   │   ├─ isMyTurn = false
│   │   └─ expectedServerConfirmations++
│   └─ socket.emit('game_action', [1, "X7K2F9"])
│
├─ [SERVER] server.js:52 → game_action handler
│   └─ actionCode === 1 → playCard(socket, io, "X7K2F9")
│
├─ [GAME ENGINE] gamelogic.js:116 → playCard()
│   ├─ Find player by socket.id
│   ├─ playedCard = player.hand.pop()
│   ├─ room.centerPile.push(playedCard)
│   ├─ nextPlayerIndex = (playerIndex + 1) % 2
│   ├─ Check match: centerPile[-1].character === centerPile[-2].character?
│   ├─ io.to("X7K2F9").emit('card_played', {
│   │       card: playedCard,
│   │       turn: nextPlayerId,
│   │       isMatch: true/false,
│   │       players: [{ id, count }, { id, count }]
│   │   })
│   └─ If hand empty && !match → finishGame()
│
└─ [CLIENT] script.js:487 → card_played handler
    ├─ If my own play: skip re-render (already optimistic)
    ├─ If opponent's play: render card, play flip sound
    ├─ Update card counts
    ├─ If match: show SNAP button, shake it
    └─ If no match: update turn text
```

### Journey 4: SNAP Attempt

```
Player clicks SNAP button (or center pile)
│
├─ [CLIENT] socket.emit('game_action', [2, "X7K2F9"])
│
├─ [SERVER] gamelogic.js:171 → handleSnap()
│   ├─ Check: top 2 cards have same character?
│   │
│   ├─ IF MATCH (Valid Snap):
│   │   ├─ player.hand.unshift(...centerPile)  ← Winner takes all
│   │   ├─ room.centerPile = []
│   │   ├─ emit 'snap_success' { winnerId, winnerName }
│   │   ├─ emit 'game_update' { turn, players[] }
│   │   └─ If opponent.hand === 0 → finishGame()
│   │
│   └─ IF NO MATCH (False Snap / Penalty):
│       ├─ penaltyCard = player.hand.pop()
│       ├─ opponent.hand.unshift(penaltyCard)  ← Transfer 1 card
│       ├─ emit 'game_update' { turn, players[] }
│       ├─ emit 'penalty_flash' to snapper: "FALSE SNAP! -1 Card"
│       ├─ emit 'penalty_flash' to opponent: "OPPONENT MISSED! +1 Card"
│       └─ If player.hand === 0 → finishGame()
│
└─ [CLIENT] Various handlers update UI accordingly
```

---

## 6. Server-Side Deep Dive

### 6.1 `server.js` — The Entry Point (91 lines)

**Purpose:** Boots up Express + Socket.io, serves static files, and routes all socket events to `gamelogic.js` functions.

**Key responsibilities:**
1. Create Express app and HTTP server.
2. Apply Gzip compression middleware (`compression()`).
3. Serve `public/` directory as static files.
4. Expose `/ping` health-check endpoint (for keep-alive services).
5. On each WebSocket connection, register event listeners:
   - `create_room` → `gamelogic.createRoom()`
   - `join_room` → `gamelogic.joinRoom()`
   - `game_action` → Routes to `playCard()` or `handleSnap()` based on action code
   - `request_restart` → `gamelogic.restartGame()`
   - `leave_room` → `gamelogic.leaveRoom()`
   - `disconnect` → `gamelogic.removePlayer()`

**The Action Packing System:**
Instead of separate events for "play card" and "snap", both are sent as `game_action` with an array `[ActionCode, RoomId]`. This is a **bandwidth optimization** — fewer event names = less overhead.

```javascript
const Actions = { PLAY: 1, SNAP: 2 };
// Client sends: socket.emit('game_action', [1, "X7K2F9"])
// Server decodes: actionCode === 1 → playCard()
```

### 6.2 `gamelogic.js` — The Game Engine (350 lines)

**The Heart of the Application.** This module manages all game state and logic.

**The "Hotel Registry" Pattern:**
```javascript
const rooms = {};
// Each room: {
//     id: "X7K2F9",
//     players: [
//         { id: "socket-id-1", name: "Pratik", hand: [...cards] },
//         { id: "socket-id-2", name: "Friend", hand: [...cards] }
//     ],
//     deck: null,          // Only used during setup
//     centerPile: [...],   // Cards played to the center
//     gameStatus: 'WAITING' | 'ACTIVE',
//     rematchVotes: Set()  // Tracks rematch consensus
// }
```

**Exported functions (7 total):**

| Function | Trigger | Purpose |
|---|---|---|
| `createRoom(socket, io, name)` | `create_room` event | Generate room ID, create room object, add creator |
| `joinRoom(socket, io, roomId, name)` | `join_room` event | Validate room, add joiner, start game if 2 players |
| `playCard(socket, io, roomId)` | `game_action [1]` | Move card from hand to pile, check match, broadcast |
| `handleSnap(socket, io, roomId)` | `game_action [2]` | Validate snap, award pile or apply penalty |
| `removePlayer(io, socketId)` | `disconnect` event | Find player's room, notify opponent, delete room |
| `restartGame(io, roomId, socketId)` | `request_restart` | Register vote, start game on consensus |
| `leaveRoom(io, socket, roomId)` | `leave_room` event | Remove player, clean up room |

**Internal functions (2):**

| Function | Purpose |
|---|---|
| `generateRoomId()` | Returns random 6-char uppercase alphanumeric string |
| `startGame(io, roomId)` | Creates deck, shuffles, deals, sends `game_start` to both players |
| `finishGame(io, roomId, winnerId, loserId)` | Emits `game_over`, keeps room alive for rematch |

### 6.3 `Deck.js` — The Card Factory (46 lines)

**The 52-Card System:**
- **13 Characters:** Doraemon, Jiyaan, Nobita, Sizuka, Sunio, Ninja Hattori, Oggy, Jack, Tom, Jerry, Himawari, Cinderella, Shinchan
- **4 Art Styles:** Ghibli, Sketch, Pixar, Standard
- **Total:** 13 × 4 = 52 unique cards

Each card object:
```javascript
{ character: "Doraemon", style: "Ghibli", id: "Ghibli_Doraemon" }
```

**Matching rule:** Two cards match if they have the **same character**, regardless of style. So "Ghibli_Doraemon" matches "Pixar_Doraemon".

**Methods:**
- `constructor()` → Calls `initDeck()` to build the 52 cards
- `initDeck()` → Nested loop: for each style, for each character, push card object
- `shuffle()` → Fisher-Yates algorithm (in-place, O(n))
- `deal()` → Splits array at midpoint: first 26 → Player 1, last 26 → Player 2

---

## 7. Client-Side Deep Dive

### 7.1 State Management

The client manages game state through plain JavaScript variables:

```javascript
let myHand = [];           // Array of card objects the player holds
let isMyTurn = false;      // Whether it's this player's turn
let isMatchActive = false; // Whether a snap-able match exists
let isGameOver = false;    // Whether the game has ended
let currentRoomId = null;  // The room this player is in
let currentSkin = 'default'; // Selected card back skin
let isMuted = false;       // Audio toggle
let expectedServerConfirmations = 0; // Optimistic UI counter
```

### 7.2 The SPA (Single Page Application) Pattern

All screens exist simultaneously in `index.html`. Navigation is achieved by toggling the `hidden` CSS class:

```
Landing → Lobby → Waiting → Game Board
  ↕          ↕        ↕         ↕
 (visible by default)  (hidden)  (hidden)  (hidden)
```

Each screen is a `<div>` with an ID:
- `#landing-screen` — always visible initially
- `#lobby-screen` — shown after "Play Game" click
- `#waiting-screen` — shown after creating a room
- `#game-screen` — shown when the game starts

Modals overlay everything:
- `#candy-modal-backdrop` — nav modals (rules, about, feedback, settings)
- `#game-over-modal` — victory/defeat modal
- `#menu-modal` — in-game menu
- `#alert-modal` — custom error alerts
- `#flash-message` — brief flash notifications

### 7.3 Optimistic UI Pattern

The client uses **optimistic rendering** for playing cards. When you click your deck:

1. **Before the server confirms**, the client:
   - Removes the card from the local `myHand[]`.
   - Renders the card image in the center pile.
   - Plays the flip sound.
   - Updates the card count display.
   - Increments `expectedServerConfirmations`.

2. **When the server confirms** (`card_played` event):
   - If `expectedServerConfirmations > 0` AND it's the opponent's turn next → this is our own play confirmation. Decrement counter, skip re-render.
   - Otherwise → it's the opponent's play. Render their card and play the sound.

This eliminates the perceived latency of waiting for the server round-trip.

### 7.4 Audio System

Three sound effects managed as `Audio` objects:

| Sound | File | Trigger |
|---|---|---|
| `audioFlip` | `/assets/audio/flip.wav` | Card played (by either player) |
| `audioSnap` | `/assets/audio/snap.mp3` | SNAP button clicked |
| `audioWin` | `/assets/audio/win.mp3` | Game won (victory screen) |

The `playSound(sound)` helper:
- Checks `isMuted` flag.
- Resets `currentTime = 0` to allow rapid-fire playback.
- Uses `.play().catch()` to handle browser autoplay restrictions.

### 7.5 Card Image Resolution

The `getCardImage(style, character)` function converts server card data to asset paths:

```javascript
// Input:  style = "Pixar",  character = "Ninja Hattori"
// Output: "/assets/pixar/ninja_hattori.webp"

function getCardImage(style, character) {
    const folder = style.toLowerCase();                    // "pixar"
    const file = character.toLowerCase().replace(/ /g, '_'); // "ninja_hattori"
    return `/assets/${folder}/${file}.webp`;
}
```

### 7.6 UI Feedback System

| Feedback Type | Function | Visual |
|---|---|---|
| **Flash Message** | `showFlashMessage(text)` | Full-screen text pop that scales up then fades (1.5s) |
| **Custom Alert** | `showCustomAlert(title, msg, callback)` | Modal with OK button, supports callback on dismiss |
| **Shake Animation** | `triggerShake(element)` | CSS `shake` animation + red border flash (0.4s) |
| **Turn Text** | `updateTurnUI(isMine, isMatch)` | Dynamic status messages with color-coded styles |
| **Confetti** | `fireConfetti()` | Dual confetti blasts using canvas-confetti library |
| **Penalty Flash** | `penalty_flash` handler | Red text flash + full body shake |

---

## 8. The Card System & Asset Pipeline

### 8.1 The 52-Card Matrix

| Character | Standard | Ghibli | Pixar | Sketch |
|---|---|---|---|---|
| Doraemon | ✅ | ✅ | ✅ | ✅ |
| Jiyaan | ✅ | ✅ | ✅ | ✅ |
| Nobita | ✅ | ✅ | ✅ | ✅ |
| Sizuka | ✅ | ✅ | ✅ | ✅ |
| Sunio | ✅ | ✅ | ✅ | ✅ |
| Ninja Hattori | ✅ | ✅ | ✅ | ✅ |
| Oggy | ✅ | ✅ | ✅ | ✅ |
| Jack | ✅ | ✅ | ✅ | ✅ |
| Tom | ✅ | ✅ | ✅ | ✅ |
| Jerry | ✅ | ✅ | ✅ | ✅ |
| Himawari | ✅ | ✅ | ✅ | ✅ |
| Cinderella | ✅ | ✅ | ✅ | ✅ |
| Shinchan | ✅ | ✅ | ✅ | ✅ |

**Total: 52 cards** (13 characters × 4 styles)

### 8.2 The Compression Pipeline

**Problem:** Raw card art files (PNG) are too large for web delivery.

**Solution:** Two utility scripts create an optimization pipeline:

#### `compress.js` (Image Compression)
```
raw_cards/               →        public/assets/
├── ghibli/                       ├── ghibli/
│   ├── doraemon.png    ─SHARP─→  │   ├── doraemon.webp (resized to 400px width, 80% quality)
│   ├── nobita.png      ─SHARP─→  │   ├── nobita.webp
│   ...                           │   ...
├── backs/                        ├── backs/
│   ├── default.png     ─SHARP─→  │   ├── default.webp
│   ...                           │   ...
```

Uses the **Sharp** library to:
1. Recursively walk all directories in `raw_cards/`.
2. For each PNG/JPG file:
   - Resize to 400px width (maintains aspect ratio).
   - Convert to WebP format at 80% quality.
   - Save to the mirror path in `public/assets/`.

#### `cleanup.js` (Legacy File Removal)
Recursively deletes any `.png`, `.jpg`, `.jpeg` files remaining in `public/assets/` after compression. Ensures only optimized WebP files are served.

### 8.3 Card Back Skins

Three interchangeable card back designs:
- `default.webp` — The original card back design
- `blue.webp` — A blue-themed alternative
- `modern.webp` — A modern/minimalist design

Applied via `updateCardBacks()`:
```javascript
function updateCardBacks() {
    const faceDownCards = document.querySelectorAll('.card.back');
    faceDownCards.forEach(card => {
        card.style.backgroundImage = `url('/assets/backs/${currentSkin}.webp')`;
    });
}
```

### 8.4 Asset Preloading

On page load, the client silently preloads all 13 standard character images:

```javascript
const preloadPaths = DEFAULT_CHARACTERS.map(char => `/assets/standard/${char}.webp`);

function preloadGameAssets(assetPaths) {
    assetPaths.forEach(path => {
        const img = new Image(); // Creates off-screen image
        img.src = path;          // Triggers browser download + cache
    });
}
```

This ensures the first card flip appears instantly without a loading delay.

---

## 9. Real-Time Communication: Socket Events Map

### Client → Server Events

| Event Name | Payload | Handler | Purpose |
|---|---|---|---|
| `create_room` | `{ name }` | `createRoom()` | Create a new game room |
| `join_room` | `{ roomId, name }` | `joinRoom()` | Join an existing room |
| `game_action` | `[1, roomId]` | `playCard()` | Play a card (action code 1) |
| `game_action` | `[2, roomId]` | `handleSnap()` | Attempt a snap (action code 2) |
| `request_restart` | `{ roomId }` | `restartGame()` | Vote for rematch/restart |
| `leave_room` | `{ roomId }` | `leaveRoom()` | Leave the current room |

### Server → Client Events

| Event Name | Payload | Recipient | Purpose |
|---|---|---|---|
| `room_created` | `{ roomId }` | Creator only | Confirm room creation, show waiting screen |
| `error` | `{ message }` | Requester only | "Room not found!" / "Room is full!" |
| `game_start` | `{ hand, opponentCardCount, isMyTurn, roomId, myName, oppName }` | Each player (personalized) | Initialize game board |
| `card_played` | `{ card, turn, isMatch, players[] }` | Entire room | Card was played, update board |
| `snap_success` | `{ winnerId, winnerName }` | Entire room | Valid snap occurred |
| `game_update` | `{ turn, players[] }` | Entire room | Update card counts & turn |
| `penalty_flash` | `string message` | Individual | False snap penalty notification |
| `game_over` | `{ winnerId, loserId }` | Entire room | Game ended, show results |
| `opponent_left` | (none) | Remaining player | Opponent disconnected |
| `opponent_wants_rematch` | (none) | Other player | One player voted for rematch |
| `rematch_success` | (none) | Entire room | Both agreed, game restarting |
| `init_error` | `string message` | Requester | Room expired (server restarted) |

---

## 10. UI/UX System & Animations

### 10.1 Design Language: "Candy UI"

The entire interface follows a **Candy Crush-inspired design system:**

| Element | Style |
|---|---|
| Color palette | Hot Pink (#FF6B6B), Teal (#4ECDC4), Yellow (#FFE66D), Deep Purple-Blue (#2b2e4a) |
| Typography | Fredoka (headings, buttons) + Nunito (body text) |
| Buttons | 3D effect with `box-shadow` that "squishes" on `:active` |
| Cards | Thick white border (sticker look), chunky shadow |
| Borders | Black cartoon outlines (`3px solid #000`) |
| Background | Animated floating shapes (`floatUp` keyframes) |

### 10.2 CSS Custom Properties

```css
:root {
    --bg-color: #2b2e4a;        /* Deep Purple-Blue background */
    --primary: #FF6B6B;          /* Hot Pink/Red (danger, SNAP) */
    --primary-dark: #ee5253;     /* Darker Red (shadows) */
    --secondary: #4ECDC4;        /* Teal/Cyan (success, buttons) */
    --secondary-dark: #22a6b3;   /* Darker Teal (shadows) */
    --accent: #FFE66D;           /* Bright Yellow (titles, names) */
    --text-color: #fff;          /* White text */
    --candy-border: 3px solid #000;
    --candy-shadow: 6px 6px 0px #000;
    --radius-lg: 20px;
    --radius-md: 12px;
}
```

### 10.3 Key Animations

| Animation | CSS Name | Duration | Used On |
|---|---|---|---|
| Floating background shapes | `floatUp` | 25s (infinite) | `.circles li` elements |
| SNAP button pop | `popCover` | 0.2s | `.snap-button` on appear |
| Flash message pop | `flashPop` | 1.5s | `#flash-message` content |
| Invalid move shake | `shake` | 0.4s | Deck, SNAP button, body |
| Turn text pulse | `gentlePulse` | 1s (infinite) | `.status-mine` |
| Rematch alert pulse | `pulse-orange` | 1.5s (infinite) | `.pulse` class |
| Urgent notification | `pulse-red` | 1.5s (infinite) | `.pulse-red` class |

### 10.4 Responsive Design

Two media query breakpoints:

| Breakpoint | Changes |
|---|---|
| `max-width: 768px` | Hamburger nav menu, slide-out sidebar, smaller titles, mobile nav overlay |
| `max-width: 600px` | Smaller cards (85×120), smaller snap button text, adjusted menu toggle for notch |

Mobile-specific features:
- `env(safe-area-inset-top)` for iPhone notch clearance
- `-webkit-tap-highlight-color: transparent` to prevent blue tap highlights
- `user-select: none` to prevent text selection during gameplay
- `maximum-scale=1.0, user-scalable=no` to prevent pinch zoom

---

## 11. Deployment Architecture

```
┌─────────────┐         ┌───────────────┐         ┌──────────────────┐
│   Vercel     │  301    │   Render.com   │  HTTP   │   User's Browser │
│  (Domain)    │ ──────→ │  (Node.js)     │ ←─────→ │   (Client)       │
│              │redirect │                │  WS     │                  │
│ vercel.json  │         │  server.js     │         │  index.html      │
│ /:path* →    │         │  + public/     │         │  script.js       │
│ render URL   │         │  + socket.io   │         │  style.css       │
└─────────────┘         └───────────────┘         └──────────────────┘
```

**Vercel** serves as a domain proxy — all paths redirect permanently (301) to the Render deployment.

**Render** runs the Node.js server:
- Serves static files from `public/`.
- Handles WebSocket connections via Socket.io.
- Has a `/ping` endpoint for keep-alive health checks (prevents Render free-tier sleep).

**Port:** `process.env.PORT || 3000`

---

## 12. Complete Flow Diagrams

### Full Game Lifecycle

```
[User Opens Website]
        │
        ▼
[Landing Screen] ──Click "Play Game"──→ [Lobby Screen]
        │                                    │
   (socket.io                        ┌───────┴───────┐
    connects)                        │               │
                             "Create Game"     "Join Game"
                                    │               │
                                    ▼               ▼
                           [Waiting Screen]   [Server validates]
                           (share code)            │
                                    │               │
                                    └───────┬───────┘
                                            │
                                   (2 players joined)
                                            │
                                            ▼
                                    [startGame()]
                                    - Shuffle 52 cards
                                    - Deal 26 each
                                    - Emit 'game_start'
                                            │
                                            ▼
                                    [Game Board Active]
                                            │
                              ┌─────────────┼─────────────┐
                              │             │             │
                        [Play Card]   [SNAP Click]   [Menu Actions]
                              │             │             │
                              ▼             ▼             │
                        [playCard()]  [handleSnap()]      │
                              │             │             │
                         ┌────┤        ┌────┤             │
                         │    │        │    │             │
                      Match?  No    Match?  No            │
                         │    │        │    │             │
                         ▼    ▼        ▼    ▼             │
                       Show  Next   Award  Penalty       │
                       SNAP  Turn   Pile   (-1 card)     │
                       btn                                │
                              │                           │
                         Hand Empty                       │
                         && !Match?                       │
                              │                           │
                              ▼                           │
                        [finishGame()]                    │
                              │                           │
                              ▼                           │
                      [Game Over Modal]                   │
                              │                           │
                     ┌────────┼────────┐                  │
                     │                 │                  │
                  Rematch            Exit        [Restart/Leave]
                  (voting)         (reload)              │
                     │                                    │
                  Both agree?                             │
                     │                                    │
                     ▼                                    │
               [startGame()]  ←───────────────────────────┘
               (new round)
```

### Socket Event Sequence Diagram

```
   Player A (Creator)              Server                Player B (Joiner)
        │                            │                         │
        │──create_room──────────────→│                         │
        │←──room_created─────────────│                         │
        │                            │                         │
        │    (shares code)           │                         │
        │                            │                         │
        │                            │←────────join_room───────│
        │                            │                         │
        │                            │── startGame() ──        │
        │                            │                         │
        │←───game_start──────────────│──────game_start────────→│
        │  (hand, isMyTurn:true)     │   (hand, isMyTurn:false)│
        │                            │                         │
        │──game_action [PLAY]───────→│                         │
        │                            │──card_played───────────→│
        │←───card_played─────────────│  (turn: playerB)        │
        │                            │                         │
        │                            │←──game_action [PLAY]────│
        │←───card_played─────────────│──card_played───────────→│
        │   (isMatch: true!)         │  (isMatch: true!)       │
        │                            │                         │
        │──game_action [SNAP]───────→│                         │
        │                            │                         │
        │←───snap_success────────────│──snap_success───────────→│
        │←───game_update─────────────│──game_update────────────→│
        │                            │                         │
        │   ... (continues until hand empty) ...               │
        │                            │                         │
        │←───game_over───────────────│──game_over──────────────→│
        │  (winnerId: A)             │  (winnerId: A)           │
        │                            │                         │
        │──request_restart──────────→│                         │
        │                            │──opponent_wants_rematch─→│
        │                            │←──request_restart────────│
        │                            │                         │
        │←───rematch_success─────────│──rematch_success────────→│
        │←───game_start──────────────│──game_start─────────────→│
```

---

## Summary

This handbook has covered every aspect of Cartoon Snap:

- **4 screens** the user navigates through (Landing → Lobby → Waiting → Game Board)
- **3 modals** for game states (Game Over, Menu, Alerts)
- **7 server functions** managing the game engine
- **12 socket events** flowing between client and server
- **52 cards** across 13 characters × 4 art styles
- **1 design system** (Candy UI) with 7 animations

The entire application runs on ~2,400 lines of code across 4 active source files, with zero external frontend frameworks and a purely in-memory server state model.

---

*Created by Pratik — Cartoon Snap v2*
