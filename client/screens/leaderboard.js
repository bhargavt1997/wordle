import { state, showScreen, showToast } from '../main.js';

export function initLeaderboard() {
  const btnNextRound = document.getElementById('btn-next-round');

  btnNextRound.addEventListener('click', () => {
    btnNextRound.disabled = true;
    state.socket.emit('next-round', (res) => {
      btnNextRound.disabled = false;
      if (!res.success) showToast(res.error, 'error');
    });
  });
}

export function showRoundResults(data) {
  document.getElementById('leaderboard-title').textContent = `Round ${data.roundNumber} Results`;
  document.getElementById('revealed-word').textContent = data.word.toUpperCase();

  // Podium
  renderPodium(data.leaderboard.slice(0, 3));

  // Leaderboard table
  const tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = '';
  data.leaderboard.forEach((entry, idx) => {
    const roundScore = data.roundScores.find(s => s.playerId === entry.playerId);
    const tr = document.createElement('tr');
    tr.style.setProperty('--row-i', idx);

    const rankDisplay = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${entry.rank}`;

    tr.innerHTML = `
      <td><span class="rank-medal">${rankDisplay}</span></td>
      <td><div class="player-cell"><span>${entry.avatar}</span><span>${entry.nickname}</span></div></td>
      <td>${roundScore?.solved ? roundScore.guessCount + '/6' : '❌'}</td>
      <td style="color:${roundScore?.total > 0 ? 'var(--correct)' : 'var(--text-muted)'}">+${roundScore?.total || 0}</td>
      <td style="font-weight:700">${entry.totalScore}</td>
    `;
    tbody.appendChild(tr);
  });

  // Show/hide next round button based on host status
  if (state.isHost && !data.isGameOver) {
    document.getElementById('btn-next-round').style.display = '';
    document.getElementById('next-round-wait').style.display = 'none';
  } else if (!data.isGameOver) {
    document.getElementById('btn-next-round').style.display = 'none';
    document.getElementById('next-round-wait').style.display = '';
  } else {
    document.getElementById('btn-next-round').style.display = 'none';
    document.getElementById('next-round-wait').style.display = 'none';
  }

  showScreen('leaderboard');
}

function renderPodium(top3) {
  const podium = document.getElementById('podium');
  podium.innerHTML = '';

  const medals = ['🥇', '🥈', '🥉'];
  top3.forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = 'podium-entry';
    div.style.animationDelay = `${idx * 0.2}s`;
    div.innerHTML = `
      <div class="podium-avatar">${entry.avatar}</div>
      <div class="podium-name">${entry.nickname}</div>
      <div class="podium-score">${entry.totalScore} pts</div>
      <div class="podium-bar">${medals[idx]}</div>
    `;
    podium.appendChild(div);
  });
}
