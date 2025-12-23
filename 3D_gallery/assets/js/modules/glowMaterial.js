import * as THREE from 'three';
import { glowVertexShader, glowFragmentShader } from './glowShader.js';

export function createGlowMaterial(color = 0xff00ff, intensity = 1.0) {
    return new THREE.ShaderMaterial({
        vertexShader: glowVertexShader,
        fragmentShader: glowFragmentShader,
        uniforms: {
            glowColor: { value: new THREE.Color(color) },
            intensity: { value: intensity },
            //pointLightPosition: { value: new THREE.Vector3() },
            //pointLightColor: { value: new THREE.Color(0xff00ff) },
            //pointLightIntensity: { value: 1.2 },
        },
        transparent: true,  //Additives Blending funkt. nur mit Transparenz
        blending: THREE.AdditiveBlending,   //Hintergrund + GlowColor
        depthWrite: false   //Tiefenbuffer könnte Transparenz überschreiben
    });
}
