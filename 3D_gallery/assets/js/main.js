/**
 * 3D Gallery Main Application
 * Refactored modular architecture for better maintainability
 */

import * as THREE from 'three';
import { SceneManager } from './modules/scene.js';
import { CameraManager } from './modules/camera.js';
import { RendererManager } from './modules/renderer.js';
import { LightingManager } from './modules/lighting.js';
import { GeometryManager } from './modules/geometry.js';
import { ControlsManager } from './modules/controls.js';

/**
 * Main Gallery Application Class
 */
class GalleryApp {
    constructor() {
        this.managers = {};
        this.isRunning = false;
        this.init();
    }

    /**
     * Initialize all managers and setup the gallery
     */
    init() {
        try {
            // Initialize core managers
            this.managers.scene = new SceneManager();
            this.managers.camera = new CameraManager();
            this.managers.renderer = new RendererManager();

            // Initialize lighting
            this.managers.lighting = new LightingManager(this.managers.scene.getScene());

            // Initialize geometry and objects
            this.managers.geometry = new GeometryManager(this.managers.scene.getScene());
            this.setupScene();

            // Initialize controls
            this.managers.controls = new ControlsManager(
                this.managers.camera.getCamera(),
                this.managers.renderer.getRenderer()
            );

            // Add camera to scene
            this.managers.scene.add(this.managers.camera.getCamera());

            // Start the render loop
            this.start();

            console.log('3D Gallery initialized successfully');
        } catch (error) {
            console.error('Failed to initialize 3D Gallery:', error);
        }
    }

    /**
     * Setup the 3D scene with all objects
     */
    setupScene() {
        // Create test cube
        this.managers.geometry.createTestCube();

        // Create floor
        const floor = this.managers.geometry.createFloor();

        // Create walls attached to floor
        this.managers.geometry.createWalls(floor);

        // Create ceiling
        this.managers.geometry.createCeiling(floor);
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
    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.animate());

        // Update controls
        this.managers.controls.update();

        // Animate objects
        this.managers.geometry.animateObjects();

        // Render the scene
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

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.galleryApp) {
            window.galleryApp.handleResize();
        }
    });
});

// Export for potential module usage
export default GalleryApp;
