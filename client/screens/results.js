import { state, showScreen } from '../main.js';
import confetti from 'canvas-confetti';

export function initResults() {
  document.getElementById('btn-play-again').addEventListener('click', () => {
    window.location.reload();
  });
}

export function showGameOver(data) {
  const winner = data.winner;

  // Winner card
  const winnerCard = document.getElementById('winner-card');
  winnerCard.innerHTML = `
    <div class="winner-label">🏆 Champion</div>
    <div class="winner-avatar">${winner.avatar}</div>
    <div class="winner-name">${winner.nickname}</div>
    <div class="winner-score">${winner.totalScore} points</div>
  `;

  // Final leaderboard
  const tbody = document.getElementById('final-leaderboard-body');
  tbody.innerHTML = '';
  data.leaderboard.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    tr.style.setProperty('--row-i', idx);
    const rankDisplay = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${entry.rank}`;
    tr.innerHTML = `
      <td><span class="rank-medal">${rankDisplay}</span></td>
      <td><div class="player-cell"><span>${entry.avatar}</span><span>${entry.nickname}</span></div></td>
      <td>${entry.solvedRounds}/${state.totalRounds}</td>
      <td>${entry.avgGuesses}</td>
      <td style="font-weight:700;color:var(--gold)">${entry.totalScore}</td>
    `;
    tbody.appendChild(tr);
  });

  showScreen('gameover');

  // Confetti celebration!
  fireConfetti();
}

function fireConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#10b981', '#f59e0b', '#8b5cf6', '#fbbf24']
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#10b981', '#f59e0b', '#8b5cf6', '#fbbf24']
    });

    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
