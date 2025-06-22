// Encoding format:
// First hex digit: board size (3-F maps to 3-15)
// Then for each circle: XYT where
//   X = column (0 to n in hex, where n is board size)
//   Y = row (0 to n in hex, where n is board size)
//   T = type (0=white, 1=black)
// Example: 4210301 = 4x4 board, white at (2,1), black at (3,0)
// Note: Circles are placed at vertices (intersections), so coords go from 0 to n

// Encode game state to hex string
const encode = (settings, circles) => {
  // First character: board size (3-15 maps to 3-F)
  if (!settings || !settings.n || settings.n < 3 || settings.n > 15) return '';
  
  let code = settings.n.toString(16).toUpperCase();
  
  // Handle empty circles array
  if (!circles || !Array.isArray(circles)) return code;
  
  // Sort circles for consistent encoding
  const sorted = [...circles].sort((a, b) => {
    if (a.vr !== b.vr) return a.vr - b.vr;
    return a.vc - b.vc;
  });
  
  // Each circle: XYT (X=column, Y=row, T=type)
  sorted.forEach(circle => {
    // Validate circle coordinates are within bounds
    // Note: vertices go from 0 to n (inclusive) for an n×n grid
    if (circle.vc >= 0 && circle.vc <= settings.n && circle.vr >= 0 && circle.vr <= settings.n) {
      code += circle.vc.toString(16).toUpperCase();
      code += circle.vr.toString(16).toUpperCase();
      code += circle.type === 'black' ? '1' : '0';
    }
  });
  
  return code;
};

// Decode hex string to game state
const decode = code => {
  if (!code || code.length < 1) return null;
  
  // Trim whitespace and convert to uppercase
  code = code.trim().toUpperCase();
  
  // Check if all characters are valid hex (0-9, A-F) 
  if (!/^[0-9A-F]+$/.test(code)) {
    console.error('Invalid characters in code:', code);
    return null;
  }
  
  // Code must be 1 + 3*k characters (board size + circles)
  if ((code.length - 1) % 3 !== 0) {
    console.error('Invalid code length:', code.length, 'expected 1 + 3*k');
    return null;
  }
  
  // First character is board size
  const n = parseInt(code[0], 16);
  if (isNaN(n) || n < 3 || n > 15) {
    console.error('Invalid board size:', code[0], '(parsed as', n, ')');
    return null;
  }
  
  // Rest is circles (3 chars each)
  const circles = [];
  const positions = new Set(); // Track positions to avoid duplicates
  let i = 1;
  
  while (i + 3 <= code.length) {
    const vc = parseInt(code[i], 16);
    const vr = parseInt(code[i + 1], 16);
    const typeChar = code[i + 2];
    
    // Validate type character
    if (typeChar !== '0' && typeChar !== '1') {
      console.error('Invalid type character:', typeChar, 'at position', i + 2);
      return null;
    }
    
    const type = typeChar === '1' ? 'black' : 'white';
    
    // Validate coordinates
    // Note: vertices go from 0 to n (inclusive) for an n×n grid
    if (isNaN(vc) || isNaN(vr) || vc > n || vr > n || vc < 0 || vr < 0) {
      console.error('Invalid coordinates:', vc, vr, 'for board size', n);
      return null;
    }
    
    // Check for duplicate positions
    const posKey = `${vr},${vc}`;
    if (positions.has(posKey)) {
      console.error('Duplicate circle at position:', posKey);
      return null;
    }
    positions.add(posKey);
    
    circles.push({ vr, vc, type });
    i += 3;
  }
  
  // Return decoded state
  return {
    n,
    circles,
    // Default density when loading from code
    circlesPercent: Math.min(100, Math.round(circles.length * 100 / (n * n)))
  };
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    encode,
    decode
  };
}