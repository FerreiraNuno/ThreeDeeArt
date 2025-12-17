import * as THREE from 'three';

/**
 * Multiplayer management module for handling WebSocket connections and player synchronization
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
        this.updateInterval = 100; // Send position updates every 100ms

        this.init();
    }

    /**
     * Initialize WebSocket connection
     */
    init() {
        try {
            // Connect to the server (adjust URL if needed)
            this.socket = io();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
        }
    }

    /**
     * Setup WebSocket event listeners
     */
    setupEventListeners() {
        if (!this.socket) return;

        // Connection established
        this.socket.on('connect', () => {
            console.log('Connected to multiplayer server');
            this.isConnected = true;
            this.localPlayerId = this.socket.id;
            this.joinRoom();
        });

        // Connection lost
        this.socket.on('disconnect', () => {
            console.log('Disconnected from multiplayer server');
            this.isConnected = false;
            this.localPlayerId = null;
        });

        // Receive list of existing players when joining
        this.socket.on('players-list', (players) => {
            console.log('Received players list:', players);
            players.forEach(player => {
                if (player.id !== this.localPlayerId) {
                    this.addRemotePlayer(player);
                }
            });
        });

        // New player joined
        this.socket.on('player-joined', (player) => {
            console.log('Player joined:', player.name);
            this.addRemotePlayer(player);
        });

        // Player left
        this.socket.on('player-left', (playerId) => {
            console.log('Player left:', playerId);
            this.removeRemotePlayer(playerId);
        });

        // Player moved
        this.socket.on('player-moved', (movementData) => {
            this.updateRemotePlayer(movementData);
        });

        // Chat message received (optional)
        this.socket.on('chat-message', (messageData) => {
            this.displayChatMessage(messageData);
        });
    }

    /**
     * Join the multiplayer room
     */
    joinRoom() {
        if (!this.socket || !this.isConnected) return;

        const cameraPos = this.camera.getPosition();

        // Calculate proper Y rotation from camera's world direction
        const direction = this.camera.getWorldDirection();
        const yRotation = Math.atan2(direction.x, direction.z);

        const playerData = {
            name: this.generatePlayerName(),
            position: {
                x: cameraPos.x,
                y: cameraPos.y, // Keep camera height for position tracking
                z: cameraPos.z
            },
            rotation: {
                x: 0, // We only need Y rotation for player orientation
                y: yRotation, // Proper 360-degree horizontal look direction
                z: 0
            },
            color: this.generateRandomColor()
        };

        this.socket.emit('player-join', playerData);
    }

    /**
     * Add a remote player to the scene
     */
    addRemotePlayer(playerData) {
        if (this.remotePlayers.has(playerData.id)) return;

 // Calculated from person geometry: hip(0.9) + foot(-0.67) = 0.23
        const initialY = playerData.position.y > 1.6 ?
            (playerData.position.y - 1.6 + footOffset) : footOffset;

        const groundPosition = new THREE.Vector3(
            playerData.position.x,
            initialY, // Place feet on ground level or jumping height
            playerData.position.z
        );

        const playerProp = this.personManager.createPerson(
            groundPosition,
            {
                name: `remote_${playerData.id}`,
                clothingColor: playerData.color || 0x4169e1,
                scale: 1
            }
        );

        // Set initial rotation to match camera direction
        // Use the calculated Y rotation for proper 360-degree orientation
        playerProp.rotation.y = playerData.rotation.y;

        console.log(`Player ${playerData.name} created with Y rotation: ${playerData.rotation.y} radians (${(playerData.rotation.y * 180 / Math.PI).toFixed(1)} degrees)`);

        // Add player name label (optional)
        this.addPlayerNameLabel(playerProp, playerData.name);

        this.remotePlayers.set(playerData.id, {
            prop: playerProp,
            data: playerData
        });

        console.log(`Added remote player: ${playerData.name}`);
    }

    /**
     * Remove a remote player from the scene
     */
    removeRemotePlayer(playerId) {
        const remotePlayer = this.remotePlayers.get(playerId);
        if (remotePlayer) {
            // Remove from scene
            this.scene.remove(remotePlayer.prop);

            // Remove from PersonManager
            this.personManager.removePerson(`remote_${playerId}`);

            // Remove from our tracking
            this.remotePlayers.delete(playerId);

            console.log(`Removed remote player: ${playerId}`);
        }
    }

    /**
     * Update remote player position and rotation
     */
    updateRemotePlayer(movementData) {
        const remotePlayer = this.remotePlayers.get(movementData.id);
        if (remotePlayer) {
            const prop = remotePlayer.prop;

            // Store previous position for movement detection
            if (!prop.previousPosition) {
                prop.previousPosition = prop.position.clone();
            }

            // Convert camera position to ground-level player position
            // Handle jumping by preserving Y position if player is above ground
            // Account for person's foot offset (feet are 0.23 units above person group origin)
            const footOffset = -0.23; // Calculated from person geometry: hip(0.9) + foot(-0.67) = 0.23
            const targetY = movementData.position.y > 1.6 ?
                (movementData.position.y - 1.6 + footOffset) : footOffset; // Offset by camera height and foot position

            const targetPosition = new THREE.Vector3(
                movementData.position.x,
                targetY, // Allow jumping while keeping feet on ground when not jumping
                movementData.position.z
            );

            // Calculate movement for animation
            const movement = targetPosition.distanceTo(prop.previousPosition);
            const isMoving = movement > 0.01;

            // Update animation state for walking
            if (prop.animationState) {
                // Smooth transition of walking state
                if (isMoving) {
                    prop.animationState.isWalking = true;
                } else {
                    // Don't immediately stop walking animation, let it fade out naturally
                    // The PersonManager will handle the smooth transition to neutral
                }
            }

            // Smoothly interpolate horizontal position
            prop.position.x = THREE.MathUtils.lerp(prop.position.x, targetPosition.x, 0.15);
            prop.position.z = THREE.MathUtils.lerp(prop.position.z, targetPosition.z, 0.15);

            // Update previous position
            prop.previousPosition.copy(targetPosition);

            // Handle smooth jumping animation
            this.personManager.updateJumpingAnimation(prop, targetY);

            // Update rotation to match camera direction
            // Use the calculated Y rotation for proper 360-degree orientation
            prop.rotation.y = movementData.rotation.y;

            // Update bounding box and helper to match new position
            this.personManager.updatePersonBoundingBox(`remote_${movementData.id}`);
        }
    }

    /**
     * Send local player movement to server
     */
    sendMovement(position, rotation) {
        if (!this.socket || !this.isConnected) return;

        const now = Date.now();
        if (now - this.lastPositionUpdate < this.updateInterval) return;

        // Calculate proper Y rotation from camera's world direction
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
                y: yRotation, // Use calculated Y rotation for proper 360-degree mapping
                z: rotation.z
            },
            // Add movement state for animations
            isJumping: position.y > 1.6 + 0.1, // Jumping if above camera ground level + threshold
            timestamp: Date.now()
        });

        this.lastPositionUpdate = now;
    }

    /**
     * Add a name label above a player
     */
    addPlayerNameLabel(playerProp, name) {
        // Create text sprite for player name (simplified version)
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

    /**
     * Display chat message (optional feature)
     */
    displayChatMessage(messageData) {
        console.log(`[${messageData.playerName}]: ${messageData.message}`);
        // Could implement UI chat display here
    }

    /**
     * Send chat message (optional feature)
     */
    sendChatMessage(message) {
        if (!this.socket || !this.isConnected) return;

        this.socket.emit('chat-message', { message });
    }

    /**
     * Generate a random player name
     */
    generatePlayerName() {
        const adjectives = ['Swift', 'Brave', 'Clever', 'Bold', 'Quick', 'Smart', 'Cool', 'Epic'];
        const nouns = ['Explorer', 'Visitor', 'Guest', 'Wanderer', 'Observer', 'Traveler'];

        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];

        return `${adjective}${noun}`;
    }

    /**
     * Generate a random color for the player
     */
    generateRandomColor() {
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

    /**
     * Get connection status
     */
    isMultiplayerConnected() {
        return this.isConnected;
    }

    /**
     * Get number of connected players
     */
    getPlayerCount() {
        return this.remotePlayers.size + (this.isConnected ? 1 : 0);
    }

    /**
     * Cleanup when shutting down
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}
