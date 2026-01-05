import * as THREE from 'three';

export class Intersect {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.heldObject = null;
        this.pickableObjects = [];
        this.pickDistance = 3;
        this.holdDistance = 2;

        // Physik für fallende Objekte
        this.gravity = -15;
        this.groundLevel = 0.4;
        this.objectVelocities = new Map();

        // 2D-Fadenkreuz im Screen-Space
        const crossSize = 0.015;
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            -crossSize, 0, 0, crossSize, 0, 0,
            0, -crossSize, 0, 0, crossSize, 0
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
        this.cursor = new THREE.LineSegments(geometry, material);
        this.cursor.position.set(0, 0, 0);
        this.cursor.renderOrder = 999;

        // Overlay-Szene und -Kamera
        this.overlayScene = new THREE.Scene();
        this.overlayScene.add(this.cursor);

        this.overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    }

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

    /**
     * Aufhebbare Objekte registrieren
     */
    setPickableObjects(objects) {
        this.pickableObjects = objects;
    }

    /**
     * Einzelnes aufhebbares Objekt hinzufügen
     */
    addPickableObject(object) {
        if (!this.pickableObjects.includes(object)) {
            this.pickableObjects.push(object);
        }
    }

    /**
     * Objekt aufheben oder ablegen
     */
    togglePickup(camera) {
        if (this.heldObject) {
            return this.dropObject();
        } else {
            return this.tryPickup(camera);
        }
    }

    /**
     * Versuchen ein Objekt aufzuheben
     */
    tryPickup(camera) {
        if (this.pickableObjects.length === 0) return false;

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = this.raycaster.intersectObjects(this.pickableObjects, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.distance <= this.pickDistance) {
                const object = hit.object;
                if (object.userData.isPickable && !object.userData.isHeld) {
                    this.heldObject = object;
                    object.userData.isHeld = true;

                    this.cursor.material.color.setHex(0x00ff00);

                    console.log('Picked up:', object.name);
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Gehaltenes Objekt ablegen
     */
    dropObject() {
        if (!this.heldObject) return false;

        this.heldObject.userData.isHeld = false;
        console.log('Dropped:', this.heldObject.name);
        this.heldObject = null;

        this.cursor.material.color.setHex(0xffff00);

        return true;
    }

    /**
     * Gehaltenes Objekt der Kamera folgen lassen
     */
    updateHeldObject(camera) {
        if (!this.heldObject) return;

        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        const cameraPos = camera.position.clone();
        const targetPos = cameraPos.add(direction.multiplyScalar(this.holdDistance));

        this.heldObject.position.lerp(targetPos, 0.3);

        this.heldObject.rotation.y += 0.02;
        this.heldObject.rotation.x += 0.01;

        if (this.heldObject.BBox) {
            this.heldObject.BBox.setFromObject(this.heldObject);
        }
    }

    /**
     * Physik für aufhebbare Objekte (Gravitation)
     */
    updatePhysics(deltaTime) {
        for (const object of this.pickableObjects) {
            if (object.userData.isHeld) continue;

            if (!this.objectVelocities.has(object)) {
                this.objectVelocities.set(object, 0);
            }

            let velocity = this.objectVelocities.get(object);
            const currentY = object.position.y;

            if (currentY > this.groundLevel + 0.01) {
                velocity += this.gravity * deltaTime;
                object.position.y += velocity * deltaTime;

                if (object.position.y <= this.groundLevel) {
                    object.position.y = this.groundLevel;
                    velocity = 0;
                    object.userData.isOnGround = true;

                    object.rotation.x = 0;
                    object.rotation.y = Math.round(object.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
                    object.rotation.z = 0;
                } else {
                    object.userData.isOnGround = false;
                }

                this.objectVelocities.set(object, velocity);

                if (object.BBox) {
                    object.BBox.setFromObject(object);
                }
            } else if (!object.userData.isOnGround) {
                object.position.y = this.groundLevel;
                object.rotation.x = 0;
                object.rotation.y = Math.round(object.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
                object.rotation.z = 0;
                this.objectVelocities.set(object, 0);
                object.userData.isOnGround = true;

                if (object.BBox) {
                    object.BBox.setFromObject(object);
                }
            }
        }
    }

    isHoldingObject() {
        return this.heldObject !== null;
    }

    getHeldObject() {
        return this.heldObject;
    }

    /**
     * Fadenkreuz-Farbe basierend auf Blickziel aktualisieren
     */
    updateCrosshairFeedback(camera) {
        if (this.heldObject) {
            this.cursor.material.color.setHex(0x00ff00);
            return;
        }

        if (this.pickableObjects.length === 0) {
            this.cursor.material.color.setHex(0xffff00);
            return;
        }

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = this.raycaster.intersectObjects(this.pickableObjects, false);

        if (intersects.length > 0 && intersects[0].distance <= this.pickDistance) {
            // Aufhebbares Objekt im Blick - Cyan
            this.cursor.material.color.setHex(0x00ffff);
        } else {
            // Normal - Gelb
            this.cursor.material.color.setHex(0xffff00);
        }
    }
}
