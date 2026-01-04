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
        // Subtle ambient light to fill dark corners
        this.lights.ambient = new THREE.AmbientLight(0x404040, 4);
        this.scene.add(this.lights.ambient);

        // Spotlights für room2 erstellen (increased intensity)
        this.lights.room2light = new THREE.SpotLight(new THREE.Color().setRGB(0.6, 0.0, 3.8), 8, 20, Math.PI, 0.5, 1);

        this.lights.room2light.position.set(0, 7.5, 57.5);
        this.lights.room2light.target.position.set(0, 0, 57.5);
        this.lights.room2light.castShadow = true;

        this.scene.add(this.lights.room2light, this.lights.room2light.target);

        // Create modern fixture for room2 purple light
        this.createRoom2PurpleFixture(0, 8, 57.5);

        //für Lerp-Intensity
        this.lights.room2lights = [this.lights.room2light]



        // Create shared materials for light fixtures
        this.createFixtureMaterials();

        // Create room ceiling lights with fixtures
        this.createRoomCeilingLights();

        // Create corridor ceiling lights
        this.createCorridorLights();

        // Create artwork spotlights
        this.createArtworkSpotlights();
    }

    /**
     * Create shared materials for ceiling light fixtures
     */
    createFixtureMaterials() {
        // Light fixture material (visible lamp housing)
        this.fixtureMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.4,
            metalness: 0.7
        });

        // Emissive light cover material (brighter glow)
        this.lightCoverMaterial = new THREE.MeshStandardMaterial({
            color: 0xfff8f0,
            emissive: 0xfff8f0,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.0
        });
    }

    /**
     * Create a ceiling light fixture with point light
     * @param {number} x - X position
     * @param {number} y - Y position (ceiling height)
     * @param {number} z - Z position
     * @param {number} intensity - Light intensity
     * @returns {THREE.PointLight} The created point light
     */
    createCeilingLightFixture(x, y, z, intensity = 2.5) {
        const ceilingHeight = y;
        const lightY = ceilingHeight - 3;

        // Create point light (warm white, strong illumination)
        const light = new THREE.PointLight(
            0xfff5e6,  // Warm white light
            intensity,
            30,        // Distance (increased for better coverage)
            1.5        // Decay (reduced for stronger reach)
        );
        light.position.set(x, lightY, z);

        // Enable shadow casting with soft shadows
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        light.shadow.bias = -0.002;
        light.shadow.normalBias = 0.02;
        light.shadow.radius = 4;  // Soft shadow edges
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 25;

        this.scene.add(light);

        // Create visible light fixture (ceiling mount)
        const fixtureGroup = new THREE.Group();
        fixtureGroup.position.set(x, ceilingHeight, z);

        // Ceiling mount plate
        const mountGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.04, 12);
        const mount = new THREE.Mesh(mountGeometry, this.fixtureMaterial);
        mount.position.y = -0.02;
        fixtureGroup.add(mount);

        // Light fixture housing
        const housingGeometry = new THREE.CylinderGeometry(0.18, 0.28, 0.12, 12);
        const housing = new THREE.Mesh(housingGeometry, this.fixtureMaterial);
        housing.position.y = -0.1;
        fixtureGroup.add(housing);

        // Light cover/diffuser (emissive - the part that glows)
        const coverGeometry = new THREE.CylinderGeometry(0.26, 0.26, 0.06, 12);
        const cover = new THREE.Mesh(coverGeometry, this.lightCoverMaterial);
        cover.position.y = -0.19;
        fixtureGroup.add(cover);

        this.scene.add(fixtureGroup);

        return light;
    }

    /**
     * Create ceiling lights for the main room (Room 1)
     * Adds point lights with visible lamp fixtures
     */
    createRoomCeilingLights() {
        this.lights.ceilingLights = [];

        const ceilingHeight = GALLERY_CONFIG.ROOM.WALL_HEIGHT;
        const roomWidth = GALLERY_CONFIG.ROOM.WIDTH;
        const roomDepth = GALLERY_CONFIG.ROOM.DEPTH;

        // Number of lights in grid
        const numLightsX = 3;
        const numLightsZ = 2;

        for (let i = 0; i < numLightsX; i++) {
            for (let j = 0; j < numLightsZ; j++) {
                // Position evenly distributed
                const x = -roomWidth / 2 + (i + 0.5) * (roomWidth / numLightsX);
                const z = -roomDepth / 2 + (j + 0.5) * (roomDepth / numLightsZ);

                const light = this.createCeilingLightFixture(x, ceilingHeight, z, 6);
                this.lights.ceilingLights.push(light);
            }
        }
    }

    /**
     * Create ceiling lights for the corridor
     * Adds point lights with visible lamp fixtures along the corridor
     */
    createCorridorLights() {
        this.lights.corridorLights = [];

        const corridorHeight = GALLERY_CONFIG.CORRIDOR.WALL_HEIGHT;
        const layoutConfig = GALLERY_CONFIG.LAYOUT;

        // Corridor runs from Room 1 front to Room 2 back
        const roomDepth = GALLERY_CONFIG.ROOM.DEPTH;
        const corridorStartZ = roomDepth / 2;  // 12.5
        const corridorEndZ = layoutConfig.ROOM2_CENTER.z - roomDepth / 2;  // 47.5
        const corridorLength = corridorEndZ - corridorStartZ;  // 35

        // Number of lights along the corridor
        const numLights = 4;
        const lightSpacing = corridorLength / (numLights + 1);

        for (let i = 0; i < numLights; i++) {
            const zPos = corridorStartZ + lightSpacing * (i + 1);

            const light = this.createCeilingLightFixture(0, corridorHeight, zPos, 2.5);
            this.lights.corridorLights.push(light);
        }
    }

    /**
     * Create focused spotlights for artwork illumination
     * Classic museum-style lighting that highlights each painting
     */
    createArtworkSpotlights() {
        this.lights.artworkSpotlights = [];

        const ceilingHeight = GALLERY_CONFIG.ROOM.WALL_HEIGHT;
        const room1Z = GALLERY_CONFIG.LAYOUT.ROOM1_CENTER.z;  // 0
        const corridorZ = GALLERY_CONFIG.LAYOUT.CORRIDOR_CENTER.z;  // 30

        // Artwork spotlight configurations
        // Each spotlight is positioned above and in front of the painting, aimed at it
        const artworkConfigs = [
            // Left wall - vanGogh.jpg at (-12.49, 4, 0)
            {
                position: { x: -9, y: ceilingHeight - 0.5, z: room1Z },
                target: { x: -12.49, y: 4, z: room1Z }
            },
            // Right wall - vanGogh2.jpg at (12.49, 4, 0)
            {
                position: { x: 9, y: ceilingHeight - 0.5, z: room1Z },
                target: { x: 12.49, y: 4, z: room1Z }
            },
            // Back wall center - claudeMonet.jpg at (0, 4, -12.49)
            {
                position: { x: 0, y: ceilingHeight - 0.5, z: -9 },
                target: { x: 0, y: 4, z: -12.49 }
            },
            // Back wall left - claudeMonet2.jpg at (-8, 4, -12.49)
            {
                position: { x: -8, y: ceilingHeight - 0.5, z: -9 },
                target: { x: -8, y: 4, z: -12.49 }
            },
            // Back wall right - claudeMonet3.jpg at (8, 4, -12.49)
            {
                position: { x: 8, y: ceilingHeight - 0.5, z: -9 },
                target: { x: 8, y: 4, z: -12.49 }
            },
            // Corridor painting - reflection.jpg at (-2.99, 2.5, 25)
            {
                position: { x: 0, y: ceilingHeight - 0.5, z: corridorZ - 5 },
                target: { x: -GALLERY_CONFIG.CORRIDOR.WIDTH / 2 + 0.01, y: 2.5, z: corridorZ - 5 }
            }
        ];

        artworkConfigs.forEach((config, index) => {
            const spotlight = this.createArtworkSpotlight(
                config.position,
                config.target
            );
            this.lights.artworkSpotlights.push(spotlight);
        });
    }

    /**
     * Create a single artwork spotlight
     * @param {Object} position - {x, y, z} spotlight position
     * @param {Object} target - {x, y, z} target position (artwork center)
     * @returns {THREE.SpotLight} The created spotlight
     */
    createArtworkSpotlight(position, target) {
        // Warm white spotlight for artwork - museum quality lighting
        const spotlight = new THREE.SpotLight(
            0xfff8e8,   // Warm white (slightly warmer than ceiling lights)
            3,          // Intensity
            20,         // Distance
            Math.PI / 8, // Narrow angle for focused beam
            0.4,        // Penumbra (soft edges)
            1.5         // Decay
        );

        spotlight.position.set(position.x, position.y, position.z);
        spotlight.target.position.set(target.x, target.y, target.z);

        // Soft shadows for artwork lighting
        spotlight.castShadow = false;  // Artwork spotlights don't need shadows

        this.scene.add(spotlight);
        this.scene.add(spotlight.target);

        return spotlight;
    }

    /**
     * Create a modern pendant light fixture for room 2 purple light
     * Sleek cylindrical design with glowing purple core
     * @param {number} x - X position
     * @param {number} y - Y position (ceiling height)
     * @param {number} z - Z position
     */
    createRoom2PurpleFixture(x, y, z) {
        const fixtureGroup = new THREE.Group();
        fixtureGroup.position.set(x, y, z);

        // Matte black fixture materials
        const blackMetal = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.3,
            metalness: 0.9
        });

        // Ceiling mount - slim rectangular plate
        const mountGeometry = new THREE.BoxGeometry(0.6, 0.05, 0.6);
        const mount = new THREE.Mesh(mountGeometry, blackMetal);
        mount.position.y = -0.025;
        fixtureGroup.add(mount);

        // Suspension rod
        const rodGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
        const rod = new THREE.Mesh(rodGeometry, blackMetal);
        rod.position.y = -0.2;
        fixtureGroup.add(rod);

        // Main housing - sleek cylinder
        const housingGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 16);
        const housing = new THREE.Mesh(housingGeometry, blackMetal);
        housing.position.y = -0.42;
        fixtureGroup.add(housing);

        // Inner ring accent
        const ringGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 24);
        const ring = new THREE.Mesh(ringGeometry, blackMetal);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.5;
        fixtureGroup.add(ring);

        // Glowing purple core - the visible light source
        const purpleGlowMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa00ff,
            emissive: 0xaa00ff,
            emissiveIntensity: 2.5,
            roughness: 0.1,
            metalness: 0.0
        });

        // Main glowing element - lens/diffuser
        const lensGeometry = new THREE.CylinderGeometry(0.18, 0.22, 0.08, 16);
        const lens = new THREE.Mesh(lensGeometry, purpleGlowMaterial);
        lens.position.y = -0.52;
        fixtureGroup.add(lens);

        // Inner glow sphere for depth
        const innerGlowGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const innerGlow = new THREE.Mesh(innerGlowGeometry, purpleGlowMaterial);
        innerGlow.position.y = -0.48;
        fixtureGroup.add(innerGlow);

        this.scene.add(fixtureGroup);
        this.objects = this.objects || {};
        this.objects.room2PurpleFixture = fixtureGroup;

        return fixtureGroup;
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

    /**
     * Add a spotlight to the scene
     * @param {THREE.Vector3} position - Position of the spotlight
     * @param {THREE.Vector3} target - Target position the light aims at
     * @param {Object} options - Spotlight configuration options
     * @returns {THREE.SpotLight} The created spotlight
     */
    addSpotlight(position, target, options = {}) {
        const {
            color = 0xffffff,
            intensity = 1,
            distance = 20,
            angle = Math.PI / 6,
            penumbra = 0.3,
            decay = 1.5,
            castShadow = true
        } = options;

        const spotlight = new THREE.SpotLight(
            color,
            intensity,
            distance,
            angle,
            penumbra,
            decay
        );

        spotlight.position.copy(position);
        spotlight.target.position.copy(target);

        if (castShadow) {
            spotlight.castShadow = true;
            spotlight.shadow.mapSize.set(512, 512);
            spotlight.shadow.bias = -0.001;
            spotlight.shadow.normalBias = 0.02;
        }

        this.scene.add(spotlight);
        this.scene.add(spotlight.target);

        return spotlight;
    }
}
