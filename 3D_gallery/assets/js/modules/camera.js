import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GALLERY_CONFIG, KEY_MAPPINGS } from '../config/constants.js';

/**
 * Combined Camera and Controls management module
 */
export class CameraManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.camera = new THREE.PerspectiveCamera(
            GALLERY_CONFIG.CAMERA.FOV,
            window.innerWidth / window.innerHeight,
            GALLERY_CONFIG.CAMERA.NEAR,
            GALLERY_CONFIG.CAMERA.FAR
        );

        this.camera.position.set(0, GALLERY_CONFIG.CAMERA.INITIAL_Y, GALLERY_CONFIG.CAMERA.INITIAL_Z);

        // Setup pointer lock controls
        this.controls = new PointerLockControls(this.camera, document.body);

        // Smooth keyboard movement state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        // Jump physics state
        this.jumpState = {
            isJumping: false,
            verticalVelocity: 0,
            isOnGround: true
        };

        this.setupControls();
    }

    setGeometryManager(geometryManager) {
        this.geometryManager = geometryManager;
    }


    setupControls() {
        this.setupPointerLock();
        this.setupKeyboardControls();
    }

    setupPointerLock() {
        // Click to enable pointer lock

        // dragclick mouse to enable pointer lock
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                this.controls.lock();
            }
        });

        // Listen for pointer lock events
        this.controls.addEventListener('lock', () => {
            console.log('Pointer locked');
        });

        this.controls.addEventListener('unlock', () => {
            console.log('Pointer unlocked');
        });
    }

    setupKeyboardControls() {
        document.addEventListener("keydown", (event) => this.handleKeyDown(event), false);
        document.addEventListener("keyup", (event) => this.handleKeyUp(event), false);
    }

    handleKeyDown(event) {
        switch (event.code) {
            case KEY_MAPPINGS.FORWARD:
                this.keys.forward = true;
                break;
            case KEY_MAPPINGS.BACKWARD:
                this.keys.backward = true;
                break;
            case KEY_MAPPINGS.LEFT:
                this.keys.left = true;
                break;
            case KEY_MAPPINGS.RIGHT:
                this.keys.right = true;
                break;
            case KEY_MAPPINGS.JUMP:
                this.keys.jump = true;
                break;
        }
    }

    handleKeyUp(event) {
        switch (event.code) {
            case KEY_MAPPINGS.FORWARD:
                this.keys.forward = false;
                break;
            case KEY_MAPPINGS.BACKWARD:
                this.keys.backward = false;
                break;
            case KEY_MAPPINGS.LEFT:
                this.keys.left = false;
                break;
            case KEY_MAPPINGS.RIGHT:
                this.keys.right = false;
                break;
            case KEY_MAPPINGS.JUMP:
                this.keys.jump = false;
                break;
        }
    }

    updateJumpPhysics(deltaTime) {
        const currentPosition = this.controls.getObject().position;
        const groundLevel = GALLERY_CONFIG.CAMERA.GROUND_LEVEL;

        // Check if player is on ground
        this.jumpState.isOnGround = currentPosition.y <= groundLevel;

        // Handle jump input
        if (this.keys.jump && this.jumpState.isOnGround && !this.jumpState.isJumping) {
            this.jumpState.isJumping = true;
            this.jumpState.verticalVelocity = GALLERY_CONFIG.CAMERA.JUMP_VELOCITY;
            this.jumpState.isOnGround = false;
        }

        // Apply gravity and update vertical position
        if (this.jumpState.isJumping || !this.jumpState.isOnGround) {
            this.jumpState.verticalVelocity += GALLERY_CONFIG.CAMERA.GRAVITY * deltaTime;
            currentPosition.y += this.jumpState.verticalVelocity * deltaTime;

            // Check if landed
            if (currentPosition.y <= groundLevel) {
                currentPosition.y = groundLevel;
                this.jumpState.verticalVelocity = 0;
                this.jumpState.isJumping = false;
                this.jumpState.isOnGround = true;
            }
        }
    }

    updateMovement(deltaTime) {
        // Update jump physics first
        this.updateJumpPhysics(deltaTime);

        // Handle horizontal movement
        if (!this.keys.forward && !this.keys.backward && !this.keys.left && !this.keys.right) {
            return; // No horizontal movement needed
        }

        const moveSpeed = GALLERY_CONFIG.CAMERA.MOVE_SPEED * deltaTime;
        const velocity = new THREE.Vector3();

        if (this.keys.forward) velocity.z -= 1;
        if (this.keys.backward) velocity.z += 1;
        if (this.keys.left) velocity.x -= 1;
        if (this.keys.right) velocity.x += 1;

        velocity.normalize();
        velocity.multiplyScalar(moveSpeed);

        // get direction where the camera is pointing
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0; // Keep movement horizontal
        direction.normalize();
        const right = new THREE.Vector3();
        right.crossVectors(direction, this.camera.up);

        const movement = new THREE.Vector3();
        movement.addScaledVector(direction, -velocity.z);
        movement.addScaledVector(right, velocity.x);

        const previousPosition = this.controls.getObject().position.clone(); //vorherige Position merken
        const newPosition = previousPosition.clone().add(movement);

        // Preserve the Y position from jump physics
        newPosition.y = previousPosition.y;

        // Temporäre Kamera-BoundingBox für die geplante Position
        const tempPlayerBB = new THREE.Box3().setFromCenterAndSize(
            newPosition,
            new THREE.Vector3(1, 1, 1)
        );

        // Kollision mit Objekt checken
        let collided = false;
        const cube = this.geometryManager.getObjects().cube;
        if (tempPlayerBB.intersectsBox(cube.BBox)) {
            collided = true;
            console.log('Kollision!');
        }

        // Wenn keine Kollision -> Kamera bewegen
        if (!collided) {
            this.controls.getObject().position.copy(newPosition);
            this.applyBoundaryConstraints(this.controls.getObject().position);
        }
    }

    /**
    * Is called every frame. It checks if the camera has surpassed the boundaries of the room
    * and places it back to the room before the frame is rendered.
    * This allows the camera to still move at an angle to the walls.
    */
    applyBoundaryConstraints(position) {
        // Room dimensions
        const { WIDTH, DEPTH, WALL_HEIGHT } = GALLERY_CONFIG.ROOM;
        // Distance from walls where collision detection starts
        const buffer = GALLERY_CONFIG.CAMERA.BOUNDARY_BUFFER;

        const bounds = {
            MIN_X: -WIDTH / 2 + buffer,
            MAX_X: WIDTH / 2 - buffer,
            MIN_Z: -DEPTH / 2 + buffer,
            MAX_Z: DEPTH / 2 - buffer,
        };

        // Constrain X position (left/right walls)
        position.x = Math.max(bounds.MIN_X, Math.min(bounds.MAX_X, position.x));

        // Constrain Z position (front/back walls)
        position.z = Math.max(bounds.MIN_Z, Math.min(bounds.MAX_Z, position.z));
    }

    checkCollisionWithObject() {
        const object = this.geometryManager.getObjects().object;
        if (object.BBox.intersects(this.camera.BBox)) {
            return true;
        }
        return false;
    }

    update(deltaTime) {
        // Update smooth keyboard movement
        this.updateMovement(deltaTime);
    }

    getCamera() {
        return this.camera;
    }

    getControls() {
        return this.controls;
    }

    updateAspectRatio() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    getWorldDirection() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        return direction;
    }
}
