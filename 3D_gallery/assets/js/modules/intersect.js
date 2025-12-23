import * as THREE from 'three';

export class Intersect {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

         // ----- 2D-Fadenkreuz in Screen-Space -----
        // PlaneGeometry von minimaler Größe
        const crossSize = 0.015; // Größe im NDC (-1 bis 1)
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            -crossSize, 0, 0,  crossSize, 0, 0,   // horizontale Linie
            0, -crossSize, 0, 0, crossSize, 0     // vertikale Linie
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
        this.cursor = new THREE.LineSegments(geometry, material); // Fadenkreuz
        // Wir positionieren das Fadenkreuz im NDC-Raum (immer sichtbar)
        this.cursor.position.set(0, 0, 0);
        this.cursor.renderOrder = 999; // ganz vorne

         // Extra Szene und Kamera für Overlay
        this.overlayScene = new THREE.Scene();
        this.overlayScene.add(this.cursor);

        this.overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    }

     // Gibt die Overlay-Szene für Renderer weiter
    getOverlayScene() {
        return this.overlayScene;
    }

    getOverlayCamera() {
        return this.overlayCamera;
    }

    updateMouse(event, camera) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, camera);
    }

    intersectObjects(camera, objects) {
        this.raycaster.setFromCamera(this.mouse, camera);
        return this.raycaster.intersectObjects(objects, true);
    }
}
