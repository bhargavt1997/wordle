import { initLobby } from './screens/lobby.js';
import { initGame } from './screens/game.js';
import { initLeaderboard } from './screens/leaderboard.js';
import { initResults } from './screens/results.js';
import { io } from 'socket.io-client';

// ─── Socket Connection ────────────────────────────────────────────────────────
// In production (Render), frontend & backend are same origin — no URL needed.
// In development, falls back to localhost:3001.
const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

socket.on('connect', () => console.log('🟢 Connected to server'));
socket.on('disconnect', () => {
  console.log('🔴 Disconnected');
  showToast('Connection lost. Reconnecting...', 'error');
});
socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

// ─── Global State ──────────────────────────────────────────────────────────────
export const state = {
  socket,
  roomCode: null,
  nickname: null,
  isHost: false,
  currentRound: 0,
  totalRounds: 5,
  roundDuration: 90
};

// ─── Screen Manager ────────────────────────────────────────────────────────────
export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(`screen-${screenId}`);
  if (screen) {
    screen.classList.add('active');
    // Reset animation
    screen.style.animation = 'none';
    screen.offsetHeight; // trigger reflow
    screen.style.animation = '';
  }
}

// ─── Toast Notifications ───────────────────────────────────────────────────────
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ─── Initialize All Modules ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLobby();
  initGame();
  initLeaderboard();
  initResults();
});
