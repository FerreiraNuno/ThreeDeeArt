import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';
import { vertexShader, fragmentShader } from './shader.js';
import { PersonManager } from './person.js';
import DragonFractal from './fractal.js';
import DragonFractalGeometry from './fractalGeometry.js';
import { createGlowMaterial } from './glowMaterial.js';

/**
 * Geometry and objects management module
 */
export class GeometryManager {
    constructor(scene) {
        this.scene = scene;
        this.lightingManager = null;
        this.objects = {};
        this.rooms = {};
        this.corridors = {};
        this.textureLoader = new THREE.TextureLoader();
        this.personManager = new PersonManager(scene);
    }

    // Setter, um den LightingManager zu verknüpfen
    setLightingManager(lightingManager) {
        this.lightingManager = lightingManager;
    }

    // Getter
    getLightingManager() {
        return this.lightingManager;
    }

    /**
     * Create a floor for a specific area
     * @param {number} width - Floor width
     * @param {number} depth - Floor depth
     * @param {THREE.Vector3} position - Floor position
     * @param {string} name - Identifier for the floor
     * @returns {THREE.Mesh} The floor mesh
     */
    createFloor(width = GALLERY_CONFIG.ROOM.WIDTH, depth = GALLERY_CONFIG.ROOM.DEPTH, position = new THREE.Vector3(0, 0, 0), name = 'floor') {
        const geometry = new THREE.PlaneGeometry(width, depth);

        // Elegant polished concrete floor - modern gallery aesthetic
        const material = new THREE.MeshStandardMaterial({
            color: GALLERY_CONFIG.MATERIALS.FLOOR.COLOR,
            roughness: 0.15,
            metalness: 0.05
        });

        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.position.copy(position);
        floor.receiveShadow = true;

        this.objects[name] = floor;
        this.scene.add(floor);
        return floor;
    }

    /**
     * Create walls for a room
     * @param {number} width - Room width
     * @param {number} depth - Room depth
     * @param {number} height - Wall height
     * @param {THREE.Vector3} center - Room center position
     * @param {string} name - Identifier for the walls
     * @param {Object} openings - Wall openings configuration
     * @returns {Object} Object containing all wall meshes
     */
    createWalls(width = GALLERY_CONFIG.ROOM.WIDTH, depth = GALLERY_CONFIG.ROOM.DEPTH, height = GALLERY_CONFIG.ROOM.WALL_HEIGHT, center = new THREE.Vector3(0, 0, 0), name = 'walls', openings = {}) {
        // Clean matte gallery walls - classic museum aesthetic
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: GALLERY_CONFIG.MATERIALS.WALL.COLOR,
            roughness: 0.9,
            metalness: 0.0
        });

        const walls = {};

        // Back wall (negative Z)
        if (!openings.back) {
            const backWallGeometry = new THREE.PlaneGeometry(width, height);
            const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
            backWall.position.set(center.x, center.y + height / 2, center.z - depth / 2);
            backWall.receiveShadow = true;
            walls.backWall = backWall;
            this.scene.add(backWall);
        } else if (openings.back === 'doorway') {
            // Create wall with doorway opening
            const doorwayWalls = this.createWallWithDoorway(width, height, center.x, center.y + height / 2, center.z - depth / 2, 0, wallMaterial, 'back');
            walls.backWallLeft = doorwayWalls.left;
            walls.backWallRight = doorwayWalls.right;
            walls.backWallTop = doorwayWalls.top;
        }

        // Front wall (positive Z)
        if (!openings.front) {
            const frontWallGeometry = new THREE.PlaneGeometry(width, height);
            const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
            frontWall.position.set(center.x, center.y + height / 2, center.z + depth / 2);
            frontWall.rotation.y = Math.PI;
            frontWall.receiveShadow = true;
            walls.frontWall = frontWall;
            this.scene.add(frontWall);
        } else if (openings.front === 'doorway') {
            // Create wall with doorway opening
            const doorwayWalls = this.createWallWithDoorway(width, height, center.x, center.y + height / 2, center.z + depth / 2, Math.PI, wallMaterial, 'front');
            walls.frontWallLeft = doorwayWalls.left;
            walls.frontWallRight = doorwayWalls.right;
            walls.frontWallTop = doorwayWalls.top;
        }

        // Left wall (negative X)
        if (!openings.left) {
            const leftWallGeometry = new THREE.PlaneGeometry(depth, height);
            const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
            leftWall.position.set(center.x - width / 2, center.y + height / 2, center.z);
            leftWall.rotation.y = Math.PI / 2;
            leftWall.receiveShadow = true;
            walls.leftWall = leftWall;
            this.scene.add(leftWall);
        }

        // Right wall (positive X)
        if (!openings.right) {
            const rightWallGeometry = new THREE.PlaneGeometry(depth, height);
            const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
            rightWall.position.set(center.x + width / 2, center.y + height / 2, center.z);
            rightWall.rotation.y = -Math.PI / 2;
            rightWall.receiveShadow = true;
            walls.rightWall = rightWall;
            this.scene.add(rightWall);
        }

        this.objects[name] = walls;

        // Add bounding boxes for collision detection
        for (const wall of Object.values(walls)) {
            wall.BBox = new THREE.Box3().setFromObject(wall);
            // Debug helpers (can be removed later)
            const helper = new THREE.Box3Helper(wall.BBox, 0xff0000);
            this.scene.add(helper);
        }
        return walls;
    }

    /**
     * Create a ceiling for a specific area
     * @param {number} width - Ceiling width
     * @param {number} depth - Ceiling depth
     * @param {number} height - Ceiling height
     * @param {THREE.Vector3} position - Ceiling position
     * @param {string} name - Identifier for the ceiling
     * @returns {THREE.Mesh} The ceiling mesh
     */
    createCeiling(width = GALLERY_CONFIG.ROOM.WIDTH, depth = GALLERY_CONFIG.ROOM.DEPTH, height = GALLERY_CONFIG.ROOM.WALL_HEIGHT, position = new THREE.Vector3(0, 0, 0), name = 'ceiling') {
        const geometry = new THREE.PlaneGeometry(width, depth);

        // Clean white ceiling - matches gallery aesthetic
        const material = new THREE.MeshStandardMaterial({
            color: GALLERY_CONFIG.MATERIALS.CEILING.COLOR,
            roughness: 0.95,
            metalness: 0.0
        });

        const ceiling = new THREE.Mesh(geometry, material);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(position.x, position.y + height, position.z);

        this.objects[name] = ceiling;
        this.scene.add(ceiling);
        return ceiling;
    }

    /**
     * Create a complete room with floor, walls, and ceiling
     * @param {THREE.Vector3} center - Room center position
     * @param {string} name - Room identifier
     * @param {Object} openings - Wall openings configuration
     * @returns {Object} Object containing all room elements
     */
    createRoom(center = new THREE.Vector3(0, 0, 0), name = 'room', openings = {}) {
        const { WIDTH, DEPTH, WALL_HEIGHT } = GALLERY_CONFIG.ROOM;

        const room = {
            floor: this.createFloor(WIDTH, DEPTH, center, `${name}_floor`),
            walls: this.createWalls(WIDTH, DEPTH, WALL_HEIGHT, center, `${name}_walls`, openings),
            ceiling: this.createCeiling(WIDTH, DEPTH, WALL_HEIGHT, center, `${name}_ceiling`)
        };

        this.rooms[name] = room;
        return room;
    }

    /**
     * Create a corridor connecting two rooms
     * @param {THREE.Vector3} start - Start position
     * @param {THREE.Vector3} end - End position
     * @param {string} name - Corridor identifier
     * @returns {Object} Object containing all corridor elements
     */
    createCorridor(start, end, name = 'corridor') {
        const { WIDTH, WALL_HEIGHT } = GALLERY_CONFIG.CORRIDOR;

        // Calculate corridor center and length
        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const length = start.distanceTo(end);

        const corridor = {
            floor: this.createFloor(WIDTH, length, center, `${name}_floor`),
            walls: this.createCorridorWalls(WIDTH, length, WALL_HEIGHT, center, `${name}_walls`),
            ceiling: this.createCeiling(WIDTH, length, WALL_HEIGHT, center, `${name}_ceiling`)
        };

        this.corridors[name] = corridor;
        return corridor;
    }

    getCorridorGroup() {
        return this.corridors;
    }


    /**
     * Create a wall with a doorway opening
     * @param {number} wallWidth - Total wall width
     * @param {number} wallHeight - Wall height
     * @param {number} x - Wall X position
     * @param {number} y - Wall Y position
     * @param {number} z - Wall Z position
     * @param {number} rotationY - Wall rotation around Y axis
     * @param {THREE.Material} material - Wall material
     * @param {string} direction - Wall direction (for naming)
     * @returns {Object} Object containing wall segments
     */
    createWallWithDoorway(wallWidth, wallHeight, x, y, z, rotationY, material, direction) {
        const doorwayWidth = GALLERY_CONFIG.CORRIDOR.WIDTH;
        const doorwayHeight = 6; // Height of the doorway opening
        const sideWallWidth = (wallWidth - doorwayWidth) / 2;

        const walls = {};

        // Left wall segment
        if (sideWallWidth > 0) {
            const leftGeometry = new THREE.PlaneGeometry(sideWallWidth, wallHeight);
            const leftWall = new THREE.Mesh(leftGeometry, material);
            leftWall.position.set(x - doorwayWidth / 2 - sideWallWidth / 2, y, z);
            leftWall.rotation.y = rotationY;
            leftWall.receiveShadow = true;
            walls.left = leftWall;
            this.scene.add(leftWall);
        }

        // Right wall segment
        if (sideWallWidth > 0) {
            const rightGeometry = new THREE.PlaneGeometry(sideWallWidth, wallHeight);
            const rightWall = new THREE.Mesh(rightGeometry, material);
            rightWall.position.set(x + doorwayWidth / 2 + sideWallWidth / 2, y, z);
            rightWall.rotation.y = rotationY;
            rightWall.receiveShadow = true;
            walls.right = rightWall;
            this.scene.add(rightWall);
        }

        // Top wall segment (above doorway)
        const topWallHeight = wallHeight - doorwayHeight;
        if (topWallHeight > 0) {
            const topGeometry = new THREE.PlaneGeometry(doorwayWidth, topWallHeight);
            const topWall = new THREE.Mesh(topGeometry, material);
            topWall.position.set(x, y + doorwayHeight / 2, z);
            topWall.rotation.y = rotationY;
            topWall.receiveShadow = true;
            walls.top = topWall;
            this.scene.add(topWall);
        }

        // Add bounding boxes for collision detection
        for (const wall of Object.values(walls)) {
            wall.BBox = new THREE.Box3().setFromObject(wall);
            // Debug helpers (can be removed later)
            const helper = new THREE.Box3Helper(wall.BBox, 0xff0000);
            this.scene.add(helper);
        }

        return walls;
    }

    /**
     * Create walls for a corridor (only left and right walls)
     * @param {number} width - Corridor width
     * @param {number} length - Corridor length
     * @param {number} height - Wall height
     * @param {THREE.Vector3} center - Corridor center position
     * @param {string} name - Identifier for the walls
     * @returns {Object} Object containing corridor wall meshes
     */
    createCorridorWalls(width, length, height, center, name) {
        // Clean matte gallery walls - matches room aesthetic
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: GALLERY_CONFIG.MATERIALS.WALL.COLOR,
            roughness: 0.9,
            metalness: 0.0
        });

        const walls = {};

        // Left wall (negative X)
        const leftWallGeometry = new THREE.PlaneGeometry(length, height);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.set(center.x - width / 2, center.y + height / 2, center.z);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        walls.leftWall = leftWall;
        this.scene.add(leftWall);

        // Right wall (positive X)
        const rightWallGeometry = new THREE.PlaneGeometry(length, height);
        const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWall.position.set(center.x + width / 2, center.y + height / 2, center.z);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        walls.rightWall = rightWall;
        this.scene.add(rightWall);

        this.objects[name] = walls;

        // Add bounding boxes for collision detection
        for (const wall of Object.values(walls)) {
            wall.BBox = new THREE.Box3().setFromObject(wall);
            // Debug helpers (can be removed later)
            const helper = new THREE.Box3Helper(wall.BBox, 0xff0000);
            this.scene.add(helper);
        }
        return walls;
    }

    createGalleryStructure() {
        // Create Room 1 (main gallery room) with doorway to corridor
        const room1Center = new THREE.Vector3(
            GALLERY_CONFIG.LAYOUT.ROOM1_CENTER.x,
            0,
            GALLERY_CONFIG.LAYOUT.ROOM1_CENTER.z
        );

        this.createRoom(room1Center, 'room1', { front: 'doorway' });

        // Create corridor connecting the rooms
        const corridorStart = new THREE.Vector3(0, 0, GALLERY_CONFIG.ROOM.DEPTH / 2);
        const corridorEnd = new THREE.Vector3(0, 0, GALLERY_CONFIG.LAYOUT.ROOM2_CENTER.z - GALLERY_CONFIG.ROOM.DEPTH / 2);
        this.createCorridor(corridorStart, corridorEnd, 'mainCorridor');

        // Create Room 2 (empty gallery room) with doorway to corridor
        const room2Center = new THREE.Vector3(
            GALLERY_CONFIG.LAYOUT.ROOM2_CENTER.x,
            0,
            GALLERY_CONFIG.LAYOUT.ROOM2_CENTER.z
        );
        this.createRoom(room2Center, 'room2', { back: 'doorway' });
    }

    /**
     * Create a player prop using the PersonManager
     * @param {THREE.Vector3} position - Position to place the player
     * @param {Object} options - Customization options
     * @returns {THREE.Group} The player group object
     */
    createPlayerProp(position = new THREE.Vector3(0, 0, 0), options = {}) {
        const player = this.personManager.createPlayerProp(position, options);
        this.objects.player = player;
        return player;
    }

    /**
     * Create a person using the PersonManager
     * @param {THREE.Vector3} position - Position to place the person
     * @param {Object} options - Customization options
     * @returns {THREE.Group} The person group object
     */
    createPerson(position = new THREE.Vector3(0, 0, 0), options = {}) {
        return this.personManager.createPerson(position, options);
    }

    /**
     * Get the PersonManager instance
     * @returns {PersonManager} The person manager
     */
    getPersonManager() {
        return this.personManager;
    }

    //hier auch BBox
    createCube() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = createGlowMaterial(0xff00ff, 1.5);
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, -9, 5); // Center of room, sitting properly on floor
        cube.castShadow = true;
        cube.receiveShadow = true;

        cube.BBox = new THREE.Box3().setFromObject(cube);
        //kann später gelöscht werden
        //const bboxHelper = new THREE.Box3Helper(cube.BBox, 0x0000ff);
        //this.scene.add(bboxHelper);

        this.objects.cube = cube;
        this.rooms['room2'].floor.add(cube);


        this.lightingManager.addEmissiveLight
            (
                cube,
                {
                    color: 0xff00ff,
                    intensity: 1.2,
                    distance: 12
                }
            );


        return cube;
    }

    animateCube(deltaTime) {
        if (this.objects.cube) {
            const speed = GALLERY_CONFIG.ANIMATION.CUBE_ROTATION_SPEED;
            //this.objects.cube.rotation.y += speed;
            this.objects.cube.rotation.z += speed;

            //this.objects.cube.updateLightUniforms();
        }
    }


    createPainting(imageURL, width, height, position, rotation) {
        const textureLoader = new THREE.TextureLoader();
        const paintingTexture = textureLoader.load(imageURL);
        const paintingMaterial = new THREE.MeshLambertMaterial({ map: paintingTexture });

        paintingMaterial.onBeforeCompile = (shader) => {
            // Vertex-Shader: vUv deklarieren
            shader.vertexShader = 'varying vec2 vUv;\n' + shader.vertexShader;

            // vUv in main setzen
            shader.vertexShader = shader.vertexShader.replace(
                '#include <uv_vertex>',
                '#include <uv_vertex>\n vUv = uv;'
            );

            // Fragment-Shader: vUv deklarieren
            shader.fragmentShader = 'varying vec2 vUv;\n' + shader.fragmentShader;

            // Radiale Vignette hinzufügen
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
            vec2 center = vec2(0.5);
            float dist = distance(vUv, center);

            float glow = smoothstep(0.35, 0.5, dist);
            vec3 glowColor = vec3(1.0, 0.9, 0.6);
            gl_FragColor.rgb += glow * 0.05 * glowColor;

            #include <dithering_fragment>
            `
            );
        };


        const paintingGeometry = new THREE.PlaneGeometry(width, height);
        const painting = new THREE.Mesh(paintingGeometry, paintingMaterial);
        painting.position.set(position.x, position.y, position.z);
        painting.rotation.set(rotation.x, rotation.y, rotation.z);
        this.scene.add(painting);
        this.objects[imageURL] = painting;
        return painting;
    }




    createDragonFractal(roomName, wallName, wallHeight = GALLERY_CONFIG.ROOM.WALL_HEIGHT, options = {},
        scaleX, scaleY, scaleZ) {
        // Fraktal erzeugen
        const dragon = new DragonFractalGeometry(options);

        // Wand holen
        const wall = this.rooms[roomName].walls[wallName];

        //Skalierung
        dragon.scale.set(scaleX, scaleY, scaleZ);

        // Position in Wand-Lokalsystem
        const wallNormal = new THREE.Vector3(0, 0, 1); //Default
        const Rotation = wall.rotation.z;
        wallNormal.applyAxisAngle(new THREE.Vector3(0, 0, 1), Rotation);   //Normale rotieren anhand Ausrichtung des Wand
        dragon.position.add(wallNormal.multiplyScalar(0.01));    //entlang der Normalen verschieben mit Offset 0.01

        //Fraktal als Child an Wand anhängen
        wall.add(dragon);

        // Objekt speichern
        this.objects[`dragon_${wallName}`] = dragon;

        return dragon;
    }

    createCarpet(roomCenter, width, depth, textureURL = null) {
        const geometry = new THREE.PlaneGeometry(width, depth);
        let material;

        if (textureURL) {
            const texture = new THREE.TextureLoader().load(textureURL);
            material = new THREE.MeshLambertMaterial({ map: texture });
        } else {
            material = new THREE.MeshLambertMaterial({ color: 0xAA3333 });
        }

        const carpet = new THREE.Mesh(geometry, material);
        carpet.receiveShadow = true;

        // Auf Boden legen (X/Z-Ebene)
        carpet.position.copy(roomCenter);
        carpet.position.z += 0.1; // leicht über Boden, kein z-fighting

        this.rooms['room1'].floor.add(carpet);
        return carpet;
    }


    getObjects() {
        return this.objects;
    }

    animateObjects(deltaTime = 0.016) {
        // Animate persons with deltaTime for smooth animations
        this.personManager.animatePersons(deltaTime);
    }
}

