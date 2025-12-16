// Gallery Configuration Constants
export const GALLERY_CONFIG = {
    // Scene dimensions
    ROOM: {
        WIDTH: 25,
        DEPTH: 25,
        WALL_HEIGHT: 8
    },

    // Camera settings
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        INITIAL_Z: 3,
        INITIAL_Y: 1.6, // Eye level height
        MOVE_SPEED: 10,
        // Collision boundary buffer from walls
        BOUNDARY_BUFFER: 0.5,
        // Jump physics
        JUMP_VELOCITY: 8,
        GRAVITY: -25,
        GROUND_LEVEL: 1.6
    },

    // Lighting
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

    // Renderer settings
    RENDERER: {
        BACKGROUND_COLOR: 0x87CEEB, // Sky blue background
        ANTIALIAS: true,
        SHADOWS: true,
        SHADOW_TYPE: 'PCFSoft'
    },

    // Textures
    TEXTURES: {
        FLOOR: 'assets/images/parkett.jpg',
        WALL: 'assets/images/white_parkett.jpg',
        ARTWORK: 'assets/images/vanGogh.jpg',
        CEILING: 'assets/images/wall1.jpg'
    },

    // Texture settings
    TEXTURE_REPEAT: {
        FLOOR: { x: 25, y: 25 },
        WALL: { x: 10, y: 2 },
        CEILING: { x: 1, y: 1 }
    },

    // Materials
    MATERIALS: {
        WALL: {
            COLOR: 0xffffff
        },
        FLOOR: {
            COLOR: 0x8B4513 // Brown floor
        },
        CEILING: {
            COLOR: 0xffffff // White ceiling
        },
        CUBE: {
            COLOR: 0xff6b6b // Red cube
        }
    },

    // Shadow settings
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
    }
};

// Key mappings
export const KEY_MAPPINGS = {
    FORWARD: 'KeyW',
    BACKWARD: 'KeyS',
    LEFT: 'KeyA',
    RIGHT: 'KeyD',
    JUMP: 'Space'
};
