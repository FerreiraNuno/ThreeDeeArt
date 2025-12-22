//für Farbanimation
export const vertexShader = `
    varying vec3 vPosition;
    void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const fragmentShader = `
    uniform float time;
    varying vec3 vPosition;
    void main() {
        gl_FragColor = vec4(abs(sin(vPosition.x + time)), 0.0, 0.0, 1.0);
    }
`;
