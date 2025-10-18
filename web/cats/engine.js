/* ====== GAME ENGINE ====== */

// Game constants
const BOARD_SIZE = 6;
const MAX_PIECES = 8;
const PIECES_TO_GRADUATE = 3;

const PIECE_TYPES = {
  KITTEN_1: 'a',
  CAT_1: 'A',
  KITTEN_2: 'b',
  CAT_2: 'B'
};

// Directions for booping (8 directions)
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

class GameEngine {
  constructor() {
    this.initializeState();
  }

  // Initialize or reset game state
  initializeState() {
    this.state = {
      board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
      currentPlayer: 1,
      selectedPiece: null,
      turnCount: 1,
      gameOver: false,
      winner: null,
      winReason: '',
      winningCells: [],
      graduationMode: false,
      fullBoardGraduation: false, // New flag for full board graduation
      graduationOptions: [],
      selectedGraduationCells: new Set(),
      boopingEnabled: true,
      pools: {
        1: { kittens: MAX_PIECES, cats: 0, reserve: MAX_PIECES },
        2: { kittens: MAX_PIECES, cats: 0, reserve: MAX_PIECES }
      }
    };
  }

  // Get current game state
  getState() {
    return this.state;
  }

  // Set booping enabled/disabled
  setBoopingEnabled(enabled) {
    this.state.boopingEnabled = enabled;
  }

  // Select piece type to place
  selectPiece(pieceType) {
    if (this.state.gameOver || this.state.graduationMode) return false;
    
    const pool = this.state.pools[this.state.currentPlayer];
    const isKitten = pieceType === this.getKittenType(this.state.currentPlayer);
    
    // Check if piece is available
    if ((isKitten && pool.kittens > 0) || (!isKitten && pool.cats > 0)) {
      this.state.selectedPiece = pieceType;
      return true;
    }
    return false;
  }

  // Place piece on board
  placePiece(row, col) {
    if (this.state.gameOver || !this.state.selectedPiece) return false;
    if (this.state.board[row][col] !== null) return false;
    
    // Place the piece
    this.state.board[row][col] = this.state.selectedPiece;
    
    // Update pool
    const pool = this.state.pools[this.state.currentPlayer];
    if (this.state.selectedPiece === this.getKittenType(this.state.currentPlayer)) {
      pool.kittens--;
    } else {
      pool.cats--;
    }
    
    // Apply booping if enabled
    if (this.state.boopingEnabled) {
      this.applyBooping(row, col);
    }
    
    // Check for victory after placement and booping
    if (this.checkVictory()) {
      this.state.gameOver = true;
      return true;
    }
    
    // Check for graduations
    this.checkGraduations();
    
    // If in graduation mode, don't switch turns yet
    if (this.state.graduationMode) {
      return true;
    }
    
    // Switch turn
    this.switchTurn();
    return true;
  }

  // Apply booping effect from placed piece
  applyBooping(placedRow, placedCol) {
    const placedPiece = this.state.board[placedRow][placedCol];
    const isPlacedCat = this.isCat(placedPiece);
    
    // Check each direction
    for (const [dr, dc] of DIRECTIONS) {
      const adjRow = placedRow + dr;
      const adjCol = placedCol + dc;
      
      // Check if adjacent position has a piece
      if (this.isValidPosition(adjRow, adjCol) && this.state.board[adjRow][adjCol]) {
        const adjPiece = this.state.board[adjRow][adjCol];
        
        // Kittens cannot boop cats
        if (!isPlacedCat && this.isCat(adjPiece)) continue;
        
        // Check line protection
        if (this.canBoop(placedRow, placedCol, adjRow, adjCol)) {
          const destRow = adjRow + dr;
          const destCol = adjCol + dc;
          
          if (this.isValidPosition(destRow, destCol) && !this.state.board[destRow][destCol]) {
            // Move piece
            this.state.board[destRow][destCol] = this.state.board[adjRow][adjCol];
            this.state.board[adjRow][adjCol] = null;
          } else {
            // Piece booped off board - return to pool
            this.returnToPool(this.state.board[adjRow][adjCol]);
            this.state.board[adjRow][adjCol] = null;
          }
        }
      }
    }
  }

  // Check if a piece can be booped (line protection rule)
  canBoop(placedRow, placedCol, targetRow, targetCol) {
    const dr = targetRow - placedRow;
    const dc = targetCol - placedCol;
    
    // Check behind the target
    const behindRow = targetRow - dr;
    const behindCol = targetCol - dc;
    
    // Skip the placed piece position
    if (!(behindRow === placedRow && behindCol === placedCol)) {
      if (this.isValidPosition(behindRow, behindCol) && this.state.board[behindRow][behindCol]) {
        return false; // Protected by piece behind
      }
    }
    
    // Check ahead of target
    const aheadRow = targetRow + dr;
    const aheadCol = targetCol + dc;
    
    if (this.isValidPosition(aheadRow, aheadCol) && this.state.board[aheadRow][aheadCol]) {
      return false; // Protected by piece ahead
    }
    
    return true;
  }

  // Return piece to its owner's pool
  returnToPool(piece) {
    const player = this.getOwner(piece);
    const pool = this.state.pools[player];
    
    if (this.isKitten(piece)) {
      pool.kittens++;
    } else {
      pool.cats++;
    }
  }

  // Check for graduations after piece placement
  checkGraduations() {
    // Check each player for graduation opportunities
    for (let player = 1; player <= 2; player++) {
      const lines = this.findGraduationLines(player);
      
      if (lines.length > 1) {
        // Multiple lines - enter selection mode
        this.state.graduationMode = true;
        this.state.fullBoardGraduation = false;
        this.state.graduationOptions = lines.map(line => ({
          player: player,
          cells: line
        }));
        return;
      } else if (lines.length === 1) {
        // Single line - graduate automatically
        this.graduateLine(player, lines[0]);
        return;
      }
    }
    
    // Check for full board graduation
    for (let player = 1; player <= 2; player++) {
      if (this.canGraduateFromFullBoard(player)) {
        // Enter selection mode for choosing which piece to remove
        this.state.graduationMode = true;
        this.state.fullBoardGraduation = true;
        
        // Create options for all player pieces on board
        const options = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (this.isPlayerPiece(this.state.board[r][c], player)) {
              options.push({
                player: player,
                cells: [[r, c]]
              });
            }
          }
        }
        this.state.graduationOptions = options;
        return;
      }
    }
  }

  // Find all valid graduation lines for a player
  findGraduationLines(player) {
    const lines = [];
    const kitten = this.getKittenType(player);
    const cat = this.getCatType(player);
    
    // Check all possible lines of 3
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.isPlayerPiece(this.state.board[r][c], player)) {
          // Check 4 directions (to avoid duplicates)
          for (let d = 0; d < 4; d++) {
            const [dr, dc] = DIRECTIONS[d];
            const line = this.checkLineFrom(r, c, dr, dc, player);
            
            if (line && line.length === PIECES_TO_GRADUATE) {
              // Line must contain at least one kitten
              const hasKitten = line.some(([lr, lc]) => 
                this.state.board[lr][lc] === kitten
              );
              if (hasKitten) {
                lines.push(line);
              }
            }
          }
        }
      }
    }
    
    return this.removeDuplicateLines(lines);
  }

  // Check for a line starting from position
  checkLineFrom(startR, startC, dr, dc, player) {
    const line = [[startR, startC]];
    
    for (let i = 1; i < PIECES_TO_GRADUATE; i++) {
      const r = startR + dr * i;
      const c = startC + dc * i;
      
      if (!this.isValidPosition(r, c) || !this.isPlayerPiece(this.state.board[r][c], player)) {
        return null;
      }
      
      line.push([r, c]);
    }
    
    return line;
  }

  // Remove duplicate lines
  removeDuplicateLines(lines) {
    const unique = [];
    const seen = new Set();
    
    for (const line of lines) {
      const key = line
        .slice()
        .sort((a, b) => a[0] - b[0] || a[1] - b[1])
        .map(([r, c]) => `${r},${c}`)
        .join('|');
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(line);
      }
    }
    
    return unique;
  }

  // Graduate a line of pieces
  graduateLine(player, line) {
    const pool = this.state.pools[player];
    let kittensCount = 0;
    let catsCount = 0;
    
    // Count kittens and cats, then remove pieces
    for (const [r, c] of line) {
      const piece = this.state.board[r][c];
      if (piece) {
        if (this.isKitten(piece)) {
          kittensCount++;
        } else if (this.isCat(piece)) {
          catsCount++;
        }
        this.state.board[r][c] = null;
      }
    }
    
    // Return existing cats to pool
    pool.cats += catsCount;
    
    // Graduate kittens to cats (from reserve)
    const catsToAdd = Math.min(kittensCount, pool.reserve);
    pool.cats += catsToAdd;
    pool.reserve -= catsToAdd;
  }

  // Check if player can graduate from full board
  canGraduateFromFullBoard(player) {
    const piecesOnBoard = this.countPiecesOnBoard(player);
    
    // Must have exactly 8 pieces on board
    if (piecesOnBoard !== MAX_PIECES) return false;
    
    // Cannot graduate if all 8 pieces are cats (that's a win condition)
    const catsOnBoard = this.countCatsOnBoard(player);
    if (catsOnBoard === MAX_PIECES) return false;
    
    return true;
  }

  // Graduate single piece from full board
  graduateSinglePiece(player, row, col) {
    const piece = this.state.board[row][col];
    if (!piece || this.getOwner(piece) !== player) return;
    
    const pool = this.state.pools[player];
    
    // Remove piece from board
    this.state.board[row][col] = null;
    
    if (this.isKitten(piece)) {
      // Kitten becomes cat if reserve available
      if (pool.reserve > 0) {
        pool.cats++;
        pool.reserve--;
      } else {
        // Return kitten to pool if no reserve
        pool.kittens++;
      }
    } else {
      // Cat returns to pool
      pool.cats++;
    }
  }

  // Handle graduation selection
  selectGraduationCell(row, col) {
    const cellKey = `${row},${col}`;
    
    // Check if cell is part of any graduation option
    let validCell = false;
    let selectedOption = null;
    
    for (const option of this.state.graduationOptions) {
      if (option.cells.some(([r, c]) => r === row && c === col)) {
        validCell = true;
        selectedOption = option;
        break;
      }
    }
    
    if (!validCell) return false;
    
    // Handle full board graduation - single click graduates
    if (this.state.fullBoardGraduation) {
      this.graduateSinglePiece(selectedOption.player, row, col);
      this.state.graduationMode = false;
      this.state.fullBoardGraduation = false;
      this.state.graduationOptions = [];
      this.state.selectedGraduationCells.clear();
      
      // Check victory and switch turn
      if (!this.checkVictory()) {
        this.switchTurn();
      } else {
        this.state.gameOver = true;
      }
      
      return true;
    }
    
    // Handle normal line graduation
    // Toggle selection
    if (this.state.selectedGraduationCells.has(cellKey)) {
      this.state.selectedGraduationCells.delete(cellKey);
    } else {
      this.state.selectedGraduationCells.add(cellKey);
    }
    
    // Check if complete line is selected
    for (const option of this.state.graduationOptions) {
      const allSelected = option.cells.every(([r, c]) => 
        this.state.selectedGraduationCells.has(`${r},${c}`)
      );
      
      if (allSelected) {
        // Graduate this line
        this.graduateLine(option.player, option.cells);
        this.state.graduationMode = false;
        this.state.fullBoardGraduation = false;
        this.state.graduationOptions = [];
        this.state.selectedGraduationCells.clear();
        
        // Check victory and switch turn
        if (!this.checkVictory()) {
          this.switchTurn();
        } else {
          this.state.gameOver = true;
        }
        
        return true;
      }
    }
    
    return true;
  }

  // Check victory conditions
  checkVictory() {
    for (let player = 1; player <= 2; player++) {
      // Check for 3 cats in a row
      const catLines = this.findPureCatLines(player);
      if (catLines.length > 0) {
        this.state.winner = player;
        this.state.winReason = 'Three cats in a row!';
        this.state.winningCells = catLines[0]; // Store first winning line
        return true;
      }
      
      // Check for 8 cats on board
      const cat = this.getCatType(player);
      const catPositions = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (this.state.board[r][c] === cat) {
            catPositions.push([r, c]);
          }
        }
      }
      
      if (catPositions.length === MAX_PIECES) {
        this.state.winner = player;
        this.state.winReason = 'Eight cats on the board!';
        
        // Check if there's a line of 3 among the 8 cats
        const linesAmongCats = this.findLinesAmongPositions(catPositions);
        
        if (linesAmongCats.length > 0) {
          // Prioritize showing a line of 3
          this.state.winningCells = linesAmongCats[0];
        } else {
          // Show all 8 cats
          this.state.winningCells = catPositions;
        }
        
        return true;
      }
    }
    
    return false;
  }

  // Find lines of 3 among given positions
  findLinesAmongPositions(positions) {
    const lines = [];
    const posSet = new Set(positions.map(([r, c]) => `${r},${c}`));
    
    for (const [r, c] of positions) {
      // Check 4 directions
      for (let d = 0; d < 4; d++) {
        const [dr, dc] = DIRECTIONS[d];
        const line = [[r, c]];
        let validLine = true;
        
        for (let i = 1; i < PIECES_TO_GRADUATE; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          const key = `${nr},${nc}`;
          
          if (!posSet.has(key)) {
            validLine = false;
            break;
          }
          
          line.push([nr, nc]);
        }
        
        if (validLine) {
          lines.push(line);
        }
      }
    }
    
    return this.removeDuplicateLines(lines);
  }

  // Find lines of pure cats (no kittens)
  findPureCatLines(player) {
    const cat = this.getCatType(player);
    const lines = [];
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.state.board[r][c] === cat) {
          // Check 4 directions
          for (let d = 0; d < 4; d++) {
            const [dr, dc] = DIRECTIONS[d];
            let validLine = true;
            const line = [[r, c]];
            
            for (let i = 1; i < PIECES_TO_GRADUATE; i++) {
              const nr = r + dr * i;
              const nc = c + dc * i;
              
              if (!this.isValidPosition(nr, nc) || this.state.board[nr][nc] !== cat) {
                validLine = false;
                break;
              }
              
              line.push([nr, nc]);
            }
            
            if (validLine) {
              lines.push(line);
            }
          }
        }
      }
    }
    
    return lines;
  }

  // Switch to next player
  switchTurn() {
    this.state.currentPlayer = this.state.currentPlayer === 1 ? 2 : 1;
    this.state.turnCount++;
    this.state.selectedPiece = null;
    this.state.selectedGraduationCells.clear();
  }

  // Helper methods
  isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  getKittenType(player) {
    return player === 1 ? PIECE_TYPES.KITTEN_1 : PIECE_TYPES.KITTEN_2;
  }

  getCatType(player) {
    return player === 1 ? PIECE_TYPES.CAT_1 : PIECE_TYPES.CAT_2;
  }

  isKitten(piece) {
    return piece === PIECE_TYPES.KITTEN_1 || piece === PIECE_TYPES.KITTEN_2;
  }

  isCat(piece) {
    return piece === PIECE_TYPES.CAT_1 || piece === PIECE_TYPES.CAT_2;
  }

  getOwner(piece) {
    return (piece === PIECE_TYPES.KITTEN_1 || piece === PIECE_TYPES.CAT_1) ? 1 : 2;
  }

  isPlayerPiece(piece, player) {
    if (!piece) return false;
    return this.getOwner(piece) === player;
  }

  countPiecesOnBoard(player) {
    let count = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.isPlayerPiece(this.state.board[r][c], player)) {
          count++;
        }
      }
    }
    return count;
  }

  countCatsOnBoard(player) {
    const cat = this.getCatType(player);
    let count = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.state.board[r][c] === cat) {
          count++;
        }
      }
    }
    return count;
  }

  // Get available pieces for current player
  getAvailablePieces() {
    const player = this.state.currentPlayer;
    const pool = this.state.pools[player];
    const pieces = [];
    
    if (pool.kittens > 0) {
      pieces.push(this.getKittenType(player));
    }
    if (pool.cats > 0) {
      pieces.push(this.getCatType(player));
    }
    
    return pieces;
  }
}

// Export for use in other modules
window.GameEngine = GameEngine;