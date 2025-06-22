// SettingsView.js - View for settings panel
export class SettingsView {
  constructor(container, initialSettings) {
    this.container = container;
    
    // Get elements
    this.codeInput = container.querySelector('#codeInput');
    this.puzzleNumber = container.querySelector('#puzzleNumber');
    this.copyBtn = container.querySelector('#copyCodeBtn');
    this.loadBtn = container.querySelector('#loadCodeBtn');
    this.newBtn = document.querySelector('#newBtn'); // In header
    
    // Setting toggles
    this.settingToggles = {
      highlightRelatedCells: container.querySelector('#highlightRelatedCells'),
      highlightPencilMarks: container.querySelector('#highlightPencilMarks'),
      highlightAffectedAreas: container.querySelector('#highlightAffectedAreas'),
      highlightBiValues: container.querySelector('#highlightBiValues'),
      prefillNotes: container.querySelector('#prefillNotes'),
      autoClearNotes: container.querySelector('#autoClearNotes')
    };
    
    // Callbacks
    this.onSettingChange = null;
    this.onNewGame = null;
    this.onLoadCode = null;
    this.onCopyCode = null;
    
    this.setupEventListeners();
    this.applyInitialSettings(initialSettings);
  }

  setupEventListeners() {
    // Setting toggles
    Object.entries(this.settingToggles).forEach(([key, toggle]) => {
      if (toggle) {
        toggle.addEventListener('change', () => {
          if (this.onSettingChange) {
            this.onSettingChange(key, toggle.checked);
          }
        });
      }
    });
    
    // Copy button
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => {
        if (this.onCopyCode) {
          const code = this.onCopyCode();
          if (code) {
            navigator.clipboard.writeText(code).then(() => {
              this.copyBtn.textContent = 'Copied!';
              this.copyBtn.classList.add('copied');
              setTimeout(() => {
                this.copyBtn.textContent = 'Copy Code';
                this.copyBtn.classList.remove('copied');
              }, 600);
            });
          }
        }
      });
    }
    
    // Load button
    if (this.loadBtn) {
      this.loadBtn.addEventListener('click', () => {
        if (this.codeInput && this.onLoadCode) {
          const code = this.codeInput.value.trim();
          if (code) {
            const success = this.onLoadCode(code);
            if (!success) {
              alert('Invalid code');
            }
          }
        }
      });
    }
    
    // Enter key on code input
    if (this.codeInput) {
      this.codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && this.loadBtn) {
          this.loadBtn.click();
        }
      });
    }
    
    // New game button
    if (this.newBtn) {
      this.newBtn.addEventListener('click', () => {
        if (this.onNewGame) this.onNewGame();
      });
    }
    
    // Help link
    const helpLink = document.querySelector('#helpLink');
    if (helpLink) {
      helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showHelp();
      });
    }
    
    // Close help modal
    const closeHelp = document.querySelector('#closeHelp');
    const helpModal = document.querySelector('#helpModal');
    
    if (closeHelp) {
      closeHelp.addEventListener('click', () => {
        if (helpModal) helpModal.style.display = 'none';
      });
    }
    
    if (helpModal) {
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          helpModal.style.display = 'none';
        }
      });
    }
  }

  applyInitialSettings(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      const toggle = this.settingToggles[key];
      if (toggle) {
        toggle.checked = value;
      }
    });
  }

  updatePuzzleInfo(code, puzzleNumber) {
    if (this.codeInput) {
      this.codeInput.value = code;
    }
    
    if (this.puzzleNumber) {
      this.puzzleNumber.textContent = puzzleNumber;
    }
  }

  showNewGameConfirmation() {
    if (this.newBtn) {
      this.newBtn.textContent = 'Confirm?';
      this.newBtn.classList.add('btn-danger');
    }
  }

  resetNewGameButton() {
    if (this.newBtn) {
      this.newBtn.textContent = 'New Game';
      this.newBtn.classList.remove('btn-danger');
    }
  }

  showHelp() {
    const helpModal = document.querySelector('#helpModal');
    if (helpModal) {
      helpModal.style.display = 'flex';
    }
  }

  destroy() {
    // Remove event listeners if needed
  }
}