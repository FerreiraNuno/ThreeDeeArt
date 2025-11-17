import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';

/**
 * Renderer management module
 */
export class RendererManager {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: GALLERY_CONFIG.RENDERER.ANTIALIAS
        });

        this.setupRenderer();
        this.setupResizeHandler();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(GALLERY_CONFIG.RENDERER.BACKGROUND_COLOR, 1);
        document.body.appendChild(this.renderer.domElement);
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => this.handleResize());
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
