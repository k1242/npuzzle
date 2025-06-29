// GameController.js - Controller that connects models and views
import { Game } from '../models/Game.js';
import { Storage } from '../models/Storage.js';
import { BoardView } from '../views/BoardView.js';
import { ControlsView } from '../views/ControlsView.js';
import { NumpadView } from '../views/NumpadView.js';
import { SettingsView } from '../views/SettingsView.js';
import { puzzle_list } from '../data/puzzle_list.js';

export class GameController {
  constructor() {
    // Models
    this.game = new Game();
    this.storage = new Storage();
    
    // Views
    this.boardView = null;
    this.controlsView = null;
    this.numpadView = null;
    this.settingsView = null;
    
    // State
    this.isModified = false;
    this.confirmingNewGame = false;
    
    this.initialize();
  }

  initialize() {
    // Initialize views
    this.initializeViews();
    
    // Set up event listeners
    this.setupGameListeners();
    this.setupViewListeners();
    this.setupKeyboardListeners();
    this.setupGlobalListeners();
    
    // Load saved game or start new
    if (!this.loadSavedGame()) {
      this.newGame();
    }
    
    // Initial render
    this.updateViews();
  }

  initializeViews() {
    // Board view
    const boardContainer = document.getElementById('board');
    if (boardContainer) {
      this.boardView = new BoardView(boardContainer);
    }
    
    // Controls view
    const controlsContainer = document.querySelector('.controls');
    if (controlsContainer) {
      this.controlsView = new ControlsView(controlsContainer);
    }
    
    // Numpad view
    const numpadContainer = document.getElementById('numpad');
    if (numpadContainer) {
      this.numpadView = new NumpadView(numpadContainer);
    }
    
    // Settings view
    const settingsContainer = document.getElementById('panel');
    if (settingsContainer) {
      this.settingsView = new SettingsView(settingsContainer, this.game.settings);
    }
  }

  setupGameListeners() {
    // Listen to game events
    this.game.on('boardUpdate', () => {
      this.isModified = true;
      this.updateViews();
      this.saveGame();
    });
    
    this.game.on('selectionChange', () => {
      this.updateViews();
    });
    
    this.game.on('modeChange', () => {
      this.updateViews();
    });
    
    this.game.on('solved', () => {
      this.showSolvedNotification();
    });
    
    this.game.on('settingChange', (data) => {
      this.saveGame();
    });
  }

  setupViewListeners() {
    // Board view events
    if (this.boardView) {
      this.boardView.onCellClick = (row, col) => this.handleCellClick(row, col);
      this.boardView.onCellDrag = (row, col, mode) => this.handleCellDrag(row, col, mode);
    }
    
    // Controls view events
    if (this.controlsView) {
      this.controlsView.onPencilClick = () => this.game.togglePencilMode();
      this.controlsView.onMarkerClick = () => this.game.toggleMarkerMode();
      this.controlsView.onEraserClick = () => this.game.toggleEraserMode();
      this.controlsView.onUndoClick = () => this.game.undo();
      this.controlsView.onMarkerDoubleClick = () => this.game.clearAllMarkers();
    }
    
    // Numpad view events
    if (this.numpadView) {
      this.numpadView.onNumberClick = (num) => this.handleNumberInput(num);
    }
    
    // Settings view events
    if (this.settingsView) {
      this.settingsView.onSettingChange = (key, value) => {
        this.game.updateSetting(key, value);
      };
      
      this.settingsView.onNewGame = () => this.handleNewGameClick();
      this.settingsView.onLoadCode = (code) => this.loadFromCode(code);
      this.settingsView.onCopyCode = () => this.getGameCode();
    }
  }

  setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
  }

  setupGlobalListeners() {
    // Click outside board to deselect
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#board') && 
          !e.target.closest('.num-btn') && 
          !e.target.closest('.tool-btn')) {
        this.game.clearSelection();
        this.game.clearAllMarkers();
      }
    });
    
    // Save before unload
    window.addEventListener('beforeunload', () => this.saveGame());
  }

  // Cell interaction handlers
  handleCellClick(row, col) {
    if (this.game.markerMode) {
      this.game.toggleMarker(row, col);
    } else if (this.game.eraserMode) {
      this.game.clearCell(row, col);
    } else if (this.game.selectedNumber && !this.game.selectedCell) {
      this.game.placeNumber(row, col, this.game.selectedNumber);
    } else {
      this.game.selectCell(row, col);
    }
  }

  handleCellDrag(row, col, mode) {
    if (!this.game.markerMode) return null;
    
    if (mode === 'start') {
      // Determine drag mode based on initial cell
      const cell = this.game.board.getCell(row, col);
      if (cell) {
        this.game.toggleMarker(row, col);
        return cell.isMarked ? 'add' : 'remove';
      }
    } else if (mode === 'add' || mode === 'remove') {
      // Continue dragging
      const cell = this.game.board.getCell(row, col);
      if (cell && cell.isMarked !== (mode === 'add')) {
        this.game.toggleMarker(row, col);
      }
    }
    
    return mode;
  }

  // Number input handler
  handleNumberInput(num) {
    if (this.game.eraserMode && this.game.selectedCell) {
      this.game.clearCell(this.game.selectedCell.row, this.game.selectedCell.col);
    } else {
      this.game.handleNumberInput(num);
    }
  }

  // Keyboard handler
  handleKeyPress(e) {
    // Skip if typing in input
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    )) {
      return;
    }
    
    const key = e.key.toLowerCase();
    
    // Prevent arrow key scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
      e.preventDefault();
    }
    
    // Escape - clear all modes and selection
    if (e.key === 'Escape') {
      this.game.clearSelection();
      this.game.clearAllModes();
      return;
    }
    
    // Undo
    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      this.game.undo();
      return;
    }
    
    if (key === 'u') {
      this.game.undo();
      return;
    }
    
    // Mode toggles
    if (key === 'n') {
      this.game.togglePencilMode();
      return;
    }
    
    if (key === 'm') {
      if (e.shiftKey) {
        this.game.clearAllMarkers();
      } else {
        this.game.toggleMarkerMode();
      }
      return;
    }
    
    if (key === 'e') {
      this.game.toggleEraserMode();
      if (this.game.eraserMode && this.game.selectedCell) {
        this.game.clearCell(this.game.selectedCell.row, this.game.selectedCell.col);
      }
      return;
    }
    
    // Numbers
    if (key >= '1' && key <= '9') {
      this.handleNumberInput(parseInt(key));
      return;
    }
    
    // Clear cell
    if (key === '0' || e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (this.game.selectedCell) {
        this.game.clearCell(this.game.selectedCell.row, this.game.selectedCell.col);
      } else if (this.game.selectedNumber) {
        this.game.selectedNumber = null;
      }
      return;
    }
    
    // Navigation
    const navMap = {
      'ArrowUp': 'up', 'w': 'up',
      'ArrowDown': 'down', 's': 'down',
      'ArrowLeft': 'left', 'a': 'left',
      'ArrowRight': 'right', 'd': 'right'
    };
    
    const direction = navMap[e.key] || navMap[key];
    if (direction) {
      this.game.moveSelection(direction);
    }
  }

  // Update all views
  updateViews() {
    // Update board
    if (this.boardView) {
      this.boardView.update(this.game);
      this.boardView.setMarkerMode(this.game.markerMode);
      
      // Set selected cell value for pencil mark highlighting
      if (this.game.selectedCell) {
        const cell = this.game.board.getCell(this.game.selectedCell.row, this.game.selectedCell.col);
        this.boardView.getSelectedCellValue = () => cell ? cell.value : null;
      }
    }
    
    // Update controls
    if (this.controlsView) {
      this.controlsView.update({
        pencilMode: this.game.pencilMode,
        eraserMode: this.game.eraserMode,
        markerMode: this.game.markerMode,
        canUndo: this.game.history.length > 0
      });
    }
    
    // Update numpad
    if (this.numpadView) {
      const counts = this.getNumberCounts();
      this.numpadView.update({
        counts,
        selectedNumber: this.game.selectedNumber,
        hasSelectedCell: !!this.game.selectedCell
      });
    }
    
    // Update settings
    if (this.settingsView) {
      this.settingsView.updatePuzzleInfo(
        this.getGameCode(),
        this.game.puzzleIndex >= 0 ? `(#${this.game.puzzleIndex + 1})` : ''
      );
    }
  }

  // Get count of each number on board
  getNumberCounts() {
    const counts = Array(10).fill(0);
    this.game.board.getAllCells().forEach(cell => {
      if (cell.value !== 0) {
        counts[cell.value]++;
      }
    });
    return counts;
  }

  // Game management
  newGame() {
    const puzzleIndex = Math.floor(Math.random() * puzzle_list.length);
    const puzzleString = puzzle_list[puzzleIndex];
    
    this.game.loadPuzzle(puzzleString, puzzleIndex);
    this.isModified = false;
    this.confirmingNewGame = false;
    
    if (this.settingsView) {
      this.settingsView.resetNewGameButton();
    }
  }

  handleNewGameClick() {
    if (!this.isModified || this.game.isSolved || this.confirmingNewGame) {
      this.newGame();
      return;
    }
    
    this.confirmingNewGame = true;
    if (this.settingsView) {
      this.settingsView.showNewGameConfirmation();
      
      setTimeout(() => {
        if (this.confirmingNewGame) {
          this.confirmingNewGame = false;
          this.settingsView.resetNewGameButton();
        }
      }, 3000);
    }
  }

  // Load from code
  loadFromCode(code) {
    // Handle puzzle number reference like "#15"
    if (code.startsWith('#')) {
      const puzzleNum = parseInt(code.substring(1));
      if (!isNaN(puzzleNum) && puzzleNum >= 1 && puzzleNum <= puzzle_list.length) {
        const puzzleCode = puzzle_list[puzzleNum - 1];
        return this.loadFromCode(puzzleCode);
      } else {
        return false;
      }
    }
    
    // Validate code
    if (!/^[0-9]{81}$/.test(code)) {
      return false;
    }
    
    // Find puzzle index
    const puzzleIndex = puzzle_list.indexOf(code);
    
    // Load puzzle
    const success = this.game.loadPuzzle(code, puzzleIndex);
    if (success) {
      this.isModified = false;
      this.confirmingNewGame = false;
    }
    
    return success;
  }

  // Get current game code
  getGameCode() {
    if (this.game.initialBoard) {
      return this.game.initialBoard.toString();
    }
    return '';
  }

  // Storage
  saveGame() {
    const state = this.game.getState();
    state.isModified = this.isModified;
    this.storage.save(state);
  }

  loadSavedGame() {
    const state = this.storage.load();
    if (!state) return false;
    
    try {
      this.game.loadState(state);
      this.isModified = state.isModified || false;
      return true;
    } catch (e) {
      console.error('Failed to load saved game:', e);
      return false;
    }
  }

  // Notifications
  showSolvedNotification() {
    // This will be handled by a notification view
    const notification = document.querySelector('.correct-badge');
    if (notification) {
      notification.classList.add('show');
    }
  }

  // Clean up
  destroy() {
    if (this.boardView) this.boardView.destroy();
    if (this.controlsView) this.controlsView.destroy();
    if (this.numpadView) this.numpadView.destroy();
    if (this.settingsView) this.settingsView.destroy();
  }
}