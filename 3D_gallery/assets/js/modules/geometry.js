import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';

/**
 * Geometry and objects management module
 */
export class GeometryManager {
    constructor(scene) {
        this.scene = scene;
        this.objects = {};
        this.textureLoader = new THREE.TextureLoader();
    }

    createTestCube() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: "red" });
        const cube = new THREE.Mesh(geometry, material);
        cube.translateZ(1);

        this.objects.cube = cube;
        this.scene.add(cube);
        return cube;
    }

    createFloor() {
        const { WIDTH, DEPTH } = GALLERY_CONFIG.ROOM;
        const floorTexture = this.textureLoader.load(GALLERY_CONFIG.TEXTURES.FLOOR);

        // Configure texture wrapping and repeat
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        const repeat = GALLERY_CONFIG.TEXTURE_REPEAT.FLOOR;
        floorTexture.repeat.set(repeat.x, repeat.y);

        const geometry = new THREE.PlaneGeometry(WIDTH, DEPTH);
        const material = new THREE.MeshBasicMaterial({
            map: floorTexture,
            side: THREE.DoubleSide
        });

        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;

        this.objects.floor = floor;
        this.scene.add(floor);
        return floor;
    }

    createWalls(floor) {
        const { WIDTH, DEPTH, WALL_HEIGHT } = GALLERY_CONFIG.ROOM;
        const wallTexture = this.textureLoader.load(GALLERY_CONFIG.TEXTURES.WALL);

        // Configure wall texture
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        const repeat = GALLERY_CONFIG.TEXTURE_REPEAT.WALL;
        wallTexture.repeat.set(repeat.x, repeat.y);

        const wallMaterial = new THREE.MeshBasicMaterial({
            map: wallTexture,
            side: THREE.DoubleSide
        });

        const walls = new THREE.Group();

        // Front wall
        const frontWall = new THREE.Mesh(
            new THREE.BoxGeometry(WIDTH, WALL_HEIGHT, 0.01),
            wallMaterial
        );
        frontWall.rotation.x = Math.PI / 2;
        frontWall.translateZ(-DEPTH / 2);
        frontWall.translateY(WALL_HEIGHT / 2);

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(DEPTH, WALL_HEIGHT, 0.01),
            wallMaterial
        );
        leftWall.rotation.z = Math.PI / 2;
        leftWall.rotation.y = Math.PI / 2;
        leftWall.translateZ(-WIDTH / 2);
        leftWall.translateY(WALL_HEIGHT / 2);

        // Right wall
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(DEPTH, WALL_HEIGHT, 0.01),
            wallMaterial
        );
        rightWall.rotation.z = Math.PI / 2;
        rightWall.rotation.y = Math.PI / 2;
        rightWall.translateZ(WIDTH / 2);
        rightWall.translateY(WALL_HEIGHT / 2);

        // Back wall
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(WIDTH, WALL_HEIGHT, 0.01),
            wallMaterial
        );
        backWall.rotation.x = Math.PI / 2;
        backWall.translateZ(DEPTH / 2);
        backWall.translateY(WALL_HEIGHT / 2);

        walls.add(frontWall, leftWall, rightWall, backWall);
        floor.add(walls);

        this.objects.walls = walls;
        return walls;
    }

    createCeiling(floor) {
        const { WIDTH, DEPTH } = GALLERY_CONFIG.ROOM;

        const geometry = new THREE.BoxGeometry(WIDTH, 0.01, DEPTH);
        const material = new THREE.MeshBasicMaterial({
            color: "grey",
            side: THREE.DoubleSide
        });

        const ceiling = new THREE.Mesh(geometry, material);
        ceiling.rotation.x = -Math.PI / 2;
        ceiling.translateY(-10 + 0.005);

        floor.add(ceiling);
        this.objects.ceiling = ceiling;
        return ceiling;
    }

    getObjects() {
        return this.objects;
    }

    animateObjects() {
        if (this.objects.cube) {
            const speed = GALLERY_CONFIG.ANIMATION.CUBE_ROTATION_SPEED;
            this.objects.cube.rotation.y += speed;
            this.objects.cube.rotation.z += speed;
        }
    }
}
