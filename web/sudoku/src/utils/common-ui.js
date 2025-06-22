// common-ui.js - Common UI components used across games

// Initialize hamburger menu
function initHamburgerMenu() {
  const menuBtn = document.querySelector('#menuBtn');
  const panel = document.querySelector('#panel');
  
  if (menuBtn && panel) {
    menuBtn.addEventListener('click', () => {
      panel.classList.toggle('open');
      menuBtn.classList.toggle('active');
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (panel.classList.contains('open')) {
        if (!e.target.closest('#panel') && !e.target.closest('#menuBtn')) {
          panel.classList.remove('open');
          menuBtn.classList.remove('active');
        }
      }
    });
  }
}

// Initialize game switcher dropdown
function initGameSwitcher() {
  const titleBtn = document.querySelector('#titleBtn');
  const gamesDropdown = document.querySelector('#gamesDropdown');
  
  if (!titleBtn || !gamesDropdown) return;
  
  titleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    titleBtn.classList.toggle('active');
    gamesDropdown.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!titleBtn.contains(e.target) && !gamesDropdown.contains(e.target)) {
      titleBtn.classList.remove('active');
      gamesDropdown.classList.remove('show');
    }
  });
  
  // Prevent dropdown from closing when clicking inside
  gamesDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Initialize all common UI components
export function initCommonUI() {
  initHamburgerMenu();
  initGameSwitcher();
}