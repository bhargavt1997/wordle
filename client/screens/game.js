import { state, showScreen, showToast } from '../main.js';

let currentRow = 0;
let currentCol = 0;
let currentGuess = '';
let solved = false;
let timerInterval = null;
let roundEndTime = 0;
let solvedCount = 0;
let totalPlayers = 0;
let previousLiveScores = {};
const keyStates = {};

export function initGame() {
  buildGrid();
  setupKeyboard();
  setupPhysicalKeyboard();

  // ── Round Start ──────────────────────────────────────────────────────────
  state.socket.on('round-start', (data) => {
    state.currentRound = data.roundNumber;
    state.totalRounds = data.totalRounds;
    resetGameState();
    document.getElementById('round-badge').textContent = `Round ${data.roundNumber}/${data.totalRounds}`;
    roundEndTime = Date.now() + (data.duration * 1000);
    startTimer(data.duration);
    showScreen('game');
  });

  // ── Live Leaderboard ─────────────────────────────────────────────────────
  state.socket.on('live-leaderboard-update', (leaderboardData) => {
    // Determine deltas before updating previous scores
    const deltas = [];
    leaderboardData.forEach(entry => {
      if (previousLiveScores[entry.playerId] !== undefined) {
        const diff = entry.liveScore - previousLiveScores[entry.playerId];
        if (diff > 0) deltas.push({ id: entry.playerId, diff });
      }
      previousLiveScores[entry.playerId] = entry.liveScore;
    });

    renderLiveLeaderboard(leaderboardData);
    
    // Show floating deltas AFTER rendering new DOM
    setTimeout(() => {
      deltas.forEach(d => showFloatingDelta(d.id, d.diff));
    }, 50);

    // Update solved count from leaderboard data
    solvedCount = leaderboardData.filter(p => p.solved).length;
    document.getElementById('solved-count').textContent = solvedCount;
  });

  // ── Round End ────────────────────────────────────────────────────────────
  state.socket.on('round-end', (data) => {
    stopTimer();
    // Small delay so players can see their last guess result
    setTimeout(() => {
      import('./leaderboard.js').then(mod => mod.showRoundResults(data));
    }, 1000);
  });

  // ── Game Over ────────────────────────────────────────────────────────────
  state.socket.on('game-over', (data) => {
    stopTimer();
    setTimeout(() => {
      import('./results.js').then(mod => mod.showGameOver(data));
    }, 500);
  });

  // ── Get Round Status ─────────────────────────────────────────────────────
  state.socket.on('player-joined', (data) => {
    totalPlayers = data.playerCount;
    document.getElementById('total-players').textContent = totalPlayers;
  });
  state.socket.on('player-left', (data) => {
    totalPlayers = data.playerCount;
    document.getElementById('total-players').textContent = totalPlayers;
  });
}

function buildGrid() {
  const grid = document.getElementById('guess-grid');
  grid.innerHTML = '';
  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div');
    row.className = 'guess-row';
    row.id = `row-${r}`;
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.id = `tile-${r}-${c}`;
      row.appendChild(tile);
    }
    grid.appendChild(row);
  }
}

function resetGameState() {
  currentRow = 0;
  currentCol = 0;
  currentGuess = '';
  solved = false;
  solvedCount = 0;
  previousLiveScores = {};
  Object.keys(keyStates).forEach(k => delete keyStates[k]);
  buildGrid();
  resetKeyboard();
  document.getElementById('solved-count').textContent = '0';
  document.getElementById('live-leaderboard-list').innerHTML = '';
}

function setupKeyboard() {
  document.getElementById('keyboard').addEventListener('click', (e) => {
    const key = e.target.closest('.key');
    if (!key) return;
    handleKeyInput(key.dataset.key);
  });
}

function setupPhysicalKeyboard() {
  document.addEventListener('keydown', (e) => {
    const screen = document.getElementById('screen-game');
    if (!screen.classList.contains('active')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Enter') handleKeyInput('Enter');
    else if (e.key === 'Backspace') handleKeyInput('Backspace');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKeyInput(e.key.toLowerCase());
  });
}

function handleKeyInput(key) {
  if (solved || currentRow >= 6) return;

  if (key === 'Backspace') {
    if (currentCol > 0) {
      currentCol--;
      currentGuess = currentGuess.slice(0, -1);
      const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
      tile.textContent = '';
      tile.classList.remove('filled');
    }
  } else if (key === 'Enter') {
    submitGuess();
  } else if (currentCol < 5 && /^[a-z]$/.test(key)) {
    const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
    tile.textContent = key.toUpperCase();
    tile.classList.add('filled');
    currentGuess += key;
    currentCol++;
  }
}

function submitGuess() {
  if (currentGuess.length !== 5) {
    shakeRow(currentRow);
    return showToast('Not enough letters', 'error');
  }

  state.socket.emit('submit-guess', { guess: currentGuess }, (res) => {
    if (!res.success) {
      shakeRow(currentRow);
      return showToast(res.error, 'error');
    }

    revealRow(currentRow, res.result);
    updateKeyboard(res.result);

    if (res.solved) {
      solved = true;
      setTimeout(() => bounceRow(currentRow), 500);
      showToast('🎉 Brilliant!', 'success');
    } else if (res.guessNumber >= 6) {
      showToast('Out of guesses!', 'error');
    }

    currentRow++;
    currentCol = 0;
    currentGuess = '';
  });
}

function revealRow(rowIdx, result) {
  const row = document.getElementById(`row-${rowIdx}`);
  const tiles = row.querySelectorAll('.tile');
  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('reveal');
      setTimeout(() => {
        tile.classList.add(result[i].status);
      }, 250);
    }, i * 300);
  });
}

function shakeRow(rowIdx) {
  const row = document.getElementById(`row-${rowIdx}`);
  row.classList.add('shake');
  setTimeout(() => row.classList.remove('shake'), 500);
}

function bounceRow(rowIdx) {
  const row = document.getElementById(`row-${rowIdx}`);
  const tiles = row.querySelectorAll('.tile');
  tiles.forEach((tile, i) => tile.style.setProperty('--i', i));
  row.classList.add('bounce');
}

function updateKeyboard(result) {
  result.forEach(({ letter, status }) => {
    const priority = { correct: 3, present: 2, absent: 1 };
    const current = keyStates[letter];
    if (!current || priority[status] > priority[current]) {
      keyStates[letter] = status;
    }
  });
  document.querySelectorAll('.key').forEach(key => {
    const k = key.dataset.key;
    if (keyStates[k]) {
      key.className = `key ${keyStates[k]}`;
      if (k.length > 1) key.classList.add('key-wide');
    }
  });
}

function resetKeyboard() {
  document.querySelectorAll('.key').forEach(key => {
    const isWide = key.classList.contains('key-wide');
    key.className = 'key';
    if (isWide) key.classList.add('key-wide');
  });
}

function startTimer(duration) {
  stopTimer();
  const totalTime = duration;
  const timerText = document.getElementById('timer-text');
  const timerRing = document.getElementById('timer-ring-progress');
  const timerDisplay = document.getElementById('timer-display');
  const circumference = 2 * Math.PI * 22; // r=22

  timerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((roundEndTime - Date.now()) / 1000));
    timerText.textContent = remaining;

    const fraction = remaining / totalTime;
    timerRing.style.strokeDashoffset = circumference * (1 - fraction);

    if (remaining <= 15) {
      timerDisplay.classList.add('warning');
      timerRing.style.stroke = 'var(--danger)';
    } else {
      timerDisplay.classList.remove('warning');
      timerRing.style.stroke = '';
    }

    if (remaining <= 0) stopTimer();
  }, 200);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function renderLiveLeaderboard(entries) {
  const lbList = document.getElementById('live-leaderboard-list');
  lbList.innerHTML = '';
  
  entries.forEach(entry => {
    const isMe = entry.playerId === state.socket.id;
    const item = document.createElement('div');
    item.className = `lb-item ${isMe ? 'is-me' : ''} ${entry.solved ? 'solved' : ''}`;
    
    item.innerHTML = `
      <div class="lb-left">
        <span class="lb-rank">${entry.rank}</span>
        <span class="lb-avatar">${entry.avatar}</span>
        <span class="lb-name" title="${entry.nickname}">${entry.nickname}</span>
      </div>
      <div class="lb-score" id="score-${entry.playerId}">${entry.liveScore}</div>
    `;
    
    lbList.appendChild(item);
  });
}

function showFloatingDelta(playerId, delta) {
  const scoreEl = document.getElementById(`score-${playerId}`);
  if (!scoreEl) return;

  const rect = scoreEl.getBoundingClientRect();
  
  const floater = document.createElement('div');
  floater.className = 'floating-delta';
  floater.textContent = `+${delta}`;
  floater.style.left = `${rect.right - 20}px`; // slightly to the left of the right edge
  floater.style.top = `${rect.top - 10}px`;

  document.body.appendChild(floater);

  setTimeout(() => {
    floater.remove();
  }, 2000);
}
