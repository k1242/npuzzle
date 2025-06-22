// utils.js - Utility functions

/* ====== DOM HELPERS ====== */
const $ = sel => document.querySelector(sel);

/* ====== UI UPDATES ====== */
const updateModeButtons = () => {
  $('#orBtn').classList.toggle('checked', settings.mode === 'bool');
  $('#xorBtn').classList.toggle('checked', settings.mode === 'mod');
};

const updateUIValues = () => {
  $('#nVal').textContent = settings.n;
  $('#rVal').textContent = settings.r;
};

/* ====== CALCULATION HELPERS ====== */
const matEq = (a, b) => {
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a.length; j++)
      if (a[i][j] !== b[i][j]) return false;
  return true;
};

const rnd = () => Math.random() < 0.5 ? 1 : 0;

const calcSize = () => {
  const n = settings.n || 5; // fallback to default
  const g = innerWidth <= 600 ? 4 : 6;
  const max = innerWidth <= 600 ? innerWidth * 0.9 : 500;
  const raw = (max - (n - 1) * g) / n;
  return Math.max(22, Math.min(raw, innerWidth <= 600 ? 36 : 46));
};