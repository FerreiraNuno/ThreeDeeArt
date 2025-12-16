const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '3D_gallery')));

// Store connected players
const players = new Map();

// Serve the main gallery page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '3D_gallery', 'index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Handle player join
    socket.on('player-join', (playerData) => {
        const player = {
            id: socket.id,
            name: playerData.name || `Player_${socket.id.substring(0, 6)}`,
            position: playerData.position || { x: 0, y: 1.6, z: 0 },
            rotation: playerData.rotation || { x: 0, y: 0, z: 0 },
            color: playerData.color || generateRandomColor(),
            joinedAt: Date.now()
        };

        players.set(socket.id, player);

        // Send current player list to the new player
        socket.emit('players-list', Array.from(players.values()));

        // Notify all other players about the new player
        socket.broadcast.emit('player-joined', player);

        console.log(`Player ${player.name} joined the gallery`);
    });

    // Handle player movement
    socket.on('player-move', (movementData) => {
        const player = players.get(socket.id);
        if (player) {
            // Update player position and rotation
            player.position = movementData.position;
            player.rotation = movementData.rotation;

            // Broadcast movement to all other players
            socket.broadcast.emit('player-moved', {
                id: socket.id,
                position: player.position,
                rotation: player.rotation
            });
        }
    });

    // Handle player disconnect
    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        if (player) {
            console.log(`Player ${player.name} disconnected`);
            players.delete(socket.id);

            // Notify all players about the disconnection
            socket.broadcast.emit('player-left', socket.id);
        }
    });

    // Handle chat messages (optional feature)
    socket.on('chat-message', (messageData) => {
        const player = players.get(socket.id);
        if (player) {
            const message = {
                playerId: socket.id,
                playerName: player.name,
                message: messageData.message,
                timestamp: Date.now()
            };

            // Broadcast message to all players
            io.emit('chat-message', message);
        }
    });
});

// Generate random color for new players
function generateRandomColor() {
    const colors = [
        0xff6b6b, // Red
        0x4ecdc4, // Teal
        0x45b7d1, // Blue
        0x96ceb4, // Green
        0xfeca57, // Yellow
        0xff9ff3, // Pink
        0x54a0ff, // Light Blue
        0x5f27cd, // Purple
        0x00d2d3, // Cyan
        0xff9f43  // Orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Start server
server.listen(PORT, () => {
    console.log(`🚀 3D Gallery server running on http://localhost:${PORT}`);
    console.log(`📱 Open multiple browser tabs to test multiplayer functionality`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
