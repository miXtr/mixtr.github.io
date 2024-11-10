const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Store connected players
const players = new Map();

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Initialize new player
    players.set(socket.id, {
        id: socket.id,
        position: { x: 0, y: 0, z: 150 },
        rotation: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 }
    });

    // Send existing players to new player
    socket.emit('players', Array.from(players.values()));

    // Broadcast new player to others
    socket.broadcast.emit('playerJoined', players.get(socket.id));

    // Handle player updates
    socket.on('updatePlayer', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = data.position;
            player.rotation = data.rotation;
            player.velocity = data.velocity;
            socket.broadcast.emit('playerMoved', player);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        players.delete(socket.id);
        io.emit('playerLeft', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});