// DragonFractalGeometry.js
import * as THREE from 'three';
import DragonFractal from './fractal.js';

export default class DragonFractalGeometry extends THREE.Object3D {
    constructor(options = {}) { //Konstruktor kann auch ohne Parameter aufgerufen werden -> Defaults
        super();    //erbt von THREE.Object3D 
        this.color = options.color || 0xff0000; //Attribute werden gekoppelt + Defaults
        this.maxOrder = options.maxOrder || 10;

        this.fractal = new DragonFractal();
        this.currentOrder = 0;

        this.geometry = new THREE.BufferGeometry(); //Vertices auf GPU -> Berechnungen viel schneller
        this.material = new THREE.LineBasicMaterial({ color: this.color });
        this.line = new THREE.Line(this.geometry, this.material);

        this.add(this.line);    //line wird als child an container angehängt

        this.updateGeometry();  //Methode, die Fraktalpunkte in BufferGeometry schreibt
    }

    updateGeometry() {
        const points = this.fractal.getPoints();
        //float32array ist gpu-optimiert und direkt nutzbar
        //buffergeometry benötigt typed arrays -> positions berücksichtigen Reihenfolge für Koord.
        const positions = new Float32Array(points.length * 3);  
        for (let i = 0; i < points.length; i++) {
            positions[i * 3]     = points[i].x;
            positions[i * 3 + 1] = points[i].y;
            positions[i * 3 + 2] = 0;   //z-Koord. auf 0, da Frakal in Wand-Ebene liegt
        }
        this.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3) //setzt die Geometrie
        );
        this.geometry.attributes.position.needsUpdate = true;   //GPU lädt Daten neu
    }

    iterate() {
        if (this.currentOrder >= this.maxOrder) return;
        this.fractal.iterate();
        this.currentOrder++;
        this.updateGeometry();
    }

    reset() {
        this.fractal.reset();
        this.currentOrder = 0;
        this.updateGeometry();
    }
}
