import * as THREE from 'three';

/**
 * Multiplayer-Verwaltung für WebSocket-Verbindungen und Spieler-Synchronisation
 */
export class MultiplayerManager {
    constructor(scene, personManager, camera) {
        this.scene = scene;
        this.personManager = personManager;
        this.camera = camera;
        this.socket = null;
        this.isConnected = false;
        this.localPlayerId = null;
        this.remotePlayers = new Map();
        this.lastPositionUpdate = 0;
        this.updateInterval = 100; // Positions-Updates alle 100ms

        this.init();
    }

    init() {
        try {
            this.socket = io();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
        }
    }

    setupEventListeners() {
        if (!this.socket) return;

        // Verbindung hergestellt
        this.socket.on('connect', () => {
            console.log('Connected to multiplayer server');
            this.isConnected = true;
            this.localPlayerId = this.socket.id;
            this.joinRoom();
        });

        // Verbindung verloren
        this.socket.on('disconnect', () => {
            console.log('Disconnected from multiplayer server');
            this.isConnected = false;
            this.localPlayerId = null;
        });

        // Spielerliste beim Beitreten erhalten
        this.socket.on('players-list', (players) => {
            console.log('Received players list:', players);
            players.forEach(player => {
                if (player.id !== this.localPlayerId) {
                    this.addRemotePlayer(player);
                }
            });
        });

        // Neuer Spieler beigetreten
        this.socket.on('player-joined', (player) => {
            console.log('Player joined:', player.name);
            this.addRemotePlayer(player);
        });

        // Spieler verlassen
        this.socket.on('player-left', (playerId) => {
            console.log('Player left:', playerId);
            this.removeRemotePlayer(playerId);
        });

        // Spielerbewegung
        this.socket.on('player-moved', (movementData) => {
            this.updateRemotePlayer(movementData);
        });

        // Chat-Nachricht
        this.socket.on('chat-message', (messageData) => {
            this.displayChatMessage(messageData);
        });
    }

    joinRoom() {
        if (!this.socket || !this.isConnected) return;

        const cameraPos = this.camera.getPosition();

        // Y-Rotation aus Blickrichtung berechnen
        const direction = this.camera.getWorldDirection();
        const yRotation = Math.atan2(direction.x, direction.z);

        const playerData = {
            name: this.generatePlayerName(),
            position: {
                x: cameraPos.x,
                y: cameraPos.y,
                z: cameraPos.z
            },
            rotation: {
                x: 0,
                y: yRotation,
                z: 0
            },
            color: this.generateRandomColor()
        };

        this.socket.emit('player-join', playerData);
    }

    /**
     * Entfernten Spieler zur Szene hinzufügen
     */
    addRemotePlayer(playerData) {
        if (this.remotePlayers.has(playerData.id)) return;

        const playerScale = 1.15;
        const personGroupGroundOffset = -0.2 * playerScale;
        const cameraHeight = 1.7;

        // Y-Position berechnen
        const jumpHeight = Math.max(0, playerData.position.y - cameraHeight);
        const initialY = personGroupGroundOffset + jumpHeight;

        const groundPosition = new THREE.Vector3(
            playerData.position.x,
            initialY,
            playerData.position.z
        );

        const playerProp = this.personManager.createPerson(
            groundPosition,
            {
                name: `remote_${playerData.id}`,
                clothingColor: playerData.color || 0x4169e1,
                scale: playerScale
            }
        );

        playerProp.rotation.y = playerData.rotation.y;

        console.log(`Player ${playerData.name} created with Y rotation: ${playerData.rotation.y} radians (${(playerData.rotation.y * 180 / Math.PI).toFixed(1)} degrees)`);

        this.addPlayerNameLabel(playerProp, playerData.name);

        this.remotePlayers.set(playerData.id, {
            prop: playerProp,
            data: playerData
        });

        console.log(`Added remote player: ${playerData.name}`);
    }

    /**
     * Entfernten Spieler aus der Szene entfernen
     */
    removeRemotePlayer(playerId) {
        const remotePlayer = this.remotePlayers.get(playerId);
        if (remotePlayer) {
            this.scene.remove(remotePlayer.prop);
            this.personManager.removePerson(`remote_${playerId}`);
            this.remotePlayers.delete(playerId);

            console.log(`Removed remote player: ${playerId}`);
        }
    }

    /**
     * Position und Rotation eines entfernten Spielers aktualisieren
     */
    updateRemotePlayer(movementData) {
        const remotePlayer = this.remotePlayers.get(movementData.id);
        if (remotePlayer) {
            const prop = remotePlayer.prop;

            if (!prop.previousPosition) {
                prop.previousPosition = prop.position.clone();
            }

            const playerScale = 1.15;
            const personGroupGroundOffset = -0.2 * playerScale;
            const cameraHeight = 1.7;

            const jumpHeight = Math.max(0, movementData.position.y - cameraHeight);
            const targetY = personGroupGroundOffset + jumpHeight;

            const targetPosition = new THREE.Vector3(
                movementData.position.x,
                targetY,
                movementData.position.z
            );

            // Bewegung für Animation erkennen
            const movement = targetPosition.distanceTo(prop.previousPosition);
            const isMoving = movement > 0.01;

            if (prop.animationState) {
                if (isMoving) {
                    prop.animationState.isWalking = true;
                }
            }

            // Horizontale Position interpolieren
            prop.position.x = THREE.MathUtils.lerp(prop.position.x, targetPosition.x, 0.15);
            prop.position.z = THREE.MathUtils.lerp(prop.position.z, targetPosition.z, 0.15);

            prop.previousPosition.copy(targetPosition);

            this.personManager.updateJumpingAnimation(prop, targetY);
            prop.rotation.y = movementData.rotation.y;
            this.personManager.updatePersonBoundingBox(`remote_${movementData.id}`);
        }
    }

    /**
     * Lokale Spielerbewegung an Server senden
     */
    sendMovement(position, rotation) {
        if (!this.socket || !this.isConnected) return;

        const now = Date.now();
        if (now - this.lastPositionUpdate < this.updateInterval) return;

        const direction = this.camera.getWorldDirection();
        const yRotation = Math.atan2(direction.x, direction.z);

        this.socket.emit('player-move', {
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: {
                x: rotation.x,
                y: yRotation,
                z: rotation.z
            },
            isJumping: position.y > 1.6 + 0.1,
            timestamp: Date.now()
        });

        this.lastPositionUpdate = now;
    }

    /**
     * Namenslabel über Spieler hinzufügen
     */
    addPlayerNameLabel(playerProp, name) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = 'white';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillText(name, canvas.width / 2, canvas.height / 2 + 8);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);

        sprite.position.set(0, 2.2, 0);
        sprite.scale.set(1, 0.25, 1);

        playerProp.add(sprite);
    }

    displayChatMessage(messageData) {
        console.log(`[${messageData.playerName}]: ${messageData.message}`);
    }

    sendChatMessage(message) {
        if (!this.socket || !this.isConnected) return;

        this.socket.emit('chat-message', { message });
    }

    generatePlayerName() {
        const adjectives = ['Swift', 'Brave', 'Clever', 'Bold', 'Quick', 'Smart', 'Cool', 'Epic'];
        const nouns = ['Explorer', 'Visitor', 'Guest', 'Wanderer', 'Observer', 'Traveler'];

        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];

        return `${adjective}${noun}`;
    }

    generateRandomColor() {
        const colors = [
            0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57,
            0xff9ff3, 0x54a0ff, 0x5f27cd, 0x00d2d3, 0xff9f43
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    isMultiplayerConnected() {
        return this.isConnected;
    }

    getPlayerCount() {
        return this.remotePlayers.size + (this.isConnected ? 1 : 0);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}
