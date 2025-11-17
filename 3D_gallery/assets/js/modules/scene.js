import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';

/**
 * Scene management module
 */
export class SceneManager {
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
