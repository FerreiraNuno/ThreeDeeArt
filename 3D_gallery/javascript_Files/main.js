/*
Vom Live Server/Browser aus gesehen:
    3D_gallery/index.html      <-- Root
    3D_gallery/images/floor.jpg  <-- Pfad für Browser
    3D_gallery/javascript_Files/main.js  <-- JS-Datei

=> deshalb müssen Dateien anders geladen werden, Root ist nicht main.js vom Browser aus, sondern index.html

import * as THREE from '../three.module.js';

*/

const scene = new THREE.Scene();

//Kamera
const camera = new THREE.PerspectiveCamera(
    75, //Sichtfeld
    window.innerWidth/window.innerHeight,   //Seitenverhältnis
    0.1,    //near clipping plane
    1000    //far
);

camera.position.z = 5; //guckt Richtung -z, Kamera nach hinten bewegen, da sie im Ursprung ist -> führt zu Problemen, wenn Objekte auch im Ursprung sind -> Kamera mittendrin
scene.add(camera);

//Renderer
const renderer =  new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 1); //Hintergrundfarbe

document.body.appendChild(renderer.domElement); //füge HTML Renderer hinzu

//Licht
const ambientLight = new THREE.AmbientLight(0x101010, 1.0); //Farbe, Intensität
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 15, 7.5)
scene.add(dirLight);

//---------------Objekte---------------//
//Cube
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({color: "red" });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.translateZ(1); //MUSS OPTIMIERT WERDEN! damit Körper nicht hinter Plane (Hintergrund) verschwindet
scene.add(cube);

//Boden
const WIDTH = 25;  // Breite
const DEPTH = 25;  // Tiefe der Plane
const WALL_HEIGHT = 50;
const floorTexture = new THREE.TextureLoader().load('images/floor.jpg');

floorTexture.wrapS = THREE.RepeatWrapping; 
floorTexture.wrapT = THREE.RepeatWrapping; 
floorTexture.repeat.set(20, 20); // Anzahl der Wiederholungen in X- und Y-Richtung

const planeGeometry = new THREE.PlaneGeometry(WIDTH, DEPTH)
const planeMaterial = new THREE.MeshBasicMaterial({map: floorTexture, side: THREE.DoubleSide}); //DoubleSide rendert beide Seiten der Plane
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -1;
scene.add(plane)

//Wände
const walls = new THREE.Group();
scene.add(walls);

const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(WIDTH, WALL_HEIGHT, 0.01), //Breite, Höhe, Tiefe (in dem Fall sehr flache Platte)
    new THREE.MeshBasicMaterial({color: "black"})
);
frontWall.position.z = -DEPTH/2; //hintere Kante der Plane
frontWall.position.y = (WALL_HEIGHT/ 2) - 1; //Plane liegt auf y=-1

const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(WIDTH, WALL_HEIGHT, 0.01),
    new THREE.MeshBasicMaterial({ color: "black" })
);
backWall.position.z = DEPTH / 2; // vordere Kante der Plane
backWall.position.y = (WALL_HEIGHT / 2) - 1;

const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(DEPTH, WALL_HEIGHT, 0.01),
    new THREE.MeshBasicMaterial({ color: "grey" })
);
leftWall.rotation.y = Math.PI / 2; 
leftWall.position.x = -WIDTH / 2; 
leftWall.position.y = (WALL_HEIGHT / 2) - 1;

const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(DEPTH, WALL_HEIGHT, 0.01),
    new THREE.MeshBasicMaterial({ color: "grey" })
);
rightWall.rotation.y = Math.PI / 2;
rightWall.position.x = WIDTH / 2;
rightWall.position.y = (WALL_HEIGHT / 2) - 1;

walls.add(frontWall, backWall, leftWall, rightWall)

//Bedienung
document.addEventListener("keydown", onKeyDown, false);

function onKeyDown(event){
    let  keycode = event.key || event.code //Tastencode der gedrückten Taste auslesen
    
    if (keycode === "ArrowLeft") { 
        camera.translateX(-0.03)
    }
    else if (keycode === "ArrowRight") { 
        camera.translateX(0.03)
    }
    else if (keycode === "ArrowUp") { 
        camera.translateY(0.03)
    }
    else if (keycode === "ArrowDown") { 
        camera.translateY(-0.03)
    }

}

//Rendering
function animate() {
    requestAnimationFrame(animate); //ruft die Funktion bei jedem Bildschirm-Refresh auf
    cube.rotation.y += 0.01;
    cube.rotation.z += 0.01;
    renderer.render(scene, camera);
}
animate();
