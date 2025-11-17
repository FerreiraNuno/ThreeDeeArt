import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';

/**
 * Camera management module
 */
export class CameraManager {
    constructor() {
        this.camera = new THREE.PerspectiveCamera(
            GALLERY_CONFIG.CAMERA.FOV,
            window.innerWidth / window.innerHeight,
            GALLERY_CONFIG.CAMERA.NEAR,
            GALLERY_CONFIG.CAMERA.FAR
        );

        this.camera.position.z = GALLERY_CONFIG.CAMERA.INITIAL_Z;
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
