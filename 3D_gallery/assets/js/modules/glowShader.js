//für Glow-Effekt

export const glowVertexShader = `
    attribute vec3 color;   //aus BufferGeometry
    varying vec3 vColor;    // für Fragment Shader 
    varying vec3 vPosition;

    void main() {
        vColor = color; //Farbe wird bei Übergabe interpoliert
        vPosition = position; //Glow abhängig von Entfernung (interpoliert)
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const glowFragmentShader = `
    precision mediump float;    //Präzisionsangabe Gleitkommazahl zur Berechnung
    uniform vec3 glowColor;       // von glowMaterial übergeben
    uniform float intensity;      // für alle Fragmente gleich
    varying vec3 vPosition;
    varying vec3 vColor;

    //Interpolationsfunktion für sanften Übergang des Glow-Effekts
    float smoothstep_custom(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);   //Umrechnung zw. 0 und 1
    return t * t * (3.0 - 2.0 * t); //Glättung des Übergangs
    }


    void main() {
        // Distanz zum Zentrum des Objekts
        float dist = length(vPosition);
        // Glow-Falloff: stärker in der Mitte, schwächer nach außen
        float falloff = 1.0 - smoothstep_custom(0.0, 1.0, dist);

        //Farbe + Glow
        vec3 finalColor = vColor + glowColor * intensity * falloff;   //Farbe ist abhängig von der Vertice-Pos. + Glow-Effekt
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;
