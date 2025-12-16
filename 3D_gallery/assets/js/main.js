import * as THREE from 'three';
import { CameraManager } from './modules/camera.js';
import { LightingManager } from './modules/lighting.js';
import { GeometryManager } from './modules/geometry.js';
import { GALLERY_CONFIG } from './config/constants.js';

/**
 * Renderer management class
 */
class RendererManager {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: GALLERY_CONFIG.RENDERER.ANTIALIAS
        });

        this.setupRenderer();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(GALLERY_CONFIG.RENDERER.BACKGROUND_COLOR, 1);

        // Enable shadows
        if (GALLERY_CONFIG.RENDERER.SHADOWS) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = GALLERY_CONFIG.RENDERER.SHADOW_TYPE === 'PCFSoft'
                ? THREE.PCFSoftShadowMap
                : THREE.BasicShadowMap;
        }

        document.body.appendChild(this.renderer.domElement);
    }

    handleResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(scene, camera) {
        this.renderer.render(scene, camera);
    }

    getRenderer() {
        return this.renderer;
    }

    getDomElement() {
        return this.renderer.domElement;
    }
}

/**
 * Scene management class
 */
class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
    }

    getScene() {
        return this.scene;
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }
}

/**
 * Main Gallery Application Class
 */
class GalleryApp {
    constructor() {
        this.managers = {};
        this.isRunning = false;
        this.lastTime = 0;
        this.init();
    }

    /**
     * Initialize all managers and setup the gallery
     */
    init() {
        try {
            this.initializeManagers();
            this.setupManagerConnections();
            this.setupScene();
            this.setupEventListeners();
            this.start();

            console.log('3D Gallery initialized successfully');
        } catch (error) {
            console.error('Failed to initialize 3D Gallery:', error);
        }
    }

    /**
     * Initialize all core managers
     */
    initializeManagers() {
        this.managers.scene = new SceneManager();
        this.managers.renderer = new RendererManager();
        this.managers.camera = new CameraManager(this.managers.renderer.getRenderer());
        this.managers.lighting = new LightingManager(this.managers.scene.getScene());
        this.managers.geometry = new GeometryManager(this.managers.scene.getScene());
    }

    /**
     * Setup connections between managers
     */
    setupManagerConnections() {
        // Connect camera manager with geometry manager for collision detection
        this.managers.camera.setGeometryManager(this.managers.geometry);

        // Add camera controls to scene (PointerLockControls manages the camera)
        this.managers.scene.add(this.managers.camera.getControls().getObject());
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Setup the 3D scene with all objects
     */
    setupScene() {
        this.createGalleryStructure();
        this.createArtworks();
    }

    /**
     * Create the basic gallery structure (floor, walls, ceiling)
     */
    createGalleryStructure() {
        this.managers.geometry.createTestCube();
        this.managers.geometry.createFloor();
        this.managers.geometry.createWalls();
        this.managers.geometry.createCeiling();

        // Add player prop in the center of the room
        this.managers.geometry.createPlayerProp(new THREE.Vector3(0, 0, 0));
    }

    /**
     * Create and position artworks in the gallery
     */
    createArtworks() {
        const paintings = [
            {
                image: 'assets/images/vanGogh.jpg',
                width: 8,
                height: 4,
                position: new THREE.Vector3(-12.49, 4, 0),
                rotation: new THREE.Vector3(0, Math.PI / 2, 0)
            },
            {
                image: 'assets/images/vanGogh2.jpg',
                width: 8,
                height: 4,
                position: new THREE.Vector3(12.49, 4, 0),
                rotation: new THREE.Vector3(0, -Math.PI / 2, 0)
            }
        ];

        paintings.forEach(painting => {
            this.managers.geometry.createPainting(
                painting.image,
                painting.width,
                painting.height,
                painting.position,
                painting.rotation
            );
        });
    }

    /**
     * Start the animation loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.animate();
    }

    /**
     * Stop the animation loop
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Main animation loop
     */
    animate(currentTime = 0) {
        if (!this.isRunning) return;

        requestAnimationFrame((time) => this.animate(time));

        const deltaTime = this.calculateDeltaTime(currentTime);
        this.updateScene(deltaTime, currentTime);
        this.renderScene();
    }

    /**
     * Calculate delta time for smooth animations
     */
    calculateDeltaTime(currentTime) {
        const deltaTime = this.lastTime === 0 ? 0 : (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        return deltaTime;
    }

    /**
     * Update all scene elements
     */
    updateScene(deltaTime, currentTime) {
        // Update camera controls with delta time for smooth movement
        this.managers.camera.update(deltaTime);

        // Animate objects
        this.managers.geometry.animateObjects();

        // TODO: Future shader material time updates for fractals
        // this.updateShaderUniforms(currentTime);
    }

    /**
     * Update shader uniforms for time-based animations (for future use)
     */
    updateShaderUniforms(currentTime) {
        for (const obj of Object.values(this.managers.geometry.objects)) {
            if (obj.material && obj.material.uniforms && obj.material.uniforms.time) {
                obj.material.uniforms.time.value = currentTime * 0.001;
            }
        }
    }

    /**
     * Render the current frame
     */
    renderScene() {
        this.managers.renderer.render(
            this.managers.scene.getScene(),
            this.managers.camera.getCamera()
        );
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.managers.camera.updateAspectRatio();
        this.managers.renderer.handleResize();
    }

    /**
     * Get access to managers for debugging or extensions
     */
    getManagers() {
        return this.managers;
    }
}

// Initialize the gallery when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.galleryApp = new GalleryApp();
});

// Export for potential module usage
export default GalleryApp;
