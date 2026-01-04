// FractalGeometry.js
import * as THREE from 'three';
import DragonFractal from './fractal.js';
import { createGlowMaterial } from './glowMaterial.js';

export default class DragonFractalGeometry extends THREE.Object3D {
    constructor(options = {}) { //Konstruktor kann auch ohne Parameter aufgerufen werden -> Defaults
        super();    //erbt von THREE.Object3D 
        this.color = options.color || 0xff0000; //Attribute werden gekoppelt + Defaults
        this.intensity = options.intensity || 1;
        this.maxOrder = options.maxOrder || 10;

        this.fractal = new DragonFractal();
        this.currentOrder = 0;

        this.geometry = new THREE.BufferGeometry(); //Vertices auf GPU -> Berechnungen viel schneller

        this.material = createGlowMaterial(this.color, this.intensity);
        this.line = new THREE.Line(this.geometry, this.material); //verbindet Punkte

        this.add(this.line);    //line wird als child an container angehängt

        this.updateGeometry();  //Methode, die Fraktalpunkte in BufferGeometry schreibt
    }

    updateGeometry() {
        const points = this.fractal.getPoints();
        //float32array ist gpu-optimiert und direkt nutzbar
        //buffergeometry arbeitet immer mit 3D-Koord: typed arrays -> positions berücksichtigen Reihenfolge für Koord.
        const positions = new Float32Array(points.length * 3);
        const colors = new Float32Array(points.length * 3);
        const color = new THREE.Color();

        for (let i = 0; i < points.length; i++) {
            const p = points[i];

            positions[i * 3]     = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = 0;   //z-Koord. auf 0, da Frakal in Wand-Ebene liegt

            const t = i / (points.length-1);    //Verlauf 0..1

            color.setHSL(t, 1.0, 0.5);  //Regenbogen (Farbton, Sättigung, Helligkeit)    

            colors[i * 3]     = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        this.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3) //setzt die Geometrie
        );

        this.geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(colors, 3)
        );

        this.geometry.attributes.position.needsUpdate = true;   //GPU lädt Daten neu
        this.geometry.attributes.color.needsUpdate = true;
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
