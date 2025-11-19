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
        // Increased ambient light for better overall illumination
        this.lights.ambient = new THREE.AmbientLight(
            GALLERY_CONFIG.LIGHTING.AMBIENT.COLOR,
            0.6 // Increased from 0.3 to brighten dark areas
        );
        this.scene.add(this.lights.ambient);

        // Directional light (like sunlight) with shadows
        this.lights.directional = new THREE.DirectionalLight(
            GALLERY_CONFIG.LIGHTING.DIRECTIONAL.COLOR,
            GALLERY_CONFIG.LIGHTING.DIRECTIONAL.INTENSITY
        );

        const pos = GALLERY_CONFIG.LIGHTING.DIRECTIONAL.POSITION;
        this.lights.directional.position.set(pos.x, pos.y, pos.z);
        this.lights.directional.castShadow = true;

        // Configure shadow properties
        const shadowConfig = GALLERY_CONFIG.SHADOWS;
        this.lights.directional.shadow.mapSize.width = shadowConfig.MAP_SIZE;
        this.lights.directional.shadow.mapSize.height = shadowConfig.MAP_SIZE;
        this.lights.directional.shadow.camera.near = shadowConfig.CAMERA_NEAR;
        this.lights.directional.shadow.camera.far = shadowConfig.CAMERA_FAR;
        this.lights.directional.shadow.camera.left = shadowConfig.CAMERA_LEFT;
        this.lights.directional.shadow.camera.right = shadowConfig.CAMERA_RIGHT;
        this.lights.directional.shadow.camera.top = shadowConfig.CAMERA_TOP;
        this.lights.directional.shadow.camera.bottom = shadowConfig.CAMERA_BOTTOM;

        this.scene.add(this.lights.directional);

        // Point light for additional illumination
        const pointPos = GALLERY_CONFIG.LIGHTING.POINT.POSITION;
        this.lights.point = new THREE.PointLight(
            GALLERY_CONFIG.LIGHTING.POINT.COLOR,
            GALLERY_CONFIG.LIGHTING.POINT.INTENSITY,
            GALLERY_CONFIG.LIGHTING.POINT.DISTANCE
        );
        this.lights.point.position.set(pointPos.x, pointPos.y, pointPos.z);
        this.lights.point.castShadow = true;
        this.scene.add(this.lights.point);

        // Add additional directional light from opposite direction to eliminate dark walls
        this.lights.directional2 = new THREE.DirectionalLight(
            0xffffff,
            0.4 // Lower intensity secondary light
        );
        this.lights.directional2.position.set(-pos.x, pos.y, -pos.z);
        this.scene.add(this.lights.directional2);
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
