import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';

/**
 * Beleuchtungs-Verwaltung
 */
export class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.geometry = null;
        this.lights = {};
        this.setupLighting();
    }

    setGeometryManager(geometry) {
        this.geometry = geometry;
    }

    getGeometryManager() {
        return this.geometry;
    }

    setupLighting() {
        // Ambiente Beleuchtung für dunkle Ecken
        this.lights.ambient = new THREE.AmbientLight(0x404040, 4);
        this.scene.add(this.lights.ambient);

        // Spotlight für Raum 2
        this.lights.room2light = new THREE.SpotLight(new THREE.Color().setRGB(0.6, 0.0, 3.8), 8, 20, Math.PI, 0.5, 1);

        this.lights.room2light.position.set(0, 7.5, 57.5);
        this.lights.room2light.target.position.set(0, 0, 57.5);
        this.lights.room2light.castShadow = true;

        this.scene.add(this.lights.room2light, this.lights.room2light.target);

        this.createRoom2PurpleFixture(0, 8, 57.5);

        this.lights.room2lights = [this.lights.room2light]

        this.createFixtureMaterials();
        this.createRoomCeilingLights();
        this.createCorridorLights();
        this.createArtworkSpotlights();
    }

    /**
     * Gemeinsame Materialien für Deckenlampen erstellen
     */
    createFixtureMaterials() {
        this.fixtureMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.4,
            metalness: 0.7
        });

        // Leuchtende Lampenabdeckung
        this.lightCoverMaterial = new THREE.MeshStandardMaterial({
            color: 0xfff8f0,
            emissive: 0xfff8f0,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.0
        });
    }

    /**
     * Deckenlampe mit Punktlicht erstellen
     */
    createCeilingLightFixture(x, y, z, intensity = 2.5) {
        const ceilingHeight = y;
        const lightY = ceilingHeight - 3;

        // Warmweißes Punktlicht
        const light = new THREE.PointLight(
            0xfff5e6,
            intensity,
            30,
            1.5
        );
        light.position.set(x, lightY, z);

        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        light.shadow.bias = -0.002;
        light.shadow.normalBias = 0.02;
        light.shadow.radius = 4;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 25;

        this.scene.add(light);

        // Sichtbare Lampenhalterung
        const fixtureGroup = new THREE.Group();
        fixtureGroup.position.set(x, ceilingHeight, z);

        // Deckenplatte
        const mountGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.04, 12);
        const mount = new THREE.Mesh(mountGeometry, this.fixtureMaterial);
        mount.position.y = -0.02;
        fixtureGroup.add(mount);

        // Lampengehäuse
        const housingGeometry = new THREE.CylinderGeometry(0.18, 0.28, 0.12, 12);
        const housing = new THREE.Mesh(housingGeometry, this.fixtureMaterial);
        housing.position.y = -0.1;
        fixtureGroup.add(housing);

        // Leuchtende Abdeckung
        const coverGeometry = new THREE.CylinderGeometry(0.26, 0.26, 0.06, 12);
        const cover = new THREE.Mesh(coverGeometry, this.lightCoverMaterial);
        cover.position.y = -0.19;
        fixtureGroup.add(cover);

        this.scene.add(fixtureGroup);

        return light;
    }

    /**
     * Deckenlichter für Raum 1 erstellen
     */
    createRoomCeilingLights() {
        this.lights.ceilingLights = [];

        const ceilingHeight = GALLERY_CONFIG.ROOM.WALL_HEIGHT;
        const roomWidth = GALLERY_CONFIG.ROOM.WIDTH;
        const roomDepth = GALLERY_CONFIG.ROOM.DEPTH;

        const numLightsX = 3;
        const numLightsZ = 2;

        for (let i = 0; i < numLightsX; i++) {
            for (let j = 0; j < numLightsZ; j++) {
                const x = -roomWidth / 2 + (i + 0.5) * (roomWidth / numLightsX);
                const z = -roomDepth / 2 + (j + 0.5) * (roomDepth / numLightsZ);

                const light = this.createCeilingLightFixture(x, ceilingHeight, z, 6);
                this.lights.ceilingLights.push(light);
            }
        }
    }

    /**
     * Korridorbeleuchtung erstellen
     */
    createCorridorLights() {
        this.lights.corridorLights = [];

        const corridorHeight = GALLERY_CONFIG.CORRIDOR.WALL_HEIGHT;
        const layoutConfig = GALLERY_CONFIG.LAYOUT;

        const roomDepth = GALLERY_CONFIG.ROOM.DEPTH;
        const corridorStartZ = roomDepth / 2;
        const corridorEndZ = layoutConfig.ROOM2_CENTER.z - roomDepth / 2;
        const corridorLength = corridorEndZ - corridorStartZ;

        const numLights = 4;
        const lightSpacing = corridorLength / (numLights + 1);

        for (let i = 0; i < numLights; i++) {
            const zPos = corridorStartZ + lightSpacing * (i + 1);

            const light = this.createCeilingLightFixture(0, corridorHeight, zPos, 2.5);
            this.lights.corridorLights.push(light);
        }
    }

    /**
     * Spotlights für Kunstwerke erstellen
     */
    createArtworkSpotlights() {
        this.lights.artworkSpotlights = [];

        const ceilingHeight = GALLERY_CONFIG.ROOM.WALL_HEIGHT;
        const room1Z = GALLERY_CONFIG.LAYOUT.ROOM1_CENTER.z;
        const corridorZ = GALLERY_CONFIG.LAYOUT.CORRIDOR_CENTER.z;

        const artworkConfigs = [
            { position: { x: -9, y: ceilingHeight - 0.5, z: room1Z }, target: { x: -12.49, y: 4, z: room1Z } },
            { position: { x: 9, y: ceilingHeight - 0.5, z: room1Z }, target: { x: 12.49, y: 4, z: room1Z } },
            { position: { x: 0, y: ceilingHeight - 0.5, z: -9 }, target: { x: 0, y: 4, z: -12.49 } },
            { position: { x: -8, y: ceilingHeight - 0.5, z: -9 }, target: { x: -8, y: 4, z: -12.49 } },
            { position: { x: 8, y: ceilingHeight - 0.5, z: -9 }, target: { x: 8, y: 4, z: -12.49 } },
            { position: { x: 0, y: ceilingHeight - 0.5, z: corridorZ - 5 }, target: { x: -GALLERY_CONFIG.CORRIDOR.WIDTH / 2 + 0.01, y: 2.5, z: corridorZ - 5 } }
        ];

        artworkConfigs.forEach((config, index) => {
            const spotlight = this.createArtworkSpotlight(config.position, config.target);
            this.lights.artworkSpotlights.push(spotlight);
        });
    }

    /**
     * Einzelnes Kunstwerk-Spotlight erstellen
     */
    createArtworkSpotlight(position, target) {
        const spotlight = new THREE.SpotLight(
            0xfff8e8,
            3,
            20,
            Math.PI / 8,
            0.4,
            1.5
        );

        spotlight.position.set(position.x, position.y, position.z);
        spotlight.target.position.set(target.x, target.y, target.z);
        spotlight.castShadow = false;

        this.scene.add(spotlight);
        this.scene.add(spotlight.target);

        return spotlight;
    }

    /**
     * Moderne Hängelampe für violettes Licht in Raum 2
     */
    createRoom2PurpleFixture(x, y, z) {
        const fixtureGroup = new THREE.Group();
        fixtureGroup.position.set(x, y, z);

        const blackMetal = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.3,
            metalness: 0.9
        });

        // Deckenplatte
        const mountGeometry = new THREE.BoxGeometry(0.6, 0.05, 0.6);
        const mount = new THREE.Mesh(mountGeometry, blackMetal);
        mount.position.y = -0.025;
        fixtureGroup.add(mount);

        // Aufhängestange
        const rodGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
        const rod = new THREE.Mesh(rodGeometry, blackMetal);
        rod.position.y = -0.2;
        fixtureGroup.add(rod);

        // Hauptgehäuse
        const housingGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 16);
        const housing = new THREE.Mesh(housingGeometry, blackMetal);
        housing.position.y = -0.42;
        fixtureGroup.add(housing);

        // Dekorativer Ring
        const ringGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 24);
        const ring = new THREE.Mesh(ringGeometry, blackMetal);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.5;
        fixtureGroup.add(ring);

        // Leuchtender violetter Kern
        const purpleGlowMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa00ff,
            emissive: 0xaa00ff,
            emissiveIntensity: 2.5,
            roughness: 0.1,
            metalness: 0.0
        });

        const lensGeometry = new THREE.CylinderGeometry(0.18, 0.22, 0.08, 16);
        const lens = new THREE.Mesh(lensGeometry, purpleGlowMaterial);
        lens.position.y = -0.52;
        fixtureGroup.add(lens);

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

        // Weiche Schatten
        light.shadow.mapSize.set(1024, 1024);
        light.shadow.bias = -0.0004;
        light.shadow.normalBias = 0.03;
        light.shadow.radius = 2;

        // Licht am Objekt befestigen
        object.add(light);

        return light;
    }

    /**
     * Spotlight zur Szene hinzufügen
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
