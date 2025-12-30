// server/server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// 1. IMPORT THE NEW LOGIC
// We are importing the new "Room-aware" functions we just wrote in Step 3
const { createRoom, joinRoom, playCard, handleSnap, removePlayer } = require('./gamelogic');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '../public')));

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
    // Note: We now expect 'data' to contain the { roomId } 
    // because the server needs to know WHICH game to update.

    socket.on('play_card', (data) => {
        // data looks like: { roomId: "X7Z9P" }
        if (data && data.roomId) {
            playCard(socket, io, data.roomId);
        }
    });

    socket.on('snap_attempt', (data) => {
        console.log(`⚡ SNAP ATTEMPT from ${socket.id} in Room ${data.roomId}`);
        if (data && data.roomId) {
            handleSnap(socket, io, data.roomId);
        }
    });

    // C. DISCONNECT
    // -------------------------------------------------
    socket.on('disconnect', () => {
        console.log(`User Disconnected: ${socket.id}`);
        removePlayer(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});