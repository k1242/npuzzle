// encoder.js - Encoding/decoding puzzle code
// Requires: global settings, state, target variables from script.js

/* ====== BIT / HEX CONVERSION ====== */
const bitsToHex = b => {
  const pad = (4 - b.length % 4) % 4;
  if (pad) b += '0'.repeat(pad);
  return b.match(/.{4}/g).map(x => parseInt(x, 2).toString(16).toUpperCase()).join('');
};

const hexToBits = h => 
  [...h.toUpperCase()].map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');

/* ====== ENCODE / DECODE ====== */
const encode = () => {
  let bits = [
    settings.n.toString(2).padStart(4, '0'),
    settings.r.toString(2).padStart(4, '0'),
    (settings.mode === 'mod' ? 1 : 0).toString(2).padStart(4, '0')
  ].join('');
  
  // in editor mode, encode player state instead of target
  const source = editorMode ? player() : target;
  for (let i = 0; i < settings.n; i++)
    for (let j = 0; j < settings.n; j++)
      bits += source[i][j];
      
  return bitsToHex(bits);
};

const loadFromCode = code => {
  if (!/^[0-9A-F]+$/i.test(code)) return false;
  const bits = hexToBits(code);
  if (bits.length < 12) return false;

  const n = parseInt(bits.slice(0, 4), 2);
  const r = parseInt(bits.slice(4, 8), 2);
  const modeBit = parseInt(bits.slice(8, 12), 2);

  if (n < 2 || n > 10 || r < 1 || r > 6 || ![0, 1].includes(modeBit)) return false;

  const cells = n * n;
  const boardBits = bits.slice(12, 12 + cells).padEnd(cells, '0');
  target = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => +boardBits[i * n + j])
  );

  Object.assign(settings, { n, r, mode: modeBit ? 'mod' : 'bool' });
  applyCSS();
  initState();
  solved = false;
  wasSolved = false;
  updateModeButtons();
  updateUIValues();
  render();
  // Calculate scale after render
  setTimeout(calculateScale, 0);
  return true;
};