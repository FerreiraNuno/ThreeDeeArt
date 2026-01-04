import * as THREE from 'three';

export class Intersect {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Pickable object state
        this.heldObject = null;
        this.pickableObjects = [];
        this.pickDistance = 3; // Max distance to pick up objects
        this.holdDistance = 2; // Distance in front of camera when holding

        // Physics for dropped objects
        this.gravity = -15; // Gravity acceleration
        this.groundLevel = 0.4; // Ground Y position (half cube height)
        this.objectVelocities = new Map(); // Track velocity per object

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

    /**
     * Register pickable objects for interaction
     * @param {THREE.Object3D[]} objects - Array of pickable objects
     */
    setPickableObjects(objects) {
        this.pickableObjects = objects;
    }

    /**
     * Add a single pickable object
     * @param {THREE.Object3D} object - Object to add
     */
    addPickableObject(object) {
        if (!this.pickableObjects.includes(object)) {
            this.pickableObjects.push(object);
        }
    }

    /**
     * Try to pick up or drop an object based on current state
     * @param {THREE.Camera} camera - The camera to raycast from
     * @returns {boolean} Whether an action was performed
     */
    togglePickup(camera) {
        if (this.heldObject) {
            // Drop the held object
            return this.dropObject();
        } else {
            // Try to pick up an object
            return this.tryPickup(camera);
        }
    }

    /**
     * Attempt to pick up an object in front of the camera
     * @param {THREE.Camera} camera - The camera to raycast from
     * @returns {boolean} Whether an object was picked up
     */
    tryPickup(camera) {
        if (this.pickableObjects.length === 0) return false;

        // Raycast from center of screen
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = this.raycaster.intersectObjects(this.pickableObjects, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.distance <= this.pickDistance) {
                const object = hit.object;
                if (object.userData.isPickable && !object.userData.isHeld) {
                    this.heldObject = object;
                    object.userData.isHeld = true;
                    
                    // Change cursor color to indicate holding
                    this.cursor.material.color.setHex(0x00ff00);
                    
                    console.log('Picked up:', object.name);
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Drop the currently held object
     * @returns {boolean} Whether an object was dropped
     */
    dropObject() {
        if (!this.heldObject) return false;

        this.heldObject.userData.isHeld = false;
        console.log('Dropped:', this.heldObject.name);
        this.heldObject = null;

        // Reset cursor color
        this.cursor.material.color.setHex(0xffff00);

        return true;
    }

    /**
     * Update the held object position to follow the camera
     * @param {THREE.Camera} camera - The camera to follow
     */
    updateHeldObject(camera) {
        if (!this.heldObject) return;

        // Get camera direction
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        // Position object in front of camera
        const cameraPos = camera.position.clone();
        const targetPos = cameraPos.add(direction.multiplyScalar(this.holdDistance));
        
        // Smoothly interpolate to target position
        this.heldObject.position.lerp(targetPos, 0.3);

        // Make cube rotate slowly while held
        this.heldObject.rotation.y += 0.02;
        this.heldObject.rotation.x += 0.01;

        // Update bounding box
        if (this.heldObject.BBox) {
            this.heldObject.BBox.setFromObject(this.heldObject);
        }
    }

    /**
     * Update physics for all pickable objects (gravity)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updatePhysics(deltaTime) {
        for (const object of this.pickableObjects) {
            // Skip if object is being held
            if (object.userData.isHeld) continue;

            // Get or initialize velocity for this object
            if (!this.objectVelocities.has(object)) {
                this.objectVelocities.set(object, 0);
            }

            let velocity = this.objectVelocities.get(object);
            const currentY = object.position.y;

            // Check if above ground
            if (currentY > this.groundLevel + 0.01) {
                // Apply gravity
                velocity += this.gravity * deltaTime;
                object.position.y += velocity * deltaTime;

                // Check if hit ground
                if (object.position.y <= this.groundLevel) {
                    object.position.y = this.groundLevel;
                    velocity = 0;
                    object.userData.isOnGround = true;
                    
                    // Reset rotation to land flat on a side
                    object.rotation.x = 0;
                    object.rotation.y = Math.round(object.rotation.y / (Math.PI / 2)) * (Math.PI / 2); // Snap to nearest 90°
                    object.rotation.z = 0;
                } else {
                    object.userData.isOnGround = false;
                }

                this.objectVelocities.set(object, velocity);

                // Update bounding box
                if (object.BBox) {
                    object.BBox.setFromObject(object);
                }
            } else if (!object.userData.isOnGround) {
                // Just landed - ensure flat rotation
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

    /**
     * Check if currently holding an object
     * @returns {boolean}
     */
    isHoldingObject() {
        return this.heldObject !== null;
    }

    /**
     * Get the currently held object
     * @returns {THREE.Object3D|null}
     */
    getHeldObject() {
        return this.heldObject;
    }

    /**
     * Update crosshair color based on what player is looking at
     * Call this each frame to provide visual feedback
     * @param {THREE.Camera} camera - The camera
     */
    updateCrosshairFeedback(camera) {
        if (this.heldObject) {
            // Keep green when holding
            this.cursor.material.color.setHex(0x00ff00);
            return;
        }

        if (this.pickableObjects.length === 0) {
            this.cursor.material.color.setHex(0xffff00);
            return;
        }

        // Check if looking at a pickable object
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = this.raycaster.intersectObjects(this.pickableObjects, false);

        if (intersects.length > 0 && intersects[0].distance <= this.pickDistance) {
            // Looking at pickable object - cyan color
            this.cursor.material.color.setHex(0x00ffff);
        } else {
            // Normal - yellow
            this.cursor.material.color.setHex(0xffff00);
        }
    }
}
