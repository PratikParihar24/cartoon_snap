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

// --- Game Variables ---
let myHand = [];
let isMyTurn = false;
let isMatchActive = false;
let isGameOver = false;
let currentRoomId = null; // <--- V2 CRITICAL: We must remember our room!

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
    // A. Show the Card
    // (Later we will replace this with the Image Logic we discussed)
    centerPile.innerHTML = `
        <div class="card">
            ${data.card.character}<br>
            <small>${data.card.style}</small>
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