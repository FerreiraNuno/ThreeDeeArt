/*
Ab Version v0.162 zwingend als ES-Module importieren


import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/controls/OrbitControls.js';
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
const WALL_HEIGHT = 10;
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
plane.add(walls);

const wallTexture = new THREE.TextureLoader().load('images/wall2.jpg');
wallTexture.wrapS = THREE.RepeatWrapping; 
wallTexture.wrapT = THREE.RepeatWrapping; 
wallTexture.repeat.set(20, 20); 

const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(WIDTH, WALL_HEIGHT, 0.01), //Breite, Höhe, Tiefe (in dem Fall sehr flache Platte)
    new THREE.MeshBasicMaterial({map: wallTexture, side: THREE.DoubleSide})
);
frontWall.rotation.x = Math.PI / 2;     
frontWall.translateZ(-DEPTH / 2);
frontWall.translateY(WALL_HEIGHT / 2)

const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(DEPTH, WALL_HEIGHT, 0.01),
    new THREE.MeshBasicMaterial({ map: wallTexture, side: THREE.DoubleSide })
);
leftWall.rotation.z = Math.PI / 2; 
leftWall.rotation.y = Math.PI / 2; 
leftWall.translateZ(-WIDTH / 2);
leftWall.translateY(WALL_HEIGHT / 2);

const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(DEPTH, WALL_HEIGHT, 0.01),
    new THREE.MeshBasicMaterial({ map: wallTexture, side: THREE.DoubleSide })
);
rightWall.rotation.z = Math.PI / 2; 
rightWall.rotation.y = Math.PI / 2; 
rightWall.translateZ(WIDTH / 2);
rightWall.translateY(WALL_HEIGHT / 2);


const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(WIDTH, WALL_HEIGHT, 0.01),
    new THREE.MeshBasicMaterial({ map: wallTexture, side: THREE.DoubleSide })
);
backWall.rotation.x = Math.PI / 2;     
backWall.translateZ(DEPTH / 2);
backWall.translateY(WALL_HEIGHT / 2)

walls.add(frontWall, leftWall, rightWall, backWall)

//Dach

const dachGeometry = new THREE.BoxGeometry(WIDTH,0.01 , DEPTH)
const dachMaterial = new THREE.MeshBasicMaterial({color: "grey", side: THREE.DoubleSide}); //DoubleSide rendert beide Seiten der Plane
const dach = new THREE.Mesh(dachGeometry, dachMaterial);
dach.rotation.x = -Math.PI / 2;; 
dach.translateY(-10 + 0.005)
plane.add(dach)

//Bedienung
document.addEventListener("keydown", onKeyDown, false);

function onKeyDown(event){
   
    const cameraMoveSpeed = 0.25;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward)   //Blickrichtung der Kamera
    forward.y = 0; // Bewegung auf XZ-Ebene begrenzen
    forward.normalize();
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, forward).normalize(); //dritte Koordinatenachse der Kamera

    // Translation-Vektor, den wir nicht nur auf Kamera, sondern auf controls.target = Blickrichtung anwenden müssen
    const translation = new THREE.Vector3();

    let  keycode = event.code //Tastencode der gedrückten Taste auslesen
      switch (event.code) {
        case "KeyW":
            translation.copy(forward).multiplyScalar(cameraMoveSpeed);  //copy zur Sicherheit -> neue Objekte/vorhandene Obj. überschreiben
            break;
        case "KeyS":
            translation.copy(forward).multiplyScalar(-cameraMoveSpeed);
            break;
        case "KeyA":
            translation.copy(right).multiplyScalar(cameraMoveSpeed);
            break;
        case "KeyD":
            translation.copy(right).multiplyScalar(-cameraMoveSpeed);
            break;
        default:
            return;
    }

    camera.position.add(translation);
   // target mitverschieben -> Blickrichtung bleibt stabil
    controls.target.add(translation);
    
}
    

//OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;


//Rendering
function animate() {
    requestAnimationFrame(animate); //ruft die Funktion bei jedem Bildschirm-Refresh auf
    cube.rotation.y += 0.01;
    cube.rotation.z += 0.01;
    controls.update();
    renderer.render(scene, camera);
}
animate();
