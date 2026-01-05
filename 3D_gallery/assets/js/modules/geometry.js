import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';
import { vertexShader, fragmentShader } from './shader.js';
import { PersonManager } from './person.js';
import DragonFractal from './fractal.js';
import DragonFractalGeometry from './fractalGeometry.js';
import { createGlowMaterial } from './glowMaterial.js';

/**
 * Geometrie- und Objekt-Verwaltung
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

    setLightingManager(lightingManager) {
        this.lightingManager = lightingManager;
    }

    getLightingManager() {
        return this.lightingManager;
    }

    /**
     * Boden für einen Bereich erstellen
     */
    createFloor(width = GALLERY_CONFIG.ROOM.WIDTH, depth = GALLERY_CONFIG.ROOM.DEPTH, position = new THREE.Vector3(0, 0, 0), name = 'floor') {
        const geometry = new THREE.PlaneGeometry(width, depth);

        // Polierter Beton für moderne Galerie-Optik
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
     * Wände für einen Raum erstellen
     */
    createWalls(width = GALLERY_CONFIG.ROOM.WIDTH, depth = GALLERY_CONFIG.ROOM.DEPTH, height = GALLERY_CONFIG.ROOM.WALL_HEIGHT, center = new THREE.Vector3(0, 0, 0), name = 'walls', openings = {}) {
        // Matte Galeriewände
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: GALLERY_CONFIG.MATERIALS.WALL.COLOR,
            roughness: 0.9,
            metalness: 0.0
        });

        const walls = {};

        // Hintere Wand
        if (!openings.back) {
            const backWallGeometry = new THREE.PlaneGeometry(width, height);
            const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
            backWall.position.set(center.x, center.y + height / 2, center.z - depth / 2);
            backWall.receiveShadow = true;
            walls.backWall = backWall;
            this.scene.add(backWall);
        } else if (openings.back === 'doorway') {
            const doorwayWalls = this.createWallWithDoorway(width, height, center.x, center.y + height / 2, center.z - depth / 2, 0, wallMaterial, 'back');
            walls.backWallLeft = doorwayWalls.left;
            walls.backWallRight = doorwayWalls.right;
            walls.backWallTop = doorwayWalls.top;
        }

        // Vordere Wand
        if (!openings.front) {
            const frontWallGeometry = new THREE.PlaneGeometry(width, height);
            const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
            frontWall.position.set(center.x, center.y + height / 2, center.z + depth / 2);
            frontWall.rotation.y = Math.PI;
            frontWall.receiveShadow = true;
            walls.frontWall = frontWall;
            this.scene.add(frontWall);
        } else if (openings.front === 'doorway') {
            const doorwayWalls = this.createWallWithDoorway(width, height, center.x, center.y + height / 2, center.z + depth / 2, Math.PI, wallMaterial, 'front');
            walls.frontWallLeft = doorwayWalls.left;
            walls.frontWallRight = doorwayWalls.right;
            walls.frontWallTop = doorwayWalls.top;
        }

        // Linke Wand
        if (!openings.left) {
            const leftWallGeometry = new THREE.PlaneGeometry(depth, height);
            const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
            leftWall.position.set(center.x - width / 2, center.y + height / 2, center.z);
            leftWall.rotation.y = Math.PI / 2;
            leftWall.receiveShadow = true;
            walls.leftWall = leftWall;
            this.scene.add(leftWall);
        }

        // Rechte Wand
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

        for (const wall of Object.values(walls)) {
            wall.BBox = new THREE.Box3().setFromObject(wall);
        }
        return walls;
    }

    /**
     * Decke erstellen
     */
    createCeiling(width = GALLERY_CONFIG.ROOM.WIDTH, depth = GALLERY_CONFIG.ROOM.DEPTH, height = GALLERY_CONFIG.ROOM.WALL_HEIGHT, position = new THREE.Vector3(0, 0, 0), name = 'ceiling') {
        const geometry = new THREE.PlaneGeometry(width, depth);

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
     * Kompletten Raum erstellen
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
     * Korridor zwischen zwei Räumen erstellen
     */
    createCorridor(start, end, name = 'corridor') {
        const { WIDTH, WALL_HEIGHT } = GALLERY_CONFIG.CORRIDOR;

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
     * Wand mit Durchgang erstellen
     */
    createWallWithDoorway(wallWidth, wallHeight, x, y, z, rotationY, material, direction) {
        const doorwayWidth = GALLERY_CONFIG.CORRIDOR.WIDTH;
        const doorwayHeight = 6;
        const sideWallWidth = (wallWidth - doorwayWidth) / 2;

        const walls = {};

        if (sideWallWidth > 0) {
            const leftGeometry = new THREE.PlaneGeometry(sideWallWidth, wallHeight);
            const leftWall = new THREE.Mesh(leftGeometry, material);
            leftWall.position.set(x - doorwayWidth / 2 - sideWallWidth / 2, y, z);
            leftWall.rotation.y = rotationY;
            leftWall.receiveShadow = true;
            walls.left = leftWall;
            this.scene.add(leftWall);
        }

        if (sideWallWidth > 0) {
            const rightGeometry = new THREE.PlaneGeometry(sideWallWidth, wallHeight);
            const rightWall = new THREE.Mesh(rightGeometry, material);
            rightWall.position.set(x + doorwayWidth / 2 + sideWallWidth / 2, y, z);
            rightWall.rotation.y = rotationY;
            rightWall.receiveShadow = true;
            walls.right = rightWall;
            this.scene.add(rightWall);
        }

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

        for (const wall of Object.values(walls)) {
            wall.BBox = new THREE.Box3().setFromObject(wall);
        }

        return walls;
    }

    /**
     * Korridorwände erstellen
     */
    createCorridorWalls(width, length, height, center, name) {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: GALLERY_CONFIG.MATERIALS.WALL.COLOR,
            roughness: 0.9,
            metalness: 0.0
        });

        const walls = {};

        const leftWallGeometry = new THREE.PlaneGeometry(length, height);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.set(center.x - width / 2, center.y + height / 2, center.z);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        walls.leftWall = leftWall;
        this.scene.add(leftWall);

        const rightWallGeometry = new THREE.PlaneGeometry(length, height);
        const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWall.position.set(center.x + width / 2, center.y + height / 2, center.z);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        walls.rightWall = rightWall;
        this.scene.add(rightWall);

        this.objects[name] = walls;

        for (const wall of Object.values(walls)) {
            wall.BBox = new THREE.Box3().setFromObject(wall);
        }
        return walls;
    }

    createGalleryStructure() {
        const room1Center = new THREE.Vector3(
            GALLERY_CONFIG.LAYOUT.ROOM1_CENTER.x,
            0,
            GALLERY_CONFIG.LAYOUT.ROOM1_CENTER.z
        );

        this.createRoom(room1Center, 'room1', { front: 'doorway' });

        const corridorStart = new THREE.Vector3(0, 0, GALLERY_CONFIG.ROOM.DEPTH / 2);
        const corridorEnd = new THREE.Vector3(0, 0, GALLERY_CONFIG.LAYOUT.ROOM2_CENTER.z - GALLERY_CONFIG.ROOM.DEPTH / 2);
        this.createCorridor(corridorStart, corridorEnd, 'mainCorridor');

        const room2Center = new THREE.Vector3(
            GALLERY_CONFIG.LAYOUT.ROOM2_CENTER.x,
            0,
            GALLERY_CONFIG.LAYOUT.ROOM2_CENTER.z
        );
        this.createRoom(room2Center, 'room2', { back: 'doorway' });
    }

    createPlayerProp(position = new THREE.Vector3(0, 0, 0), options = {}) {
        const player = this.personManager.createPlayerProp(position, options);
        this.objects.player = player;
        return player;
    }

    createPerson(position = new THREE.Vector3(0, 0, 0), options = {}) {
        return this.personManager.createPerson(position, options);
    }

    getPersonManager() {
        return this.personManager;
    }

    createCube() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = createGlowMaterial(0xff00ff, 1.5);
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, -9, 5);
        cube.castShadow = true;
        cube.receiveShadow = true;

        cube.BBox = new THREE.Box3().setFromObject(cube);

        this.objects.cube = cube;
        this.rooms['room2'].floor.add(cube);

        this.lightingManager.addEmissiveLight(
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
            this.objects.cube.rotation.z += speed;
        }
    }

    createPainting(imageURL, width, height, position, rotation) {
        const textureLoader = new THREE.TextureLoader();
        const paintingTexture = textureLoader.load(imageURL);
        const paintingMaterial = new THREE.MeshLambertMaterial({ map: paintingTexture });

        paintingMaterial.onBeforeCompile = (shader) => {
            // Vertex-Shader: vUv deklarieren
            shader.vertexShader = 'varying vec2 vUv;\n' + shader.vertexShader;
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
        const dragon = new DragonFractalGeometry(options);
        const wall = this.rooms[roomName].walls[wallName];

        dragon.scale.set(scaleX, scaleY, scaleZ);

        // Position im Wand-Lokalsystem
        const wallNormal = new THREE.Vector3(0, 0, 1);
        const Rotation = wall.rotation.z;
        wallNormal.applyAxisAngle(new THREE.Vector3(0, 0, 1), Rotation);
        dragon.position.add(wallNormal.multiplyScalar(0.01));

        wall.add(dragon);

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

        carpet.position.copy(roomCenter);
        carpet.position.z += 0.1; // Leicht über Boden gegen Z-Fighting

        this.rooms['room1'].floor.add(carpet);
        return carpet;
    }

    /**
     * Aufhebbaren Würfel erstellen
     */
    createPickableCube() {
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffaa,
            roughness: 0.3,
            metalness: 0.6,
            emissive: 0x003322,
            emissiveIntensity: 0.3
        });

        const pickableCube = new THREE.Mesh(geometry, material);
        pickableCube.position.set(0, 0.4, 0);
        pickableCube.castShadow = true;
        pickableCube.receiveShadow = true;
        pickableCube.name = 'pickableCube';

        // Als aufhebbar markieren
        pickableCube.userData.isPickable = true;
        pickableCube.userData.isHeld = false;

        pickableCube.BBox = new THREE.Box3().setFromObject(pickableCube);

        this.objects.pickableCube = pickableCube;
        this.scene.add(pickableCube);

        if (this.lightingManager) {
            this.lightingManager.addEmissiveLight(pickableCube, {
                color: 0x00ffaa,
                intensity: 0.5,
                distance: 5
            });
        }

        return pickableCube;
    }

    updatePickableCubeBBox() {
        if (this.objects.pickableCube) {
            this.objects.pickableCube.BBox.setFromObject(this.objects.pickableCube);
        }
    }

    getObjects() {
        return this.objects;
    }

    animateObjects(deltaTime = 0.016) {
        this.personManager.animatePersons(deltaTime);
    }

    /**
     * Prozedurale Stein-Normal-Map generieren
     */
    generateStoneNormalMap(width = 512, height = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Neutrale Normale (zeigt nach oben)
        ctx.fillStyle = 'rgb(128, 128, 255)';
        ctx.fillRect(0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const heightMap = new Float32Array(width * height);

        // Multi-Oktaven Rauschen generieren
        for (let octave = 0; octave < 4; octave++) {
            const frequency = Math.pow(2, octave) * 8;
            const amplitude = 1 / Math.pow(2, octave);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const nx = x / width * frequency;
                    const ny = y / height * frequency;
                    const noise = Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453;
                    const value = (noise - Math.floor(noise)) * amplitude;
                    heightMap[y * width + x] += value;
                }
            }
        }

        // Risse hinzufügen
        for (let i = 0; i < 20; i++) {
            let cx = Math.random() * width;
            let cy = Math.random() * height;
            const angle = Math.random() * Math.PI * 2;
            const length = 40 + Math.random() * 120;

            for (let j = 0; j < length; j++) {
                const px = Math.floor(cx);
                const py = Math.floor(cy);
                if (px >= 0 && px < width && py >= 0 && py < height) {
                    heightMap[py * width + px] -= 0.6;
                    if (px > 0) heightMap[py * width + (px - 1)] -= 0.35;
                    if (px < width - 1) heightMap[py * width + (px + 1)] -= 0.35;
                    if (py > 0) heightMap[(py - 1) * width + px] -= 0.25;
                    if (py < height - 1) heightMap[(py + 1) * width + px] -= 0.25;
                }
                cx += Math.cos(angle + (Math.random() - 0.5) * 0.5);
                cy += Math.sin(angle + (Math.random() - 0.5) * 0.5);
            }
        }

        // Höhenkarte in Normal-Map umwandeln (Sobel-Operator)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const tl = heightMap[(y - 1) * width + (x - 1)];
                const t = heightMap[(y - 1) * width + x];
                const tr = heightMap[(y - 1) * width + (x + 1)];
                const l = heightMap[y * width + (x - 1)];
                const r = heightMap[y * width + (x + 1)];
                const bl = heightMap[(y + 1) * width + (x - 1)];
                const b = heightMap[(y + 1) * width + x];
                const br = heightMap[(y + 1) * width + (x + 1)];

                const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
                const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

                const strength = 5.0;
                const normalX = -dX * strength;
                const normalY = -dY * strength;
                const normalZ = 1.0;

                const len = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(((normalX / len) * 0.5 + 0.5) * 255);
                data[idx + 1] = Math.floor(((normalY / len) * 0.5 + 0.5) * 255);
                data[idx + 2] = Math.floor(((normalZ / len) * 0.5 + 0.5) * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        return texture;
    }

    /**
     * Stein-Podest mit Normal-Mapping erstellen
     */
    createStonePedestal(position = new THREE.Vector3(0, 0, 60)) {
        const pedestalGroup = new THREE.Group();
        pedestalGroup.position.copy(position);

        const stoneNormalMap = this.textureLoader.load('assets/images/np_carpet.jpg');
        stoneNormalMap.wrapS = THREE.RepeatWrapping;
        stoneNormalMap.wrapT = THREE.RepeatWrapping;

        // Stein-Material mit Normal-Mapping
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x9a9a90,
            roughness: 0.35,
            metalness: 0.25,
            normalMap: stoneNormalMap,
            normalScale: new THREE.Vector2(3.5, 3.5)
        });

        // Sockel
        const baseGeometry = new THREE.BoxGeometry(2, 0.4, 2);
        const base = new THREE.Mesh(baseGeometry, stoneMaterial);
        base.position.y = 0.2;
        base.castShadow = true;
        base.receiveShadow = true;
        pedestalGroup.add(base);

        // Säule
        const columnGeometry = new THREE.CylinderGeometry(0.6, 0.7, 2.5, 16);
        const column = new THREE.Mesh(columnGeometry, stoneMaterial);
        column.position.y = 1.65;
        column.castShadow = true;
        column.receiveShadow = true;
        pedestalGroup.add(column);

        // Kapitell
        const capitalGeometry = new THREE.BoxGeometry(1.6, 0.3, 1.6);
        const capital = new THREE.Mesh(capitalGeometry, stoneMaterial);
        capital.position.y = 3.05;
        capital.castShadow = true;
        capital.receiveShadow = true;
        pedestalGroup.add(capital);

        // Dekorative Kugel
        const sphereNormalMap = this.textureLoader.load('assets/images/np_carpet.jpg');
        sphereNormalMap.wrapS = THREE.RepeatWrapping;
        sphereNormalMap.wrapT = THREE.RepeatWrapping;
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a5868,
            roughness: 0.25,
            metalness: 0.5,
            normalMap: sphereNormalMap,
            normalScale: new THREE.Vector2(4.0, 4.0)
        });

        const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.y = 3.7;
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        pedestalGroup.add(sphere);

        this.objects.stonePedestal = pedestalGroup;
        this.scene.add(pedestalGroup);

        if (this.lightingManager) {
            this.lightingManager.addSpotlight(
                new THREE.Vector3(position.x, 7, position.z),
                new THREE.Vector3(position.x, 0, position.z),
                {
                    color: 0xfff8e7,
                    intensity: 0.8,
                    distance: 15,
                    angle: Math.PI / 6,
                    penumbra: 0.5
                }
            );
        }

        console.log('Stone pedestal with normal mapping created in Room 2');
        return pedestalGroup;
    }
}
