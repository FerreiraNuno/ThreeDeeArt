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

app.use(cors());
app.use(express.static(path.join(__dirname, '3D_gallery')));

// Verbundene Spieler speichern
const players = new Map();

// Haupt-Galerie-Seite ausliefern
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '3D_gallery', 'index.html'));
});

// WebSocket-Verbindungen
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Spieler tritt bei
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

        // Spielerliste an neuen Spieler senden
        socket.emit('players-list', Array.from(players.values()));

        // Andere Spieler informieren
        socket.broadcast.emit('player-joined', player);

        console.log(`Player ${player.name} joined the gallery`);
    });

    // Spielerbewegung
    socket.on('player-move', (movementData) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = movementData.position;
            player.rotation = movementData.rotation;

            // Bewegung an andere Spieler senden
            socket.broadcast.emit('player-moved', {
                id: socket.id,
                position: player.position,
                rotation: player.rotation
            });
        }
    });

    // Spieler verlässt
    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        if (player) {
            console.log(`Player ${player.name} disconnected`);
            players.delete(socket.id);

            socket.broadcast.emit('player-left', socket.id);
        }
    });

    // Chat-Nachrichten
    socket.on('chat-message', (messageData) => {
        const player = players.get(socket.id);
        if (player) {
            const message = {
                playerId: socket.id,
                playerName: player.name,
                message: messageData.message,
                timestamp: Date.now()
            };

            io.emit('chat-message', message);
        }
    });
});

// Zufällige Farbe generieren
function generateRandomColor() {
    const colors = [
        0xff6b6b,
        0x4ecdc4,
        0x45b7d1,
        0x96ceb4,
        0xfeca57,
        0xff9ff3,
        0x54a0ff,
        0x5f27cd,
        0x00d2d3,
        0xff9f43
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Server starten
server.listen(PORT, () => {
    console.log(`🚀 3D Gallery server running on http://localhost:${PORT}`);
    console.log(`📱 Open multiple browser tabs to test multiplayer functionality`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
