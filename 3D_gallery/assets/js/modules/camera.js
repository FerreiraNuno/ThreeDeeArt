import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GALLERY_CONFIG, KEY_MAPPINGS } from '../config/constants.js';

/**
 * Kamera- und Steuerungs-Verwaltung
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

        this.controls = new PointerLockControls(this.camera, document.body);

        // Vertikalen Blickwinkel begrenzen (verhindert Gimbal-Lock)
        this.controls.minPolarAngle = Math.PI / 180;
        this.controls.maxPolarAngle = Math.PI - (Math.PI / 180);

        // Tastatursteuerung
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        // Sprung-Physik
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
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                this.controls.lock();
            }
        });

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

        this.jumpState.isOnGround = currentPosition.y <= groundLevel;

        if (this.keys.jump && this.jumpState.isOnGround && !this.jumpState.isJumping) {
            this.jumpState.isJumping = true;
            this.jumpState.verticalVelocity = GALLERY_CONFIG.CAMERA.JUMP_VELOCITY;
            this.jumpState.isOnGround = false;
        }

        if (this.jumpState.isJumping || !this.jumpState.isOnGround) {
            this.jumpState.verticalVelocity += GALLERY_CONFIG.CAMERA.GRAVITY * deltaTime;
            currentPosition.y += this.jumpState.verticalVelocity * deltaTime;

            if (currentPosition.y <= groundLevel) {
                currentPosition.y = groundLevel;
                this.jumpState.verticalVelocity = 0;
                this.jumpState.isJumping = false;
                this.jumpState.isOnGround = true;
            }
        }
    }

    updateMovement(deltaTime) {
        this.updateJumpPhysics(deltaTime);

        if (!this.keys.forward && !this.keys.backward && !this.keys.left && !this.keys.right) {
            return;
        }

        const moveSpeed = GALLERY_CONFIG.CAMERA.MOVE_SPEED * deltaTime;
        const velocity = new THREE.Vector3();

        if (this.keys.forward) velocity.z -= 1;
        if (this.keys.backward) velocity.z += 1;
        if (this.keys.left) velocity.x -= 1;
        if (this.keys.right) velocity.x += 1;

        velocity.normalize();
        velocity.multiplyScalar(moveSpeed);

        // Blickrichtung der Kamera
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();
        const right = new THREE.Vector3();
        right.crossVectors(direction, this.camera.up);

        const movement = new THREE.Vector3();
        movement.addScaledVector(direction, -velocity.z);
        movement.addScaledVector(right, velocity.x);

        const previousPosition = this.controls.getObject().position.clone();
        const newPosition = previousPosition.clone().add(movement);

        newPosition.y = previousPosition.y;

        // Temporäre BoundingBox für Kollisionserkennung
        const tempPlayerBB = new THREE.Box3().setFromCenterAndSize(
            newPosition,
            new THREE.Vector3(1, 1, 1)
        );

        let collided = false;
        const cube = this.geometryManager.getObjects().cube;
        if (tempPlayerBB.intersectsBox(cube.BBox)) {
            collided = true;
            console.log('Kollision!');
        }

        if (!collided) {
            this.controls.getObject().position.copy(newPosition);
            this.applyBoundaryConstraints(this.controls.getObject().position);
        }
    }

    /**
     * Prüft ob Kamera die Galerie-Grenzen überschritten hat und korrigiert die Position
     */
    applyBoundaryConstraints(position) {
        const { WIDTH, DEPTH } = GALLERY_CONFIG.ROOM;
        const { WIDTH: CORRIDOR_WIDTH } = GALLERY_CONFIG.CORRIDOR;
        const buffer = GALLERY_CONFIG.CAMERA.BOUNDARY_BUFFER;

        const room1Z = GALLERY_CONFIG.LAYOUT.ROOM1_CENTER.z;
        const room2Z = GALLERY_CONFIG.LAYOUT.ROOM2_CENTER.z;

        const overallBounds = {
            MIN_X: -WIDTH / 2 + buffer,
            MAX_X: WIDTH / 2 - buffer,
            MIN_Z: room1Z - DEPTH / 2 + buffer,
            MAX_Z: room2Z + DEPTH / 2 - buffer
        };

        const corridorStartZ = room1Z + DEPTH / 2;
        const corridorEndZ = room2Z - DEPTH / 2;
        const inCorridor = position.z >= corridorStartZ && position.z <= corridorEndZ;

        if (inCorridor) {
            position.x = Math.max(-CORRIDOR_WIDTH / 2 + buffer, Math.min(CORRIDOR_WIDTH / 2 - buffer, position.x));
        } else {
            position.x = Math.max(overallBounds.MIN_X, Math.min(overallBounds.MAX_X, position.x));
        }

        position.z = Math.max(overallBounds.MIN_Z, Math.min(overallBounds.MAX_Z, position.z));
    }

    checkCollisionWithObject() {
        const object = this.geometryManager.getObjects().object;
        if (object.BBox.intersects(this.camera.BBox)) {
            return true;
        }
        return false;
    }

    update(deltaTime) {
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

    /**
     * Aktuelle Kamera-Position abrufen
     */
    getPosition() {
        return this.controls.getObject().position.clone();
    }

    /**
     * Aktuelle Kamera-Rotation abrufen
     */
    getRotation() {
        return this.controls.getObject().rotation.clone();
    }

    /**
     * Kamera-Position setzen
     */
    setPosition(position) {
        this.controls.getObject().position.copy(position);
    }

    /**
     * Kamera-Rotation setzen
     */
    setRotation(rotation) {
        this.controls.getObject().rotation.copy(rotation);
    }
}
