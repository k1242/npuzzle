/* ====== MULTIPLAYER FUNCTIONALITY ====== */

// Multiplayer state
let socket = null;
let currentRoomCode = null;
let isConnected = false;
let isInRoom = false;
let playerCount = 0;
let isUpdatingFromRemote = false; // Flag to prevent echo

// Multiplayer UI elements
let roomStatusEl, roomCodeEl, playerCountEl, createRoomBtn, joinRoomBtn, leaveRoomBtn;
let roomCodeInput, joinConfirmBtn, joinCancelBtn;

// Initialize multiplayer UI
const initMultiplayer = () => {
  // Get UI elements
  roomStatusEl = $('#roomStatus');
  roomCodeEl = $('#roomCode');
  playerCountEl = $('#playerCount');
  createRoomBtn = $('#createRoomBtn');
  joinRoomBtn = $('#joinRoomBtn');
  leaveRoomBtn = $('#leaveRoomBtn');
  roomCodeInput = $('#roomCodeInput');
  joinConfirmBtn = $('#joinConfirmBtn');
  joinCancelBtn = $('#joinCancelBtn');
  
  // Set up event handlers
  if (createRoomBtn) {
    createRoomBtn.onclick = createRoom;
  }
  
  if (joinRoomBtn) {
    joinRoomBtn.onclick = showJoinInput;
  }
  
  if (leaveRoomBtn) {
    leaveRoomBtn.onclick = leaveRoom;
  }
  
  if (joinConfirmBtn) {
    joinConfirmBtn.onclick = confirmJoin;
  }
  
  if (joinCancelBtn) {
    joinCancelBtn.onclick = hideJoinInput;
  }
  
  if (roomCodeInput) {
    roomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmJoin();
      if (e.key === 'Escape') hideJoinInput();
    });
  }
  
  // Room code click to copy
  if (roomCodeEl) {
    roomCodeEl.onclick = copyRoomCode;
    roomCodeEl.style.cursor = 'pointer';
  }
  
  // Try to connect on init
  connectToServer();
  
  // Update UI
  updateMultiplayerUI();
  
  // Check if we should reconnect to a room
  const savedRoomCode = localStorage.getItem('multiplayerRoomCode');
  if (savedRoomCode && socket && socket.connected) {
    // Wait a bit for socket to stabilize
    setTimeout(() => {
      if (socket && socket.connected) {
        rejoinRoom(savedRoomCode);
      }
    }, 500);
  }
};

// Connect to server
const connectToServer = () => {
  if (socket && socket.connected) return;
  
  // Use production URL when not on localhost
  const serverUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://qdiag.xyz';
  
  try {
    socket = io(serverUrl, {
      path: '/socket.io/',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });
    
    // Connection events
    socket.on('connect', () => {
      console.log('Connected to multiplayer server');
      isConnected = true;
      updateMultiplayerUI();
      
      // Try to rejoin saved room if any
      const savedRoomCode = localStorage.getItem('multiplayerRoomCode');
      if (savedRoomCode && !isInRoom) {
        rejoinRoom(savedRoomCode);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      isConnected = false;
      isInRoom = false;
      currentRoomCode = null;
      playerCount = 0;
      updateMultiplayerUI();
    });
    
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      isConnected = false;
      updateMultiplayerUI();
    });
    
    // Game events
    socket.on('player-count', (count) => {
      playerCount = count;
      updateMultiplayerUI();
    });
    
    socket.on('game-update', (update) => {
      handleRemoteUpdate(update);
    });
    
  } catch (error) {
    console.error('Failed to connect:', error);
    isConnected = false;
    updateMultiplayerUI();
  }
};

// Create room
const createRoom = () => {
  if (!socket || !isConnected) {
    return;
  }
  
  const gameState = {
    board: board,
    pencilMarks: pencilMarks.map(row => row.map(set => Array.from(set))),
    markedCells: Array.from(markedCells.entries()),
    initialBoard: initialBoard,
    currentPuzzleIndex: currentPuzzleIndex,
    prefillNotes: prefillNotes,
    autoClearNotes: autoClearNotes,
    multicolorBrush: multicolorBrush,
    fixed: fixed,
    undoHistory: undoHistory.map(snap => ({
      board: snap.board,
      pencilMarks: snap.pencilMarks.map(row => row.map(set => Array.from(set))),
      markedCells: snap.markedCells ? Array.from(snap.markedCells.entries()) : []
    }))
  };
  
  socket.emit('create-room', gameState, (response) => {
    if (response.success) {
      currentRoomCode = response.roomCode;
      isInRoom = true;
      localStorage.setItem('multiplayerRoomCode', currentRoomCode);
      updateMultiplayerUI();
      copyRoomCode(); // Auto-copy code
    } else if (response.error) {
      // Show error message if room limit reached
      alert(response.error);
    }
  });
};

// Show join input
const showJoinInput = () => {
  if (createRoomBtn) createRoomBtn.style.display = 'none';
  if (joinRoomBtn) joinRoomBtn.style.display = 'none';
  
  const joinInputGroup = $('#joinInputGroup');
  if (joinInputGroup) joinInputGroup.style.display = 'flex';
  
  if (roomCodeInput) {
    roomCodeInput.value = '';
    roomCodeInput.focus();
  }
};

// Hide join input
const hideJoinInput = () => {
  const joinInputGroup = $('#joinInputGroup');
  if (joinInputGroup) joinInputGroup.style.display = 'none';
  
  if (createRoomBtn) createRoomBtn.style.display = '';
  if (joinRoomBtn) joinRoomBtn.style.display = '';
};

// Confirm join
const confirmJoin = () => {
  if (!socket || !isConnected) {
    return;
  }
  
  const roomCode = roomCodeInput.value.trim();
  if (roomCode.length !== 6 || !/^\d+$/.test(roomCode)) {
    return;
  }
  
  joinRoom(roomCode);
};

// Join room (used by both confirmJoin and rejoinRoom)
const joinRoom = (roomCode) => {
  socket.emit('join-room', roomCode, (response) => {
    if (response.success) {
      currentRoomCode = roomCode;
      isInRoom = true;
      localStorage.setItem('multiplayerRoomCode', roomCode);
      
      // Apply received game state
      const state = response.gameState;
      isUpdatingFromRemote = true;
      
      // Update board
      board = state.board;
      
      // Update pencil marks
      pencilMarks = state.pencilMarks.map(row =>
        row.map(marks => new Set(marks))
      );
      
      // Update marked cells
      markedCells = new Map(state.markedCells || []);
      
      // Update other state
      initialBoard = state.initialBoard;
      window.initialBoard = initialBoard;
      currentPuzzleIndex = state.currentPuzzleIndex || -1;
      
      // Update settings
      prefillNotes = state.prefillNotes || false;
      autoClearNotes = state.autoClearNotes || false;
      multicolorBrush = state.multicolorBrush || false;
      
      // Update UI toggles
      const prefillToggle = $('#prefillNotes');
      const autoClearToggle = $('#autoClearNotes');
      const multicolorToggle = $('#multicolorBrush');
      if (prefillToggle) prefillToggle.checked = prefillNotes;
      if (autoClearToggle) autoClearToggle.checked = autoClearNotes;
      if (multicolorToggle) multicolorToggle.checked = multicolorBrush;
      
      // Update undo history
      if (state.undoHistory) {
        undoHistory = state.undoHistory.map(snap => ({
          board: snap.board,
          pencilMarks: snap.pencilMarks.map(row =>
            row.map(marks => new Set(marks))
          ),
          markedCells: snap.markedCells ? new Map(snap.markedCells) : new Map()
        }));
        updateUndoButton();
      }
      
      // Recreate fixed array if provided, otherwise recreate from initialBoard
      if (state.fixed) {
        fixed = state.fixed;
      } else {
        fixed = [];
        for (let r = 0; r < 9; r++) {
          fixed[r] = [];
          for (let c = 0; c < 9; c++) {
            fixed[r][c] = initialBoard[r][c] !== 0;
          }
        }
      }
      
      isUpdatingFromRemote = false;
      
      hideJoinInput();
      updateMultiplayerUI();
      updatePuzzleNumber();
      updateCodeInput();
      render();
    } else {
      // Failed to join - remove from localStorage
      localStorage.removeItem('multiplayerRoomCode');
      if (response.error === 'Room not found') {
        alert('Room not found. It may have expired or been deleted.');
      }
    }
  });
};

// Rejoin room (used after page refresh)
const rejoinRoom = (roomCode) => {
  // Don't show any UI changes during rejoin attempt
  joinRoom(roomCode);
};

// Leave room
const leaveRoom = () => {
  if (!socket || !currentRoomCode) return;
  
  socket.emit('leave-room', currentRoomCode, (response) => {
    if (response.success) {
      currentRoomCode = null;
      isInRoom = false;
      playerCount = 0;
      localStorage.removeItem('multiplayerRoomCode');
      updateMultiplayerUI();
    }
  });
};

// Copy room code
const copyRoomCode = () => {
  if (!currentRoomCode) return;
  
  navigator.clipboard.writeText(currentRoomCode).then(() => {
    // Visual feedback on room code element
    if (roomCodeEl) {
      const originalColor = roomCodeEl.style.color;
      roomCodeEl.style.color = 'var(--accent)';
      setTimeout(() => {
        roomCodeEl.style.color = originalColor;
      }, 300);
    }
  }).catch(() => {
    // Failed to copy
  });
};

// Handle remote updates
const handleRemoteUpdate = (update) => {
  if (!update || !update.type || !update.data) return;
  
  isUpdatingFromRemote = true;
  
  try {
    switch (update.type) {
      case 'cell':
        const { row, col, value } = update.data;
        board[row][col] = value;
        if (value === 0) {
          pencilMarks[row][col].clear();
        }
        break;
        
      case 'board':
        board = update.data.board;
        break;
        
      case 'pencilMarks':
        pencilMarks = update.data.pencilMarks.map(row =>
          row.map(marks => new Set(marks))
        );
        break;
        
      case 'pencilMark':
        const { row: r, col: c, marks } = update.data;
        pencilMarks[r][c] = new Set(marks);
        break;
        
      case 'markedCells':
        markedCells = new Map(update.data.markedCells || []);
        break;
        
      case 'undo':
        board = update.data.board;
        pencilMarks = update.data.pencilMarks.map(row =>
          row.map(marks => new Set(marks))
        );
        markedCells = new Map(update.data.markedCells || []);
        break;
        
      case 'undoHistory':
        undoHistory = update.data.undoHistory.map(snap => ({
          board: snap.board,
          pencilMarks: snap.pencilMarks.map(row =>
            row.map(marks => new Set(marks))
          ),
          markedCells: snap.markedCells ? new Map(snap.markedCells) : new Map()
        }));
        updateUndoButton();
        break;
        
      case 'settings':
        if ('prefillNotes' in update.data) prefillNotes = update.data.prefillNotes;
        if ('autoClearNotes' in update.data) autoClearNotes = update.data.autoClearNotes;
        if ('multicolorBrush' in update.data) multicolorBrush = update.data.multicolorBrush;
        
        // Update UI toggles
        const prefillToggle = $('#prefillNotes');
        const autoClearToggle = $('#autoClearNotes');
        const multicolorToggle = $('#multicolorBrush');
        if (prefillToggle) prefillToggle.checked = prefillNotes;
        if (autoClearToggle) autoClearToggle.checked = autoClearNotes;
        if (multicolorToggle) multicolorToggle.checked = multicolorBrush;
        break;
        
      case 'new-game':
        // Handle new game from another player
        board = update.data.board;
        initialBoard = update.data.initialBoard;
        window.initialBoard = initialBoard;
        fixed = update.data.fixed;
        currentPuzzleIndex = update.data.currentPuzzleIndex;
        
        // Clear game state
        pencilMarks = Array(9).fill(null).map(() => 
          Array(9).fill(null).map(() => new Set())
        );
        markedCells.clear();
        undoHistory = [];
        solved = false;
        selectedCell = null;
        selectedNumber = null;
        gameModified = false;
        
        // Apply prefill if needed
        if (update.data.pencilMarks && prefillNotes) {
          pencilMarks = update.data.pencilMarks.map(row =>
            row.map(marks => new Set(marks))
          );
        } else if (prefillNotes) {
          prefillAllNotes();
        }
        
        updatePuzzleNumber();
        updateCodeInput();
        updateUndoButton();
        CorrectNotification.hide();
        break;
        
      case 'load-code':
        // Handle load code from another player
        const loadedCode = update.data.code;
        
        // Use the loadFromCode function but mark as from multiplayer
        if (typeof window.loadFromCode === 'function') {
          window.loadFromCode(loadedCode, true);
        }
        break;
    }
    
    render();
  } finally {
    isUpdatingFromRemote = false;
  }
};

// Send update to room
const sendUpdate = (type, data) => {
  if (!socket || !isInRoom || !currentRoomCode || isUpdatingFromRemote) return;
  
  const update = { type, data };
  socket.emit('game-update', { roomCode: currentRoomCode, update });
};

// Update multiplayer UI
const updateMultiplayerUI = () => {
  // Room status sections
  const noRoomSection = $('#multiplayerNoRoom');
  const inRoomSection = $('#multiplayerInRoom');
  const joinInputGroup = $('#joinInputGroup');
  
  if (isInRoom) {
    if (noRoomSection) noRoomSection.style.display = 'none';
    if (inRoomSection) inRoomSection.style.display = 'block';
    if (joinInputGroup) joinInputGroup.style.display = 'none';
    
    if (roomCodeEl) roomCodeEl.textContent = currentRoomCode;
    if (playerCountEl) playerCountEl.textContent = playerCount;
  } else {
    if (noRoomSection) noRoomSection.style.display = 'block';
    if (inRoomSection) inRoomSection.style.display = 'none';
    
    // Enable/disable buttons based on connection
    if (createRoomBtn) createRoomBtn.disabled = !isConnected;
    if (joinRoomBtn) joinRoomBtn.disabled = !isConnected;
  }
};

// Toast notification (keeping the function but no longer using it)
const showToast = (message, type = 'info') => {
  // Function kept for compatibility but does nothing
  console.log(`[${type}] ${message}`);
};

// Export functions for use in other scripts
window.initMultiplayer = initMultiplayer;
window.sendUpdate = sendUpdate;
window.isInMultiplayerRoom = () => isInRoom;
window.getMultiplayerStatus = () => ({ isConnected, isInRoom, currentRoomCode, playerCount });