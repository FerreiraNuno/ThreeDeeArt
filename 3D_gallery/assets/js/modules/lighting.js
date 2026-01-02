import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';

/**
 * Lighting management module
 */
export class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.geometry = null;
        this.lights = {};
        this.setupLighting();
    }

    // Setter
    setGeometryManager(geometry) {
        this.geometry = geometry;
    }
    //Getter
    getGeometryManager() {
        return this.geometry;
    }

    setupLighting() {
        // ambient light
        this.lights.ambient = new THREE.AmbientLight(
            GALLERY_CONFIG.LIGHTING.AMBIENT.COLOR,
            0.05
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

        this.lights.spotlight4 = new THREE.SpotLight(
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.COLOR,
            3,
            15,
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.ANGLE,
            0.1,
            0.9
        );

        this.lights.spotlight4.position.set(-14, 0, -11);
        this.lights.spotlight4.target.position.set(0, -4, -12.49);
        this.lights.spotlight4.castShadow = true;
        this.scene.add(this.lights.spotlight4, this.lights.spotlight4.target);

        this.lights.spotlight5 = new THREE.SpotLight(
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.COLOR,
            3,
            15,
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.ANGLE,
            0.1,
            0.9
        );

        this.lights.spotlight5.position.set(14, 0, -11);
        this.lights.spotlight5.target.position.set(0, -4, -12.49);
        this.lights.spotlight5.castShadow = true;
        this.scene.add(this.lights.spotlight5, this.lights.spotlight5.target);

        this.lights.spotlight6 = new THREE.SpotLight(
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.COLOR,
            3,
            15,
            GALLERY_CONFIG.LIGHTING.SPOTLIGHT.ANGLE,
            0.1,
            0.9
        );

        this.lights.spotlight6.position.set(0, -2, -11);
        this.lights.spotlight6.target.position.set(0, 7, -12.49);
        this.lights.spotlight6.castShadow = true;
        this.scene.add(this.lights.spotlight6, this.lights.spotlight6.target);

        // Spotlights für Corridor erstellen
        this.lights.spotlight7 = new THREE.SpotLight(0xffffff, 5, 15, Math.PI / 2, 0.5, 1);
        this.lights.spotlight8 = new THREE.SpotLight(0xffffff, 5, 15, Math.PI / 2, 0.5, 1);

        this.lights.spotlight7.position.set(0, 10, 35);
        this.lights.spotlight7.target.position.set(0, 0, 35);
        this.lights.spotlight7.castShadow = true;

        this.lights.spotlight8.position.set(0, 10, 15);
        this.lights.spotlight8.target.position.set(0, 0, 15);
        this.lights.spotlight8.castShadow = true;

        this.scene.add(this.lights.spotlight7, this.lights.spotlight7.target);
        this.scene.add(this.lights.spotlight8, this.lights.spotlight8.target);

        // Spotlights für room2 erstellen
        this.lights.spotlight9 = new THREE.SpotLight(new THREE.Color().setRGB(0.6, 0.0, 3.8), 3, 17.5, Math.PI, 0.5, 1);

        this.lights.spotlight9.position.set(0, 8, 57.5);
        this.lights.spotlight9.target.position.set(0, 0, 57.5);
        this.lights.spotlight9.castShadow = true;

        this.scene.add(this.lights.spotlight9, this.lights.spotlight9.target);

        //für Lerp-Color
        this.lights.corridor = [this.lights.spotlight7, this.lights.spotlight8];
        //für Lerp-Intensity
        this.lights.room2lights = [this.lights.spotlight9]

        /*
        // Directional light
        // Lichtquelle in obere Ecke des Raumes für Beleuchtung
     
        this.lights.directional = new THREE.DirectionalLight(
            GALLERY_CONFIG.LIGHTING.DIRECTIONAL.COLOR,
            0.0
        );

        const directPos = GALLERY_CONFIG.LIGHTING.DIRECTIONAL.POSITION;
        this.lights.directional.position.set(directPos.x, directPos.y, directPos.z);
        this.lights.directional.castShadow = true;

        // Add additional directional light from opposite direction to eliminate dark walls
        this.lights.directional2 = new THREE.DirectionalLight(
            0xffffff,
            0.0
        );
        this.lights.directional2.position.set(-directPos.x, directPos.y, -directPos.z);
        this.scene.add(this.lights.directional2);
        */

        //Decke heller machen
        this.lights.ceilingDirectional = new THREE.DirectionalLight(0xffffff, 0.2);

        this.lights.ceilingDirectional.position.set(0, 0, 0);
        this.lights.ceilingDirectional.target.position.set(
            0,
            GALLERY_CONFIG.ROOM.WALL_HEIGHT,
            0
        );
        this.scene.add(this.lights.ceilingDirectional, this.lights.ceilingDirectional.target);

        // Configure shadow properties
        const shadowConfig = GALLERY_CONFIG.SHADOWS;
        this.lights.ceilingDirectional.shadow.mapSize.width = shadowConfig.MAP_SIZE;
        this.lights.ceilingDirectional.shadow.mapSize.height = shadowConfig.MAP_SIZE;
        this.lights.ceilingDirectional.shadow.camera.near = shadowConfig.CAMERA_NEAR;
        this.lights.ceilingDirectional.shadow.camera.far = shadowConfig.CAMERA_FAR;
        this.lights.ceilingDirectional.shadow.camera.left = shadowConfig.CAMERA_LEFT;
        this.lights.ceilingDirectional.shadow.camera.right = shadowConfig.CAMERA_RIGHT;
        this.lights.ceilingDirectional.shadow.camera.top = shadowConfig.CAMERA_TOP;
        this.lights.ceilingDirectional.shadow.camera.bottom = shadowConfig.CAMERA_BOTTOM;

        this.scene.add(this.lights.ceilingDirectional);


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
                    1,
                    GALLERY_CONFIG.LIGHTING.POINT.DISTANCE,
                    1
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
    }

    getLights() {
        return this.lights;
    }

    updateLightIntensity(lightType, intensity) {
        if (this.lights[lightType]) {
            this.lights[lightType].intensity = intensity;
        }
    }

    addEmissiveLight(object,
        {
            color = 0xff00ff,
            intensity = 1,
            distance = 10,
            castShadow = false
        } = {}) {
        const light = new THREE.PointLight(color, intensity, distance);

        light.castShadow = castShadow;

        // bessere Schatten
        light.shadow.mapSize.set(1024, 1024);
        // Bias für bewegtes Licht
        light.shadow.bias = -0.0004;
        light.shadow.normalBias = 0.03;
        light.shadow.radius = 2;

        // Licht INS Objekt hängen
        object.add(light);

        return light;
    }
}
