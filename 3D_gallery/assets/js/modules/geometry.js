import * as THREE from 'three';
import { GALLERY_CONFIG } from '../config/constants.js';
import { vertexShader, fragmentShader} from './shader.js';
import DragonFractal from './fractal.js';
import DragonFractalGeometry from './fractalGeometry.js';

/**
 * Geometry and objects management module
 */
export class GeometryManager {
    constructor(scene) {
        this.scene = scene;
        this.objects = {};
        this.textureLoader = new THREE.TextureLoader();
    }

    //hier auch BB-Box
    createTestCube() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({
            color: GALLERY_CONFIG.MATERIALS.CUBE.COLOR
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(-10, 1, -10); // Center of room, sitting properly on floor
        cube.castShadow = true;
        cube.receiveShadow = true;

        cube.BBox = new THREE.Box3().setFromObject(cube);
        //kann später gelöscht werden
        const bboxHelper = new THREE.Box3Helper(cube.BBox, 0x0000ff);
        this.scene.add(bboxHelper);

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
        const material = new THREE.MeshLambertMaterial({
            map: floorTexture
        });

        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;

        this.objects.floor = floor;
        this.scene.add(floor);
        return floor;
    }

    createWalls() {
        const { WIDTH, DEPTH, WALL_HEIGHT } = GALLERY_CONFIG.ROOM;
        const wallTexture = this.textureLoader.load(GALLERY_CONFIG.TEXTURES.WALL);

        // Configure wall texture
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        const repeat = GALLERY_CONFIG.TEXTURE_REPEAT.WALL;
        wallTexture.repeat.set(repeat.x, repeat.y);

        const wallMaterial = new THREE.MeshLambertMaterial({
            map: wallTexture
        });

        const wallGeometry = new THREE.PlaneGeometry(WIDTH, WALL_HEIGHT);

        // Back wall
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.set(0, WALL_HEIGHT / 2, -WIDTH / 2);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Front wall
        const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
        frontWall.position.set(0, WALL_HEIGHT / 2, WIDTH / 2);
        frontWall.rotation.y = Math.PI;
        frontWall.receiveShadow = true;
        this.scene.add(frontWall);

        // Left wall
        const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
        leftWall.position.set(-WIDTH / 2, WALL_HEIGHT / 2, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
        rightWall.position.set(WIDTH / 2, WALL_HEIGHT / 2, 0);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);

        const walls = { backWall, frontWall, leftWall, rightWall };
        this.objects.walls = walls;
        
        // brauchen wir das???
        for (const wall of Object.values(walls)){
            wall.BBox = new THREE.Box3().setFromObject(wall);
            //kann später gelöscht werden !!!!!
            const helper = new THREE.Box3Helper(wall.BBox, 0xff0000);
            this.scene.add(helper);
        }
        return walls;
    }

    createCeiling() {
        const { WIDTH, DEPTH, WALL_HEIGHT } = GALLERY_CONFIG.ROOM;
        const ceilingTexture = this.textureLoader.load(GALLERY_CONFIG.TEXTURES.CEILING);

        ceilingTexture.wrapS = THREE.RepeatWrapping;
        ceilingTexture.wrapT = THREE.RepeatWrapping;
        const repeat = GALLERY_CONFIG.TEXTURE_REPEAT.CEILING;
        ceilingTexture.repeat.set(repeat.x, repeat.y);

        const material = new THREE.MeshLambertMaterial({
        map: ceilingTexture
        });
        const geometry = new THREE.PlaneGeometry(WIDTH, DEPTH);

        const ceiling = new THREE.Mesh(geometry, material);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = WALL_HEIGHT;

        this.objects.ceiling = ceiling;
        this.scene.add(ceiling);
        return ceiling;
    }

    createPainting(imageURL, width, height, position, rotation) {
        const textureLoader = new THREE.TextureLoader();
        const paintingTexture = textureLoader.load(imageURL);
        const paintingMaterial = new THREE.MeshLambertMaterial({
           map: paintingTexture, 
        });
        const paintingGeometry = new THREE.PlaneGeometry(width, height);
        const painting = new THREE.Mesh(paintingGeometry, paintingMaterial);
        painting.position.set(position.x, position.y, position.z);
        painting.rotation.set(rotation.x, rotation.y, rotation.z);
        this.scene.add(painting);
        this.objects[imageURL] = painting;
        return painting;
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

