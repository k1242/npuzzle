// Tutorial examples generation
const generateTutorialExamples = () => {
  const container = document.getElementById('tutorialExamples');
  
  const whiteExamples = `
    <div class="example-group">
      <h3>White Circles ○</h3>
      <p style="margin-bottom:16px;font-size:.9rem">The path goes <strong>straight through</strong> the white circle, but must turn immediately before OR after (or both).</p>
      <div class="example-row">
        <div class="example">
          <svg width="100" height="100" viewBox="0 0 100 100">
            ${generateGrid()}
            <rect x="10" y="48" width="40" height="4" fill="#3e3d3a"/>
            <rect x="50" y="48" width="20" height="4" fill="#3e3d3a"/>
            <rect x="68" y="50" width="4" height="20" fill="#3e3d3a"/>
            <circle cx="50" cy="50" r="6" fill="white" stroke="#3e3d3a" stroke-width="3"/>
          </svg>
          <div class="example-label correct">✓ Correct</div>
        </div>
        <div class="example">
          <svg width="100" height="100" viewBox="0 0 100 100">
            ${generateGrid()}
            <rect x="28" y="30" width="4" height="20" fill="#3e3d3a"/>
            <rect x="30" y="48" width="40" height="4" fill="#3e3d3a"/>
            <rect x="68" y="50" width="4" height="20" fill="#3e3d3a"/>
            <circle cx="50" cy="50" r="6" fill="white" stroke="#3e3d3a" stroke-width="3"/>
          </svg>
          <div class="example-label correct">✓ Correct</div>
        </div>
      </div>
      <div class="example-row">
        <div class="example">
          <svg width="100" height="100" viewBox="0 0 100 100">
            ${generateGrid()}
            <rect x="30" y="48" width="20" height="4"  fill="#3e3d3a"/>
            <rect x="48" y="50" width="4"  height="20" fill="#3e3d3a"/>
            <circle cx="50" cy="50" r="6" fill="white" stroke="#3e3d3a" stroke-width="3"/>
          </svg>
          <div class="example-label incorrect">✗ Wrong</div>
        </div>
        <div class="example">
          <svg width="100" height="100" viewBox="0 0 100 100">
            ${generateGrid()}
            <rect x="10" y="48" width="40" height="4" fill="#3e3d3a"/>
            <rect x="48" y="48" width="40" height="4" fill="#3e3d3a"/>
            <circle cx="50" cy="50" r="6" fill="white" stroke="#3e3d3a" stroke-width="3"/>
          </svg>
          <div class="example-label incorrect">✗ Wrong</div>
        </div>
      </div>
    </div>
  `;
  
  const blackExamples = `
    <div class="example-group">
      <h3>Black Circles ●</h3>
      <p style="margin-bottom:16px;font-size:.9rem">The path must <strong>turn 90° at</strong> the black circle, and must go straight for at least one cell before AND after the turn.</p>
      <div class="example-row">
        <div class="example">
          <svg width="100" height="100" viewBox="0 0 100 100">
            ${generateGrid()}
            <rect x="10" y="48" width="40" height="4" fill="#3e3d3a"/>
            <rect x="48" y="48" width="4" height="40" fill="#3e3d3a"/>
            <circle cx="50" cy="50" r="6" fill="#3e3d3a"/>
          </svg>
          <div class="example-label correct">✓ Correct</div>
        </div>
      </div>
      <div class="example-row">
        <div class="example">
          <svg width="100" height="100" viewBox="0 0 100 100">
            ${generateGrid()}
            <rect x="30" y="48" width="40" height="4" fill="#3e3d3a"/>
            <circle cx="50" cy="50" r="6" fill="#3e3d3a"/>
          </svg>
          <div class="example-label incorrect">✗ Wrong</div>
        </div>
        <div class="example">
          <svg width="100" height="100" viewBox="0 0 100 100">
            ${generateGrid()}
            <rect x="30" y="48" width="20" height="4" fill="#3e3d3a"/>
            <rect x="48" y="30" width="4" height="20" fill="#3e3d3a"/>
            <rect x="50" y="28" width="20" height="4" fill="#3e3d3a"/>
            <circle cx="50" cy="50" r="6" fill="#3e3d3a"/>
          </svg>
          <div class="example-label incorrect">✗ Wrong</div>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = whiteExamples + blackExamples;
};

const generateGrid = () => {
  let grid = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      grid += `<rect x="${10 + c * 20}" y="${10 + r * 20}" width="20" height="20" fill="#fff" stroke="#e0e0e0"/>`;
    }
  }
  return grid;
};

// Initialize tutorial when page loads
document.addEventListener('DOMContentLoaded', generateTutorialExamples);