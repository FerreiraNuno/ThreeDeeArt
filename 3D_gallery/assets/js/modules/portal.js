import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';

/**
 * Portal Window Manager - Creates the "Not to Be Reproduced" effect
 * 
 * This creates a surreal mirror effect where the viewer sees themselves from behind
 * instead of seeing their reflection, mimicking René Magritte's famous painting.
 */
export class PortalManager {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;

        // Portal configuration
        this.portalConfig = {
            width: 3,
            height: 4,
            // Position on the left wall of the corridor
            position: new THREE.Vector3(
                -GALLERY_CONFIG.CORRIDOR.WIDTH / 2 + 0.02, // Slightly in front of wall
                2.5, // Eye level height
                GALLERY_CONFIG.LAYOUT.CORRIDOR_CENTER.z + 5 // A bit after corridor center
            ),
            // Render target resolution
            resolution: 512
        };

        this.portalCamera = null;
        this.portalRenderTarget = null;
        this.portalMesh = null;
        this.frameGroup = null;

        this.init();
    }

    init() {
        this.createRenderTarget();
        this.createPortalCamera();
        this.createPortalWindow();
    }

    /**
     * Create the render target for the portal view
     */
    createRenderTarget() {
        const { resolution } = this.portalConfig;

        this.portalRenderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false
        });
    }

    /**
     * Create the camera that will render the "back view"
     */
    createPortalCamera() {
        this.portalCamera = new THREE.PerspectiveCamera(
            GALLERY_CONFIG.CAMERA.FOV,
            this.portalConfig.width / this.portalConfig.height,
            GALLERY_CONFIG.CAMERA.NEAR,
            GALLERY_CONFIG.CAMERA.FAR
        );
    }

    /**
     * Create the portal window mesh with an ornate frame
     */
    createPortalWindow() {
        const { width, height, position } = this.portalConfig;

        // Create portal group to hold window and frame
        this.frameGroup = new THREE.Group();
        this.frameGroup.position.copy(position);
        this.frameGroup.rotation.y = Math.PI / 2; // Face into the corridor

        // Portal surface (the "mirror")
        const portalGeometry = new THREE.PlaneGeometry(width, height);
        const portalMaterial = new THREE.MeshBasicMaterial({
            map: this.portalRenderTarget.texture,
            side: THREE.FrontSide
        });

        this.portalMesh = new THREE.Mesh(portalGeometry, portalMaterial);
        this.frameGroup.add(this.portalMesh);

        // Create ornate frame
        this.createFrame(width, height);

        this.scene.add(this.frameGroup);
    }

    /**
     * Create an ornate frame around the portal
     */
    createFrame(width, height) {
        const frameDepth = 0.15;
        const frameWidth = 0.2;

        // Dark wood material for the frame
        const frameMaterial = new THREE.MeshLambertMaterial({
            color: 0x3d2817  // Dark walnut color
        });

        // Gold inner trim material
        const goldMaterial = new THREE.MeshLambertMaterial({
            color: 0xd4af37  // Gold color
        });

        // Outer frame pieces
        const topFrameGeom = new THREE.BoxGeometry(width + frameWidth * 2, frameWidth, frameDepth);
        const topFrame = new THREE.Mesh(topFrameGeom, frameMaterial);
        topFrame.position.set(0, height / 2 + frameWidth / 2, frameDepth / 2);
        topFrame.castShadow = true;
        this.frameGroup.add(topFrame);

        const bottomFrame = topFrame.clone();
        bottomFrame.position.set(0, -height / 2 - frameWidth / 2, frameDepth / 2);
        this.frameGroup.add(bottomFrame);

        const sideFrameGeom = new THREE.BoxGeometry(frameWidth, height, frameDepth);
        const leftFrame = new THREE.Mesh(sideFrameGeom, frameMaterial);
        leftFrame.position.set(-width / 2 - frameWidth / 2, 0, frameDepth / 2);
        leftFrame.castShadow = true;
        this.frameGroup.add(leftFrame);

        const rightFrame = leftFrame.clone();
        rightFrame.position.set(width / 2 + frameWidth / 2, 0, frameDepth / 2);
        this.frameGroup.add(rightFrame);

        // Inner gold trim
        const trimWidth = 0.05;
        const trimDepth = 0.08;

        const topTrimGeom = new THREE.BoxGeometry(width + trimWidth, trimWidth, trimDepth);
        const topTrim = new THREE.Mesh(topTrimGeom, goldMaterial);
        topTrim.position.set(0, height / 2 + trimWidth / 2, trimDepth / 2);
        this.frameGroup.add(topTrim);

        const bottomTrim = topTrim.clone();
        bottomTrim.position.set(0, -height / 2 - trimWidth / 2, trimDepth / 2);
        this.frameGroup.add(bottomTrim);

        const sideTrimGeom = new THREE.BoxGeometry(trimWidth, height, trimDepth);
        const leftTrim = new THREE.Mesh(sideTrimGeom, goldMaterial);
        leftTrim.position.set(-width / 2 - trimWidth / 2, 0, trimDepth / 2);
        this.frameGroup.add(leftTrim);

        const rightTrim = leftTrim.clone();
        rightTrim.position.set(width / 2 + trimWidth / 2, 0, trimDepth / 2);
        this.frameGroup.add(rightTrim);

        // Corner ornaments (small spheres)
        const ornamentGeom = new THREE.SphereGeometry(0.08, 16, 16);
        const corners = [
            [-width / 2 - frameWidth / 2, height / 2 + frameWidth / 2],
            [width / 2 + frameWidth / 2, height / 2 + frameWidth / 2],
            [-width / 2 - frameWidth / 2, -height / 2 - frameWidth / 2],
            [width / 2 + frameWidth / 2, -height / 2 - frameWidth / 2]
        ];

        corners.forEach(([x, y]) => {
            const ornament = new THREE.Mesh(ornamentGeom, goldMaterial);
            ornament.position.set(x, y, frameDepth);
            ornament.castShadow = true;
            this.frameGroup.add(ornament);
        });
    }

    /**
     * Update the portal camera to create the "Not to Be Reproduced" effect
     * 
     * Like Magritte's painting, instead of seeing their reflection (face),
     * the viewer sees the back of their head. To achieve this, we position
     * the portal camera on the OPPOSITE wall of the corridor, looking in the
     * SAME direction as the player (so we see their back, not their face).
     * 
     * @param {THREE.Camera} playerCamera - The main player camera
     * @param {THREE.Object3D} playerBody - The local player body (optional, for visibility)
     */
    updatePortalCamera(playerCamera, playerBody = null) {
        const portalPos = this.portalConfig.position;
        const corridorWidth = GALLERY_CONFIG.CORRIDOR.WIDTH;
        const corridorCenterZ = GALLERY_CONFIG.LAYOUT.CORRIDOR_CENTER.z;

        // Get player's world position from the controls object
        const playerWorldPos = new THREE.Vector3();
        if (playerCamera.parent) {
            playerCamera.parent.getWorldPosition(playerWorldPos);
        } else {
            playerWorldPos.copy(playerCamera.position);
        }

        // Get player's facing direction
        const playerDirection = new THREE.Vector3();
        playerCamera.getWorldDirection(playerDirection);

        // Position the portal camera on the OPPOSITE wall (right wall)
        // The portal is on the left wall (x = -corridorWidth/2)
        // So we place the camera on the right wall (x = +corridorWidth/2)
        const cameraX = corridorWidth / 2 - 0.3; // Slightly off the wall

        // Camera follows player's Z position, but clamped to corridor bounds
        const corridorStartZ = GALLERY_CONFIG.ROOM.DEPTH;
        const corridorEndZ = GALLERY_CONFIG.LAYOUT.ROOM2_CENTER.z - GALLERY_CONFIG.ROOM.DEPTH;
        const cameraZ = THREE.MathUtils.clamp(playerWorldPos.z, corridorStartZ, corridorEndZ) + 8.5;

        // Camera at same height as player
        const cameraY = playerWorldPos.y + 2;

        this.portalCamera.position.set(cameraX, cameraY, cameraZ);

        // The camera looks in the SAME direction as the player
        // This is the key to the "Not to Be Reproduced" effect!
        // When player looks at the portal (towards -x), camera also looks towards -x
        // This means the camera sees the player's BACK, not their face
        const lookAtPoint = this.portalCamera.position.clone().add(playerDirection.clone().multiplyScalar(10));
        this.portalCamera.lookAt(lookAtPoint);
    }

    /**
     * Render the portal view
     * This should be called BEFORE the main render pass
     * 
     * @param {THREE.Camera} playerCamera - The main player camera
     * @param {THREE.Object3D} playerBody - The local player body to make visible in portal
     */
    render(playerCamera, playerBody = null) {
        // Store original state
        const originalRenderTarget = this.renderer.getRenderTarget();

        // Update portal camera position/orientation
        this.updatePortalCamera(playerCamera, playerBody);

        // Hide the portal mesh during its own render to avoid recursion
        this.portalMesh.visible = false;

        // Make the local player body visible for the portal render
        // (normally it might be invisible to the main camera)
        let bodyWasVisible = false;
        if (playerBody) {
            bodyWasVisible = playerBody.visible;
            playerBody.visible = true;
        }

        // Render to portal texture
        this.renderer.setRenderTarget(this.portalRenderTarget);
        this.renderer.render(this.scene, this.portalCamera);

        // Restore states
        this.renderer.setRenderTarget(originalRenderTarget);
        this.portalMesh.visible = true;

        if (playerBody) {
            playerBody.visible = bodyWasVisible;
        }
    }

    /**
     * Get the portal mesh for potential interactions
     */
    getPortalMesh() {
        return this.portalMesh;
    }

    /**
     * Get portal camera for debugging
     */
    getPortalCamera() {
        return this.portalCamera;
    }

    /**
     * Dispose of portal resources
     */
    dispose() {
        if (this.portalRenderTarget) {
            this.portalRenderTarget.dispose();
        }
        if (this.portalMesh) {
            this.portalMesh.geometry.dispose();
            this.portalMesh.material.dispose();
        }
        if (this.frameGroup) {
            this.scene.remove(this.frameGroup);
        }
    }
}
