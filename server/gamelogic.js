// server/gameLogic.js

const Deck = require('./classes/Deck');

// 1. The State Object (The Memory)
let gameState = {
    players: [],      // Will hold max 2 players
    deck: null,       // Will hold the card deck
    gameStatus: 'WAITING', // WAITING, ACTIVE
    centerPile: []    // The cards on the table
};

// 2. Function to handle a new player joining
function addPlayer(socket , io) {
    
    // Check if we already have 2 players
    if (gameState.players.length >= 2) {
        console.log(`Game is full. ${socket.id} cannot join.`);
        socket.emit('game_full', { message: 'Sorry, the game is full!' });
        return;
    }

    // Determine if this is Player 1 or Player 2
    const playerIndex = gameState.players.length; // 0 or 1
    const playerName = `Player ${playerIndex + 1}`;

    // Add them to our "Memory"
    const newPlayer = {
        id: socket.id,
        name: playerName,
        hand: [] // Empty for now
    };
    gameState.players.push(newPlayer);

    console.log(`${playerName} joined! (${socket.id})`);

    // Tell the specific user "Welcome, you are Player X"
    socket.emit('welcome', { 
        name: playerName, 
        playerId: socket.id 
    });

    // If we have 2 players, we can START the game!
    if (gameState.players.length === 2) {
        console.log("⚡ Two players connected. Starting Game!");
        startGame(io); 
    }
}

// 3. Function to Start the Game
// server/gameLogic.js (Update these parts)

// ... (Keep the imports and addPlayer function the same) ...

// UPDATE THIS FUNCTION
function startGame(io) { // <--- Note: We now accept 'io' as a parameter
    gameState.gameStatus = 'ACTIVE';
    console.log("--> Game Status changed to ACTIVE");

    // 1. Create and Shuffle Deck
    const gameDeck = new Deck();
    gameDeck.shuffle();

    // 2. Deal Cards
    const { player1Hand, player2Hand } = gameDeck.deal();

    // 3. Assign cards to the specific player objects in our state
    // (We assume player[0] is P1 and player[1] is P2)
    gameState.players[0].hand = player1Hand;
    gameState.players[1].hand = player2Hand;

    // 4. Send the data to the clients (The "Deal")
    // usage: io.to(socketId).emit(...) sends a message ONLY to that person.

    // Send Player 1 their cards
    io.to(gameState.players[0].id).emit('game_start', {
        hand: player1Hand,    // They can see their own cards
        opponentCardCount: 26, // They only know HOW MANY cards opp has
        isMyTurn: true        // Player 1 goes first
    });

    // Send Player 2 their cards
    io.to(gameState.players[1].id).emit('game_start', {
        hand: player2Hand,
        opponentCardCount: 26,
        isMyTurn: false       // Player 2 waits
    });

    console.log("🃏 Cards dealt. Game started!");
}

// ... (Keep removePlayer same) ...
// 4. Function to handle Disconnects
function removePlayer(socketId) {
    // Filter out the player who left
    gameState.players = gameState.players.filter(p => p.id !== socketId);
    gameState.gameStatus = 'WAITING';
    console.log(`Player ${socketId} left. Game reset to WAITING.`);
}

// server/gameLogic.js

// ... (Keep existing code above) ...

// server/gameLogic.js (Updated playCard function)

// server/gameLogic.js

// server/gameLogic.js

// server/gameLogic.js

function playCard(socketId, io) {
    const playerIndex = gameState.players.findIndex(p => p.id === socketId);
    const player = gameState.players[playerIndex];

    // 1. Move the card
    const playedCard = player.hand.pop();
    gameState.centerPile.push(playedCard);

    // 2. Identify Opponent
    const nextPlayerIndex = (playerIndex + 1) % 2;
    const nextPlayerId = gameState.players[nextPlayerIndex].id;

    // 3. Check Match (Standard Logic)
    let isMatch = false;
    if (gameState.centerPile.length >= 2) {
        const last = gameState.centerPile[gameState.centerPile.length - 1];
        const prev = gameState.centerPile[gameState.centerPile.length - 2];
        if (last.character === prev.character) {
            isMatch = true;
        }
    }

    // 4. FIRST: Update the Board for Everyone (So they see the card)
    io.emit('card_played', {
        card: playedCard,
        turn: nextPlayerId,
        pileCount: gameState.centerPile.length,
        isMatch: isMatch,
        players: [
            { id: gameState.players[0].id, count: gameState.players[0].hand.length },
            { id: gameState.players[1].id, count: gameState.players[1].hand.length }
        ]
    });

    // 5. SECOND: Check Game Over (Immediately after updating UI)
    if (player.hand.length === 0) {
        console.log(`🏁 GAME OVER! ${player.name} is out of cards.`);
        
        // Broadcast the result to EVERYONE
        io.emit('game_over', {
            winnerId: nextPlayerId, // The other player wins
            loserId: socketId       // The current player loses
        });
        
        gameState.gameStatus = 'ENDED';
    }
}

function handleSnap(socketId, io) {
    // 1. Verify: Is there actually a match?
    // (This prevents cheaters from sending fake snap signals)
    const pile = gameState.centerPile;
    if (pile.length < 2) return; // Cannot snap with 1 card

    const last = pile[pile.length - 1];
    const prev = pile[pile.length - 2];

    if (last.character !== prev.character) {
        console.log(`False Start! User ${socketId} clicked snap but no match.`);
        return; // Ignore false snaps for now (or add penalty later)
    }

    // 2. Identify the Winner
    const winnerIndex = gameState.players.findIndex(p => p.id === socketId);
    const winner = gameState.players[winnerIndex];

    console.log(`🎉 SNAP! ${winner.name} won ${pile.length} cards!`);

    // 3. Give Cards to Winner
    // We put the pile at the BOTTOM of their hand (unshift)
    // Note: We move the whole pile array into their hand
    winner.hand.unshift(...gameState.centerPile);

    // 4. Clear the Center Pile
    gameState.centerPile = [];

    // 5. Update Everyone
    io.emit('snap_success', {
        winnerId: socketId,
        winnerName: winner.name,
        pileSize: 0 
    });

    // 6. Resume Game & Send Updated Counts
    io.emit('game_update', {
        turn: socketId, // Winner keeps turn
        // We send the specific count for each player ID
        players: [
            { id: gameState.players[0].id, count: gameState.players[0].hand.length },
            { id: gameState.players[1].id, count: gameState.players[1].hand.length }
        ]
    });

    // ...

    // 6. Resume Game: The Winner gets to play the next card
    // We send a "reset" state
    io.emit('game_update', {
        turn: socketId, // Winner keeps turn
        player1Count: gameState.players[0].hand.length,
        player2Count: gameState.players[1].hand.length
    });
}



// 👇 MAKE SURE 'handleSnap' IS IN THIS LIST 👇
module.exports = { addPlayer, removePlayer, playCard, handleSnap, gameState };



