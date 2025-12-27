// server/server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// 1. IMPORT ALL FUNCTIONS (Ensure handleSnap is here)
const { addPlayer, removePlayer, playCard, handleSnap } = require('./gamelogic');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '../public')));

// 2. THE CONNECTION BLOCK
io.on('connection', (socket) => {
    // A. Handle New Player
    addPlayer(socket, io); 

    // B. Handle Playing a Card
    socket.on('play_card', () => {
        playCard(socket.id, io);
    });

    // =================================================
    // 🚨 THIS IS THE MISSING PART!
    // It MUST be inside the io.on(...) curly brackets.
    // =================================================
    socket.on('snap_attempt', () => {
        console.log(`⚡ SERVER HEARD SNAP from ${socket.id}`);
        handleSnap(socket.id, io);
    });
    // =================================================

    // D. Handle Disconnect
    socket.on('disconnect', () => {
        removePlayer(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});