// public/script.js

const socket = io();

// ========================================================
// ASSET PRELOADER (Silently caches .webp assets)
// ========================================================
const DEFAULT_CHARACTERS = [
    "cinderella", "doraemon", "himawari", "jack", "jerry",
    "jiyaan", "ninja_hattori", "nobita", "oggy", "shinchan",
    "sizuka", "sunio", "tom"
];

// Generate the paths for the default deck (Standard skin)
const preloadPaths = DEFAULT_CHARACTERS.map(char => `/assets/standard/${char}.webp`);

function preloadGameAssets(assetPaths) {
    if (!assetPaths || assetPaths.length === 0) return;

    let loadedCount = 0;
    const totalAssets = assetPaths.length;

    assetPaths.forEach(path => {
        const img = new Image();

        // Advance count regardless of success or failure so we don't hang
        const onLoadOrError = () => {
            loadedCount++;
            if (loadedCount === totalAssets) {
                console.log("✅ All game assets preloaded and cached.");
            }
        };

        img.onload = onLoadOrError;
        img.onerror = onLoadOrError;

        img.src = path;
    });
}

// Invoke silently in the background
preloadGameAssets(preloadPaths);

// ========================================================
// PHASE 2: EVENT DATA PACKING ENUMS
// ========================================================
const Actions = { PLAY: 1, SNAP: 2 };

// --- DOM Elements ---
// Screens
const landingScreen = document.getElementById('landing-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const mainNav = document.getElementById('main-nav');

// Landing Controls
const playGameBtn = document.getElementById('play-game-btn');

// Lobby Controls
const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const roomInput = document.getElementById('room-code-input');
const lobbyStatus = document.getElementById('lobby-status');

// Game Board Elements
const myCountDisplay = document.getElementById('my-count');
const oppCountDisplay = document.getElementById('opp-count');
const statusMsg = document.getElementById('game-status');
const myDeck = document.getElementById('my-deck');
const centerPile = document.getElementById('center-pile');
const snapBtn = document.getElementById('snap-btn');


// --- NEW WAITING ROOM DOM ELEMENTS ---
const usernameInput = document.getElementById('username-input');
const waitingScreen = document.getElementById('waiting-screen');
const displayRoomCode = document.getElementById('display-room-code');
const copyBtn = document.getElementById('copy-btn');
const whatsappBtn = document.getElementById('whatsapp-btn');
const myNameDisplay = document.getElementById('my-name-display');
const oppNameDisplay = document.getElementById('opp-name-display');

// --- MENU DOM ELEMENTS ---
const menuBtn = document.getElementById('menu-btn');
const menuModal = document.getElementById('menu-modal');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const leaveBtn = document.getElementById('leave-btn');

// --- GAME OVER MODAL ELEMENTS ---
const gameOverModal = document.getElementById('game-over-modal');
const winnerTitle = document.getElementById('winner-title');
const winnerMessage = document.getElementById('winner-message');
const rematchBtn = document.getElementById('rematch-btn');
const exitBtn = document.getElementById('exit-btn');


// --- Game Variables ---
let myHand = [];
let isMyTurn = false;
let isMatchActive = false;
let isGameOver = false;
let currentRoomId = null; // <--- V2 CRITICAL: We must remember our room!
let currentSkin = 'default'; // Default skin
let expectedServerConfirmations = 0; // Phase 3: Optimistic UI tracking

// --- AUDIO SYSTEM ---
const audioFlip = new Audio('/assets/audio/flip.wav');
const audioSnap = new Audio('/assets/audio/snap.mp3');
const audioWin = new Audio('/assets/audio/win.mp3');

// Audio Settings
let isMuted = false;

// Helper: Play Sound safely
function playSound(sound) {
    if (!isMuted) {
        sound.currentTime = 0; // Reset sound to start (allows rapid fire)
        sound.play().catch(e => console.log("Audio play failed (browser blocked):", e));
    }
}

// --- HELPER: Trigger CSS Animation ---
function triggerShake(element) {
    element.classList.remove('shake-anim'); // Reset
    void element.offsetWidth; // Force Reflow (Magic trick to restart animation)
    element.classList.add('shake-anim'); // Apply

    // Play a dull "thud" sound if you have one, or just silent visual feedback
}

// --- HELPER: ENGAGING UI UPDATES ---
const myPhrases = ["YOUR TURN!", "GO GO GO!", "YOUR MOVE!", "DROP IT!", "PLAY NOW!"];
const oppPhrases = ["Opponent Thinking...", "Waiting...", "Opponent's Move", "Hurry up..."];

function updateTurnUI(isMine, isMatch) {
    // 1. Handle MATCH State (Highest Priority)
    if (isMatch) {
        statusMsg.innerText = "🔥 SNAP! CLICK IT! 🔥";
        statusMsg.className = "status-message status-match"; // Apply CSS
        myDeck.style.border = "4px solid #FF6B6B"; // Red Border
        return;
    }

    // 2. Handle MY TURN
    if (isMine) {
        // Pick a random fun phrase
        const randomText = myPhrases[Math.floor(Math.random() * myPhrases.length)];
        statusMsg.innerText = randomText;
        statusMsg.className = "status-message status-mine"; // Apply CSS
        myDeck.style.border = "4px solid #FFE66D"; // Yellow Border
    }
    // 3. Handle OPPONENT TURN
    else {
        const randomText = oppPhrases[Math.floor(Math.random() * oppPhrases.length)];
        statusMsg.innerText = randomText;
        statusMsg.className = "status-message status-opp"; // Apply CSS
        myDeck.style.border = "2px solid rgba(255,255,255,0.2)"; // Dim Border
    }
}

// ========================================================
// A. SPA & CONNECTION LOGIC (NEW)
// ========================================================

// 1. Connection Event (Cold Start Fix)
socket.on('connect', () => {
    console.log('Connected to server!');
    if (playGameBtn) {
        playGameBtn.disabled = false;
        playGameBtn.innerText = "Play Game";
    }
});

// 2. Transition from Landing to Lobby
if (playGameBtn) {
    playGameBtn.addEventListener('click', () => {
        landingScreen.classList.add('hidden');
        if (mainNav) mainNav.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');
    });
}

// 3. Modal Logic
const modalBackdrop = document.getElementById('candy-modal-backdrop');
const modalCloseBtn = document.getElementById('candy-modal-close');
const navBtns = document.querySelectorAll('.nav-btn');
const modalModules = document.querySelectorAll('.modal-module');
const feedbackForm = document.getElementById('feedback-form');
const feedbackText = document.getElementById('feedback-text');
const hamburgerMenu = document.getElementById('hamburger-menu');
const closeMenuBtn = document.getElementById('close-menu');
const navLinksContainer = document.getElementById('nav-links');
const menuOverlay = document.getElementById('menu-overlay');

if (hamburgerMenu && navLinksContainer) {
    hamburgerMenu.addEventListener('click', () => {
        navLinksContainer.classList.add('active');
        if (menuOverlay) menuOverlay.classList.add('active');
    });
}

function closeMobileMenu() {
    if (navLinksContainer) navLinksContainer.classList.remove('active');
    if (menuOverlay) menuOverlay.classList.remove('active');
}

if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', closeMobileMenu);
}

if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMobileMenu);
}

if (modalBackdrop) {
    // Open Modals
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetModal = btn.getAttribute('data-modal');

            // Hide hamburger menu and overlay if open
            if (typeof closeMobileMenu === 'function') {
                closeMobileMenu();
            }

            // Hide all modules
            modalModules.forEach(mod => mod.classList.add('hidden'));

            // Show targeted module
            const targetElement = document.getElementById(`modal-${targetModal}`);
            if (targetElement) {
                targetElement.classList.remove('hidden');
                modalBackdrop.classList.remove('hidden');
            }
        });
    });

    // Close Modals
    modalCloseBtn.addEventListener('click', () => {
        modalBackdrop.classList.add('hidden');
    });

    // Close on clicking backdrop
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            modalBackdrop.classList.add('hidden');
        }
    });
}

// 4. Feedback Form Logic
if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        feedbackText.value = '';
        modalBackdrop.classList.add('hidden');
        showCustomAlert("Success! 🎉", "Your feedback has been saved. Thank you!");
    });
}

// ========================================================
// B. LOBBY LOGIC (NEW)
// ========================================================

// 1. Create Game
createBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    // REPLACEMENT 1: Custom Modal
    if (!name) {
        showCustomAlert("Missing Name", "Please enter your name to create a room!");
        return;
    }
    console.log("Creating room as " + name);
    // V2 Update: Send name along with request
    socket.emit('create_room', { name: name });
});

// 2. Join Game
joinBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    const code = roomInput.value.trim().toUpperCase();

    // REPLACEMENT 2: Custom Modal
    if (!name) {
        showCustomAlert("Missing Name", "Please enter your name to join!");
        return;
    }
    if (!code) {
        showCustomAlert("Missing Code", "Please enter a 6-letter Room Code!");
        return;
    }
    console.log(`Joining room ${code} as ${name}`);
    // V2 Update: Send name along with request
    socket.emit('join_room', { roomId: code, name: name });
});

// 3. Room Created -> GO TO WAITING SCREEN
socket.on('room_created', (data) => {
    currentRoomId = data.roomId;

    // Hide Lobby, Show Waiting Room
    lobbyScreen.classList.add('hidden');
    waitingScreen.classList.remove('hidden');

    // Display the code
    displayRoomCode.innerText = data.roomId;

    // Set Up WhatsApp Share Link
    // This opens WhatsApp with a pre-filled message
    const message = `Hey! Join my Cartoon Snap game. \nCode: *${data.roomId}* \nLink: ${window.location.href}`;
    whatsappBtn.onclick = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };
});

// 4. COPY BUTTON LOGIC
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoomId).then(() => {
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "✅ Copied!";
        setTimeout(() => copyBtn.innerText = originalText, 2000);
    });
});

// 5. Game Start -> GO TO GAME BOARD
socket.on('game_start', (data) => {
    // Hide Waiting Screen (if open)
    waitingScreen.classList.add('hidden');
    lobbyScreen.classList.add('hidden'); // Ensure lobby is gone
    gameScreen.classList.remove('hidden');

    // Setup Game Data
    myHand = data.hand;
    isMyTurn = data.isMyTurn;
    currentRoomId = data.roomId; // Ensure ID is set for the joiner

    // UPDATE NAMES ON UI
    myNameDisplay.innerText = data.myName + " (YOU)";
    oppNameDisplay.innerText = data.oppName;

    myCountDisplay.innerText = myHand.length;
    oppCountDisplay.innerText = data.opponentCardCount;

    // REPLACE THE OLD IF/ELSE BLOCK WITH THIS:
    updateTurnUI(isMyTurn, false);
});

// ========================================================
// B. GAMEPLAY LOGIC (UPDATED FOR V2)
// ========================================================

// 1. The Game Starts
socket.on('game_start', (data) => {
    console.log("Game Started!", data);

    // --- 🛑 FIX: RESET GAME STATE FLAGS ---
    isGameOver = false;      // Unlock the deck!
    isMatchActive = false;   // Reset match status
    snapBtn.classList.add('hidden'); // Hide button if it was stuck open
    // Reset Center Pile UI (Clear old cards)
    centerPile.innerHTML = `<div class="placeholder-text">Center Pile</div>`;
    // -------------------------------------

    // ... (previous reset code) ...

    // --- 🛑 NEW: RESET UI ARTIFACTS (Fixes the stuck menu button) ---

    // 1. Reset the Menu "Restart" Button (Blue & Default Text)
    const menuRestartBtn = document.getElementById('restart-btn');
    menuRestartBtn.innerText = "🔄 Restart Game";
    menuRestartBtn.style.backgroundColor = ""; // Removes the orange warning color
    menuRestartBtn.classList.remove('pulse');

    // 2. Stop the Menu Icon from pulsing red (if it was)
    const menuIcon = document.getElementById('menu-btn');
    menuIcon.classList.remove('pulse-red');

    // 3. Reset the Game Over Modal Button (Just in case)
    const goRematchBtn = document.getElementById('rematch-btn');
    if (goRematchBtn) {
        goRematchBtn.innerText = "🔄 Rematch";
        goRematchBtn.style.backgroundColor = "";
        goRematchBtn.disabled = false;
        goRematchBtn.style.opacity = "1";
    }

    // Force hide modals just in case
    document.getElementById('game-over-modal').classList.add('hidden');
    document.getElementById('menu-modal').classList.add('hidden');

    // Force hide modals just in case 'rematch_success' missed it
    document.getElementById('game-over-modal').classList.add('hidden');
    document.getElementById('menu-modal').classList.add('hidden');

    // 1. Identify Opponent
    const opponent = data.players.find(p => p.id !== socket.id);
    const me = data.players.find(p => p.id === socket.id);

    // 2. Set Names
    document.getElementById('opp-name-display').innerText = opponent.name;
    document.getElementById('my-name-display').innerText = me.name;

    // 3. GENERATE AVATARS (Bottts Style)
    const myAvatar = document.getElementById('my-avatar');
    const oppAvatar = document.getElementById('opp-avatar');

    // API URL: generates a unique robot based on the name string
    myAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${me.name}`;
    oppAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${opponent.name}`;

    // Show them
    myAvatar.classList.remove('hidden');
    oppAvatar.classList.remove('hidden');

    myHand = data.hand;
    isMyTurn = data.isMyTurn;

    myCountDisplay.innerText = myHand.length;
    oppCountDisplay.innerText = data.opponentCardCount;

    if (isMyTurn) {
        statusMsg.innerText = "Game Started! YOUR TURN";
        myDeck.style.border = "4px solid yellow";
    } else {
        statusMsg.innerText = "Game Started! Opponent's Turn";
        myDeck.style.border = "2px solid white";
    }
    updateCardBacks();
});

// 2. User Plays a Card
myDeck.addEventListener('click', () => {
    if (isGameOver) return;
    // REPLACEMENT 3: If it's a match, don't alert. 
    // Just shake the SNAP button to tell them "CLICK ME!"
    if (isMatchActive) {
        triggerShake(snapBtn);
        showFlashMessage("CLICK SNAP! 👇");
        return;
    }

    // REPLACEMENT 4: Shake the deck if it's not their turn
    if (!isMyTurn) {
        triggerShake(myDeck);
        // Optional: Updates status text briefly
        const oldText = statusMsg.innerText;
        statusMsg.innerText = "❌ WAIT YOUR TURN!";
        statusMsg.style.color = "#FF6B6B";
        setTimeout(() => {
            statusMsg.innerText = oldText;
            statusMsg.style.color = "white";
        }, 1000);
        return;
    }

    if (myHand.length === 0) {
        // No alert needed here, the Game Over event handles this
        return;
    }

    // --- PHASE 3: OPTIMISTIC UI (PLAY CARD) ---
    const playedCard = myHand.pop();
    myCountDisplay.innerText = myHand.length;

    // Render local card immediately
    const imagePath = getCardImage(playedCard.style, playedCard.character);
    centerPile.innerHTML = `
        <div class="card face-up">
            <img src="${imagePath}" alt="${playedCard.character}" class="card-img">
        </div>
    `;
    playSound(audioFlip);

    // Locally lock turn until server says otherwise
    isMyTurn = false;
    updateTurnUI(false, false);

    expectedServerConfirmations++;

    // --- NOTIFY SERVER (PHASE 2 PACKED EVENT) ---
    socket.emit('game_action', [Actions.PLAY, currentRoomId]);
});

// 3. Server Updates Board
// 3. Server Updates Board (Card Played)
socket.on('card_played', (data) => {
    // --- PHASE 3: RECONCILIATION ---
    // If we just optimistically played a card and it's our turn to yield,
    // we don't need to replay the sound or re-render the image.
    if (expectedServerConfirmations > 0 && data.turn !== socket.id) {
        expectedServerConfirmations--;
    } else {
        playSound(audioFlip);

        // A. Show the Card
        const imagePath = getCardImage(data.card.style, data.card.character);
        centerPile.innerHTML = `
            <div class="card face-up">
                <img src="${imagePath}" alt="${data.card.character}" class="card-img">
            </div>
        `;
    }

    // B. Update Counts
    data.players.forEach(player => {
        if (player.id === socket.id) {
            myCountDisplay.innerText = player.count;
        } else {
            oppCountDisplay.innerText = player.count;
        }
    });

    // C. Handle Turn & Match Logic
    // 1. First, determine whose turn it is
    if (data.turn === socket.id) {
        isMyTurn = true;
    } else {
        isMyTurn = false;
    }

    // 2. NOW, check for match and update UI
    if (data.isMatch) {
        // --- IT IS A MATCH! ---
        snapBtn.classList.remove('hidden'); // Show Button
        isMatchActive = true;
        updateTurnUI(null, true); // Force "SNAP!" text

        // Trigger shake immediately to grab attention
        triggerShake(snapBtn);

    } else {
        // --- NORMAL PLAY (No Match) ---
        snapBtn.classList.add('hidden'); // Hide Button
        isMatchActive = false;

        // CRITICAL FIX: Reset the text to "Your Turn" or "Waiting"
        updateTurnUI(isMyTurn, false);
    }
});

// 4. Handle SNAP Button
snapBtn.addEventListener('click', () => {
    console.log("🔴 SNAP CLICKED!");
    // --- PHASE 3: OPTIMISTIC UI (SNAP) ---
    playSound(audioSnap);
    snapBtn.classList.add('hidden');

    // --- NOTIFY SERVER (PHASE 2 PACKED EVENT) ---
    socket.emit('game_action', [Actions.SNAP, currentRoomId]);
});

// NEW: Clicking the Center Pile also attempts a SNAP
// This allows for "Spam Penalties" if they click it when there is no match.
centerPile.addEventListener('click', () => {
    // 1. Safety Check: Game must be running
    if (isGameOver || !currentRoomId) return;

    // 2. Visual Feedback: Shake the pile slightly to show it registered
    triggerShake(centerPile);

    // 3. Send the Attempt (Server handles the penalty logic)
    console.log("🔴 PILE CLICKED (Snap Attempt)!");
    // --- PHASE 3: OPTIMISTIC UI (SNAP) ---
    playSound(audioSnap);
    snapBtn.classList.add('hidden');

    socket.emit('game_action', [Actions.SNAP, currentRoomId]);
});

// 5. Handle Snap Success
socket.on('snap_success', (data) => {
    // Note: audioSnap might have been played optimistically already, but playing it again on confirm is often fine.
    fireConfetti();
    // ✨ NEW FLASH MESSAGE
    showFlashMessage(`${data.winnerName} WINS!`);
    snapBtn.classList.add('hidden');
    centerPile.innerHTML = `<div class="placeholder-text">Center Pile</div>`;
    isMatchActive = false;
});

// 6. Game Updates (Counts)
// 6. Game Updates (Counts & Turns)
socket.on('game_update', (data) => {
    // 1. Update Turn Logic (Concise & Clean)
    isMyTurn = (socket.id === data.turn);

    // 2. Update UI (New Engaging Text/Colors)
    updateTurnUI(isMyTurn, false);

    // 3. Update Card Counts
    data.players.forEach(player => {
        if (player.id === socket.id) {
            myCountDisplay.innerText = player.count;
        } else {
            oppCountDisplay.innerText = player.count;
        }
    });
});
// 7 : game over

socket.on('game_over', (data) => {
    console.log("💀 GAME OVER EVENT RECEIVED"); // Check console for this
    isGameOver = true;

    // 1. Determine Winner
    const amIWinner = (socket.id === data.winnerId);

    // 2. Set Text
    if (amIWinner) {
        playSound(audioWin);
        fireConfetti();
        winnerTitle.innerText = "🏆 VICTORY!";
        winnerTitle.style.color = "#FFE66D";
        winnerMessage.innerText = "You are the Snap Champion!";
    } else {
        winnerTitle.innerText = "💀 DEFEAT";
        winnerTitle.style.color = "#FF6B6B";
        winnerMessage.innerText = "Better luck next time...";
    }

    // 3. FORCE SHOW MODAL
    setTimeout(() => {
        console.log("🕒 Showing Modal Now..."); // Check console for this
        const modal = document.getElementById('game-over-modal');

        if (modal) {
            modal.classList.remove('hidden');
            console.log("✅ Modal class list:", modal.classList.value);
        } else {
            console.error("❌ ERROR: Could not find element #game-over-modal");
        }
    }, 1000);
});




// Helper: Generate Image Path
function getCardImage(style, character) {
    // 1. Convert Style to lowercase (e.g., "Pixar" -> "pixar")
    const folder = style.toLowerCase();

    // 2. Convert Character to lowercase AND replace spaces with underscores
    // (e.g., "Ninja Hattori" -> "ninja_hattori")
    const file = character.toLowerCase().replace(/ /g, '_'); // Regex replaces ALL spaces

    return `/assets/${folder}/${file}.webp`;
}


// ========================================================
// C. MENU INTERACTIONS
// ========================================================

// 1. Toggle Menu
menuBtn.addEventListener('click', () => {
    menuModal.classList.remove('hidden');

    // NEW: Stop the urgent pulsing when they open the menu
    menuBtn.classList.remove('pulse-red');
});

// 5. Ensure Menu Resets when closed via Resume
resumeBtn.addEventListener('click', () => {
    menuModal.classList.add('hidden');
    // Reset views just in case they open it again later
    setTimeout(() => {
        menuConfirmView.classList.add('hidden');
        menuMainView.classList.remove('hidden');
    }, 300);
});

// 2. Restart Game (Reset Deck for both players)
restartBtn.addEventListener('click', () => {
    // Instant Restart (Removes the annoying confirm)
    socket.emit('request_restart', { roomId: currentRoomId });
    menuModal.classList.add('hidden');
});

// 3. Leave Room (Go back to Lobby)
// --- MENU LOGIC UPDATES ---

// 1. Get New Elements
const menuMainView = document.getElementById('menu-main-view');
const menuConfirmView = document.getElementById('menu-confirm-view');
const confirmLeaveYes = document.getElementById('confirm-leave-yes');
const confirmLeaveNo = document.getElementById('confirm-leave-no');

// 2. Handle "Leave Room" Click -> Show Confirmation
leaveBtn.addEventListener('click', () => {
    menuMainView.classList.add('hidden');   // Hide Normal Menu
    menuConfirmView.classList.remove('hidden'); // Show Confirm View
});

// 3. Handle "No, Go Back" -> Restore Normal Menu
confirmLeaveNo.addEventListener('click', () => {
    menuConfirmView.classList.add('hidden'); // Hide Confirm View
    menuMainView.classList.remove('hidden'); // Show Normal Menu
});

// 4. Handle "Yes, Leave" -> Actually Quit
confirmLeaveYes.addEventListener('click', () => {
    window.location.reload();
});

// 4. Handle Restart Signal (from Server)
socket.on('game_restarted', () => {
    showFlashMessage("RESTART!");
    // Just show a small notification
    statusMsg.innerText = "🔄 Game Restarted!";
    centerPile.innerHTML = `<div class="placeholder-text">Center Pile</div>`;
    snapBtn.classList.add('hidden');
    isMatchActive = false;
    isGameOver = false;
    menuModal.classList.add('hidden');
});

// public/script.js

// 9. Handle Opponent Leaving
socket.on('opponent_left', () => {
    // 1. Notify the user
    showCustomAlert(
        "Game Over",
        "Your opponent fled the battle! Returning to lobby...",
        () => { window.location.reload(); } // Action on click
    );

    // 2. Reset the game by reloading the page
    // This is the cleanest way to clear all game state and variables
    window.location.reload();
});

const soundBtn = document.getElementById('sound-btn');

soundBtn.addEventListener('click', () => {
    isMuted = !isMuted; // Toggle the value

    if (isMuted) {
        soundBtn.innerText = "🔇 Sound: OFF";
        soundBtn.style.backgroundColor = "#95a5a6"; // Gray out the button
    } else {
        soundBtn.innerText = "🔊 Sound: ON";
        soundBtn.style.backgroundColor = "#3498db"; // Blue again
    }
});

// --- SKIN CUSTOMIZATION ---
const skinOptions = document.querySelectorAll('.skin-option');

skinOptions.forEach(option => {
    option.addEventListener('click', () => {
        // 1. Remove 'selected' class from all
        skinOptions.forEach(opt => opt.classList.remove('selected'));

        // 2. Add 'selected' to clicked one
        option.classList.add('selected');

        // 3. Update the variable
        currentSkin = option.getAttribute('data-skin');

        // 4. Apply the new skin immediately!
        updateCardBacks();

        console.log(`Skin changed to: ${currentSkin}`);
    });
});

// Helper: Apply skin to all "back" cards
function updateCardBacks() {
    // Select all cards that are face-down (class "back")
    const faceDownCards = document.querySelectorAll('.card.back');

    faceDownCards.forEach(card => {
        // We set the background image via CSS variable or direct style
        card.style.backgroundImage = `url('/assets/backs/${currentSkin}.webp')`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
    });
}

// --- CONFETTI FX ---
function fireConfetti() {
    // Blast from the left
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6, x: 0.4 },
        colors: ['#FF6B6B', '#4ECDC4', '#FFE66D'] // Your theme colors
    });

    // Blast from the right
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6, x: 0.6 },
        colors: ['#FF6B6B', '#4ECDC4', '#FFE66D']
    });
}


// --- CUSTOM UI HELPERS ---

// 1. Show Big Flash Message (For Snaps)
function showFlashMessage(text) {
    const flashDiv = document.getElementById('flash-message');
    const flashText = document.getElementById('flash-text');

    flashText.innerText = text;
    flashDiv.classList.remove('hidden');

    // Auto-hide after animation (1.5s matches CSS animation)
    setTimeout(() => {
        flashDiv.classList.add('hidden');
    }, 1500);
}

// 2. Show Custom Alert Modal (For Errors/Leaves)
function showCustomAlert(title, message, callback) {
    const modal = document.getElementById('alert-modal');
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-msg').innerText = message;

    const btn = document.getElementById('alert-btn');

    // Clear old listeners to prevent stacking
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (callback) callback();
    });

    modal.classList.remove('hidden');
}

// Handle errors (like "Room Full" or "Game in Progress")
// Handle Server Errors (Like "Room not found")
// 3. Handle "Room Expired" Error (For server restarts)
socket.on('init_error', (msg) => {
    // Hide the game/modal so it doesn't look stuck
    document.getElementById('game-over-modal').classList.add('hidden');

    // Show alert and reload
    showCustomAlert("Connection Error", msg, () => {
        window.location.reload();
    });
});

// --- GAME OVER LOGIC ---

// 1. Rematch Button Click
rematchBtn.addEventListener('click', () => {
    playSound(audioFlip);

    // Disable button to prevent spam
    rematchBtn.disabled = true;
    rematchBtn.innerText = "⏳ Waiting for Opponent...";
    rematchBtn.style.opacity = "0.7";

    // Tell server "I want a rematch"
    socket.emit('request_restart', { roomId: currentRoomId });
});

// 2. Exit Button Click
exitBtn.addEventListener('click', () => {
    window.location.reload(); // Go back to lobby
});

// 3. Handle Game Over Event (Show the Modal)
socket.on('game_over', (data) => {
    isGameOver = true;

    // Who won?
    const amIWinner = (socket.id === data.winnerId);

    if (amIWinner) {
        playSound(audioWin);
        fireConfetti();
        winnerTitle.innerText = "🏆 VICTORY!";
        winnerTitle.style.color = "#FFE66D"; // Gold
        winnerMessage.innerText = "You are the Snap Champion!";
    } else {
        winnerTitle.innerText = "💀 DEFEAT";
        winnerTitle.style.color = "#FF6B6B"; // Red
        winnerMessage.innerText = "Better luck next time...";
    }

    // Show Modal after small delay
    setTimeout(() => {
        gameOverModal.classList.remove('hidden');
    }, 1000);
});

// 4. Handle "Opponent Wants Rematch" (Update Button)

// 1. Handle "Opponent Waiting" (Update Button Color/Text)
// 1. Handle "Opponent Waiting" (Update Button Color/Text)
// 1. Handle "Opponent Waiting"
socket.on('opponent_wants_rematch', () => {
    // A. Show the Flash Message (Brief Alert)
    showFlashMessage("Opponent wants restart!");

    // B. Update Status Text (PERSISTENT INDICATOR)
    // This stays on screen until they click or play
    statusMsg.innerText = "⚠️ Opponent wants Restart!";
    statusMsg.className = "status-message status-match"; // Reuse the 'Match' style (Red/Big)
    statusMsg.style.fontSize = "1.2rem"; // Make it fit nicely

    // C. Highlight the Menu Button (Guide them where to click)
    const menuBtn = document.getElementById('menu-btn');
    menuBtn.classList.add('pulse-red');

    // D. Update the Button inside the Menu
    const menuRestartBtn = document.getElementById('restart-btn');
    menuRestartBtn.innerText = "⚠️ Accept Restart";
    menuRestartBtn.style.backgroundColor = "#e67e22"; // Orange

    // E. Update the Button inside Game Over Modal (If open)
    const gameOverRematchBtn = document.getElementById('rematch-btn');
    if (gameOverRematchBtn) {
        gameOverRematchBtn.innerText = "⚠️ Opponent is waiting!";
        gameOverRematchBtn.style.backgroundColor = "#e67e22";
        gameOverRematchBtn.classList.add('pulse');
    }
});

// 2. Handle "Rematch Success" (Force Close Modal & Reset Button)
socket.on('rematch_success', () => {
    console.log("✅ Rematch Accepted! Resetting UI...");

    // A. Hide the Game Over Modal
    document.getElementById('game-over-modal').classList.add('hidden');

    // B. Reset the Button for next time
    const btn = document.getElementById('rematch-btn');
    btn.innerText = "🔄 Rematch";
    btn.disabled = false;
    btn.style.backgroundColor = "";
    btn.classList.remove('pulse');

    // C. Show Feedback
    showFlashMessage("GAME START!");
});

// 6. Handle Standard Restart (Mid-game)
socket.on('game_restarted', () => {
    // Also hide modal just in case
    gameOverModal.classList.add('hidden');
    showFlashMessage("RESTART!");
});

// 7. Handle False Snap Penalty (Add this at the bottom of script.js)
socket.on('penalty_flash', (msg) => {
    const flashDiv = document.getElementById('flash-message');
    const flashText = document.getElementById('flash-text');

    flashText.innerText = msg;
    flashText.style.color = "#FF6B6B"; // Red Text
    flashDiv.classList.remove('hidden');
    triggerShake(document.body); // Shake the screen

    setTimeout(() => {
        flashDiv.classList.add('hidden');
        // Reset color back to gold for next time
        flashText.style.color = "#FFE66D";
    }, 1500);
});

// --- CANCEL ROOM LOGIC ---
document.getElementById('cancel-room-btn').onclick = () => {
    // 1. Tell Server I'm leaving
    socket.emit('leave_room', { roomId: currentRoomId });

    // 2. Reset UI locally
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');

    // 3. Reset Variables
    currentRoomId = null;
    isMatchActive = false;
};