import * as THREE from 'three';
import { CameraManager } from './modules/camera.js';
import { LightingManager } from './modules/lighting.js';
import { GeometryManager } from './modules/geometry.js';
import { MultiplayerManager } from './modules/multiplayer.js';
import { GALLERY_CONFIG } from './config/constants.js';
import { EffectComposer } from 'EffectComposer';
import { RenderPass } from 'RenderPass';
import { UnrealBloomPass } from 'UnrealBloomPass';
import { Intersect } from './modules/intersect.js';
import { AudioManager } from './modules/audio.js';
import { PortalManager } from './modules/portal.js';

/**
 * Renderer management class
 */
class RendererManager {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: GALLERY_CONFIG.RENDERER.ANTIALIAS,
            stencil: true  // Enable stencil buffer for portal rendering
        });

        this.setupRenderer();

        // Tone Mapping aktivieren
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Filmischer Look
        this.renderer.toneMappingExposure = 1.2;                // Helligkeit
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(GALLERY_CONFIG.RENDERER.BACKGROUND_COLOR, 1);

        // Enable shadows
        if (GALLERY_CONFIG.RENDERER.SHADOWS) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = GALLERY_CONFIG.RENDERER.SHADOW_TYPE === 'PCFSoft'
                ? THREE.PCFSoftShadowMap
                : THREE.BasicShadowMap;
        }

        document.body.appendChild(this.renderer.domElement);
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

/**
 * Scene management class
 */
class SceneManager {
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

/**
 * Main Gallery Application Class
 */
class GalleryApp {
    constructor() {
        this.managers = {};
        this.isRunning = false;
        this.lastTime = 0;
        this.fractalTimer = 0;
        this.fractalInterval = 1.5; // Sekunden pro Iteration
        this.dragon = null;
        this.colorLerpFactor = 0;
        this.listener = new THREE.AudioListener();
        this.init();
    }

    /**
     * Initialize all managers and setup the gallery
     */
    init() {
        try {
            this.initializeManagers();
            this.setupManagerConnections();
            this.setupIntersect();
            this.setupScene();
            this.setupEventListeners();
            this.setupPostProcessing();
            this.start();

            console.log('3D Gallery initialized successfully');
        } catch (error) {
            console.error('Failed to initialize 3D Gallery:', error);
        }
    }

    /**
     * Initialize all core managers
     */
    initializeManagers() {
        this.managers.scene = new SceneManager();
        this.managers.renderer = new RendererManager();
        this.managers.camera = new CameraManager(this.managers.renderer.getRenderer());
        //this.managers.lighting = new LightingManager(this.managers.scene.getScene());
        //this.managers.geometry = new GeometryManager(this.managers.scene.getScene(), this.managers.lighting);
        this.managers.geometry = new GeometryManager(this.managers.scene.getScene());
        this.managers.lighting = new LightingManager(this.managers.scene.getScene());

        // Post-init: beide Manager kennen sich -> keine zyklische Abhängigkeit!!!
        this.managers.geometry.setLightingManager(this.managers.lighting);
        this.managers.lighting.setGeometryManager(this.managers.geometry);

        this.managers.camera.getCamera().add(this.listener);
        this.managers.audio = new AudioManager(this.listener);

        console.log(this.managers.geometry.objects);

        // Initialize multiplayer manager
        this.managers.multiplayer = new MultiplayerManager(
            this.managers.scene.getScene(),
            this.managers.geometry.getPersonManager(),
            this.managers.camera
        );

        // Initialize portal manager
        if (GALLERY_CONFIG.PORTAL.ENABLED) {
            this.managers.portal = new PortalManager(
                this.managers.renderer.getRenderer(),
                this.managers.scene.getScene(),
                this.managers.camera.getCamera(),
                {
                    recursionDepth: GALLERY_CONFIG.PORTAL.RECURSION_DEPTH,
                    debugMode: GALLERY_CONFIG.PORTAL.DEBUG_MODE
                }
            );
        }

        // Create local player body for first-person view
        this.createLocalPlayerBody();
    }

    /**
     * Setup connections between managers
     */
    setupManagerConnections() {
        // Connect camera manager with geometry manager for collision detection
        this.managers.camera.setGeometryManager(this.managers.geometry);

        // Add camera controls to scene (PointerLockControls manages the camera)
        this.managers.scene.add(this.managers.camera.getControls().getObject());
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());

        // Keyboard shortcuts for portal toggle
        window.addEventListener('keydown', (event) => this.handleGlobalKeyDown(event));

        // Mouse click for picking up/dropping objects
        window.addEventListener('click', (event) => this.handlePickupClick(event));

        // Update multiplayer status periodically
        setInterval(() => this.updateMultiplayerStatus(), 1000);
    }

    /**
     * Handle click for picking up/dropping objects
     */
    handlePickupClick(event) {
        // Only handle left click when pointer is locked (in game)
        if (event.button !== 0) return;
        if (!this.managers.camera.getControls().isLocked) return;

        const camera = this.managers.camera.getCamera();
        this.intersect.togglePickup(camera);
    }

    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeyDown(event) {
        // Toggle portal rendering with 'P' key
        if (event.code === 'KeyP' && this.managers.portal) {
            this.managers.portal.setEnabled(!this.managers.portal.enabled);
            console.log(`Portals ${this.managers.portal.enabled ? 'enabled' : 'disabled'}`);
        }

        // Adjust portal recursion depth with '[' and ']' keys
        if (event.code === 'BracketLeft' && this.managers.portal) {
            const newDepth = Math.max(1, this.managers.portal.recursionDepth - 1);
            this.managers.portal.setRecursionDepth(newDepth);
            console.log(`Portal recursion depth: ${newDepth}`);
        }
        if (event.code === 'BracketRight' && this.managers.portal) {
            const newDepth = Math.min(10, this.managers.portal.recursionDepth + 1);
            this.managers.portal.setRecursionDepth(newDepth);
            console.log(`Portal recursion depth: ${newDepth}`);
        }

        // Pick up / drop object with 'E' key
        if (event.code === 'KeyE' && this.managers.camera.getControls().isLocked) {
            const camera = this.managers.camera.getCamera();
            this.intersect.togglePickup(camera);
        }
    }

    /**
     * Update multiplayer status in the UI
     */
    updateMultiplayerStatus() {
        const statusElement = document.getElementById('multiplayer-status');
        if (statusElement && this.managers.multiplayer) {
            const isConnected = this.managers.multiplayer.isMultiplayerConnected();
            const playerCount = this.managers.multiplayer.getPlayerCount();

            if (isConnected) {
                statusElement.textContent = `Multiplayer: Connected (${playerCount} player${playerCount !== 1 ? 's' : ''})`;
                statusElement.style.color = '#4ecdc4';
            } else {
                statusElement.textContent = 'Multiplayer: Disconnected';
                statusElement.style.color = '#ff6b6b';
            }
        }
    }

    /**
     * Setup the 3D scene with all objects
     */
    setupScene() {
        this.managers.geometry.createGalleryStructure();
        this.managers.geometry.createCube();
        this.createPickableCube();
        this.createArtworks();
        this.createFractal();
        this.doCarpet();
        this.createAudio();
        this.createPortals();
        this.createStonePedestal();
    }

    /**
     * Create a stone pedestal with normal mapping in Room 2
     */
    createStonePedestal() {
        // Position the pedestal in Room 2 (off to the side so it doesn't block the view)
        const room2Center = GALLERY_CONFIG.LAYOUT.ROOM2_CENTER;
        const pedestalPosition = new THREE.Vector3(
            room2Center.x + 8,  // Right side of room
            0,
            room2Center.z
        );

        this.managers.geometry.createStonePedestal(pedestalPosition);
    }

    /**
     * Create a pickable cube in the middle of the room
     */
    createPickableCube() {
        const pickableCube = this.managers.geometry.createPickableCube();

        // Register it with the intersect system
        this.intersect.addPickableObject(pickableCube);
    }

    /**
     * Create portal pairs in the gallery
     * Portals placed on opposite corridor walls for infinite recursion effect
     */
    createPortals() {
        if (!this.managers.portal) return;

        const portalConfig = GALLERY_CONFIG.PORTAL;
        const corridorConfig = GALLERY_CONFIG.CORRIDOR;
        const layoutConfig = GALLERY_CONFIG.LAYOUT;

        // Portal A: On the LEFT wall of the corridor, facing right (into corridor)
        const portalAPosition = new THREE.Vector3(
            corridorConfig.WIDTH / 2 + 0.05,  // Left wall, slightly offset outward so it is not visible
            corridorConfig.WALL_HEIGHT / 2 - 1.5,    // Centered vertically, 1 unit lower
            layoutConfig.CORRIDOR_CENTER.z     // Center of corridor
        );
        const portalARotation = new THREE.Euler(0, -Math.PI / 2, 0);  // Facing left (into corridor)

        // Portal B: On the RIGHT wall of the corridor, facing left (into corridor)
        const portalBPosition = new THREE.Vector3(
            -corridorConfig.WIDTH / 2 + 0.05,  // Right wall, slightly offset inward
            corridorConfig.WALL_HEIGHT / 2 - 1.5,     // Centered vertically, 1 unit lower
            layoutConfig.CORRIDOR_CENTER.z      // Center of corridor (same Z as portal A)
        );
        const portalBRotation = new THREE.Euler(0, Math.PI / 2, 0);  // Facing left (into corridor)

        // Create portal meshes with frames
        const portalAMeshes = this.managers.portal.createPortalMesh(
            portalConfig.WIDTH,
            portalConfig.HEIGHT,
            portalAPosition,
            portalARotation,
            {
                portalColor: portalConfig.PORTAL_COLOR_A,
                frameColor: portalConfig.FRAME_COLOR,
                frameWidth: portalConfig.FRAME_WIDTH
            }
        );

        const portalBMeshes = this.managers.portal.createPortalMesh(
            portalConfig.WIDTH,
            portalConfig.HEIGHT,
            portalBPosition,
            portalBRotation,
            {
                portalColor: portalConfig.PORTAL_COLOR_B,
                frameColor: portalConfig.FRAME_COLOR,
                frameWidth: portalConfig.FRAME_WIDTH
            }
        );

        // Add meshes to scene
        this.managers.scene.add(portalAMeshes.portalMesh);
        this.managers.scene.add(portalAMeshes.frameMesh);
        this.managers.scene.add(portalBMeshes.portalMesh);
        this.managers.scene.add(portalBMeshes.frameMesh);

        // Create the portal pair (links them together)
        const { portalA, portalB } = this.managers.portal.createPortalPair(
            portalAMeshes.portalMesh,
            portalBMeshes.portalMesh
        );

        // Store references for potential future access
        this.portalPair = {
            portalA,
            portalB,
            frameA: portalAMeshes.frameMesh,
            frameB: portalBMeshes.frameMesh
        };

        console.log('Portals created: Blue portal on right corridor wall, Orange portal on left corridor wall (infinite recursion effect)');
    }


    setupIntersect() {
        this.intersect = new Intersect();

        // Maus-Event für Raycasting
        window.addEventListener('mousemove', (e) => this.intersect.updateMouse(e, this.managers.camera.getCamera()));
    }

    //Objekte hinzufügen -> vllt in intersect
    addIntersectObjects(objects) {
        if (this.intersect)
            this.intersect.setObjects(objects);
    }




    setupPostProcessing() {
        const renderer = this.managers.renderer.getRenderer();
        const scene = this.managers.scene.getScene();
        const camera = this.managers.camera.getCamera();

        // Composer nimmt den normalen Renderer als Basis
        this.composer = new EffectComposer(renderer);

        // RenderPass rendert die Szene normal auf eine interne Textur, statt direkt auf den Bildschirm
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // UnrealBloomPass nimmt Ergebnis von RenderPass, berechnet Glow
        const bloomParams = {
            strength: 1.5,  // Stärke des Glows
            radius: 0.4,    // Weichheit des Glows
            threshold: 0.85 // ab welcher Helligkeit Glow startet
        };

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            bloomParams.strength,
            bloomParams.radius,
            bloomParams.threshold
        );

        // Pässe werden der Reihe nach ausgeführt, Composer rendert Ergebnis auf Bildschirm
        this.composer.addPass(bloomPass);
    }

    createFractal() {
        //Fraktale erzeugen
        this.dragon = this.managers.geometry.createDragonFractal(
            'room2',
            'rightWall',
            GALLERY_CONFIG.ROOM.WALL_HEIGHT,
            { color: 0xff0000, maxOrder: 12 },
            7, 5, 1

        );
        this.dragon2 = this.managers.geometry.createDragonFractal(
            'room2',
            'leftWall',
            GALLERY_CONFIG.ROOM.WALL_HEIGHT,
            { color: 0x0000FF, maxOrder: 11 },
            6, 2, 1
        );
    }

    updateFractal(deltaTime) {
        if (!this.dragon || !this.dragon2) return;

        //Zeit aufsummieren
        this.fractalTimer += deltaTime;

        // Nur iterieren, wenn genug Zeit vergangen ist
        if (this.fractalTimer < this.fractalInterval) return;

        this.fractalTimer = 0;

        // Abbruch, wenn maxOrder erreicht
        if (this.dragon.fractal.getOrder() >= this.dragon.maxOrder) {
            this.dragon.reset();
            return;
        }
        if (this.dragon2.fractal.getOrder() >= this.dragon2.maxOrder) {
            this.dragon2.reset();
            return;
        }

        this.dragon.iterate();
        this.dragon2.iterate();
    }

    /**
     * Create and position artworks in the gallery
     */
    createArtworks() {
        // Room 1 paintings (main gallery room)
        const room1Paintings = [
            {
                image: 'assets/images/vanGogh.jpg',
                width: 8,
                height: 4,
                position: new THREE.Vector3(-12.49, 4, GALLERY_CONFIG.LAYOUT.ROOM1_CENTER.z),
                rotation: new THREE.Vector3(0, Math.PI / 2, 0)
            },
            {
                image: 'assets/images/vanGogh2.jpg',
                width: 8,
                height: 4,
                position: new THREE.Vector3(12.49, 4, GALLERY_CONFIG.LAYOUT.ROOM1_CENTER.z),
                rotation: new THREE.Vector3(0, -Math.PI / 2, 0)
            },
            {
                image: 'assets/images/claudeMonet.jpg',
                width: 8,
                height: 4,
                position: new THREE.Vector3(0, 4, -12.49),
                rotation: new THREE.Vector3(0, 0, 0)
            },
            {
                image: 'assets/images/claudeMonet2.jpg',
                width: 5,
                height: 2.5,
                position: new THREE.Vector3(-8, 4, -12.49),
                rotation: new THREE.Vector3(0, 0, 0)
            },
            {
                image: 'assets/images/claudeMonet3.jpg',
                width: 5,
                height: 2.5,
                position: new THREE.Vector3(8, 4, -12.49),
                rotation: new THREE.Vector3(0, 0, 0)
            }
        ];

        // Corridor painting
        const corridorPaintings = [
            {
                image: 'assets/images/reflection.jpg',
                width: 3,
                height: 4,
                position: new THREE.Vector3(-GALLERY_CONFIG.CORRIDOR.WIDTH / 2 + 0.01, 2.5, GALLERY_CONFIG.LAYOUT.CORRIDOR_CENTER.z - 5),
                rotation: new THREE.Vector3(0, Math.PI / 2, 0)
            }
        ];

        // Room 2 is intentionally left empty

        // Create all paintings
        [...room1Paintings, ...corridorPaintings].forEach((painting, index) => {
            this.managers.geometry.createPainting(
                painting.image,
                painting.width,
                painting.height,
                painting.position,
                painting.rotation
            );
        });
    }

    doCarpet() {
        //Teppich erzeugen
        this.carpet = this.managers.geometry.createCarpet(
            new THREE.Vector3(0, 8, 0),
            16,
            3,

        );
        this.carpet2 = this.managers.geometry.createCarpet(
            new THREE.Vector3(-7.5, -1, 0),
            12,
            3,
        );
        this.carpet2.rotation.z = -Math.PI / 2;
        this.carpet3 = this.managers.geometry.createCarpet(
            new THREE.Vector3(7.5, -1, 0),
            12,
            3,
        );
        this.carpet3.rotation.z = Math.PI / 2;
    }

    async createAudio() {
        const textureLoader = new THREE.TextureLoader();

        // Textur asynchron laden
        const musicboxTex = await new Promise((resolve, reject) => {
            textureLoader.load(
                'assets/images/box.jpg',
                (texture) => resolve(texture),
                undefined,
                (err) => reject(err)
            );
        });

        const boxMaterial = new THREE.MeshLambertMaterial({
            map: musicboxTex,
        });

        const musicboxGeo = new THREE.BoxGeometry(1, 1, 0.5);
        const musicbox = new THREE.Mesh(musicboxGeo, boxMaterial);

        // Position & Rotation setzen **auf dem Mesh**
        musicbox.position.set(1.35, 0.8, 0);
        musicbox.rotation.y = Math.PI / 2; // optional 90° drehen

        this.dragon2.add(musicbox);

        this.managers.audio.addPositionalAudio(
            musicbox,
            'assets/audio/background.mp3',
            true,   // loop
            0.3,    // volume
            10      // refDistance
        );
    }


    /**carpet.rotation.x = -Math.PI / 2;
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
    animate(currentTime = 0) {
        if (!this.isRunning) return;

        requestAnimationFrame((time) => this.animate(time));

        const deltaTime = this.calculateDeltaTime(currentTime);
        this.updateScene(deltaTime, currentTime);
        this.updateFractal(deltaTime);
        this.managers.geometry.animateCube(deltaTime);
        this.updateHeldObject(deltaTime);
        this.renderScene();
    }

    /**
     * Update held object position to follow camera and physics
     */
    updateHeldObject(deltaTime) {
        const camera = this.managers.camera.getCamera();

        if (this.intersect) {
            // Update crosshair color feedback
            this.intersect.updateCrosshairFeedback(camera);

            // Update held object position
            if (this.intersect.isHoldingObject()) {
                this.intersect.updateHeldObject(camera);
            }

            // Update physics (gravity) for pickable objects
            this.intersect.updatePhysics(deltaTime);
        }
    }

    /**
     * Calculate delta time for smooth animations
     */
    calculateDeltaTime(currentTime) {
        const deltaTime = this.lastTime === 0 ? 0 : (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        return deltaTime;
    }


    /**
     * Update all scene elements
     */
    updateScene(deltaTime, currentTime) {
        // Update camera controls with delta time for smooth movement
        this.managers.camera.update(deltaTime);

        // Update local player body to follow camera
        this.updateLocalPlayerBody(deltaTime);

        // Send multiplayer movement updates
        if (this.managers.multiplayer && this.managers.multiplayer.isMultiplayerConnected()) {
            const cameraPosition = this.managers.camera.getPosition();
            const cameraRotation = this.managers.camera.getRotation();
            this.managers.multiplayer.sendMovement(cameraPosition, cameraRotation);
        }
    }

    /**
     * Update shader uniforms for time-based animations (for future use)
     */
    updateShaderUniforms(currentTime) {
        for (const obj of Object.values(this.managers.geometry.objects)) {
            if (obj.material && obj.material.uniforms && obj.material.uniforms.time) {
                obj.material.uniforms.time.value = currentTime * 0.001;
            }
        }
    }

    renderScene() {
        // Check if portal rendering is enabled and we have portals
        const usePortalRendering = this.managers.portal &&
            this.managers.portal.enabled &&
            this.managers.portal.getPortals().length > 0;

        if (usePortalRendering) {
            // Portal rendering handles its own scene rendering
            // Note: Portal rendering currently bypasses the bloom composer
            // for correct stencil buffer handling
            this.managers.portal.render();
        } else if (this.composer) {
            this.composer.render(); // Composer rendert jetzt mit Bloom
        } else {
            this.managers.renderer.render(
                this.managers.scene.getScene(),
                this.managers.camera.getCamera()
            );
        }

        // Overlay-Fadenkreuz rendern
        this.managers.renderer.getRenderer().autoClear = false;
        this.managers.renderer.getRenderer().render(
            this.intersect.getOverlayScene(),
            this.intersect.getOverlayCamera()
        );
        this.managers.renderer.getRenderer().autoClear = true;
    }

    //Composer rendert in eigenen Texturen, bei Änderungen der Fenstergröße neu setzen -> sonst Glow verzerrt
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.managers.camera.updateAspectRatio();
        this.managers.renderer.handleResize();

        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }


    /**
     * Create local player body for first-person view
     * Uses the full PersonManager model for consistency with remote players
     * Head is visible from external views (portals) but not from first-person using layers
     */
    createLocalPlayerBody() {
        const personManager = this.managers.geometry.getPersonManager();
        const cameraPos = this.managers.camera.getPosition();

        // Create a full person model using PersonManager
        // Person group offset adjusted for scale 1.15 (taller player)
        const playerScale = 1.15;
        const personGroupGroundOffset = -0.23 * playerScale;

        this.localPlayerBody = personManager.createPerson(
            new THREE.Vector3(cameraPos.x, personGroupGroundOffset, cameraPos.z),
            {
                name: 'localPlayer',
                clothingColor: 0x4169e1, // Blue clothing
                scale: playerScale
            }
        );

        // Use layer 1 for head parts - visible from external views (portals) but not first-person
        // Layer 0 = default (main camera sees this)
        // Layer 1 = external view only (portal camera sees this, main camera doesn't)
        const EXTERNAL_VIEW_LAYER = 1;

        // Configure main camera to NOT see layer 1 (head parts)
        this.managers.camera.getCamera().layers.disable(EXTERNAL_VIEW_LAYER);

        // Move head, hair, and eyes to layer 1 (external view only)
        const bodyParts = this.localPlayerBody.bodyParts;
        if (bodyParts) {
            if (bodyParts.head) {
                bodyParts.head.layers.set(EXTERNAL_VIEW_LAYER);
            }
            if (bodyParts.hair) {
                bodyParts.hair.layers.set(EXTERNAL_VIEW_LAYER);
            }
            if (bodyParts.eyes) {
                if (bodyParts.eyes.leftEye) bodyParts.eyes.leftEye.layers.set(EXTERNAL_VIEW_LAYER);
                if (bodyParts.eyes.rightEye) bodyParts.eyes.rightEye.layers.set(EXTERNAL_VIEW_LAYER);
                if (bodyParts.eyes.leftPupil) bodyParts.eyes.leftPupil.layers.set(EXTERNAL_VIEW_LAYER);
                if (bodyParts.eyes.rightPupil) bodyParts.eyes.rightPupil.layers.set(EXTERNAL_VIEW_LAYER);
            }
        }

        // Remove the person from scene (PersonManager adds it automatically)
        // We'll manage its position manually to follow the camera
        this.managers.scene.getScene().remove(this.localPlayerBody);

        // Re-add to scene (not attached to camera, we update position manually)
        this.managers.scene.add(this.localPlayerBody);

        console.log('Local player body created with full model (head on layer 1 - visible from portals only)');
    }



    /**
     * Update local player body to follow camera movement and animate walking
     */
    updateLocalPlayerBody(deltaTime) {
        if (!this.localPlayerBody) return;

        const cameraPos = this.managers.camera.getPosition();
        const cameraKeys = this.managers.camera.keys;
        const jumpState = this.managers.camera.jumpState;

        // Person group ground offset (feet on ground when camera at Y=1.6)
        // Adjusted for taller player (scale 1.15)
        const playerScale = 1.15;
        const personGroupGroundOffset = -0.2 * playerScale; // -0.23
        const cameraHeight = 1.7;

        // Get camera direction to offset body backward from camera
        const direction = this.managers.camera.getWorldDirection();
        const yRotation = Math.atan2(direction.x, direction.z);

        // Offset body backward from camera position (camera is in front of body)
        // Use yRotation instead of direction vector so offset is independent of vertical look angle
        const bodyOffset = 0.25; // How far behind the camera the body center is
        const offsetX = -Math.sin(yRotation) * bodyOffset;
        const offsetZ = -Math.cos(yRotation) * bodyOffset;

        // Update position to follow camera with offset
        this.localPlayerBody.position.x = cameraPos.x + offsetX;
        this.localPlayerBody.position.z = cameraPos.z + offsetZ;

        // Calculate Y position: account for jumping
        const jumpHeight = Math.max(0, cameraPos.y - cameraHeight);
        this.localPlayerBody.position.y = personGroupGroundOffset + jumpHeight;

        // Update rotation to match camera direction
        this.localPlayerBody.rotation.y = yRotation;

        // Detect if player is moving based on key input
        const isMoving = cameraKeys.forward || cameraKeys.backward || cameraKeys.left || cameraKeys.right;
        const isJumping = jumpState.isJumping;

        // Get body parts (using PersonManager's structure)
        const bodyParts = this.localPlayerBody.bodyParts;
        if (!bodyParts) return;

        const animState = this.localPlayerBody.animationState;
        if (!animState) return;

        // Update walking animation
        if (isMoving && !isJumping) {
            animState.isWalking = true;
            animState.walkCycle += deltaTime * 8; // Faster walk cycle for more visible animation

            const legSwing = Math.sin(animState.walkCycle) * 0.5; // Larger leg swing

            // Animate legs (using PersonManager's leg structure)
            if (bodyParts.legs && bodyParts.legs.leftLeg) {
                bodyParts.legs.leftLeg.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.legs.leftLeg.rotation.x,
                    legSwing,
                    0.2
                );
            }

            if (bodyParts.legs && bodyParts.legs.rightLeg) {
                bodyParts.legs.rightLeg.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.legs.rightLeg.rotation.x,
                    -legSwing,
                    0.2
                );
            }

            // Animate arms (opposite to legs for natural walking)
            const armSwing = Math.sin(animState.walkCycle) * 0.3;
            if (bodyParts.arms && bodyParts.arms.leftArm) {
                bodyParts.arms.leftArm.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.arms.leftArm.rotation.x,
                    -armSwing,
                    0.15
                );
            }
            if (bodyParts.arms && bodyParts.arms.rightArm) {
                bodyParts.arms.rightArm.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.arms.rightArm.rotation.x,
                    armSwing,
                    0.15
                );
            }

            // Subtle torso sway for more natural walking
            if (bodyParts.torso) {
                const torsoSway = Math.sin(animState.walkCycle * 0.5) * 0.03;
                bodyParts.torso.rotation.z = THREE.MathUtils.lerp(
                    bodyParts.torso.rotation.z,
                    torsoSway,
                    0.1
                );
            }
        } else if (!isJumping) {
            // Return to neutral position when not walking
            animState.isWalking = false;
            animState.walkCycle = 0;

            if (bodyParts.legs && bodyParts.legs.leftLeg) {
                bodyParts.legs.leftLeg.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.legs.leftLeg.rotation.x,
                    0,
                    0.15
                );
            }

            if (bodyParts.legs && bodyParts.legs.rightLeg) {
                bodyParts.legs.rightLeg.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.legs.rightLeg.rotation.x,
                    0,
                    0.15
                );
            }

            if (bodyParts.arms && bodyParts.arms.leftArm) {
                bodyParts.arms.leftArm.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.arms.leftArm.rotation.x,
                    0,
                    0.1
                );
            }
            if (bodyParts.arms && bodyParts.arms.rightArm) {
                bodyParts.arms.rightArm.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.arms.rightArm.rotation.x,
                    0,
                    0.1
                );
            }

            // Reset torso sway
            if (bodyParts.torso) {
                bodyParts.torso.rotation.z = THREE.MathUtils.lerp(
                    bodyParts.torso.rotation.z,
                    0,
                    0.1
                );
            }
        }

        // Handle jumping animation
        if (isJumping) {
            // Bring legs up during jump
            if (bodyParts.legs && bodyParts.legs.leftLeg) {
                bodyParts.legs.leftLeg.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.legs.leftLeg.rotation.x,
                    -0.5,
                    0.2
                );
            }

            if (bodyParts.legs && bodyParts.legs.rightLeg) {
                bodyParts.legs.rightLeg.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.legs.rightLeg.rotation.x,
                    -0.5,
                    0.2
                );
            }

            // Slight forward body lean
            if (bodyParts.torso) {
                bodyParts.torso.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.torso.rotation.x,
                    0.1,
                    0.1
                );
            }
        } else {
            // Reset torso lean
            if (bodyParts.torso) {
                bodyParts.torso.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.torso.rotation.x,
                    0,
                    0.1
                );
            }
        }
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
});

// Export for potential module usage
export default GalleryApp;
