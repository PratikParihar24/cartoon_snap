// public/script.js

const socket = io();

// --- DOM Elements ---
// Screens
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');

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
const roomDisplay = document.getElementById('room-display'); // New!

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


// --- Game Variables ---
let myHand = [];
let isMyTurn = false;
let isMatchActive = false;
let isGameOver = false;
let currentRoomId = null; // <--- V2 CRITICAL: We must remember our room!
let currentSkin = 'default'; // Default skin

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

// ========================================================
// A. LOBBY LOGIC (NEW)
// ========================================================

// 1. Create Game
createBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (!name) { alert("Please enter your name!"); return; }

    console.log("Creating room as " + name);
    // V2 Update: Send name along with request
    socket.emit('create_room', { name: name });
});

// 2. Join Game
joinBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    const code = roomInput.value.trim().toUpperCase();

    if (!name) { alert("Please enter your name!"); return; }
    if (!code) { alert("Please enter a Room Code!"); return; }

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
    
    if (isMyTurn) {
        statusMsg.innerText = "YOUR TURN";
        myDeck.style.border = "4px solid yellow";
    } else {
        statusMsg.innerText = "Opponent's Turn";
        myDeck.style.border = "2px solid white";
    }
});

// ========================================================
// B. GAMEPLAY LOGIC (UPDATED FOR V2)
// ========================================================

// 1. The Game Starts
socket.on('game_start', (data) => {
    console.log("Game Started!", data);
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
    if (isMatchActive) {
        alert("IT'S A MATCH! CLICK THE SNAP BUTTON!");
        return;
    }
    if (!isMyTurn) {
        alert("Wait for your turn!"); 
        return; 
    }
    if (myHand.length === 0) {
        alert("You have no cards left!");
        return;
    }

    // V2 UPDATE: We send the roomId now!
    socket.emit('play_card', { roomId: currentRoomId });
});

// 3. Server Updates Board
socket.on('card_played', (data) => {

    playSound(audioFlip);


    // A. Show the Card (UPDATED FOR IMAGES)
    const imagePath = getCardImage(data.card.style, data.card.character);
    
    centerPile.innerHTML = `
        <div class="card face-up">
            <img src="${imagePath}" alt="${data.card.character}" class="card-img">
        </div>
    `;

    // B. Update Counts
    data.players.forEach(player => {
        if (player.id === socket.id) {
            myCountDisplay.innerText = player.count;
        } else {
            oppCountDisplay.innerText = player.count;
        }
    });

    // C. Handle Match & Turn
    if (data.isMatch) {
        snapBtn.classList.remove('hidden');
        statusMsg.innerText = "🔥 SNAP! CLICK THE BUTTON! 🔥";
        statusMsg.style.color = "#ffcc00";
        isMatchActive = true;
    } else {
        snapBtn.classList.add('hidden');
        statusMsg.style.color = "white";
        isMatchActive = false;

        if (data.turn === socket.id) {
            isMyTurn = true;
            statusMsg.innerText = "YOUR TURN";
            myDeck.style.border = "4px solid yellow";
        } else {
            isMyTurn = false;
            statusMsg.innerText = "Opponent's Turn";
            myDeck.style.border = "2px solid white";
        }
    }
});

// 4. Handle SNAP Button
snapBtn.addEventListener('click', () => {
    console.log("🔴 SNAP CLICKED!");
    // V2 UPDATE: Send roomId
    socket.emit('snap_attempt', { roomId: currentRoomId });
    snapBtn.classList.add('hidden');
});

// 5. Handle Snap Success
socket.on('snap_success', (data) => {
    playSound(audioSnap);
    alert(`${data.winnerName} WON THE PILE!`);
    snapBtn.classList.add('hidden');
    centerPile.innerHTML = `<div class="placeholder-text">Center Pile</div>`;
    isMatchActive = false; 
});

// 6. Game Updates (Counts)
socket.on('game_update', (data) => {
    if (socket.id === data.turn) {
        isMyTurn = true;
        statusMsg.innerText = "YOUR TURN";
        myDeck.style.border = "4px solid yellow";
    } else {
        isMyTurn = false;
        statusMsg.innerText = "Opponent's Turn";
        myDeck.style.border = "2px solid white";
    }

    data.players.forEach(player => {
        if (player.id === socket.id) {
            myCountDisplay.innerText = player.count;
            if (player.count === 0) alert("GAME OVER! You Lose!");
        } else {
            oppCountDisplay.innerText = player.count;
        }
    });
});

// 7. Game Over
socket.on('game_over', (data) => {
    isMyTurn = false;
    isMatchActive = false;
    snapBtn.classList.add('hidden');
    myDeck.style.border = "2px solid gray";

    if (socket.id === data.winnerId) {
        playSound(audioWin);
        statusMsg.innerText = "🏆 VICTORY! YOU WON! 🏆";
        statusMsg.style.color = "#2ecc71";
        document.body.style.backgroundColor = "#27ae60"; 
        setTimeout(() => alert("🏆 CONGRATULATIONS! You won!"), 100);
    } else {
        statusMsg.innerText = "💀 GAME OVER";
        statusMsg.style.color = "#e74c3c"; 
        setTimeout(() => alert("💀 GAME OVER!"), 100);
    }
});





// Helper: Generate Image Path
function getCardImage(style, character) {
    // 1. Convert Style to lowercase (e.g., "Pixar" -> "pixar")
    const folder = style.toLowerCase();
    
    // 2. Convert Character to lowercase AND replace spaces with underscores
    // (e.g., "Ninja Hattori" -> "ninja_hattori")
    const file = character.toLowerCase().replace(/ /g, '_'); // Regex replaces ALL spaces
    
    return `/assets/${folder}/${file}.png`;
}   


// ========================================================
// C. MENU INTERACTIONS
// ========================================================

// 1. Toggle Menu
menuBtn.addEventListener('click', () => {
    menuModal.classList.remove('hidden');
});

resumeBtn.addEventListener('click', () => {
    menuModal.classList.add('hidden');
});

// 2. Restart Game (Reset Deck for both players)
restartBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to restart the game?")) {
        socket.emit('request_restart', { roomId: currentRoomId });
        menuModal.classList.add('hidden'); // Close menu
    }
});

// 3. Leave Room (Go back to Lobby)
leaveBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to leave?")) {
        // Reloading the page is the easiest way to "Disconnect" and reset state
        window.location.reload(); 
    }
});

// 4. Handle Restart Signal (from Server)
socket.on('game_restarted', () => {
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
    alert("Your opponent has left the game! Returning to lobby...");
    
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
        card.style.backgroundImage = `url('/assets/backs/${currentSkin}.png')`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
    });
}