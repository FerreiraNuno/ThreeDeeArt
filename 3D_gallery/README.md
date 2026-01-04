# 3D Gallery Project

A modular 3D gallery application built with Three.js, featuring a clean architecture for better maintainability and extensibility.

## Project Structure

```
3D_gallery/
├── index.html              # Landing page with menu
├── gallery.html            # 3D gallery viewer
├── assets/
│   ├── css/
│   │   ├── main.css        # Global styles and utilities
│   │   ├── menu.css        # Landing page styles
│   │   └── gallery.css     # 3D gallery specific styles
│   ├── js/
│   │   ├── main.js         # Main application orchestrator
│   │   ├── modules/
│   │   │   ├── audio.js             # Audio Management
│   │   │   ├── camera.js            # Camera controls and Management
│   │   │   ├── fractal.js           # calculations for fractal object
│   │   │   ├── fractalGeometry.js   # object and geometry creation for fractal
│   │   │   ├── geometry.js          # 3D objects and geometry creation
│   │   │   ├── glowMaterial.js      # customized Material for Bloom
│   │   │   ├── glowShader.js        # customized Shader for Bloom
│   │   │   ├── intersect.js         # selection and picking
│   │   │   ├── lighting.js          # Lighting setup and management
│   │   │   ├── multiplayer.js       # 
│   │   │   ├── person.js            # 
│   │   │   ├── portal.js            # 
│   │   │   ├── shader.js            # simple vertex- and fragment shader
│   │   └── config/
│   │       └── constants.js # Configuration constants
│   └── images/
│       ├── box.jpg             # musicbox texture
│       ├── floor.jpg           # Floor texture
│       ├── vanGogh.jpg         # Artwork texture
│       ├── vanGogh2.jpg        # Artwork texture
│       ├── claudeMonet.jpg     # Artwork texture
│       ├── claudeMonet2.jpg    # Artwork texture
│       ├── claudeMonet3.jpg    # Artwork texture
│       ├── reflection.jpg      # Artwork texture
│       ├── np_carpet.jpg       # NormalMap 
└── README.md                   # This file
```

## Architecture Overview

### Modular Design

The application follows a modular architecture with clear separation of concerns:

- **SceneManager**: Handles Three.js scene creation and object management
- **CameraManager**: Manages camera setup, positioning, and aspect ratio updates
- **RendererManager**: Handles WebGL renderer configuration and window resizing
- **LightingManager**: Sets up and manages ambient and directional lighting
- **GeometryManager**: Creates and manages 3D objects (floor, walls, ceiling, artworks)
- **ControlsManager**: Handles user input (keyboard and mouse controls)

### Configuration Management

All constants and settings are centralized in `assets/js/config/constants.js`:

- Room dimensions
- Camera settings
- Lighting configuration
- Texture paths
- Animation parameters
- Key mappings

### CSS Organization

Styles are organized into logical modules:

- **main.css**: Global styles, CSS reset, utilities, and responsive design
- **menu.css**: Landing page specific styles
- **gallery.css**: 3D gallery viewer specific styles

## Features

- **Responsive Design**: Adapts to different screen sizes
- **Modular Architecture**: Easy to extend and maintain
- **Configurable Settings**: Centralized configuration management
- **Modern ES6+ Modules**: Uses import/export for better code organization
- **Clean Code**: Well-documented and structured codebase

## Controls

- **W/A/S/D**: Move camera forward/left/backward/right
- **Mouse**: Look around (orbit controls)
- **Mouse Wheel**: Zoom in/out

## Getting Started

1. Open `index.html` in a web browser
2. Click "Betritt die Galerie" to enter the 3D gallery
3. Use WASD keys and mouse to navigate

**Note**: If you encounter module loading errors, try:
- Hard refresh (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Ensure you have an internet connection (required for CDN modules)

## Development

### Adding New Objects

1. Add object creation methods to `GeometryManager`
2. Update constants in `constants.js` if needed
3. Call the new methods in `GalleryApp.setupScene()`

### Modifying Controls

1. Update key mappings in `constants.js`
2. Modify control logic in `ControlsManager`

### Styling Changes

1. Global styles: Edit `main.css`
2. Menu styles: Edit `menu.css`
3. Gallery styles: Edit `gallery.css`

## Browser Compatibility

- Modern browsers with ES6 module support and import maps (Chrome 89+, Firefox 108+, Safari 16.4+, Edge 89+)
- WebGL support required for 3D rendering
- Internet connection required for Three.js CDN modules
- Uses import maps for clean module resolution
- Tested on Chrome, Firefox, Safari, and Edge

## Performance Considerations

- Textures are loaded asynchronously
- Efficient geometry reuse
- Optimized render loop with requestAnimationFrame
- Modular loading reduces initial bundle size

## Future Enhancements

- [ ] Add artwork loading system
- [ ] Implement gallery navigation
- [ ] Add audio support
- [ ] Mobile touch controls
- [ ] VR support
- [ ] Loading indicators
- [ ] Error handling improvements
