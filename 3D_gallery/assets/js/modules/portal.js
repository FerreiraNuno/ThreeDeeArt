import * as THREE from 'three';

/**
 * Simplified One-Way Portal System
 * 
 * This creates an infinite recursion effect using:
 * - A visible "view portal" (the frame you look into)
 * - An invisible "reference point" (where the virtual camera is positioned)
 * 
 * The view portal shows what would be seen from the reference point,
 * creating the illusion of looking through to another location.
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

/**
 * Compute the virtual camera pose for viewing through the portal
 * 
 * The transform positions the camera as if stepping through the view portal
 * and looking out from the reference point.
 * 
 * @param {THREE.Camera} mainCamera - The main scene camera
 * @param {THREE.Object3D} viewPortal - The visible portal mesh (what you look into)
 * @param {THREE.Object3D} referencePoint - The reference object (where view originates)
 * @param {THREE.PerspectiveCamera} portalCamera - Camera to update with portal view
 */
function updatePortalCamera(mainCamera, viewPortal, referencePoint, portalCamera) {
    viewPortal.updateMatrixWorld(true);
    referencePoint.updateMatrixWorld(true);
    mainCamera.updateMatrixWorld(true);

    // Build transformation: reference * rot180 * inv(viewPortal) * mainCamera
    _m.copy(referencePoint.matrixWorld);
    _m.multiply(_rotY180);
    _m.multiply(_mInv.copy(viewPortal.matrixWorld).invert());
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
 * Apply oblique near-plane clipping to prevent rendering behind the reference point
 * 
 * @param {THREE.PerspectiveCamera} portalCamera - The portal view camera
 * @param {THREE.Plane} referencePlane - The reference plane in world space
 */
function applyObliqueClipping(portalCamera, referencePlane) {
    portalCamera.updateMatrixWorld(true);

    _clipPlaneWorld.copy(referencePlane);

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
 * Get a plane in world space from an Object3D
 * Assumes the object's local +Z is the normal direction
 * 
 * @param {THREE.Object3D} object - The object to get plane from
 * @returns {THREE.Plane}
 */
function getPlaneFromObject(object) {
    const plane = new THREE.Plane();
    const normal = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(object.quaternion)
        .normalize();

    object.getWorldPosition(_tempVec3);
    plane.setFromNormalAndCoplanarPoint(normal, _tempVec3);

    return plane;
}

/**
 * One-Way Portal Manager
 * Handles rendering a single portal view with recursive depth
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

        // Portal data (single one-way portal)
        this.viewPortal = null;        // The visible portal mesh
        this.referencePoint = null;    // The reference point Object3D
        this.frameMesh = null;         // Optional frame mesh

        // Create portal cameras for each recursion level
        this.portalCameras = [];
        for (let i = 0; i < this.recursionDepth; i++) {
            const cam = new THREE.PerspectiveCamera();
            cam.layers.enableAll();
            this.portalCameras.push(cam);
        }

        // Helper scene for stencil writes
        this.helperScene = new THREE.Scene();

        // Ensure stencil buffer is available
        this._checkStencilBuffer();
    }

    /**
     * Check if stencil buffer is available
     * @private
     */
    _checkStencilBuffer() {
        const gl = this.renderer.getContext();
        const attrs = gl.getContextAttributes();
        if (!attrs.stencil) {
            console.warn('PortalManager: WebGL context missing stencil buffer');
        }
    }

    /**
     * Create the view portal mesh (the visible portal frame)
     * @param {number} width - Portal width
     * @param {number} height - Portal height
     * @param {THREE.Vector3} position - Portal position
     * @param {THREE.Euler} rotation - Portal rotation
     * @param {Object} options - Visual options
     * @returns {Object} Object containing portalMesh and frameMesh
     */
    createViewPortal(width, height, position, rotation, options = {}) {
        const portalColor = options.portalColor || 0x00aaff;
        const frameColor = options.frameColor || 0x333333;
        const frameWidth = options.frameWidth || 0.15;

        // Create portal surface
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

        // Create frame
        const frameShape = new THREE.Shape();
        const outerW = width / 2 + frameWidth;
        const outerH = height / 2 + frameWidth;
        const innerW = width / 2;
        const innerH = height / 2;

        frameShape.moveTo(-outerW, -outerH);
        frameShape.lineTo(outerW, -outerH);
        frameShape.lineTo(outerW, outerH);
        frameShape.lineTo(-outerW, outerH);
        frameShape.lineTo(-outerW, -outerH);

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
        // Slight offset to prevent z-fighting
        frameMesh.position.add(new THREE.Vector3(0, 0, 0.01).applyEuler(rotation));

        return { portalMesh, frameMesh };
    }

    /**
     * Create a reference point (invisible, just defines where the view originates)
     * @param {THREE.Vector3} position - Reference position
     * @param {THREE.Euler} rotation - Reference rotation (determines view direction)
     * @returns {THREE.Object3D} The reference point object
     */
    createReferencePoint(position, rotation) {
        const ref = new THREE.Object3D();
        ref.position.copy(position);
        ref.rotation.copy(rotation);
        ref.updateMatrixWorld(true);
        return ref;
    }

    /**
     * Set up the one-way portal
     * @param {THREE.Mesh} viewPortalMesh - The visible portal mesh
     * @param {THREE.Object3D} referencePoint - The reference point
     * @param {THREE.Mesh} frameMesh - Optional frame mesh
     */
    setupPortal(viewPortalMesh, referencePoint, frameMesh = null) {
        this.viewPortal = viewPortalMesh;
        this.referencePoint = referencePoint;
        this.frameMesh = frameMesh;
        this.originalMaterial = viewPortalMesh.material;

        // Add reference point to scene (invisible, just for transforms)
        this.scene.add(referencePoint);
    }

    /**
     * Check if camera is in front of the view portal
     * @param {THREE.Vector3} point - Point to check
     * @returns {boolean}
     */
    isPointInFrontOfPortal(point) {
        const plane = getPlaneFromObject(this.viewPortal);
        return plane.distanceToPoint(point) > 0;
    }

    /**
     * Get the reference plane (for oblique clipping)
     * @returns {THREE.Plane}
     */
    getReferencePlane() {
        return getPlaneFromObject(this.referencePoint);
    }

    /**
     * Set stencil test on all scene materials
     * @private
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
     * Render a single recursion level of the portal
     * @private
     */
    _renderPortalLevel(level, viewCamera) {
        if (level >= this.recursionDepth) return;
        if (!this.viewPortal || !this.referencePoint) return;

        const stencilRef = level + 1;
        const portalCam = this.portalCameras[level];

        // Step 1: Write portal shape to stencil buffer
        const stencilWriterMat = new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: false
        });
        stencilWriterMat.stencilWrite = true;
        stencilWriterMat.stencilRef = level;
        stencilWriterMat.stencilFunc = THREE.EqualStencilFunc;
        stencilWriterMat.stencilFail = THREE.KeepStencilOp;
        stencilWriterMat.stencilZFail = THREE.KeepStencilOp;
        stencilWriterMat.stencilZPass = THREE.IncrementWrapStencilOp;

        this.viewPortal.material = stencilWriterMat;
        this.viewPortal.visible = true;

        this.helperScene.add(this.viewPortal);
        this.renderer.render(this.helperScene, viewCamera);
        this.helperScene.remove(this.viewPortal);

        this.viewPortal.material = this.originalMaterial;
        this.scene.add(this.viewPortal);
        stencilWriterMat.dispose();

        // Step 2: Compute virtual camera for portal view
        updatePortalCamera(viewCamera, this.viewPortal, this.referencePoint, portalCam);

        // Step 3: Apply oblique clipping
        const refPlane = this.getReferencePlane();
        applyObliqueClipping(portalCam, refPlane);

        // Step 4: Clear depth and render scene through portal
        this.renderer.clearDepth();

        this.viewPortal.visible = false;

        this._setSceneStencilTest(stencilRef, THREE.EqualStencilFunc);
        this.renderer.render(this.scene, portalCam);
        this._clearSceneStencilTest();

        this.viewPortal.visible = true;

        // Step 5: Recurse for nested views
        if (level + 1 < this.recursionDepth) {
            if (this.isPointInFrontOfPortal(portalCam.position)) {
                this._renderPortalLevel(level + 1, portalCam);
            }
        }

        // Step 6: Restore depth buffer
        const depthOnlyMat = new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: true
        });
        depthOnlyMat.stencilWrite = true;
        depthOnlyMat.stencilRef = stencilRef;
        depthOnlyMat.stencilFunc = THREE.EqualStencilFunc;
        depthOnlyMat.stencilFail = THREE.KeepStencilOp;
        depthOnlyMat.stencilZFail = THREE.KeepStencilOp;
        depthOnlyMat.stencilZPass = THREE.DecrementWrapStencilOp;

        this.viewPortal.material = depthOnlyMat;
        this.viewPortal.visible = true;

        this.helperScene.add(this.viewPortal);
        this.renderer.render(this.helperScene, viewCamera);
        this.helperScene.remove(this.viewPortal);

        this.viewPortal.material = this.originalMaterial;
        this.scene.add(this.viewPortal);
        depthOnlyMat.dispose();
    }

    /**
     * Main render method - call this instead of renderer.render()
     */
    render() {
        if (!this.enabled || !this.viewPortal || !this.referencePoint) {
            this.renderer.render(this.scene, this.mainCamera);
            return;
        }

        // Check if camera is in front of portal
        if (!this.isPointInFrontOfPortal(this.mainCamera.position)) {
            this.renderer.render(this.scene, this.mainCamera);
            return;
        }

        this.renderer.autoClear = false;
        this.renderer.clear(true, true, true);

        // Render portal recursively
        this._renderPortalLevel(0, this.mainCamera);

        // Final render of main scene where stencil is 0
        this._setSceneStencilTest(0, THREE.EqualStencilFunc);

        this.viewPortal.visible = false;
        this.renderer.render(this.scene, this.mainCamera);
        this.viewPortal.visible = true;

        this._clearSceneStencilTest();

        this.renderer.autoClear = true;
    }

    /**
     * Set recursion depth
     * @param {number} depth - Maximum recursion depth (1-10)
     */
    setRecursionDepth(depth) {
        const newDepth = Math.max(1, Math.min(10, depth));

        while (this.portalCameras.length < newDepth) {
            const cam = new THREE.PerspectiveCamera();
            cam.layers.enableAll();
            this.portalCameras.push(cam);
        }

        this.recursionDepth = newDepth;
    }

    /**
     * Enable or disable portal rendering
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Update main camera reference
     * @param {THREE.Camera} camera
     */
    setMainCamera(camera) {
        this.mainCamera = camera;
    }

    /**
     * Check if portal system has a configured portal
     * @returns {boolean}
     */
    hasPortal() {
        return this.viewPortal !== null && this.referencePoint !== null;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.viewPortal) {
            this.scene.remove(this.viewPortal);
        }
        if (this.referencePoint) {
            this.scene.remove(this.referencePoint);
        }
        if (this.frameMesh) {
            this.scene.remove(this.frameMesh);
        }
        this.portalCameras = [];
    }
}

export default PortalManager;
