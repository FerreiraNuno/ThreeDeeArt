import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GALLERY_CONFIG, KEY_MAPPINGS } from '../config/constants.js';

/**
 * Controls management module
 */
export class ControlsManager {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.orbitControls = null;
        this.setupControls();
        this.setupKeyboardControls();
    }

    setupControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = GALLERY_CONFIG.CONTROLS.ENABLE_DAMPING;
        this.orbitControls.dampingFactor = GALLERY_CONFIG.CONTROLS.DAMPING_FACTOR;
    }

    setupKeyboardControls() {
        document.addEventListener("keydown", (event) => this.handleKeyDown(event), false);
    }

    handleKeyDown(event) {
        const moveSpeed = GALLERY_CONFIG.CAMERA.MOVE_SPEED;

        // Get camera direction vectors
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0; // Keep movement on XZ plane
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(this.camera.up, forward).normalize();

        const translation = new THREE.Vector3();

        switch (event.code) {
            case KEY_MAPPINGS.FORWARD:
                translation.copy(forward).multiplyScalar(moveSpeed);
                break;
            case KEY_MAPPINGS.BACKWARD:
                translation.copy(forward).multiplyScalar(-moveSpeed);
                break;
            case KEY_MAPPINGS.LEFT:
                translation.copy(right).multiplyScalar(moveSpeed);
                break;
            case KEY_MAPPINGS.RIGHT:
                translation.copy(right).multiplyScalar(-moveSpeed);
                break;
            default:
                return;
        }

        // Apply translation to camera and orbit target
        this.camera.position.add(translation);
        this.orbitControls.target.add(translation);
    }

    update() {
        if (this.orbitControls) {
            this.orbitControls.update();
        }
    }

    getOrbitControls() {
        return this.orbitControls;
    }
}
