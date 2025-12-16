# 3D Gallery - Multiplayer Setup

This 3D Gallery now supports multiplayer functionality where multiple users can join the same virtual gallery space and see each other as person props walking around.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

### 3. Open Multiple Browser Tabs

- Open your browser and go to `http://localhost:3000`
- Open additional tabs with the same URL to simulate multiple players
- Each tab represents a different player in the gallery

## 🎮 Features

### Multiplayer Functionality
- **Real-time Player Synchronization**: See other players moving around in real-time
- **Automatic Player Props**: Each connected player gets a unique person prop
- **Random Colors**: Each player gets a randomly assigned clothing color
- **Player Names**: Auto-generated names for each player (e.g., "SwiftExplorer", "BoldWanderer")
- **Name Labels**: Player names appear above their character props
- **Connection Status**: Live multiplayer status display in the UI

### Player Management
- **Dynamic Creation**: Player props only appear when someone joins
- **Clean Disconnection**: Players disappear when they leave
- **Collision Detection**: Each player prop has proper collision boundaries
- **Smooth Movement**: Interpolated movement for smooth remote player updates

### Technical Features
- **WebSocket Communication**: Real-time bidirectional communication using Socket.IO
- **Position Throttling**: Optimized network updates (100ms intervals)
- **Automatic Reconnection**: Built-in reconnection handling
- **Cross-browser Compatibility**: Works across different browser tabs/windows

## 🎯 Controls

- **WASD**: Move around the gallery
- **Mouse**: Look around (click to lock cursor)
- **Space**: Jump
- **ESC**: Unlock cursor

## 🏗️ Architecture

### Server Side (`server.js`)
- Express.js web server serving static files
- Socket.IO for WebSocket communication
- Player state management and broadcasting
- Automatic cleanup on disconnect

### Client Side
- **MultiplayerManager** (`multiplayer.js`): Handles all multiplayer logic
- **PersonManager** (`person.js`): Creates and manages player props
- **Main Application** (`main.js`): Integrates multiplayer with the 3D scene

### Key Components

1. **Player Synchronization**: Position and rotation updates sent every 100ms
2. **Person Props**: Detailed 3D character models with customizable colors
3. **Real-time Updates**: Immediate feedback when players join/leave
4. **Smooth Interpolation**: Lerped movement for natural-looking remote players

## 🔧 Configuration

### Server Configuration
- **Port**: Default 3000 (configurable via `PORT` environment variable)
- **CORS**: Enabled for cross-origin requests
- **Update Rate**: 100ms for position updates (configurable in `multiplayer.js`)

### Player Customization
Players are automatically assigned:
- Random clothing colors from a predefined palette
- Generated names (adjective + noun combinations)
- Unique IDs based on socket connection

## 🐛 Troubleshooting

### Common Issues

1. **"Multiplayer: Disconnected"**
   - Ensure the server is running (`npm start`)
   - Check if port 3000 is available
   - Verify no firewall blocking the connection

2. **Players Not Appearing**
   - Check browser console for errors
   - Ensure Socket.IO is loading properly
   - Verify WebSocket connection in browser dev tools

3. **Movement Lag**
   - Check network connection
   - Reduce update frequency in `multiplayer.js` if needed
   - Ensure server isn't overloaded

### Development Tips

- Use browser dev tools to monitor WebSocket messages
- Check server console for connection logs
- Multiple browser windows work better than multiple tabs for testing
- Use incognito/private windows to simulate different users

## 📁 File Structure

```
ThreeDeeArt/
├── server.js                          # Node.js server with Socket.IO
├── package.json                       # Dependencies and scripts
├── 3D_gallery/
│   ├── gallery.html                   # Main gallery page (updated with Socket.IO)
│   └── assets/js/modules/
│       ├── multiplayer.js             # Multiplayer management
│       ├── person.js                  # Player prop creation
│       └── main.js                    # Updated with multiplayer integration
```

## 🎨 Customization

### Adding New Player Colors
Edit the `generateRandomColor()` function in `multiplayer.js`:

```javascript
const colors = [
    0xff6b6b, // Red
    0x4ecdc4, // Teal
    // Add your custom colors here
];
```

### Changing Update Rate
Modify the `updateInterval` in `MultiplayerManager`:

```javascript
this.updateInterval = 50; // 50ms for more frequent updates
```

### Custom Player Names
Edit the `generatePlayerName()` function to use your own name lists.

## 🚀 Next Steps

The multiplayer system is ready for additional features:
- Walking animations (mentioned as future enhancement)
- Chat system (basic framework included)
- Player customization UI
- Room-based multiplayer
- Voice chat integration
- Gesture/emote system

Enjoy exploring the gallery with friends! 🎨👥
