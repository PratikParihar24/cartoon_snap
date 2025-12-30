// server/gamelogic.js

const Deck = require('./classes/Deck');

// ============================================================
// THE HOTEL REGISTRY (The Memory)
// ============================================================
// Instead of one 'gameState', we have a dictionary of many rooms.
// Format: { "A1B2C3": { players: [], deck: ..., status: ... } }
const rooms = {}; 

// Helper: Generate a random 6-character Room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============================================================
// 1. CREATE ROOM
// ============================================================
// server/gamelogic.js

// Update createRoom to accept 'playerName'
function createRoom(socket, io, playerName) {
    const roomId = generateRoomId();
    
    rooms[roomId] = {
        id: roomId,
        players: [],      
        deck: null,
        centerPile: [],
        gameStatus: 'WAITING'
    };

    const player1 = {
        id: socket.id,
        name: playerName || "Player 1", // Fallback if empty
        hand: []
    };
    rooms[roomId].players.push(player1);
    socket.join(roomId);
    socket.emit('room_created', { roomId: roomId });
}

// Update joinRoom to accept 'playerName'
function joinRoom(socket, io, roomId, playerName) {
    const room = rooms[roomId];

    if (!room) {
        socket.emit('error', { message: "Room not found!" });
        return;
    }
    if (room.players.length >= 2) {
        socket.emit('error', { message: "Room is full!" });
        return;
    }

    const player2 = {
        id: socket.id,
        name: playerName || "Player 2",
        hand: []
    };
    room.players.push(player2);
    socket.join(roomId);

    // START GAME with Names
    if (room.players.length === 2) {
        startGame(io, roomId);
    }
}

// Update startGame to Send Names
function startGame(io, roomId) {
    const room = rooms[roomId];
    room.gameStatus = 'ACTIVE';

    // ... (Deck shuffling logic is same) ...
    const gameDeck = new Deck();
    gameDeck.shuffle();
    const { player1Hand, player2Hand } = gameDeck.deal();
    
    room.players[0].hand = player1Hand;
    room.players[1].hand = player2Hand;

    // SEND NAMES TO PLAYERS
    // To Player 1:
    io.to(room.players[0].id).emit('game_start', {
        hand: player1Hand,
        opponentCardCount: 26,
        isMyTurn: true,
        roomId: roomId,
        myName: room.players[0].name,   // Your Name
        oppName: room.players[1].name   // Opponent Name
    });

    // To Player 2:
    io.to(room.players[1].id).emit('game_start', {
        hand: player2Hand,
        opponentCardCount: 26,
        isMyTurn: false,
        roomId: roomId,
        myName: room.players[1].name,
        oppName: room.players[0].name
    });
}

// ============================================================
// 4. PLAY CARD
// ============================================================
function playCard(socket, io, roomId) {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== 'ACTIVE') return;

    // Find the player who clicked
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return; // Player not in this room?

    const player = room.players[playerIndex];

    // logic: Move card from hand to pile
    const playedCard = player.hand.pop();
    room.centerPile.push(playedCard);

    // Identify Opponent (for turn switching)
    const nextPlayerIndex = (playerIndex + 1) % 2;
    const nextPlayerId = room.players[nextPlayerIndex].id;

    // Check Match (Logic remains same as V1)
    let isMatch = false;
    if (room.centerPile.length >= 2) {
        const last = room.centerPile[room.centerPile.length - 1];
        const prev = room.centerPile[room.centerPile.length - 2];
        if (last.character === prev.character) {
            isMatch = true;
        }
    }

    // BROADCAST UPDATE TO THE ROOM
    // We use io.to(roomId) so only people in this game see it
    io.to(roomId).emit('card_played', {
        card: playedCard,
        turn: nextPlayerId,
        isMatch: isMatch,
        players: [
            { id: room.players[0].id, count: room.players[0].hand.length },
            { id: room.players[1].id, count: room.players[1].hand.length }
        ]
    });

    // Check Game Over (Empty Hand)
    if (player.hand.length === 0) {
        finishGame(io, roomId, nextPlayerId, socket.id); // Opponent wins
    }
}

// ============================================================
// 5. HANDLE SNAP
// ============================================================
function handleSnap(socket, io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const pile = room.centerPile;
    if (pile.length < 2) return;

    // Verify Match
    const last = pile[pile.length - 1];
    const prev = pile[pile.length - 2];

    if (last.character !== prev.character) {
        console.log(`[FALSE SNAP] in Room ${roomId}`);
        return; 
    }

    // Winner Logic
    const winnerIndex = room.players.findIndex(p => p.id === socket.id);
    const winner = room.players[winnerIndex];

    // Give cards to winner
    winner.hand.unshift(...room.centerPile);
    room.centerPile = [];

    // Notify Room
    io.to(roomId).emit('snap_success', {
        winnerId: socket.id,
        winnerName: winner.name
    });

    // Resume Game
    io.to(roomId).emit('game_update', {
        turn: socket.id, // Winner keeps turn
        players: [
            { id: room.players[0].id, count: room.players[0].hand.length },
            { id: room.players[1].id, count: room.players[1].hand.length }
        ]
    });
}

// ============================================================
// 6. CLEANUP (Disconnect)
// ============================================================
function removePlayer(socketId) {
    // We must find which room this player was in
    // This is a bit inefficient (looping all rooms), but fine for MVP
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerExists = room.players.find(p => p.id === socketId);

        if (playerExists) {
            console.log(`[DISCONNECT] Player left Room ${roomId}`);
            // Remove the room entirely (Game Abandoned)
            delete rooms[roomId];
            return;
        }
    }
}

// Helper: End Game
function finishGame(io, roomId, winnerId, loserId) {
    io.to(roomId).emit('game_over', {
        winnerId: winnerId,
        loserId: loserId
    });
    delete rooms[roomId]; // Cleanup
}

module.exports = { createRoom, joinRoom, playCard, handleSnap, removePlayer };