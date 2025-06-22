/* ====== COMMON UI COMPONENTS ====== */

// Hamburger menu functionality
const initHamburgerMenu = () => {
  const menuBtn = document.querySelector('#menuBtn');
  const panel = document.querySelector('#panel');
  
  if (menuBtn && panel) {
    menuBtn.onclick = () => {
      panel.classList.toggle('open');
      menuBtn.classList.toggle('active');
    };
  }
};

// Game switcher dropdown
const initGameSwitcher = () => {
  const titleBtn = document.querySelector('#titleBtn');
  const gamesDropdown = document.querySelector('#gamesDropdown');
  
  if (!titleBtn || !gamesDropdown) return;
  
  titleBtn.onclick = (e) => {
    e.stopPropagation();
    titleBtn.classList.toggle('active');
    gamesDropdown.classList.toggle('show');
  };
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!titleBtn.contains(e.target) && !gamesDropdown.contains(e.target)) {
      titleBtn.classList.remove('active');
      gamesDropdown.classList.remove('show');
    }
  });
  
  // Prevent dropdown from closing when clicking inside
  gamesDropdown.onclick = (e) => {
    e.stopPropagation();
  };
};

// Correct notification helper
const CorrectNotification = {
  element: null,
  
  show() {
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.className = 'correct-badge';
      this.element.innerHTML = `
        <span class="correct-icon">✓</span>
        <span class="correct-text">Correct!</span>
      `;
      document.body.appendChild(this.element);
    }
    this.element.classList.add('show');
  },
  
  hide() {
    if (this.element) {
      this.element.classList.remove('show');
    }
  }
};

// Stepper functionality
const initSteppers = (handlers) => {
  document.querySelectorAll('.stepper').forEach(stepper => {
    stepper.onclick = e => {
      const inc = e.target.classList.contains('plus') ? 1 
                : e.target.classList.contains('minus') ? -1 : 0;
      if (!inc) return;
      
      const target = stepper.dataset.target;
      if (handlers[target]) {
        handlers[target](inc);
      }
    };
  });
};

// Copy button functionality
const initCopyButton = (getTextFunc) => {
  const copyBtn = document.querySelector('#copyCodeBtn');
  if (!copyBtn) return;
  
  copyBtn.onclick = () => {
    const text = getTextFunc();
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy Code';
        copyBtn.classList.remove('copied');
      }, 600);
    });
  };
};

// Initialize all common UI components
const initCommonUI = () => {
  initHamburgerMenu();
  initGameSwitcher();
};

// Export for use in game scripts
window.initCommonUI = initCommonUI;
window.initSteppers = initSteppers;
window.initCopyButton = initCopyButton;
window.CorrectNotification = CorrectNotification;