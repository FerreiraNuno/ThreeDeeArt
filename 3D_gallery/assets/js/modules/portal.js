import * as THREE from 'three';

/**
 * Vereinfachtes Einweg-Portal-System
 * 
 * Erzeugt einen unendlichen Rekursionseffekt mit:
 * - Einem sichtbaren "Ansichts-Portal" (Rahmen zum Hineinschauen)
 * - Einem unsichtbaren "Referenzpunkt" (Position der virtuellen Kamera)
 */

// Wiederverwendbare Mathe-Objekte
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
 * Virtuelle Kamerapose für Portal-Ansicht berechnen
 */
function updatePortalCamera(mainCamera, viewPortal, referencePoint, portalCamera) {
    viewPortal.updateMatrixWorld(true);
    referencePoint.updateMatrixWorld(true);
    mainCamera.updateMatrixWorld(true);

    _m.copy(referencePoint.matrixWorld);
    _m.multiply(_rotY180);
    _m.multiply(_mInv.copy(viewPortal.matrixWorld).invert());
    _m.multiply(mainCamera.matrixWorld);

    portalCamera.matrixWorld.copy(_m);
    portalCamera.matrixWorld.decompose(
        portalCamera.position,
        portalCamera.quaternion,
        portalCamera.scale
    );
    portalCamera.updateMatrixWorld(true);

    portalCamera.projectionMatrix.copy(mainCamera.projectionMatrix);
    portalCamera.projectionMatrixInverse.copy(mainCamera.projectionMatrixInverse);
}

/**
 * Schräges Near-Plane-Clipping anwenden
 */
function applyObliqueClipping(portalCamera, referencePlane) {
    portalCamera.updateMatrixWorld(true);

    _clipPlaneWorld.copy(referencePlane);

    const viewMatrix = portalCamera.matrixWorldInverse;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(viewMatrix);

    const n = _clipPlaneWorld.normal.clone().applyMatrix3(normalMatrix).normalize();
    const p = _clipPlaneWorld.coplanarPoint(new THREE.Vector3()).applyMatrix4(viewMatrix);
    const d = -n.dot(p);

    _clipPlaneCam.set(n.x, n.y, n.z, d);

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

    proj.elements[2] = _c.x - proj.elements[3];
    proj.elements[6] = _c.y - proj.elements[7];
    proj.elements[10] = _c.z - proj.elements[11];
    proj.elements[14] = _c.w - proj.elements[15];

    portalCamera.projectionMatrix.copy(proj);
    portalCamera.projectionMatrixInverse.copy(proj).invert();
}

/**
 * Ebene aus Object3D ermitteln
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
 * Einweg-Portal-Manager
 */
export class PortalManager {
    constructor(renderer, scene, mainCamera, options = {}) {
        this.renderer = renderer;
        this.scene = scene;
        this.mainCamera = mainCamera;

        this.recursionDepth = options.recursionDepth || 3;
        this.enabled = options.enabled !== false;

        this.viewPortal = null;
        this.referencePoint = null;
        this.frameMesh = null;

        // Portal-Kameras für jede Rekursionsebene
        this.portalCameras = [];
        for (let i = 0; i < this.recursionDepth; i++) {
            const cam = new THREE.PerspectiveCamera();
            cam.layers.enableAll();
            this.portalCameras.push(cam);
        }

        this.helperScene = new THREE.Scene();
        this._checkStencilBuffer();
    }

    _checkStencilBuffer() {
        const gl = this.renderer.getContext();
        const attrs = gl.getContextAttributes();
        if (!attrs.stencil) {
            console.warn('PortalManager: WebGL context missing stencil buffer');
        }
    }

    /**
     * Sichtbares Portal-Mesh erstellen
     */
    createViewPortal(width, height, position, rotation, options = {}) {
        const portalColor = options.portalColor || 0x00aaff;
        const frameColor = options.frameColor || 0x333333;
        const frameWidth = options.frameWidth || 0.15;

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

        // Rahmen erstellen
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
        // Kleiner Versatz gegen Z-Fighting
        frameMesh.position.add(new THREE.Vector3(0, 0, 0.01).applyEuler(rotation));

        return { portalMesh, frameMesh };
    }

    /**
     * Referenzpunkt erstellen
     */
    createReferencePoint(position, rotation) {
        const ref = new THREE.Object3D();
        ref.position.copy(position);
        ref.rotation.copy(rotation);
        ref.updateMatrixWorld(true);
        return ref;
    }

    /**
     * Einweg-Portal einrichten
     */
    setupPortal(viewPortalMesh, referencePoint, frameMesh = null) {
        this.viewPortal = viewPortalMesh;
        this.referencePoint = referencePoint;
        this.frameMesh = frameMesh;
        this.originalMaterial = viewPortalMesh.material;

        this.scene.add(referencePoint);
    }

    isPointInFrontOfPortal(point) {
        const plane = getPlaneFromObject(this.viewPortal);
        return plane.distanceToPoint(point) > 0;
    }

    getReferencePlane() {
        return getPlaneFromObject(this.referencePoint);
    }

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

    _renderPortalLevel(level, viewCamera) {
        if (level >= this.recursionDepth) return;
        if (!this.viewPortal || !this.referencePoint) return;

        const stencilRef = level + 1;
        const portalCam = this.portalCameras[level];

        // Schritt 1: Portal-Form in Stencil-Buffer schreiben
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

        // Schritt 2: Virtuelle Kamera berechnen
        updatePortalCamera(viewCamera, this.viewPortal, this.referencePoint, portalCam);

        // Schritt 3: Schräges Clipping anwenden
        const refPlane = this.getReferencePlane();
        applyObliqueClipping(portalCam, refPlane);

        // Schritt 4: Tiefenbuffer leeren und Szene durch Portal rendern
        this.renderer.clearDepth();

        this.viewPortal.visible = false;

        this._setSceneStencilTest(stencilRef, THREE.EqualStencilFunc);
        this.renderer.render(this.scene, portalCam);
        this._clearSceneStencilTest();

        this.viewPortal.visible = true;

        // Schritt 5: Rekursion für verschachtelte Ansichten
        if (level + 1 < this.recursionDepth) {
            if (this.isPointInFrontOfPortal(portalCam.position)) {
                this._renderPortalLevel(level + 1, portalCam);
            }
        }

        // Schritt 6: Tiefenbuffer wiederherstellen
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
     * Haupt-Rendermethode
     */
    render() {
        if (!this.enabled || !this.viewPortal || !this.referencePoint) {
            this.renderer.render(this.scene, this.mainCamera);
            return;
        }

        if (!this.isPointInFrontOfPortal(this.mainCamera.position)) {
            this.renderer.render(this.scene, this.mainCamera);
            return;
        }

        this.renderer.autoClear = false;
        this.renderer.clear(true, true, true);

        this._renderPortalLevel(0, this.mainCamera);

        this._setSceneStencilTest(0, THREE.EqualStencilFunc);

        this.viewPortal.visible = false;
        this.renderer.render(this.scene, this.mainCamera);
        this.viewPortal.visible = true;

        this._clearSceneStencilTest();

        this.renderer.autoClear = true;
    }

    setRecursionDepth(depth) {
        const newDepth = Math.max(1, Math.min(10, depth));

        while (this.portalCameras.length < newDepth) {
            const cam = new THREE.PerspectiveCamera();
            cam.layers.enableAll();
            this.portalCameras.push(cam);
        }

        this.recursionDepth = newDepth;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    setMainCamera(camera) {
        this.mainCamera = camera;
    }

    hasPortal() {
        return this.viewPortal !== null && this.referencePoint !== null;
    }

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
