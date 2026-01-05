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
 * Renderer-Verwaltung
 */
class RendererManager {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: GALLERY_CONFIG.RENDERER.ANTIALIAS,
            stencil: true
        });

        this.setupRenderer();

        // Tone Mapping für filmischen Look
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(GALLERY_CONFIG.RENDERER.BACKGROUND_COLOR, 1);

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
 * Szenen-Verwaltung
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
 * Haupt-Galerie-Anwendung
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
     * Initialisiert alle Manager und die Galerie
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
     * Initialisiert alle Kern-Manager
     */
    initializeManagers() {
        this.managers.scene = new SceneManager();
        this.managers.renderer = new RendererManager();
        this.managers.camera = new CameraManager(this.managers.renderer.getRenderer());
        this.managers.geometry = new GeometryManager(this.managers.scene.getScene());
        this.managers.lighting = new LightingManager(this.managers.scene.getScene());

        // Beide Manager verknüpfen
        this.managers.geometry.setLightingManager(this.managers.lighting);
        this.managers.lighting.setGeometryManager(this.managers.geometry);

        this.managers.camera.getCamera().add(this.listener);
        this.managers.audio = new AudioManager(this.listener);

        console.log(this.managers.geometry.objects);

        this.managers.multiplayer = new MultiplayerManager(
            this.managers.scene.getScene(),
            this.managers.geometry.getPersonManager(),
            this.managers.camera
        );

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

        this.createLocalPlayerBody();
    }

    /**
     * Verbindungen zwischen Managern herstellen
     */
    setupManagerConnections() {
        this.managers.camera.setGeometryManager(this.managers.geometry);
        this.managers.scene.add(this.managers.camera.getControls().getObject());
    }

    /**
     * Event-Listener einrichten
     */
    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('keydown', (event) => this.handleGlobalKeyDown(event));
        window.addEventListener('click', (event) => this.handlePickupClick(event));
        setInterval(() => this.updateMultiplayerStatus(), 1000);
    }

    /**
     * Klick zum Aufheben/Ablegen von Objekten
     */
    handlePickupClick(event) {
        if (event.button !== 0) return;
        if (!this.managers.camera.getControls().isLocked) return;

        const camera = this.managers.camera.getCamera();
        this.intersect.togglePickup(camera);
    }

    /**
     * Globale Tastaturkürzel
     */
    handleGlobalKeyDown(event) {
        if (event.code === 'KeyE' && this.managers.camera.getControls().isLocked) {
            const camera = this.managers.camera.getCamera();
            this.intersect.togglePickup(camera);
        }
    }

    /**
     * Multiplayer-Status in der UI aktualisieren
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
     * 3D-Szene mit allen Objekten aufbauen
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
     * Stein-Podest mit Normal-Mapping in Raum 2 erstellen
     */
    createStonePedestal() {
        const room2Center = GALLERY_CONFIG.LAYOUT.ROOM2_CENTER;
        const pedestalPosition = new THREE.Vector3(
            room2Center.x + 8,
            0,
            room2Center.z
        );

        this.managers.geometry.createStonePedestal(pedestalPosition);
    }

    /**
     * Aufhebbaren Würfel erstellen
     */
    createPickableCube() {
        const pickableCube = this.managers.geometry.createPickableCube();
        this.intersect.addPickableObject(pickableCube);
    }

    /**
     * Einweg-Portal im Korridor erstellen
     */
    createPortals() {
        if (!this.managers.portal) return;

        const portalConfig = GALLERY_CONFIG.PORTAL;
        const corridorConfig = GALLERY_CONFIG.CORRIDOR;
        const layoutConfig = GALLERY_CONFIG.LAYOUT;

        // Sichtbares Portal an der rechten Korridorwand
        const viewPortalPosition = new THREE.Vector3(
            -corridorConfig.WIDTH / 2 + 0.05,
            corridorConfig.WALL_HEIGHT / 2 - 1.5,
            layoutConfig.CORRIDOR_CENTER.z
        );
        const viewPortalRotation = new THREE.Euler(0, Math.PI / 2, 0);

        // Referenzpunkt an der linken Wand
        const referencePosition = new THREE.Vector3(
            corridorConfig.WIDTH / 2 - 0.05,
            corridorConfig.WALL_HEIGHT / 2 - 1.5,
            layoutConfig.CORRIDOR_CENTER.z
        );
        const referenceRotation = new THREE.Euler(0, -Math.PI / 2, 0);

        const { portalMesh, frameMesh } = this.managers.portal.createViewPortal(
            portalConfig.WIDTH,
            portalConfig.HEIGHT,
            viewPortalPosition,
            viewPortalRotation,
            {
                portalColor: portalConfig.PORTAL_COLOR,
                frameColor: portalConfig.FRAME_COLOR,
                frameWidth: portalConfig.FRAME_WIDTH
            }
        );

        const referencePoint = this.managers.portal.createReferencePoint(
            referencePosition,
            referenceRotation
        );

        this.managers.scene.add(portalMesh);
        this.managers.scene.add(frameMesh);
        this.managers.portal.setupPortal(portalMesh, referencePoint, frameMesh);

        this.portal = {
            viewPortal: portalMesh,
            frame: frameMesh,
            reference: referencePoint
        };

        console.log('One-way portal created: View portal on right corridor wall, reference point on left wall');
    }


    setupIntersect() {
        this.intersect = new Intersect();
        window.addEventListener('mousemove', (e) => this.intersect.updateMouse(e, this.managers.camera.getCamera()));
    }

    addIntersectObjects(objects) {
        if (this.intersect)
            this.intersect.setObjects(objects);
    }

    setupPostProcessing() {
        const renderer = this.managers.renderer.getRenderer();
        const scene = this.managers.scene.getScene();
        const camera = this.managers.camera.getCamera();

        // Composer für Post-Processing Pipeline
        this.composer = new EffectComposer(renderer);

        // RenderPass rendert Szene auf interne Textur
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // Bloom-Effekt Parameter
        const bloomParams = {
            strength: 1.5,
            radius: 0.4,
            threshold: 0.85
        };

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            bloomParams.strength,
            bloomParams.radius,
            bloomParams.threshold
        );

        this.composer.addPass(bloomPass);
    }

    createFractal() {
        // Fraktale erzeugen
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

        this.fractalTimer += deltaTime;

        if (this.fractalTimer < this.fractalInterval) return;

        this.fractalTimer = 0;

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
     * Kunstwerke in der Galerie erstellen und positionieren
     */
    createArtworks() {
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

        const corridorPaintings = [
            {
                image: 'assets/images/reflection.jpg',
                width: 3,
                height: 4,
                position: new THREE.Vector3(-GALLERY_CONFIG.CORRIDOR.WIDTH / 2 + 0.01, 2.5, GALLERY_CONFIG.LAYOUT.CORRIDOR_CENTER.z - 3.5),
                rotation: new THREE.Vector3(0, Math.PI / 2, 0)
            }
        ];

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
        // Teppiche erzeugen
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

        musicbox.position.set(1.35, 0.8, 0);
        musicbox.rotation.y = Math.PI / 2;

        this.dragon2.add(musicbox);

        this.managers.audio.addPositionalAudio(
            musicbox,
            'assets/audio/background.mp3',
            true,
            0.3,
            10
        );
    }

    /**
     * Animationsschleife starten
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.animate();
    }

    /**
     * Animationsschleife stoppen
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Haupt-Animationsschleife
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
     * Gehaltenes Objekt aktualisieren
     */
    updateHeldObject(deltaTime) {
        const camera = this.managers.camera.getCamera();

        if (this.intersect) {
            this.intersect.updateCrosshairFeedback(camera);

            if (this.intersect.isHoldingObject()) {
                this.intersect.updateHeldObject(camera);
            }

            this.intersect.updatePhysics(deltaTime);
        }
    }

    /**
     * Delta-Zeit für flüssige Animationen berechnen
     */
    calculateDeltaTime(currentTime) {
        const deltaTime = this.lastTime === 0 ? 0 : (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        return deltaTime;
    }


    /**
     * Alle Szenen-Elemente aktualisieren
     */
    updateScene(deltaTime, currentTime) {
        this.managers.camera.update(deltaTime);
        this.updateLocalPlayerBody(deltaTime);

        if (this.managers.multiplayer && this.managers.multiplayer.isMultiplayerConnected()) {
            const cameraPosition = this.managers.camera.getPosition();
            const cameraRotation = this.managers.camera.getRotation();
            this.managers.multiplayer.sendMovement(cameraPosition, cameraRotation);
        }
    }

    /**
     * Shader-Uniforms für zeitbasierte Animationen aktualisieren
     */
    updateShaderUniforms(currentTime) {
        for (const obj of Object.values(this.managers.geometry.objects)) {
            if (obj.material && obj.material.uniforms && obj.material.uniforms.time) {
                obj.material.uniforms.time.value = currentTime * 0.001;
            }
        }
    }

    renderScene() {
        const usePortalRendering = this.managers.portal &&
            this.managers.portal.enabled &&
            this.managers.portal.hasPortal();

        if (usePortalRendering) {
            this.managers.portal.render();
        } else if (this.composer) {
            this.composer.render();
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

    // Bei Fenstergrößenänderung Composer-Texturen neu setzen
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
     * Lokalen Spielerkörper für First-Person-Ansicht erstellen
     */
    createLocalPlayerBody() {
        const personManager = this.managers.geometry.getPersonManager();
        const cameraPos = this.managers.camera.getPosition();

        const playerScale = 1.15;
        const personGroupGroundOffset = -0.23 * playerScale;

        this.localPlayerBody = personManager.createPerson(
            new THREE.Vector3(cameraPos.x, personGroupGroundOffset, cameraPos.z),
            {
                name: 'localPlayer',
                clothingColor: 0x4169e1,
                scale: playerScale
            }
        );

        // Layer 1 für Kopfteile - sichtbar aus externen Ansichten (Portale)
        const EXTERNAL_VIEW_LAYER = 1;

        this.managers.camera.getCamera().layers.disable(EXTERNAL_VIEW_LAYER);

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

        this.managers.scene.getScene().remove(this.localPlayerBody);
        this.managers.scene.add(this.localPlayerBody);

        console.log('Local player body created with full model (head on layer 1 - visible from portals only)');
    }



    /**
     * Lokalen Spielerkörper mit Kamerabewegung synchronisieren und Laufanimation
     */
    updateLocalPlayerBody(deltaTime) {
        if (!this.localPlayerBody) return;

        const cameraPos = this.managers.camera.getPosition();
        const cameraKeys = this.managers.camera.keys;
        const jumpState = this.managers.camera.jumpState;

        const playerScale = 1.15;
        const personGroupGroundOffset = -0.2 * playerScale;
        const cameraHeight = 1.7;

        const direction = this.managers.camera.getWorldDirection();
        const yRotation = Math.atan2(direction.x, direction.z);

        const bodyOffset = 0.25;
        const offsetX = -Math.sin(yRotation) * bodyOffset;
        const offsetZ = -Math.cos(yRotation) * bodyOffset;

        this.localPlayerBody.position.x = cameraPos.x + offsetX;
        this.localPlayerBody.position.z = cameraPos.z + offsetZ;

        const jumpHeight = Math.max(0, cameraPos.y - cameraHeight);
        this.localPlayerBody.position.y = personGroupGroundOffset + jumpHeight;

        this.localPlayerBody.rotation.y = yRotation;

        const isMoving = cameraKeys.forward || cameraKeys.backward || cameraKeys.left || cameraKeys.right;
        const isJumping = jumpState.isJumping;

        const bodyParts = this.localPlayerBody.bodyParts;
        if (!bodyParts) return;

        const animState = this.localPlayerBody.animationState;
        if (!animState) return;

        // Laufanimation
        if (isMoving && !isJumping) {
            animState.isWalking = true;
            animState.walkCycle += deltaTime * 8;

            const legSwing = Math.sin(animState.walkCycle) * 0.5;

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

            if (bodyParts.torso) {
                const torsoSway = Math.sin(animState.walkCycle * 0.5) * 0.03;
                bodyParts.torso.rotation.z = THREE.MathUtils.lerp(
                    bodyParts.torso.rotation.z,
                    torsoSway,
                    0.1
                );
            }
        } else if (!isJumping) {
            // Zurück zur Neutralposition
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

            if (bodyParts.torso) {
                bodyParts.torso.rotation.z = THREE.MathUtils.lerp(
                    bodyParts.torso.rotation.z,
                    0,
                    0.1
                );
            }
        }

        // Sprunganimation
        if (isJumping) {
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

            if (bodyParts.torso) {
                bodyParts.torso.rotation.x = THREE.MathUtils.lerp(
                    bodyParts.torso.rotation.x,
                    0.1,
                    0.1
                );
            }
        } else {
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
     * Zugriff auf Manager für Debugging oder Erweiterungen
     */
    getManagers() {
        return this.managers;
    }

}




// Galerie beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', () => {
    window.galleryApp = new GalleryApp();
});

export default GalleryApp;
