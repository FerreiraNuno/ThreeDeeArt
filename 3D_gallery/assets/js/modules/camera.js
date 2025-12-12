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
            right: false
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
        }
    }

    updateMovement(deltaTime = 1 / 60) {
        if (!this.keys.forward && !this.keys.backward && !this.keys.left && !this.keys.right) {
            return; // No movement needed
        }

        const moveSpeed = GALLERY_CONFIG.CAMERA.MOVE_SPEED * deltaTime;
        const velocity = new THREE.Vector3();

        if (this.keys.forward) velocity.z -= 1;
        if (this.keys.backward) velocity.z += 1;
        if (this.keys.left) velocity.x -= 1;
        if (this.keys.right) velocity.x += 1;

        velocity.normalize();
        velocity.multiplyScalar(moveSpeed);

        // Apply movement relative to camera direction
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

        // Temporäre Kamera-BoundingBox für die geplante Position
        const tempPlayerBB = new THREE.Box3().setFromCenterAndSize(
            newPosition,
            new THREE.Vector3(1,1,1)  // gleiche Größe wie in checkCollision()
        );

        // Kollision checken
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
    
    checkCollision() {
        const playerBB = new THREE.Box3();
        const cameraWorldPos = new THREE.Vector3();

        this.controls.getObject().getWorldPosition(cameraWorldPos);    //camera repräsentiert player's position -> camera position in vector
        playerBB.setFromCenterAndSize(  //BB wird gesetzt quasi um Player(=camera)
            cameraWorldPos,
            new THREE.Vector3(1, 1, 1)
        );

        // Cube aus GeometryManager holen
        const cube = this.geometryManager.getObjects().cube;
        
        if (playerBB.intersectsBox(cube.BBox)) {
            console.log('Kollision!');
            return true;
        }

        return false;

        /*
        const walls = this.geometryManager.getObjects().walls;
        for (const wall of Object.values(walls)){
            if(playerBB.intersectsBox(wall.BBox)){
                return true;
            }
        }
        return false;
        */
    }


    
    
    /** -------- SPÄTER DURCH KOLLISIONSABFRAGE ERSETZEN?! -------
     * 
     * Apply boundary constraints to keep camera within room bounds
     * @param {THREE.Vector3} position - The position to constrain
     */
    applyBoundaryConstraints(position) {
        const { WIDTH, DEPTH, WALL_HEIGHT } = GALLERY_CONFIG.ROOM;
        const buffer = GALLERY_CONFIG.CAMERA.BOUNDARY_BUFFER;

        // Calculate dynamic boundaries based on room dimensions
        const bounds = {
            MIN_X: -WIDTH / 2 + buffer,
            MAX_X: WIDTH / 2 - buffer,
            MIN_Z: -DEPTH / 2 + buffer,
            MAX_Z: DEPTH / 2 - buffer,
            MIN_Y: 0,  // Floor is at -1, so camera should stay above 0
            MAX_Y: WALL_HEIGHT - 2  // Ceiling height minus buffer
        };

        // Constrain X position (left/right walls)
        position.x = Math.max(bounds.MIN_X, Math.min(bounds.MAX_X, position.x));

        // Constrain Z position (front/back walls)
        position.z = Math.max(bounds.MIN_Z, Math.min(bounds.MAX_Z, position.z));

        // Constrain Y position (floor/ceiling)
        position.y = Math.max(bounds.MIN_Y, Math.min(bounds.MAX_Y, position.y));
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
