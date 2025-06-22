/* ====== TIMER SYSTEM ====== */
const Timer = (() => {
  let startTime = null;
  let elapsedTime = 0;
  let timerInterval = null;
  let isRunning = false;
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const updateDisplay = () => {
    if (!settings.showTimer) {
      $('#timerDisplay').style.display = 'none';
      return;
    }
    
    $('#timerDisplay').style.display = 'block';
    const currentTime = isRunning 
      ? elapsedTime + Math.floor((Date.now() - startTime) / 1000)
      : elapsedTime;
    $('#timerValue').textContent = formatTime(currentTime);
  };
  
  const start = () => {
    if (isRunning) return;
    
    startTime = Date.now();
    isRunning = true;
    
    $('#timerDisplay').classList.remove('solved');
    
    timerInterval = setInterval(() => {
      updateDisplay();
      if (!initializing) saveGame();
    }, 1000);
    
    updateDisplay();
  };
  
  const stop = () => {
    if (!isRunning) return;
    
    elapsedTime += Math.floor((Date.now() - startTime) / 1000);
    isRunning = false;
    
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    $('#timerDisplay').classList.add('solved');
    updateDisplay();
  };
  
  const reset = () => {
    stop();
    elapsedTime = 0;
    startTime = null;
    $('#timerDisplay').classList.remove('solved');
    updateDisplay();
  };
  
  const getTime = () => {
    return isRunning 
      ? elapsedTime + Math.floor((Date.now() - startTime) / 1000)
      : elapsedTime;
  };
  
  const getState = () => ({
    elapsedTime: getTime(),
    isRunning
  });
  
  const setState = (state) => {
    if (!state) return;
    
    elapsedTime = state.elapsedTime || 0;
    
    if (state.isRunning && !solved && !wasSolved) {
      start();
    } else {
      isRunning = false;
      if (solved || wasSolved) {
        $('#timerDisplay').classList.add('solved');
      }
      updateDisplay();
    }
  };
  
  return {
    start,
    stop,
    reset,
    getTime,
    getState,
    setState,
    updateDisplay,
    get isRunning() { return isRunning }
  };
})();