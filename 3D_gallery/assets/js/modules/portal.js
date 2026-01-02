import * as THREE from 'three';

/**
 * Portal System Implementation
 * Based on the OpenGL stencil buffer technique ported to Three.js
 * 
 * The approach:
 * 1. Write portal shape into stencil buffer
 * 2. Render scene from virtual camera only where stencil passes
 * 3. Restore normal rendering
 * 4. Recurse by incrementing stencil value each level
 */

// Reusable math objects to avoid allocations
const _m = new THREE.Matrix4();
const _mInv = new THREE.Matrix4();
const _rotY180 = new THREE.Matrix4().makeRotationY(Math.PI);
const _clipPlaneWorld = new THREE.Plane();
const _clipPlaneCam = new THREE.Vector4();
const _q = new THREE.Vector4();
const _c = new THREE.Vector4();
const _invProj = new THREE.Matrix4();
const _tempVec3 = new THREE.Vector3();
const _tempNormal = new THREE.Vector3();

/**
 * Compute the virtual camera pose for viewing through a portal
 * 
 * The transform is: dstPortal * rotate(180°) * inverse(srcPortal) * mainCamera
 * This positions the camera as if stepping through srcPortal and emerging from dstPortal
 * 
 * @param {THREE.Camera} mainCamera - The main scene camera
 * @param {THREE.Object3D} srcPortal - Source portal mesh (the one being looked through)
 * @param {THREE.Object3D} dstPortal - Destination portal mesh (where we see the view from)
 * @param {THREE.PerspectiveCamera} portalCamera - Camera to update with portal view
 */
export function updatePortalCamera(mainCamera, srcPortal, dstPortal, portalCamera) {
    srcPortal.updateMatrixWorld(true);
    dstPortal.updateMatrixWorld(true);
    mainCamera.updateMatrixWorld(true);

    // Build the transformation matrix:
    // dst * rot180 * inv(src) * mainCamera
    _m.copy(dstPortal.matrixWorld);
    _m.multiply(_rotY180);
    _m.multiply(_mInv.copy(srcPortal.matrixWorld).invert());
    _m.multiply(mainCamera.matrixWorld);

    // Apply to portal camera
    portalCamera.matrixWorld.copy(_m);
    portalCamera.matrixWorld.decompose(
        portalCamera.position,
        portalCamera.quaternion,
        portalCamera.scale
    );
    portalCamera.updateMatrixWorld(true);

    // Copy projection from main camera
    portalCamera.projectionMatrix.copy(mainCamera.projectionMatrix);
    portalCamera.projectionMatrixInverse.copy(mainCamera.projectionMatrixInverse);
}

/**
 * Apply oblique near-plane clipping to prevent rendering behind the portal
 * This modifies the projection matrix so the near plane aligns with the portal surface
 * 
 * @param {THREE.PerspectiveCamera} portalCamera - The portal view camera
 * @param {THREE.Plane} portalPlaneWorld - The destination portal plane in world space
 */
export function applyObliqueClipping(portalCamera, portalPlaneWorld) {
    portalCamera.updateMatrixWorld(true);

    _clipPlaneWorld.copy(portalPlaneWorld);

    // Transform plane to camera space
    const viewMatrix = portalCamera.matrixWorldInverse;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(viewMatrix);

    const n = _clipPlaneWorld.normal.clone().applyMatrix3(normalMatrix).normalize();
    const p = _clipPlaneWorld.coplanarPoint(new THREE.Vector3()).applyMatrix4(viewMatrix);
    const d = -n.dot(p);

    _clipPlaneCam.set(n.x, n.y, n.z, d);

    // Modify projection matrix for oblique clipping
    const proj = portalCamera.projectionMatrix.clone();
    _invProj.copy(proj).invert();

    _q.set(
        Math.sign(_clipPlaneCam.x),
        Math.sign(_clipPlaneCam.y),
        1.0,
        1.0
    ).applyMatrix4(_invProj);

    const scale = 2.0 / _clipPlaneCam.dot(_q);
    _c.copy(_clipPlaneCam).multiplyScalar(scale);

    // Replace the third row of the projection matrix
    proj.elements[2] = _c.x - proj.elements[3];
    proj.elements[6] = _c.y - proj.elements[7];
    proj.elements[10] = _c.z - proj.elements[11];
    proj.elements[14] = _c.w - proj.elements[15];

    portalCamera.projectionMatrix.copy(proj);
    portalCamera.projectionMatrixInverse.copy(proj).invert();
}

/**
 * Get the portal plane in world space (facing outward from portal surface)
 * Assumes portal mesh is a plane with local +Z as the normal
 * 
 * @param {THREE.Object3D} portalMesh - The portal mesh
 * @returns {THREE.Plane} The portal plane in world space
 */
export function getPortalPlane(portalMesh) {
    const plane = new THREE.Plane();
    const normal = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(portalMesh.quaternion)
        .normalize();

    portalMesh.getWorldPosition(_tempVec3);
    plane.setFromNormalAndCoplanarPoint(normal, _tempVec3);

    return plane;
}

/**
 * Create a material that writes to stencil buffer without affecting color/depth
 * This is used to mark portal pixels in the stencil buffer
 * 
 * @param {number} stencilRef - The stencil reference value for this recursion level
 * @returns {THREE.MeshBasicMaterial} Material configured for stencil writing
 */
export function createPortalStencilWriterMaterial(stencilRef) {
    const material = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false
    });

    material.stencilWrite = true;
    material.stencilRef = stencilRef;
    material.stencilFunc = THREE.AlwaysStencilFunc;
    material.stencilFail = THREE.IncrementWrapStencilOp;
    material.stencilZFail = THREE.IncrementWrapStencilOp;
    material.stencilZPass = THREE.IncrementWrapStencilOp;

    return material;
}

/**
 * Create a material that tests against stencil buffer for portal view rendering
 * 
 * @param {THREE.Material} baseMaterial - Original material to clone
 * @param {number} stencilRef - The stencil reference value to test against
 * @returns {THREE.Material} Material configured for stencil testing
 */
export function createPortalStencilTestMaterial(baseMaterial, stencilRef) {
    const material = baseMaterial.clone();

    material.stencilWrite = true;
    material.stencilRef = stencilRef;
    material.stencilFunc = THREE.LessEqualStencilFunc;
    material.stencilFail = THREE.KeepStencilOp;
    material.stencilZFail = THREE.KeepStencilOp;
    material.stencilZPass = THREE.KeepStencilOp;

    return material;
}

/**
 * Create a depth-only material for the portal frame depth write step
 * 
 * @returns {THREE.MeshBasicMaterial} Material that only writes to depth buffer
 */
export function createDepthOnlyMaterial() {
    const material = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: true
    });
    return material;
}

/**
 * Portal pair definition
 */
export class Portal {
    /**
     * Create a portal
     * @param {THREE.Mesh} mesh - The portal surface mesh (should be a plane)
     * @param {Portal} linkedPortal - The destination portal (set after both are created)
     * @param {Object} options - Portal options
     */
    constructor(mesh, linkedPortal = null, options = {}) {
        this.mesh = mesh;
        this.linkedPortal = linkedPortal;
        this.enabled = options.enabled !== false;
        this.renderLayer = options.renderLayer || 0;

        // Store original material for restoration
        this.originalMaterial = mesh.material;

        // Create stencil materials cache
        this.stencilWriterMaterials = new Map();

        // Ensure mesh has proper matrix
        this.mesh.updateMatrixWorld(true);
    }

    /**
     * Link this portal to another portal
     * @param {Portal} portal - The destination portal
     */
    linkTo(portal) {
        this.linkedPortal = portal;
    }

    /**
     * Get the portal plane in world space
     * @returns {THREE.Plane}
     */
    getPlane() {
        return getPortalPlane(this.mesh);
    }

    /**
     * Get or create a stencil writer material for a given recursion level
     * @param {number} level - Recursion level
     * @returns {THREE.Material}
     */
    getStencilWriterMaterial(level) {
        if (!this.stencilWriterMaterials.has(level)) {
            this.stencilWriterMaterials.set(level, createPortalStencilWriterMaterial(level));
        }
        return this.stencilWriterMaterials.get(level);
    }

    /**
     * Get world position of the portal
     * @returns {THREE.Vector3}
     */
    getWorldPosition() {
        return this.mesh.getWorldPosition(new THREE.Vector3());
    }

    /**
     * Check if a point is in front of the portal
     * @param {THREE.Vector3} point - Point to check
     * @returns {boolean}
     */
    isPointInFront(point) {
        const plane = this.getPlane();
        return plane.distanceToPoint(point) > 0;
    }

    /**
     * Dispose of cached materials
     */
    dispose() {
        for (const material of this.stencilWriterMaterials.values()) {
            material.dispose();
        }
        this.stencilWriterMaterials.clear();
    }
}

/**
 * Portal Manager - handles all portal rendering
 */
export class PortalManager {
    /**
     * Create a portal manager
     * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
     * @param {THREE.Scene} scene - The main scene
     * @param {THREE.Camera} mainCamera - The main camera
     * @param {Object} options - Configuration options
     */
    constructor(renderer, scene, mainCamera, options = {}) {
        this.renderer = renderer;
        this.scene = scene;
        this.mainCamera = mainCamera;

        // Configuration
        this.recursionDepth = options.recursionDepth || 3;
        this.enabled = options.enabled !== false;
        this.debugMode = options.debugMode || false;

        // Portal collection
        this.portals = [];
        this.portalPairs = [];

        // Create portal camera (reused for all portal views)
        this.portalCamera = new THREE.PerspectiveCamera();
        this.portalCamera.layers.enableAll();

        // Depth-only material for frame depth write
        this.depthOnlyMaterial = createDepthOnlyMaterial();

        // Track objects to exclude from portal rendering
        this.excludedObjects = new Set();

        // Stencil state tracking
        this.stencilEnabled = false;

        // Ensure stencil buffer is available
        this._ensureStencilBuffer();
    }

    /**
     * Ensure renderer has stencil buffer enabled
     * @private
     */
    _ensureStencilBuffer() {
        // Check if context has stencil
        const gl = this.renderer.getContext();
        const contextAttributes = gl.getContextAttributes();
        if (!contextAttributes.stencil) {
            console.warn('PortalManager: WebGL context does not have stencil buffer. Portals may not render correctly.');
        }
    }

    /**
     * Create a portal pair (two linked portals)
     * @param {THREE.Mesh} meshA - First portal mesh
     * @param {THREE.Mesh} meshB - Second portal mesh
     * @param {Object} options - Portal options
     * @returns {Object} Object containing both portals
     */
    createPortalPair(meshA, meshB, options = {}) {
        const portalA = new Portal(meshA, null, options);
        const portalB = new Portal(meshB, null, options);

        // Link portals to each other
        portalA.linkTo(portalB);
        portalB.linkTo(portalA);

        // Add to collections
        this.portals.push(portalA, portalB);
        this.portalPairs.push({ portalA, portalB });

        // Exclude portal meshes from normal rendering order issues
        this.excludedObjects.add(meshA);
        this.excludedObjects.add(meshB);

        return { portalA, portalB };
    }

    /**
     * Create a portal mesh with a frame
     * @param {number} width - Portal width
     * @param {number} height - Portal height
     * @param {THREE.Vector3} position - Portal position
     * @param {THREE.Euler} rotation - Portal rotation
     * @param {Object} options - Visual options
     * @returns {Object} Object containing portal mesh and frame mesh
     */
    createPortalMesh(width, height, position, rotation, options = {}) {
        const portalColor = options.portalColor || 0x00aaff;
        const frameColor = options.frameColor || 0x333333;
        const frameWidth = options.frameWidth || 0.15;

        // Create portal surface (the actual portal)
        const portalGeometry = new THREE.PlaneGeometry(width, height);
        const portalMaterial = new THREE.MeshBasicMaterial({
            color: portalColor,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        const portalMesh = new THREE.Mesh(portalGeometry, portalMaterial);
        portalMesh.position.copy(position);
        portalMesh.rotation.copy(rotation);

        // Create frame around portal
        const frameShape = new THREE.Shape();
        const outerW = width / 2 + frameWidth;
        const outerH = height / 2 + frameWidth;
        const innerW = width / 2;
        const innerH = height / 2;

        // Outer rectangle
        frameShape.moveTo(-outerW, -outerH);
        frameShape.lineTo(outerW, -outerH);
        frameShape.lineTo(outerW, outerH);
        frameShape.lineTo(-outerW, outerH);
        frameShape.lineTo(-outerW, -outerH);

        // Inner hole
        const hole = new THREE.Path();
        hole.moveTo(-innerW, -innerH);
        hole.lineTo(-innerW, innerH);
        hole.lineTo(innerW, innerH);
        hole.lineTo(innerW, -innerH);
        hole.lineTo(-innerW, -innerH);
        frameShape.holes.push(hole);

        const frameGeometry = new THREE.ShapeGeometry(frameShape);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: frameColor,
            metalness: 0.8,
            roughness: 0.2
        });

        const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
        frameMesh.position.copy(position);
        frameMesh.rotation.copy(rotation);
        // Slightly offset frame to prevent z-fighting
        frameMesh.position.add(
            new THREE.Vector3(0, 0, 0.01).applyEuler(rotation)
        );

        return { portalMesh, frameMesh };
    }

    /**
     * Add a portal to the scene
     * @param {Portal} portal - Portal to add
     */
    addPortalToScene(portal) {
        this.scene.add(portal.mesh);
    }

    /**
     * Render the scene with portals
     * This replaces the normal render call when portals are present
     * Uses Three.js state management for proper stencil buffer handling
     */
    render() {
        if (!this.enabled || this.portals.length === 0) {
            this.renderer.render(this.scene, this.mainCamera);
            return;
        }

        const gl = this.renderer.getContext();
        const state = this.renderer.state;

        // Disable auto clear - we'll manage clearing ourselves
        this.renderer.autoClear = false;

        // Initial clear of all buffers
        this.renderer.clear(true, true, true);

        // Process each portal visible to the main camera
        for (const portal of this.portals) {
            if (!portal.enabled || !portal.linkedPortal) continue;

            // Only render portal if viewer is in front of it
            const cameraPos = this.mainCamera.position;
            if (!portal.isPointInFront(cameraPos)) continue;

            this._renderPortalWithMaterialStencil(portal, 0);
        }

        // Final render of main scene where stencil is 0 (not covered by portals)
        // First, set stencil test on all scene materials
        this._setSceneStencilTest(0, THREE.EqualStencilFunc);

        // Hide portal meshes during final render to show portal views behind them
        for (const portal of this.portals) {
            portal.mesh.visible = false;
        }

        this.renderer.render(this.scene, this.mainCamera);

        // Restore portal mesh visibility
        for (const portal of this.portals) {
            portal.mesh.visible = true;
        }

        // Reset stencil on all materials
        this._clearSceneStencilTest();

        // Restore auto clear
        this.renderer.autoClear = true;
    }

    /**
     * Set stencil test on all scene materials
     * @private
     * @param {number} ref - Stencil reference value
     * @param {number} func - Stencil function (THREE.EqualStencilFunc, etc.)
     */
    _setSceneStencilTest(ref, func) {
        this.scene.traverse((obj) => {
            if (obj.material) {
                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const mat of materials) {
                    mat.stencilWrite = true;
                    mat.stencilRef = ref;
                    mat.stencilFunc = func;
                    mat.stencilFail = THREE.KeepStencilOp;
                    mat.stencilZFail = THREE.KeepStencilOp;
                    mat.stencilZPass = THREE.KeepStencilOp;
                }
            }
        });
    }

    /**
     * Clear stencil test from all scene materials
     * @private
     */
    _clearSceneStencilTest() {
        this.scene.traverse((obj) => {
            if (obj.material) {
                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const mat of materials) {
                    mat.stencilWrite = false;
                }
            }
        });
    }

    /**
     * Render a portal using Three.js material stencil properties
     * This approach properly respects Three.js's state management
     * @private
     * @param {Portal} portal - Portal to render
     * @param {number} level - Current recursion level
     */
    _renderPortalWithMaterialStencil(portal, level) {
        if (level >= this.recursionDepth) return;

        const destPortal = portal.linkedPortal;
        const stencilRef = level + 1;

        // Step 1: Write portal shape to stencil buffer
        // Create a stencil writer material that increments stencil where portal is visible
        const stencilWriterMat = new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: false
        });
        stencilWriterMat.stencilWrite = true;
        stencilWriterMat.stencilRef = level;
        stencilWriterMat.stencilFunc = THREE.EqualStencilFunc;  // Only write where stencil == level
        stencilWriterMat.stencilFail = THREE.KeepStencilOp;
        stencilWriterMat.stencilZFail = THREE.KeepStencilOp;
        stencilWriterMat.stencilZPass = THREE.IncrementWrapStencilOp;  // Increment on pass

        const originalMaterial = portal.mesh.material;
        portal.mesh.material = stencilWriterMat;
        portal.mesh.visible = true;

        // Render portal mesh to write stencil
        this.renderer.render(portal.mesh, this.mainCamera);

        // Restore original material
        portal.mesh.material = originalMaterial;
        stencilWriterMat.dispose();

        // Step 2: Compute virtual camera for portal view
        updatePortalCamera(
            this.mainCamera,
            portal.mesh,
            destPortal.mesh,
            this.portalCamera
        );

        // Step 3: Apply oblique clipping to prevent rendering behind destination portal
        const destPlane = destPortal.getPlane();
        applyObliqueClipping(this.portalCamera, destPlane);

        // Step 4: Clear depth buffer for portal area and render scene through portal
        this.renderer.clearDepth();

        // Hide portal meshes during portal view rendering
        for (const p of this.portals) {
            p.mesh.visible = false;
        }

        // Set stencil test on all scene materials to only render where stencil == stencilRef
        this._setSceneStencilTest(stencilRef, THREE.EqualStencilFunc);

        // Render scene from portal camera
        this.renderer.render(this.scene, this.portalCamera);

        // Clear stencil from scene materials
        this._clearSceneStencilTest();

        // Restore portal visibility
        for (const p of this.portals) {
            p.mesh.visible = true;
        }

        // Step 5: Recurse for nested portals (portal within portal)
        if (level + 1 < this.recursionDepth) {
            for (const p of this.portals) {
                if (!p.enabled || !p.linkedPortal) continue;

                // Check if this portal is visible from the portal camera
                if (p.isPointInFront(this.portalCamera.position)) {
                    this._renderPortalWithMaterialStencil(p, level + 1);
                }
            }
        }

        // Step 6: Restore depth buffer by rendering portal surface with depth-only
        // This ensures objects in front of the portal in the main view render correctly
        const depthOnlyMat = new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: true
        });
        depthOnlyMat.stencilWrite = true;
        depthOnlyMat.stencilRef = stencilRef;
        depthOnlyMat.stencilFunc = THREE.EqualStencilFunc;
        depthOnlyMat.stencilFail = THREE.KeepStencilOp;
        depthOnlyMat.stencilZFail = THREE.KeepStencilOp;
        depthOnlyMat.stencilZPass = THREE.DecrementWrapStencilOp;  // Decrement back to previous level

        portal.mesh.material = depthOnlyMat;
        portal.mesh.visible = true;
        this.renderer.render(portal.mesh, this.mainCamera);
        portal.mesh.material = originalMaterial;
        depthOnlyMat.dispose();
    }

    /**
     * Render a portal recursively using raw WebGL calls
     * @private
     * @param {Portal} portal - Portal to render
     * @param {number} level - Current recursion level
     * @deprecated Use _renderPortalWithMaterialStencil instead
     */
    _renderPortalRecursive(portal, level) {
        // Redirect to the material-based approach
        this._renderPortalWithMaterialStencil(portal, level);
    }

    /**
     * Simplified render method using material stencil properties
     * This is an alternative approach that uses Three.js material stencil settings
     * rather than direct WebGL calls
     */
    renderSimplified() {
        if (!this.enabled || this.portals.length === 0) {
            this.renderer.render(this.scene, this.mainCamera);
            return;
        }

        this.renderer.autoClear = false;
        this.renderer.clear(true, true, true);

        // Render each portal
        for (const portal of this.portals) {
            if (!portal.enabled || !portal.linkedPortal) continue;

            const cameraPos = this.mainCamera.position;
            if (!portal.isPointInFront(cameraPos)) continue;

            this._renderPortalSimplified(portal);
        }

        // Hide portals and render final scene
        for (const portal of this.portals) {
            portal.mesh.visible = false;
        }
        this.renderer.render(this.scene, this.mainCamera);
        for (const portal of this.portals) {
            portal.mesh.visible = true;
        }

        this.renderer.autoClear = true;
    }

    /**
     * Simplified single-level portal render
     * @private
     * @param {Portal} portal - Portal to render
     */
    _renderPortalSimplified(portal) {
        const destPortal = portal.linkedPortal;

        // Step 1: Write to stencil
        const stencilWriter = createPortalStencilWriterMaterial(0);
        const originalMaterial = portal.mesh.material;
        portal.mesh.material = stencilWriter;

        this.renderer.render(portal.mesh, this.mainCamera);

        // Step 2: Compute portal camera
        updatePortalCamera(
            this.mainCamera,
            portal.mesh,
            destPortal.mesh,
            this.portalCamera
        );

        // Step 3: Apply oblique clipping
        const destPlane = destPortal.getPlane();
        applyObliqueClipping(this.portalCamera, destPlane);

        // Step 4: Render portal view
        this.renderer.clearDepth();

        // Configure stencil test on all materials
        this.scene.traverse((obj) => {
            if (obj.material) {
                obj.material.stencilWrite = true;
                obj.material.stencilRef = 1;
                obj.material.stencilFunc = THREE.EqualStencilFunc;
            }
        });

        // Hide portals during portal view
        for (const p of this.portals) {
            p.mesh.visible = false;
        }

        this.renderer.render(this.scene, this.portalCamera);

        // Reset materials
        this.scene.traverse((obj) => {
            if (obj.material) {
                obj.material.stencilWrite = false;
            }
        });

        // Restore portals
        for (const p of this.portals) {
            p.mesh.visible = true;
        }

        // Restore original material
        portal.mesh.material = originalMaterial;
        stencilWriter.dispose();
    }

    /**
     * Set recursion depth for nested portal rendering
     * @param {number} depth - Maximum recursion depth (1-10)
     */
    setRecursionDepth(depth) {
        this.recursionDepth = Math.max(1, Math.min(10, depth));
    }

    /**
     * Enable or disable portal rendering
     * @param {boolean} enabled - Whether portals are enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Remove a portal pair
     * @param {Portal} portalA - First portal
     * @param {Portal} portalB - Second portal
     */
    removePortalPair(portalA, portalB) {
        const idx = this.portalPairs.findIndex(
            p => (p.portalA === portalA && p.portalB === portalB) ||
                (p.portalA === portalB && p.portalB === portalA)
        );

        if (idx !== -1) {
            this.portalPairs.splice(idx, 1);
        }

        this.portals = this.portals.filter(p => p !== portalA && p !== portalB);
        this.excludedObjects.delete(portalA.mesh);
        this.excludedObjects.delete(portalB.mesh);

        // Clean up
        portalA.dispose();
        portalB.dispose();
        this.scene.remove(portalA.mesh);
        this.scene.remove(portalB.mesh);
    }

    /**
     * Update the main camera reference (call if camera changes)
     * @param {THREE.Camera} camera - New main camera
     */
    setMainCamera(camera) {
        this.mainCamera = camera;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        for (const portal of this.portals) {
            portal.dispose();
        }
        this.portals = [];
        this.portalPairs = [];
        this.depthOnlyMaterial.dispose();
    }

    /**
     * Get all portals
     * @returns {Portal[]}
     */
    getPortals() {
        return this.portals;
    }

    /**
     * Get portal pairs
     * @returns {Object[]}
     */
    getPortalPairs() {
        return this.portalPairs;
    }
}

export default PortalManager;

