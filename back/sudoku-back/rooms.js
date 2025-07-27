class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map(); // Track which rooms each player is in
    this.maxRooms = 1000; // Maximum number of rooms
    this.roomTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days
  }
  
  // Generate unique 6-digit room code
  generateRoomCode() {
    let code;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(code));
    return code;
  }
  
  // Create new room
  createRoom(initialGameState) {
    // Check room limit
    if (this.rooms.size >= this.maxRooms) {
      throw new Error('Server room limit reached');
    }
    
    const roomCode = this.generateRoomCode();
    
    this.rooms.set(roomCode, {
      code: roomCode,
      gameState: {
        board: initialGameState.board,
        pencilMarks: initialGameState.pencilMarks,
        markedCells: initialGameState.markedCells || [],
        undoHistory: initialGameState.undoHistory || [],
        initialBoard: initialGameState.initialBoard,
        currentPuzzleIndex: initialGameState.currentPuzzleIndex || -1,
        prefillNotes: initialGameState.prefillNotes || false,
        autoClearNotes: initialGameState.autoClearNotes || false,
        multicolorBrush: initialGameState.multicolorBrush || false,
        fixed: initialGameState.fixed || []
      },
      players: new Set(),
      createdAt: Date.now(),
      lastActivity: Date.now()
    });
    
    return roomCode;
  }
  
  // Get room by code
  getRoom(roomCode) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.lastActivity = Date.now();
    }
    return room;
  }
  
  // Check if room exists
  roomExists(roomCode) {
    return this.rooms.has(roomCode);
  }
  
  // Add player to room
  addPlayer(roomCode, playerId) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Room not found');
    
    room.players.add(playerId);
    
    // Track player's rooms
    if (!this.playerRooms.has(playerId)) {
      this.playerRooms.set(playerId, new Set());
    }
    this.playerRooms.get(playerId).add(roomCode);
  }
  
  // Remove player from room
  removePlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    
    room.players.delete(playerId);
    
    // Update player's rooms tracking
    const playerRooms = this.playerRooms.get(playerId);
    if (playerRooms) {
      playerRooms.delete(roomCode);
      if (playerRooms.size === 0) {
        this.playerRooms.delete(playerId);
      }
    }
  }
  
  // Get player count in room
  getPlayerCount(roomCode) {
    const room = this.rooms.get(roomCode);
    return room ? room.players.size : 0;
  }
  
  // Get all rooms a player is in
  getPlayerRooms(playerId) {
    return Array.from(this.playerRooms.get(playerId) || []);
  }
  
  // Update game state
  updateGameState(roomCode, update) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Room not found');
    
    const { type, data } = update;
    
    switch (type) {
      case 'board':
        room.gameState.board = data.board;
        break;
        
      case 'cell':
        const { row, col, value } = data;
        room.gameState.board[row][col] = value;
        break;
        
      case 'pencilMarks':
        room.gameState.pencilMarks = data.pencilMarks;
        break;
        
      case 'pencilMark':
        const { row: r, col: c, marks } = data;
        room.gameState.pencilMarks[r][c] = marks;
        break;
        
      case 'markedCells':
        room.gameState.markedCells = data.markedCells;
        break;
        
      case 'undo':
        room.gameState.board = data.board;
        room.gameState.pencilMarks = data.pencilMarks;
        room.gameState.markedCells = data.markedCells || [];
        break;
        
      case 'undoHistory':
        room.gameState.undoHistory = data.undoHistory;
        break;
        
      case 'settings':
        Object.assign(room.gameState, data);
        break;
        
      case 'new-game':
        // Update room state with new game data
        room.gameState.board = data.board;
        room.gameState.initialBoard = data.initialBoard;
        room.gameState.fixed = data.fixed;
        room.gameState.currentPuzzleIndex = data.currentPuzzleIndex;
        room.gameState.pencilMarks = data.pencilMarks || Array(9).fill(null).map(() => Array(9).fill([]));
        room.gameState.markedCells = [];
        room.gameState.undoHistory = [];
        
        // Apply prefill if enabled
        if (room.gameState.prefillNotes && data.pencilMarks) {
          room.gameState.pencilMarks = data.pencilMarks;
        }
        break;
        
      case 'load-code':
        // Update room state with loaded game data
        room.gameState.board = data.board;
        room.gameState.initialBoard = data.initialBoard;
        room.gameState.fixed = data.fixed;
        room.gameState.currentPuzzleIndex = data.currentPuzzleIndex || -1;
        room.gameState.pencilMarks = data.pencilMarks || Array(9).fill(null).map(() => Array(9).fill([]));
        room.gameState.markedCells = [];
        room.gameState.undoHistory = [];
        
        // Apply prefill if enabled
        if (room.gameState.prefillNotes && data.pencilMarks) {
          room.gameState.pencilMarks = data.pencilMarks;
        }
        break;
        
      default:
        throw new Error(`Unknown update type: ${type}`);
    }
    
    room.lastActivity = Date.now();
  }
  
  // Get room count
  getRoomCount() {
    return this.rooms.size;
  }
  
  // Get total players across all rooms
  getTotalPlayers() {
    let total = 0;
    for (const room of this.rooms.values()) {
      total += room.players.size;
    }
    return total;
  }
  
  // Get detailed info about all rooms
  getDetailedInfo() {
    const now = Date.now();
    const rooms = [];
    
    for (const [code, room] of this.rooms.entries()) {
      rooms.push({
        code: code,
        players: room.players.size,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        ageMinutes: Math.floor((now - room.createdAt) / 60000),
        idleMinutes: Math.floor((now - room.lastActivity) / 60000),
        puzzleIndex: room.gameState.currentPuzzleIndex
      });
    }
    
    // Sort by creation time (newest first)
    rooms.sort((a, b) => b.createdAt - a.createdAt);
    
    return {
      totalRooms: this.rooms.size,
      totalPlayers: this.getTotalPlayers(),
      maxRooms: this.maxRooms,
      roomTimeoutMinutes: this.roomTimeout / 60000,
      rooms: rooms,
      timestamp: now
    };
  }
  
  // Clean up empty rooms
  cleanupEmptyRooms() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [code, room] of this.rooms.entries()) {
      // Remove if empty and older than timeout (10 minutes)
      if (room.players.size === 0 && (now - room.lastActivity) > this.roomTimeout) {
        this.rooms.delete(code);
        cleaned++;
        console.log(`Cleaned up room ${code} (idle for ${Math.floor((now - room.lastActivity) / 60000)} minutes)`);
      }
    }
    
    return cleaned;
  }
}

module.exports = { RoomManager };