// Galerie-Konfiguration
export const GALLERY_CONFIG = {
    // Raum-Dimensionen
    ROOM: {
        WIDTH: 25,
        DEPTH: 25,
        WALL_HEIGHT: 8
    },

    // Korridor-Dimensionen
    CORRIDOR: {
        WIDTH: 6,
        LENGTH: 10,
        WALL_HEIGHT: 8
    },

    // Layout-Konfiguration
    LAYOUT: {
        ROOM1_CENTER: { x: 0, z: 0 },
        CORRIDOR_CENTER: { x: 0, z: 30 },
        ROOM2_CENTER: { x: 0, z: 60 }
    },

    // Kamera-Einstellungen
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        INITIAL_Z: 3,
        INITIAL_Y: 2,
        MOVE_SPEED: 10,
        BOUNDARY_BUFFER: 0.5,
        JUMP_VELOCITY: 8,
        GRAVITY: -25,
        GROUND_LEVEL: 1.7
    },

    // Beleuchtung
    LIGHTING: {
        AMBIENT: {
            COLOR: 0x404040,
            INTENSITY: 0.3
        },
        DIRECTIONAL: {
            COLOR: 0xffffff,
            INTENSITY: 0.5,
            POSITION: { x: 5, y: 8, z: 5 }
        },
        POINT: {
            COLOR: 0xffffff,
            INTENSITY: 0.5,
            DISTANCE: 100,
            POSITION: { x: 0, y: 3, z: 0 }
        },
        SPOTLIGHT: {
            COLOR: 0xffffff,
            INTENSITY: 0.5,
            DISTANCE: 100,
            ANGLE: Math.PI / 3,
            POSITION: { x: 0, y: 0, z: 0 },
        }
    },

    // Renderer-Einstellungen
    RENDERER: {
        BACKGROUND_COLOR: 0x87CEEB, // Himmelblau
        ANTIALIAS: true,
        SHADOWS: true,
        SHADOW_TYPE: 'PCFSoft'
    },

    // Texturen
    TEXTURES: {
        FLOOR: 'assets/images/parkett.jpg',
        WALL: 'assets/images/white_parkett.jpg',
        ARTWORK: 'assets/images/vanGogh.jpg',
        CEILING: 'assets/images/wall1.jpg'
    },

    // Textur-Wiederholungen
    TEXTURE_REPEAT: {
        FLOOR: { x: 25, y: 25 },
        WALL: { x: 10, y: 2 },
        CEILING: { x: 1, y: 1 }
    },

    // Materialien
    MATERIALS: {
        WALL: {
            COLOR: 0xf8f6f0 // Warmes Elfenbein
        },
        FLOOR: {
            COLOR: 0x8a8a8a // Polierter Beton
        },
        CEILING: {
            COLOR: 0xf8f6f0 // Warmes Elfenbein
        },
        CUBE: {
            COLOR: 0xff6b6b // Rot
        }
    },

    // Schatten-Einstellungen
    SHADOWS: {
        MAP_SIZE: 2048,
        CAMERA_NEAR: 0.5,
        CAMERA_FAR: 50,
        CAMERA_LEFT: -10,
        CAMERA_RIGHT: 10,
        CAMERA_TOP: 10,
        CAMERA_BOTTOM: -10
    },

    // Animation
    ANIMATION: {
        CUBE_ROTATION_SPEED: 0.01
    },

    // Portal-Einstellungen (Einweg-Portal-System)
    PORTAL: {
        ENABLED: true,
        RECURSION_DEPTH: 5,
        WIDTH: 3,
        HEIGHT: 4,
        FRAME_WIDTH: 0.15,
        FRAME_COLOR: 0x1a1a2e,
        PORTAL_COLOR: 0x00aaff
    }
};

// Tastenbelegung
export const KEY_MAPPINGS = {
    FORWARD: 'KeyW',
    BACKWARD: 'KeyS',
    LEFT: 'KeyA',
    RIGHT: 'KeyD',
    JUMP: 'Space',
};
