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
    room.centerPile = [];

    // --- 🛡️ SAFETY LOCK: FORCE CLEAR VOTES ---
    // This guarantees the new game starts with 0 votes, no matter what.
    if (room.rematchVotes) {
        room.rematchVotes.clear();
    }

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
   // BROADCAST UPDATE TO THE ROOM
    io.to(roomId).emit('card_played', {
        card: playedCard,
        turn: nextPlayerId,
        isMatch: isMatch,
        players: [
            { id: room.players[0].id, count: room.players[0].hand.length },
            { id: room.players[1].id, count: room.players[1].hand.length }
        ]
        
    });

    // --- FIX 2: LAST MOVE SURVIVAL LOGIC ---
    // Only end the game if hand is empty AND there is NO match.
    // If there IS a match, the player stays alive to try and Snap!
    if (player.hand.length === 0 && !isMatch) {
        finishGame(io, roomId, nextPlayerId, socket.id); // Opponent wins immediately
    }
}

// ============================================================
// 5. HANDLE SNAP
// ============================================================
// REPLACE your entire handleSnap function with this:

function handleSnap(socket, io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const pile = room.centerPile;
    
    // Identify Player & Opponent
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    const opponentIndex = (playerIndex + 1) % 2;
    const player = room.players[playerIndex];
    const opponent = room.players[opponentIndex];

    // --- CHECK MATCH ---
    let isMatch = false;
    if (pile.length >= 2) {
        const last = pile[pile.length - 1];
        const prev = pile[pile.length - 2];
        if (last.character === prev.character) isMatch = true;
    }

    // --- PENALTY LOGIC (False Snap) ---
    if (!isMatch) {
        console.log(`[FALSE SNAP] Penalty for ${player.name}`);
        
        // Only apply penalty if they actually have cards to lose
        if (player.hand.length > 0) {
            const penaltyCard = player.hand.pop();
            opponent.hand.unshift(penaltyCard); // Transfer card to opponent
            
            // 1. Notify Room (Update Counts)
            io.to(roomId).emit('game_update', {
                turn: room.gameStatus === 'ACTIVE' ? room.players.find(p => p.hand.length > 0).id : socket.id,
                players: [
                    { id: room.players[0].id, count: room.players[0].hand.length },
                    { id: room.players[1].id, count: room.players[1].hand.length }
                ]
            });
            
            // 2. Send RED FLASH event to clients
            io.to(socket.id).emit('penalty_flash', "FALSE SNAP! -1 Card");
            io.to(opponent.id).emit('penalty_flash', "OPPONENT MISSED! +1 Card");
            
            // 3. Did they die from the penalty?
            if (player.hand.length === 0) {
                finishGame(io, roomId, opponent.id, player.id);
            }
        }
        return; 
    }

    // --- VALID SNAP LOGIC ---
    player.hand.unshift(...room.centerPile);
    room.centerPile = [];

    io.to(roomId).emit('snap_success', {
        winnerId: socket.id,
        winnerName: player.name
    });

    io.to(roomId).emit('game_update', {
        turn: socket.id, 
        players: [
            { id: room.players[0].id, count: room.players[0].hand.length },
            { id: room.players[1].id, count: room.players[1].hand.length }
        ]
    });

    // Check if the OTHER player is now dead (because they failed to snap their last chance)
    if (opponent.hand.length === 0) {
        finishGame(io, roomId, player.id, opponent.id);
    }
}
// ============================================================
// 6. CLEANUP (Disconnect)
// ============================================================
// server/gamelogic.js

// Updated removePlayer now requires 'io' to send messages
function removePlayer(io, socketId) {
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socketId);

        if (playerIndex !== -1) {
            console.log(`[DISCONNECT] Player ${socketId} left Room ${roomId}`);

            // 1. Find the Other Player (The Survivor)
            const otherPlayer = room.players.find(p => p.id !== socketId);

            if (otherPlayer) {
                // 2. Tell the Survivor that the game is over
                io.to(otherPlayer.id).emit('opponent_left');
            }

            // 3. Destroy the Room (Game Over)
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
    
    // We DO NOT delete the room here anymore.
    // We keep it alive so players can click "Rematch".
    // The room will be deleted when they disconnect (close the tab).
}

// Add this new function
function leaveRoom(io, socket, roomId) {
    const room = rooms[roomId];
    if (room) {
        // Remove player from room data
        room.players = room.players.filter(p => p.id !== socket.id);
        
        // If room is empty, delete it
        if (room.players.length === 0) {
            delete rooms[roomId];
            console.log(`[SERVER] Room ${roomId} deleted (Empty).`);
        } else {
            // If someone is still there (unlikely in waiting room), notify them
            io.to(roomId).emit('opponent_left');
        }
    }
    socket.leave(roomId);
}



// server/gamelogic.js

function restartGame(io, roomId, socketId) {
    const room = rooms[roomId];

    // 1. SAFETY CHECK: If room is dead (server restarted), tell client
    if (!room) {
        console.log(`[ERROR] Room ${roomId} not found for restart.`);
        io.to(socketId).emit('init_error', 'Room expired. Please create a new game.');
        return;
    }

    // 2. Initialize Votes (if missing)
    if (!room.rematchVotes) {
        room.rematchVotes = new Set();
    }

    // 3. Register the Vote
    room.rematchVotes.add(socketId);
    console.log(`[REMATCH] Room ${roomId}: Player ${socketId} voted. Total: ${room.rematchVotes.size}/2`);

    // 4. CHECK CONSENSUS (Both players agreed?)
    if (room.rematchVotes.size >= 2) {
        console.log(`[REMATCH] Consensus reached! Restarting Room ${roomId}...`);
        
        // Reset votes for next time
        room.rematchVotes.clear();

        // A. Tell Clients "Success" (To close the Game Over modal)
        io.to(roomId).emit('rematch_success');

        // B. Actually restart the game logic
        startGame(io, roomId); 
    } else {
        // 5. Only 1 person voted. Notify the OTHER player.
        const otherPlayer = room.players.find(p => p.id !== socketId);
        if (otherPlayer) {
            io.to(otherPlayer.id).emit('opponent_wants_rematch');
        }
    }
}
// Ensure you export the same list as before!
module.exports = { createRoom, joinRoom, playCard, handleSnap, removePlayer, restartGame ,leaveRoom};
