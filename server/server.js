// server/server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// 1. IMPORT THE NEW LOGIC
// We are importing the new "Room-aware" functions we just wrote in Step 3
const { createRoom, joinRoom, playCard, handleSnap, removePlayer ,restartGame , leaveRoom} = require('./gamelogic');
const compression = require('compression'); // Import compression

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Apply Gzip compression to all HTTP responses before static files
app.use(compression());

app.use(express.static(path.join(__dirname, '../public')));

// --- Keep-Awake Health Check ---
app.get('/ping', (req, res) => {
    res.status(200).send("Server is awake");
});

// 2. THE CONNECTION BLOCK
io.on('connection', (socket) => {
    console.log(`New User Connected: ${socket.id}`);

    // A. LOBBY LISTENERS (New for V2)
    // -------------------------------------------------
    
   // User clicks "Create Game"
    socket.on('create_room', (data) => {
        // data = { name: "Pratik" }
        createRoom(socket, io, data.name);
    });

    // User types code and clicks "Join Game"
    socket.on('join_room', (data) => {
        // data = { roomId: "XYZ", name: "Friend" }
        joinRoom(socket, io, data.roomId, data.name);
    });


    // B. GAMEPLAY LISTENERS (Updated for V2)
    // -------------------------------------------------
    // Phase 2: Socket Event Data Packing
    const Actions = { PLAY: 1, SNAP: 2 };

    socket.on('game_action', (dataArray) => {
        // Expected format: [ActionCode, RoomId]
        if (!Array.isArray(dataArray) || dataArray.length < 2) return;
        
        const [actionCode, roomId] = dataArray;
        
        if (actionCode === Actions.PLAY) {
            playCard(socket, io, roomId);
        } else if (actionCode === Actions.SNAP) {
            console.log(`⚡ SNAP ATTEMPT from ${socket.id} in Room ${roomId}`);
            handleSnap(socket, io, roomId);
        }
    });

    // Handle Restart Request
   socket.on('request_restart', (data) => {
    if (data && data.roomId) {
        // ⚠️ CRITICAL: Must pass 'socket.id' as the 3rd argument
        restartGame(io, data.roomId, socket.id);
    }
});

socket.on('leave_room', (data) => {
    leaveRoom(io, socket, data.roomId);
});

    // C. DISCONNECT
    // -------------------------------------------------
    socket.on('disconnect', () => {
        console.log(`User Disconnected: ${socket.id}`);

        // UPDATE: Pass 'io' as the first argument
        removePlayer(io, socket.id);
        });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});