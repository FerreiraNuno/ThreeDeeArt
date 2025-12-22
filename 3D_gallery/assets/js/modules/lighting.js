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
        // ambient light
        this.lights.ambient = new THREE.AmbientLight(
            GALLERY_CONFIG.LIGHTING.AMBIENT.COLOR,
            0.1
        );
        this.scene.add(this.lights.ambient);
        
        // spotlights (color, intensity, distance, angle, ränder, Lichtabnahme)
        this.lights.spotlight1 = new THREE.SpotLight(
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.COLOR,
            5,
            100,
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.ANGLE,
            0.25,
            0.9
        );
        
        this.lights.spotlight1.position.set(12.40, 7, 0);
        this.lights.spotlight1.target.position.set(12.4, 0, 0);
        this.lights.spotlight1.castShadow = true;
        this.scene.add(this.lights.spotlight1, this.lights.spotlight1.target);

        this.lights.spotlight2 = new THREE.SpotLight(
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.COLOR,
            5,
            100,
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.ANGLE,
            0.25,
            0.9
        );
        
        this.lights.spotlight2.position.set(-12.40, 7, 3.5);
        this.lights.spotlight2.target.position.set(-12.4, 0, 0);
        this.lights.spotlight2.castShadow = true;
        this.scene.add(this.lights.spotlight2, this.lights.spotlight2.target);

         this.lights.spotlight3 = new THREE.SpotLight(
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.COLOR,
            5,
            100,
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.ANGLE,
            0.25,
            0.9
        );
        
        this.lights.spotlight3.position.set(-12.40, 7, -3.5);
        this.lights.spotlight3.target.position.set(-12.4, 0, 0);
        this.lights.spotlight3.castShadow = true;
        this.scene.add(this.lights.spotlight3, this.lights.spotlight3.target);

        // Directional light
        this.lights.directional = new THREE.DirectionalLight(
            GALLERY_CONFIG.LIGHTING.DIRECTIONAL.COLOR,
            0.1,
        );

        const directPos = GALLERY_CONFIG.LIGHTING.DIRECTIONAL.POSITION;
        this.lights.directional.position.set(directPos.x, directPos.y, directPos.z);
        this.lights.directional.castShadow = true;

        const ceilingDirectional = new THREE.DirectionalLight(0xffffff, 0.2);
        ceilingDirectional.position.set(0, 0, 0);   // Raummitte
        ceilingDirectional.target.position.set(0, GALLERY_CONFIG.ROOM.WALL_HEIGHT, 0);
        this.scene.add(ceilingDirectional);
        this.scene.add(ceilingDirectional.target);


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

        
        // point lights
        // Punktlichter an der Decke verteilen
        this.lights.ceilingLights = [];

        const ceilingHeight = GALLERY_CONFIG.ROOM.WALL_HEIGHT - 0.1; // leicht unterhalb der Decke
        const roomWidth = GALLERY_CONFIG.ROOM.WIDTH;
        const roomDepth = GALLERY_CONFIG.ROOM.DEPTH;

        // Anzahl Lichter
        const numLightsX = 3; // entlang Breite
        const numLightsZ = 2; // entlang Tiefe

        for (let i = 0; i < numLightsX; i++) {
            for (let j = 0; j < numLightsZ; j++) {
                const light = new THREE.PointLight(
                    GALLERY_CONFIG.LIGHTING.POINT.COLOR,
                    GALLERY_CONFIG.LIGHTING.POINT.INTENSITY,
                    GALLERY_CONFIG.LIGHTING.POINT.DISTANCE
                );

                // Position gleichmäßig verteilen
                const x = -roomWidth / 2 + (i + 0.5) * (roomWidth / numLightsX);
                const z = -roomDepth / 2 + (j + 0.5) * (roomDepth / numLightsZ);
                light.position.set(x, ceilingHeight, z);

                light.castShadow = true;

                this.scene.add(light);
                this.lights.ceilingLights.push(light);
            }
        }
   

        // Add additional directional light from opposite direction to eliminate dark walls
        this.lights.directional2 = new THREE.DirectionalLight(
            0xffffff,
            0.1
        );
        this.lights.directional2.position.set(-directPos.x, directPos.y, -directPos.z);
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
