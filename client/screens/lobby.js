import { state, showScreen, showToast } from '../main.js';

export function initLobby() {
  const btnCreate = document.getElementById('btn-create');
  const btnJoin = document.getElementById('btn-join');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnStartGame = document.getElementById('btn-start-game');

  // ── Create Room ──────────────────────────────────────────────────────────
  btnCreate.addEventListener('click', () => {
    const nickname = document.getElementById('create-nickname').value.trim();
    if (!nickname) return showToast('Enter a nickname!', 'error');

    const rounds = parseInt(document.getElementById('rounds-select').value);
    const roundDuration = parseInt(document.getElementById('duration-select').value);

    btnCreate.disabled = true;
    state.socket.emit('create-room', { nickname, rounds, roundDuration }, (res) => {
      btnCreate.disabled = false;
      if (!res.success) return showToast(res.error, 'error');

      state.roomCode = res.roomCode;
      state.nickname = nickname;
      state.isHost = true;
      state.totalRounds = res.settings.rounds;
      state.roundDuration = res.settings.roundDuration;

      showWaitingRoom(res.roomCode, res.settings, res.players, true);
    });
  });

  // ── Join Room ────────────────────────────────────────────────────────────
  btnJoin.addEventListener('click', () => {
    const nickname = document.getElementById('join-nickname').value.trim();
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    if (!nickname) return showToast('Enter a nickname!', 'error');
    if (!roomCode || roomCode.length < 6) return showToast('Enter a valid room code!', 'error');

    btnJoin.disabled = true;
    state.socket.emit('join-room', { roomCode, nickname }, (res) => {
      btnJoin.disabled = false;
      if (!res.success) return showToast(res.error, 'error');

      state.roomCode = res.roomCode;
      state.nickname = nickname;
      state.isHost = res.isHost;
      state.totalRounds = res.settings.rounds;
      state.roundDuration = res.settings.roundDuration;

      showWaitingRoom(res.roomCode, res.settings, res.players, false);
    });
  });

  // ── Copy Code ────────────────────────────────────────────────────────────
  btnCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(state.roomCode).then(() => {
      showToast('Room code copied!', 'success');
    });
  });

  // ── Start Game ───────────────────────────────────────────────────────────
  btnStartGame.addEventListener('click', () => {
    state.socket.emit('start-game', (res) => {
      if (!res.success) showToast(res.error, 'error');
    });
  });

  // ── Socket Events ────────────────────────────────────────────────────────
  state.socket.on('player-joined', (data) => {
    renderPlayerGrid(data.players);
    document.getElementById('info-players').textContent = data.playerCount;
    showToast(`${data.nickname} joined!`, 'success');
  });

  state.socket.on('player-left', (data) => {
    renderPlayerGrid(data.players);
    document.getElementById('info-players').textContent = data.playerCount;
    showToast(`${data.nickname} left`, 'info');

    // Check if we became host
    if (data.newHostId === state.socket.id) {
      state.isHost = true;
      document.getElementById('btn-start-game').style.display = '';
      document.getElementById('waiting-message').style.display = 'none';
    }
  });

  // Enter key support
  document.getElementById('create-nickname').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnCreate.click();
  });
  document.getElementById('room-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnJoin.click();
  });
}

function showWaitingRoom(roomCode, settings, players, isHost) {
  document.getElementById('display-room-code').textContent = roomCode;
  document.getElementById('info-rounds').textContent = settings.rounds;
  document.getElementById('info-timer').textContent = settings.roundDuration + 's';
  document.getElementById('info-players').textContent = players.length;

  if (isHost) {
    document.getElementById('btn-start-game').style.display = '';
    document.getElementById('waiting-message').style.display = 'none';
  } else {
    document.getElementById('btn-start-game').style.display = 'none';
    document.getElementById('waiting-message').style.display = '';
  }

  renderPlayerGrid(players);
  showScreen('waiting');
}

function renderPlayerGrid(players) {
  const grid = document.getElementById('players-grid');
  grid.innerHTML = '';
  players.forEach(p => {
    const chip = document.createElement('div');
    chip.className = `player-chip${p.isHost ? ' host' : ''}`;
    chip.innerHTML = `<span class="chip-avatar">${p.avatar}</span><span>${p.nickname}</span>${p.isHost ? '<span style="font-size:0.7rem;color:var(--gold)">👑</span>' : ''}`;
    grid.appendChild(chip);
  });
}
