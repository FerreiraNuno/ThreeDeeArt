import * as THREE from 'three';
import { glowVertexShader, glowFragmentShader } from './glowShader.js';

export function createGlowMaterial(color = 0xff00ff, intensity = 1.0) {
    return new THREE.ShaderMaterial({
        vertexShader: glowVertexShader,
        fragmentShader: glowFragmentShader,
        uniforms: {
            glowColor: { value: new THREE.Color(color) },
            intensity: { value: intensity },
        },
        transparent: true,  //Additives Blending funkt. nur mit Transparenz
        blending: THREE.AdditiveBlending,   //Glow überstrahlt: Hintergrund + GlowColor
        depthWrite: false   //Tiefenbuffer könnte Transparenz überschreiben
    });
}
