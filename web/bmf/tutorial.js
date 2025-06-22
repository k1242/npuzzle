// tutorial.js

/* ====== TUTORIAL SYSTEM ====== */
const Tutorial = (() => {
  let currentStep = 0;
  let tutorialActive = false;
  let overlay = null;
  let messageBox = null;
  let continueHandler = null;
  
  // Tutorial steps configuration
  const steps = [
    {
      action: () => {
        // Load the tutorial puzzle
        loadFromCode('4215BE5');
        $('#panel').classList.remove('open');
        
        // Highlight first layer toggles
        highlightElements(['[data-row="1"]', '[data-row="2"]', '[data-col="0"]', '[data-col="2"]', '[data-col="3"]'], 
          "Click on the outer boxes to select rows and columns");
      },
      validate: () => {
        // Check if correct toggles are selected in layer 1
        return state.U[0][1] === 1 && state.U[0][2] === 1 && 
               state.V[0][0] === 1 && state.V[0][2] === 1 && state.V[0][3] === 1;
      }
    },
    {
      action: () => {
        clearHighlights();
        highlightElements(['[data-card="1"]'], 
          "Great! Now select other layer to continue");
      },
      validate: () => state.cur === 1
    },
    {
      action: () => {
        clearHighlights();
        highlightElements(['[data-row="0"]', '[data-row="2"]', '[data-row="3"]', '[data-col="1"]', '[data-col="3"]'], 
          "Select these rows and columns to complete the pattern");
      },
      validate: () => {
        // Check if all required toggles are selected in layer 2
        return state.U[1][0] === 1 && state.U[1][2] === 1 && state.U[1][3] === 1 && 
               state.V[1][1] === 1 && state.V[1][3] === 1;
      }
    },
    {
      action: () => {
        clearHighlights();
        showMessage("Perfect! You've solved the puzzle!", "Tap to continue", true, true);
      },
      onContinue: () => nextStep()
    },
    {
      action: () => {
        clearHighlights();
        highlightElements(['#menuBtn'], 
          "Open the menu to customize your experience", true);
      },
      validate: () => $('#panel').classList.contains('open')
    },
    {
      action: () => {
        clearHighlights();
        highlightElements(['.setting:nth-child(1)']);
        showMessage("Choose combine mode: OR (layers stack: 1+1=1) or XOR (layers cancel: 1+1=0)", "Tap to continue", true, true);
      },
      onContinue: () => nextStep()
    },
    {
      action: () => {
        clearHighlights();
        highlightElements(['.setting:nth-child(2)', '.setting:nth-child(3)']);
        showMessage("Experiment with settings to find your preferred challenge level", "Tap to finish tutorial", true, true);
      },
      onContinue: () => endTutorial()
    }
  ];
  
  // Create tutorial overlay
  const createOverlay = () => {
    overlay = document.createElement('div');
    overlay.className = 'tutorialOverlay';
    overlay.innerHTML = `
      <div class="tutorialMessage">
        <div class="tutorialText"></div>
        <div class="tutorialContinue" style="display:none">Tap to continue</div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    // Create highlights container inside the app for proper scaling
    const app = document.querySelector('#app');
    const highlightsContainer = document.createElement('div');
    highlightsContainer.className = 'tutorialHighlightsContainer';
    highlightsContainer.style.position = 'absolute';
    highlightsContainer.style.inset = '0';
    highlightsContainer.style.pointerEvents = 'none';
    highlightsContainer.style.zIndex = '1000';
    app.appendChild(highlightsContainer);
    overlay.highlightsContainer = highlightsContainer;
    
    messageBox = overlay.querySelector('.tutorialMessage');
    
    // Add click handler for continue button
    const continueBtn = overlay.querySelector('.tutorialContinue');
    continueBtn.addEventListener('click', () => {
      if (continueHandler) {
        const handler = continueHandler;
        continueHandler = null;
        handler();
      }
    });
  };
  
  // Highlight specific elements
  const highlightElements = (selectors, message = "", bottomPosition = false) => {
    clearHighlights();
    
    const app = document.querySelector('#app');
    const appRect = app.getBoundingClientRect();
    
    selectors.forEach(sel => {
      const els = document.querySelectorAll(sel);
      els.forEach(el => {
        const rect = el.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.className = 'tutorialHighlight';
        
        // Calculate position relative to the app container
        const relativeLeft = rect.left - appRect.left;
        const relativeTop = rect.top - appRect.top;
        
        // Apply the app's transform to get the unscaled coordinates
        const transform = window.getComputedStyle(app).transform;
        let scale = 1;
        
        if (transform && transform !== 'none') {
          const matrix = transform.match(/matrix\((.+)\)/);
          if (matrix) {
            const values = matrix[1].split(', ');
            scale = parseFloat(values[0]);
          }
        }
        
        // Calculate unscaled position
        highlight.style.position = 'absolute';
        highlight.style.left = (relativeLeft / scale) - 4 + 'px';
        highlight.style.top = (relativeTop / scale) - 4 + 'px';
        highlight.style.width = (rect.width / scale) + 8 + 'px';
        highlight.style.height = (rect.height / scale) + 8 + 'px';
        
        overlay.highlightsContainer.appendChild(highlight);
      });
    });
    
    // Only show message if provided and not empty
    if (message) {
      showMessage(message, "", false, bottomPosition);
    }
  };
  
  // Clear all highlights
  const clearHighlights = () => {
    if (overlay && overlay.highlightsContainer) {
      overlay.highlightsContainer.querySelectorAll('.tutorialHighlight').forEach(h => h.remove());
    }
  };
  
  // Show message
  const showMessage = (text, continueText = "", showContinue = false, bottomPosition = false) => {
    const textEl = overlay.querySelector('.tutorialText');
    const continueEl = overlay.querySelector('.tutorialContinue');
    
    textEl.textContent = text;
    continueEl.textContent = continueText || "Tap to continue";
    continueEl.style.display = showContinue ? 'block' : 'none';
    
    // Position the message
    if (bottomPosition) {
      messageBox.style.top = 'auto';
      messageBox.style.bottom = '20px';
    } else {
      messageBox.style.top = '10px';
      messageBox.style.bottom = 'auto';
    }
    
    messageBox.style.display = text || showContinue ? 'block' : 'none';
  };
  
  // Start tutorial
  const start = () => {
    if (tutorialActive) return;
    
    tutorialActive = true;
    currentStep = 0;
    
    // Save current state
    const savedState = {
      settings: {...settings},
      target: target ? [...target.map(row => [...row])] : null,
      state: state ? JSON.parse(JSON.stringify(state)) : null,
      wasSolved: typeof wasSolved !== 'undefined' ? wasSolved : false 
    };
    
    createOverlay();
    executeStep();
    
    // Store saved state for restoration
    overlay.savedState = savedState;
  };
  
  // Execute current step
  const executeStep = () => {
    if (currentStep >= steps.length) {
      endTutorial();
      return;
    }
    
    // Clear any existing intervals
    if (overlay && overlay.checkInterval) {
      clearInterval(overlay.checkInterval);
      overlay.checkInterval = null;
    }
    
    const step = steps[currentStep];
    step.action();
    
    // Set continue handler for manual steps
    if (step.onContinue) {
      // Use setTimeout to ensure handler is set after all synchronous operations
      setTimeout(() => {
        continueHandler = step.onContinue;
      }, 10);
    }
    
    // Start automatic validation for steps without manual confirmation
    if (step.validate && !step.onContinue) {
      const checkInterval = setInterval(() => {
        if (step.validate()) {
          clearInterval(checkInterval);
          setTimeout(nextStep, 500);
        }
      }, 100);
      
      overlay.checkInterval = checkInterval;
    }
  };
  
  // Move to next step
  const nextStep = () => {
    currentStep++;
    executeStep();
  };
  
  // End tutorial
  const endTutorial = () => {
    tutorialActive = false;
    
    // Clear any intervals
    if (overlay && overlay.checkInterval) {
      clearInterval(overlay.checkInterval);
      overlay.checkInterval = null;
    }
    
    continueHandler = null;
    
    // Remove highlights container from app
    if (overlay && overlay.highlightsContainer) {
      overlay.highlightsContainer.remove();
    }
    
    // Restore saved state
    if (overlay && overlay.savedState) {
      Object.assign(settings, overlay.savedState.settings);
      target = overlay.savedState.target;
      state = overlay.savedState.state;
      wasSolved = overlay.savedState.wasSolved;
      
      $('#nVal').textContent = settings.n;
      $('#rVal').textContent = settings.r;
      updateModeButtons();
      applyCSS();
      render();
      // Calculate scale after render
      setTimeout(calculateScale, 0);

      // Restore solved state
      solved = matEq(player(), target);
      if (solved) CorrectNotification.show();
    }
    
    // Remove overlay
    if (overlay) {
      overlay.remove();
      overlay = null;
      messageBox = null;
    }
    
    $('#panel').classList.remove('open');
  };
  
  return { start, isActive: () => tutorialActive };
})();