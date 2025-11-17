import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';

/**
 * Lighting management module
 */
export class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.lights = {};
        this.setupLighting();
    }

    setupLighting() {
        // Ambient light
        this.lights.ambient = new THREE.AmbientLight(
            GALLERY_CONFIG.LIGHTING.AMBIENT.COLOR,
            GALLERY_CONFIG.LIGHTING.AMBIENT.INTENSITY
        );
        this.scene.add(this.lights.ambient);

        // Directional light
        this.lights.directional = new THREE.DirectionalLight(
            GALLERY_CONFIG.LIGHTING.DIRECTIONAL.COLOR,
            GALLERY_CONFIG.LIGHTING.DIRECTIONAL.INTENSITY
        );

        const pos = GALLERY_CONFIG.LIGHTING.DIRECTIONAL.POSITION;
        this.lights.directional.position.set(pos.x, pos.y, pos.z);
        this.scene.add(this.lights.directional);
    }

    getLights() {
        return this.lights;
    }

    updateLightIntensity(lightType, intensity) {
        if (this.lights[lightType]) {
            this.lights[lightType].intensity = intensity;
        }
    }
}
