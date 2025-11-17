// Gallery Configuration Constants
export const GALLERY_CONFIG = {
    // Scene dimensions
    ROOM: {
        WIDTH: 25,
        DEPTH: 25,
        WALL_HEIGHT: 10
    },

    // Camera settings
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        INITIAL_Z: 5,
        MOVE_SPEED: 0.25
    },

    // Lighting
    LIGHTING: {
        AMBIENT: {
            COLOR: 0x101010,
            INTENSITY: 1.0
        },
        DIRECTIONAL: {
            COLOR: 0xffffff,
            INTENSITY: 1.0,
            POSITION: { x: 5, y: 15, z: 7.5 }
        }
    },

    // Renderer settings
    RENDERER: {
        BACKGROUND_COLOR: 0xffffff,
        ANTIALIAS: true
    },

    // Controls
    CONTROLS: {
        ENABLE_DAMPING: true,
        DAMPING_FACTOR: 0.05
    },

    // Textures
    TEXTURES: {
        FLOOR: 'assets/images/floor.jpg',
        WALL: 'assets/images/wall2.jpg',
        ARTWORK: 'assets/images/vanGogh.jpg'
    },

    // Texture settings
    TEXTURE_REPEAT: {
        FLOOR: { x: 20, y: 20 },
        WALL: { x: 20, y: 20 }
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
    RIGHT: 'KeyD'
};
