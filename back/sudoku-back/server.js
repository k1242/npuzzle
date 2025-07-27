const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const { RoomManager } = require('./rooms');
const { validateGameState, validateUpdate } = require('./gameState');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://qdiag.xyz', 'http://localhost:8080'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configuration
const PASSWORD = 'fermi';
const SESSION_SECRET = process.env.SESSION_SECRET || 'sudoku-info-secret-2024';

// Middleware
app.use(cors({
  origin: ['https://qdiag.xyz', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());
// Trust proxy for proper cookie handling
app.set('trust proxy', 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    path: '/'
  },
  name: 'sudoku.sid'
}));

// Room manager instance
const roomManager = new RoomManager();

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// REST endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: roomManager.getRoomCount(),
    uptime: process.uptime()
  });
});

// Login endpoint
app.post('/auth/login', (req, res) => {
  const { password } = req.body;
  
  if (password === PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth status
app.get('/auth/status', (req, res) => {
  res.json({ authenticated: req.session && req.session.authenticated });
});

// Info endpoint (protected)
app.get('/info', requireAuth, (req, res) => {
  const info = roomManager.getDetailedInfo();
  res.json(info);
});

// Public stats endpoint
app.get('/stats', (req, res) => {
  res.json({
    rooms: roomManager.getRoomCount(),
    players: roomManager.getTotalPlayers()
  });
});

// Room exists endpoint
app.get('/room/:code/exists', (req, res) => {
  const exists = roomManager.roomExists(req.params.code);
  res.json({ exists });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Create room
  socket.on('create-room', (gameState, callback) => {
    try {
      // Check room limit
      if (roomManager.getRoomCount() >= 1000) {
        if (callback) return callback({ error: 'Server room limit reached. Please try again later.' });
        return;
      }
      
      // Validate game state
      if (!validateGameState(gameState)) {
        if (callback) return callback({ error: 'Invalid game state' });
        return;
      }
      
      const roomCode = roomManager.createRoom(gameState);
      socket.join(roomCode);
      roomManager.addPlayer(roomCode, socket.id);
      
      // Update player count for all in room
      io.to(roomCode).emit('player-count', roomManager.getPlayerCount(roomCode));
      
      if (callback) callback({ success: true, roomCode });
      console.log(`Room created: ${roomCode} by ${socket.id}`);
    } catch (error) {
      if (callback) callback({ error: error.message });
      console.error('Create room error:', error);
    }
  });
  
  // Join room
  socket.on('join-room', (roomCode, callback) => {
    try {
      const room = roomManager.getRoom(roomCode);
      
      if (!room) {
        if (callback) return callback({ error: 'Room not found' });
        return;
      }
      
      socket.join(roomCode);
      roomManager.addPlayer(roomCode, socket.id);
      
      // Send current game state to joining player
      if (callback) {
        callback({ 
          success: true, 
          gameState: room.gameState 
        });
      }
      
      // Update player count for all in room
      io.to(roomCode).emit('player-count', roomManager.getPlayerCount(roomCode));
      
      console.log(`User ${socket.id} joined room ${roomCode}`);
    } catch (error) {
      if (callback) callback({ error: error.message });
      console.error('Join room error:', error);
    }
  });
  
  // Leave room
  socket.on('leave-room', (roomCode, callback) => {
    try {
      socket.leave(roomCode);
      roomManager.removePlayer(roomCode, socket.id);
      
      // Update player count for remaining players
      io.to(roomCode).emit('player-count', roomManager.getPlayerCount(roomCode));
      
      if (callback) callback({ success: true });
      console.log(`User ${socket.id} left room ${roomCode}`);
    } catch (error) {
      if (callback) callback({ error: error.message });
      console.error('Leave room error:', error);
    }
  });
  
  // Game state updates
  socket.on('game-update', (data) => {
    const { roomCode, update } = data;
    
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room) return;
      
      // Validate update
      if (!validateUpdate(update)) {
        console.error('Invalid update received');
        return;
      }
      
      // Apply update to room state
      roomManager.updateGameState(roomCode, update);
      
      // Broadcast to all other players in room
      socket.to(roomCode).emit('game-update', update);
      
    } catch (error) {
      console.error('Error processing game update:', error);
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove from all rooms
    const rooms = roomManager.getPlayerRooms(socket.id);
    rooms.forEach(roomCode => {
      roomManager.removePlayer(roomCode, socket.id);
      // Update player count for remaining players
      io.to(roomCode).emit('player-count', roomManager.getPlayerCount(roomCode));
    });
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Clean up empty rooms every minute
  setInterval(() => {
    const cleaned = roomManager.cleanupEmptyRooms();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} empty rooms`);
    }
  }, 60 * 1000);
});