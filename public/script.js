// public/script.js

const socket = io();

// --- DOM Elements (The things we want to change) ---
const myCountDisplay = document.getElementById('my-count');
const oppCountDisplay = document.getElementById('opp-count');
const statusMsg = document.getElementById('game-status');
const myDeck = document.getElementById('my-deck');
const centerPile = document.getElementById('center-pile');
const snapBtn = document.getElementById('snap-btn');

// --- Game Variables ---
let myHand = [];
let isMyTurn = false;
let isMatchActive = false; // <--- NEW: The Lock
let isGameOver = false; // To prevent actions after game ends

// 1. Connection Logic
socket.on('connect', () => {
    console.log("Connected to server!");
    statusMsg.innerText = "Waiting for opponent...";
});

socket.on('game_full', () => {
    statusMsg.innerText = "Error: Game is Full!";
    statusMsg.style.color = "red";
});

// 2. The Game Starts!
// This event comes from server/gameLogic.js inside startGame()
socket.on('game_start', (data) => {
    console.log("Game Started!", data);

    // Update Local Variables
    myHand = data.hand;
    isMyTurn = data.isMyTurn;

    // Update UI
    myCountDisplay.innerText = myHand.length; // Should be 26
    oppCountDisplay.innerText = data.opponentCardCount; // Should be 26
    
    if (isMyTurn) {
        statusMsg.innerText = "Game Started! YOUR TURN";
        myDeck.style.border = "4px solid yellow"; // Highlight my deck
    } else {
        statusMsg.innerText = "Game Started! Opponent's Turn";
        myDeck.style.border = "2px solid white";
    }
});

// public/script.js (Add to the bottom)

// 3. User Interaction (Clicking the Deck)
myDeck.addEventListener('click', () => {

    if (isGameOver) {
        return; 
    }
    // 1. New Check: If match is active, STOP!
    if (isMatchActive) {
        alert("IT'S A MATCH! CLICK THE SNAP BUTTON!");
        return;
    }

    // Basic Rule Check: Is it my turn? Do I have cards?
    if (!isMyTurn) {
        alert("Wait for your turn!"); 
        return; 
    }

    
    
    if (myHand.length === 0) {
        alert("You have no cards left!");
        return;
    }

    // If checks pass, tell the server!
    console.log("Sending 'play_card' event...");
    socket.emit('play_card');
});


// public/script.js (Add to the bottom)

// 4. Listen for updates from Server
// public/script.js

socket.on('card_played', (data) => {
    console.log("Card played:", data.card);

    // A. Show the Card
    centerPile.innerHTML = `
        <div class="card">
            ${data.card.character}<br>
            <small>${data.card.style}</small>
        </div>
    `;

    // B. UPDATE CARD COUNTS (The Fix 🛠️)
    // We loop through the data sent by server and update the UI
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
    // C. Update Counts (Optional for now, but good practice)
    // We simply subtract 1 from whoever's turn it was.
    // Ideally, the server sends fresh counts, but let's keep it simple.
    const currentMyCount = parseInt(myCountDisplay.innerText);
    const currentOppCount = parseInt(oppCountDisplay.innerText);

    // If I just played (it's NO LONGER my turn), my count goes down
    if (!isMyTurn) { 
        myCountDisplay.innerText = currentMyCount - 1;
    } else {
        oppCountDisplay.innerText = currentOppCount - 1;
    }

    // public/script.js (Add to bottom)

// 5. Handle SNAP Button Click
// public/script.js

snapBtn.addEventListener('click', () => {
    console.log("🔴 BUTTON CLICKED! Sending 'snap_attempt' to server..."); // Check console for this
    socket.emit('snap_attempt');
    snapBtn.classList.add('hidden');
});
// public/script.js

// 6. Handle Winning Animation & Cleanup (THE FIX)
socket.on('snap_success', (data) => {
    // A. Notify who won
    // (Optional: You can remove the alert later if it's too annoying)
    alert(`${data.winnerName} WON THE PILE!`);
    
    // B. CRITICAL: Hide the button for EVERYONE
    // Even if I didn't click it, I must hide mine now because the race is over.
    snapBtn.classList.add('hidden');
    
    // C. Clear the center pile visually
    centerPile.innerHTML = `<div class="placeholder-text">Center Pile</div>`;
    
    // D. CRITICAL: Unlock the game state for EVERYONE
    // This fixes the "Please click snap" bug on the next turn.
    isMatchActive = false; 
});

// 7. Handle Game State Update (Counts)
// public/script.js

socket.on('game_update', (data) => {
    
    // 1. Update Turn Logic (Existing)
    if (socket.id === data.turn) {
        isMyTurn = true;
        statusMsg.innerText = "YOUR TURN";
        myDeck.style.border = "4px solid yellow";
    } else {
        isMyTurn = false;
        statusMsg.innerText = "Opponent's Turn";
        myDeck.style.border = "2px solid white";
    }

    // 2. Update Card Counts (NEW FIX) 🛠️
    data.players.forEach(player => {
        if (player.id === socket.id) {
            // This is ME
            myCountDisplay.innerText = player.count;
            
            // Safety Check: Did I run out of cards?
            if (player.count === 0) {
                 alert("GAME OVER! You have 0 cards. You Lose!");
            }
        } else {
            // This is OPPONENT
            oppCountDisplay.innerText = player.count;
        }
    });
});

// public/script.js (At the bottom)

// public/script.js (At the bottom)

/// public/script.js

// 8. Handle Game Over
socket.on('game_over', (data) => {
    // 1. Force update the status immediately
    isMyTurn = false;
    isMatchActive = false;
    snapBtn.classList.add('hidden'); // Hide snap button if it was there
    myDeck.style.border = "2px solid gray"; // Lock the deck

    // 2. Check: Am I the Winner or Loser?
    if (socket.id === data.winnerId) {
        // I AM THE WINNER
        statusMsg.innerText = "🏆 VICTORY! YOU WON! 🏆";
        statusMsg.style.color = "#2ecc71"; // Bright Green
        statusMsg.style.fontSize = "2rem"; // Make it BIG
        document.body.style.backgroundColor = "#27ae60"; // Celebrate with green background
        
        // Small delay so they see the text before the alert
        setTimeout(() => {
            alert("🏆 CONGRATULATIONS! You won the game!");
        }, 100);

    } else {
        // I AM THE LOSER
        statusMsg.innerText = "💀 GAME OVER";
        statusMsg.style.color = "#e74c3c"; // Red
        
        setTimeout(() => {
            alert("💀 GAME OVER! You ran out of cards.");
        }, 100);
    }
});