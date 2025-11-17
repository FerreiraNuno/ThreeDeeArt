import * as THREE from 'three';
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

        this.camera.position.z = GALLERY_CONFIG.CAMERA.INITIAL_Z;
        this.camera.position.y = GALLERY_CONFIG.CAMERA.INITIAL_Y;

        // Mouse control variables
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.mouseSensitivity = 0.005;

        // Camera rotation state (Euler angles)
        this.yaw = 0; // horizontal rotation
        this.pitch = 0; // vertical rotation
        this.maxPitch = Math.PI / 2 - 0.1; // prevent looking too far up/down

        // Smooth keyboard movement state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        this.setupControls();
    }

    setupControls() {
        this.setupMouseControls();
        this.setupKeyboardControls();
    }

    setupMouseControls() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', (event) => {
            this.isMouseDown = true;
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            canvas.style.cursor = 'grab';
        });

        canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
            canvas.style.cursor = 'grab';
        });

        canvas.addEventListener('mousemove', (event) => {
            if (!this.isMouseDown) return;

            const deltaX = event.clientX - this.mouseX;
            const deltaY = this.mouseY - event.clientY;

            this.mouseX = event.clientX;
            this.mouseY = event.clientY;

            // Update camera rotation based on mouse movement
            this.updateCameraRotation(deltaX, deltaY);
        });

        // Set initial cursor style
        canvas.style.cursor = 'grab';
    }

    updateCameraRotation(deltaX, deltaY) {
        // Update yaw (horizontal rotation) and pitch (vertical rotation)
        this.yaw -= deltaX * this.mouseSensitivity;
        this.pitch += deltaY * this.mouseSensitivity;

        // Clamp pitch to prevent camera from flipping
        this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));

        // Apply rotation to camera without changing its position
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
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

        const moveSpeed = GALLERY_CONFIG.CAMERA.MOVE_SPEED * deltaTime * 60; // Normalize for 60fps

        // Get camera direction vectors
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0; // Keep movement on XZ plane
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(this.camera.up, forward).normalize();

        const translation = new THREE.Vector3();

        // Accumulate movement from all pressed keys
        if (this.keys.forward) {
            translation.add(forward.clone().multiplyScalar(moveSpeed));
        }
        if (this.keys.backward) {
            translation.add(forward.clone().multiplyScalar(-moveSpeed));
        }
        if (this.keys.left) {
            translation.add(right.clone().multiplyScalar(moveSpeed));
        }
        if (this.keys.right) {
            translation.add(right.clone().multiplyScalar(-moveSpeed));
        }

        // Calculate new position
        const newPosition = this.camera.position.clone().add(translation);

        // Apply boundary constraints
        this.applyBoundaryConstraints(newPosition);

        // Apply the constrained position
        this.camera.position.copy(newPosition);
    }

    /**
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
