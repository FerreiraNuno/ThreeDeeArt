//für Glow-Effekt, optional pulsierend, additives Blending
// beim Material noch THREE.AdditiveBlending setzen, damit der Glow „überstrahlt“.
export const glowVertexShader = `
    attribute vec3 color;   //aus BufferGeometry
    varying vec3 vColor;    // für Fragment Shader
    varying vec3 vPosition;

    void main() {
        vColor = color;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const glowFragmentShader = `
    uniform vec3 glowColor;       // Farbe des Glow
    uniform float intensity;      // Stärke des Glow
    varying vec3 vPosition;
    varying vec3 vColor;

    void main() {
        //Farbe + Glow
        vec3 finalColor = vColor + glowColor * intensity;
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;
