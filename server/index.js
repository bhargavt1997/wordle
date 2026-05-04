import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { RoomManager } from './game/RoomManager.js';
import { RoundManager } from './game/RoundManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In production, frontend is served from same origin so CORS isn't needed.
// In dev, allow localhost origins.
const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', '*'];

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e6,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());

// Serve static files in production
app.use(express.static(join(__dirname, '../client/dist')));

const roomManager = new RoomManager();
const roundManager = new RoundManager();

// Cleanup old rooms every 30 minutes
setInterval(() => roomManager.cleanup(), 30 * 60 * 1000);

// ─── Socket.IO Event Handling ────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);

  // ── Create Room ──────────────────────────────────────────────────────────
  socket.on('create-room', ({ nickname, rounds, roundDuration }, callback) => {
    try {
      const room = roomManager.createRoom(socket.id, nickname, {
        rounds: rounds || 5,
        roundDuration: roundDuration || 90
      });

      socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.data.nickname = nickname;

      console.log(`🏠 Room ${room.code} created by ${nickname}`);

      callback({
        success: true,
        roomCode: room.code,
        settings: room.settings,
        players: roomManager.getPlayerList(room)
      });
    } catch (err) {
      console.error('Error creating room:', err);
      callback({ success: false, error: 'Failed to create room.' });
    }
  });

  // ── Join Room ────────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomCode, nickname }, callback) => {
    try {
      const result = roomManager.joinRoom(roomCode, socket.id, nickname);

      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      const room = result.room;
      socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.data.nickname = nickname;

      const players = roomManager.getPlayerList(room);

      // Notify all players in room
      io.to(room.code).emit('player-joined', {
        nickname,
        avatar: room.players.get(socket.id).avatar,
        players,
        playerCount: room.players.size
      });

      console.log(`👤 ${nickname} joined room ${room.code} (${room.players.size} players)`);

      callback({
        success: true,
        roomCode: room.code,
        settings: room.settings,
        players,
        status: room.status,
        isHost: false
      });
    } catch (err) {
      console.error('Error joining room:', err);
      callback({ success: false, error: 'Failed to join room.' });
    }
  });

  // ── Start Game ───────────────────────────────────────────────────────────
  socket.on('start-game', (callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = roomManager.getRoom(roomCode);

      if (!room) return callback({ success: false, error: 'Room not found.' });
      if (room.hostId !== socket.id) return callback({ success: false, error: 'Only the host can start the game.' });
      if (room.players.size < 1) return callback({ success: false, error: 'Need at least 1 player.' });

      startNewRound(roomCode);
      callback({ success: true });
    } catch (err) {
      console.error('Error starting game:', err);
      callback({ success: false, error: 'Failed to start game.' });
    }
  });

  // ── Restart Game (Same Room) ─────────────────────────────────────────────
  socket.on('restart-game', (callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = roomManager.getRoom(roomCode);
      if (!room || room.hostId !== socket.id) {
        return callback({ success: false, error: 'Only the host can restart.' });
      }

      // Deep reset of room state
      room.currentRound = 0;
      room.usedWords = [];
      room.status = 'playing';
      
      for (const [, player] of room.players) {
        player.scores = [];
        player.currentGuesses = [];
        player.solved = false;
        player.solvedAt = null;
      }

      startNewRound(roomCode);
      callback({ success: true });
    } catch (err) {
      console.error('Error restarting game:', err);
      callback({ success: false, error: 'Failed to restart.' });
    }
  });

  // ── Submit Guess ─────────────────────────────────────────────────────────
  socket.on('submit-guess', ({ guess }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = roomManager.getRoom(roomCode);

      if (!room) return callback({ success: false, error: 'Room not found.' });

      const result = roundManager.processGuess(room, socket.id, guess);

      if (!result.valid) {
        return callback({ success: false, error: result.error });
      }

      callback({
        success: true,
        result: result.result,
        solved: result.solved,
        guessNumber: result.guessNumber
      });

      // Broadcast live leaderboard to everyone
      const liveLeaderboard = roundManager.getLiveLeaderboard(room);
      io.to(roomCode).emit('live-leaderboard-update', liveLeaderboard);

      // If solved, broadcast celebration
      if (result.solved) {
        io.to(roomCode).emit('player-solved', {
          nickname: socket.data.nickname,
          avatar: room.players.get(socket.id)?.avatar,
          guessCount: result.guessNumber
        });
      }

      // Check if all players are done
      if (roundManager.allPlayersFinished(room)) {
        endCurrentRound(roomCode);
      }
    } catch (err) {
      console.error('Error submitting guess:', err);
      callback({ success: false, error: 'Failed to process guess.' });
    }
  });

  // ── Request Round Status ─────────────────────────────────────────────────
  socket.on('get-round-status', (callback) => {
    const roomCode = socket.data.roomCode;
    const room = roomManager.getRoom(roomCode);
    if (!room) return callback({ error: 'Room not found.' });
    callback(roundManager.getRoundStatus(room));
  });

  // ── Next Round (host only) ───────────────────────────────────────────────
  socket.on('next-round', (callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = roomManager.getRoom(roomCode);
      if (!room) return callback({ success: false, error: 'Room not found.' });
      if (room.hostId !== socket.id) return callback({ success: false, error: 'Only host can advance.' });

      startNewRound(roomCode);
      callback({ success: true });
    } catch (err) {
      callback({ success: false, error: 'Failed to start next round.' });
    }
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);
    const roomCode = socket.data.roomCode;
    if (roomCode) {
      const room = roomManager.getRoom(roomCode);
      if (room) {
        const deleted = roomManager.leaveRoom(roomCode, socket.id);
        if (!deleted) {
          const players = roomManager.getPlayerList(room);
          io.to(roomCode).emit('player-left', {
            nickname: socket.data.nickname,
            players,
            playerCount: room.players.size,
            newHostId: room.hostId
          });

          // Check if all remaining players are done
          if (room.status === 'playing' && roundManager.allPlayersFinished(room)) {
            endCurrentRound(roomCode);
          }
        }
      }
    }
  });
});

// ─── Helper Functions ──────────────────────────────────────────────────────────

function startNewRound(roomCode) {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  const roundInfo = roundManager.startRound(room, (code) => {
    // Timer expired callback
    endCurrentRound(code);
  });

  io.to(roomCode).emit('round-start', {
    roundNumber: roundInfo.roundNumber,
    totalRounds: roundInfo.totalRounds,
    duration: roundInfo.duration,
    wordLength: 5
  });

  // Broadcast initial live leaderboard (everyone at 0 for this round)
  const initialLeaderboard = roundManager.getLiveLeaderboard(room);
  io.to(roomCode).emit('live-leaderboard-update', initialLeaderboard);

  console.log(`🎮 Round ${roundInfo.roundNumber}/${roundInfo.totalRounds} started in room ${roomCode} (word: ${room.currentWord})`);
}

function endCurrentRound(roomCode) {
  const room = roomManager.getRoom(roomCode);
  if (!room || room.status !== 'playing') return;

  const results = roundManager.endRound(room);

  io.to(roomCode).emit('round-end', {
    roundNumber: results.roundNumber,
    word: results.word,
    roundScores: results.roundScores,
    leaderboard: results.leaderboard,
    isGameOver: results.isGameOver
  });

  console.log(`🏁 Round ${results.roundNumber} ended in room ${roomCode}. Word was: ${results.word}`);

  if (results.isGameOver) {
    io.to(roomCode).emit('game-over', {
      leaderboard: results.leaderboard,
      winner: results.leaderboard[0]
    });
    console.log(`🏆 Game over in room ${roomCode}. Winner: ${results.leaderboard[0]?.nickname}`);
  }
}

// ─── SPA Catch-All (serve index.html for any non-API route) ────────────────────
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

// ─── Start Server ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎯 Wordle Arena server running on http://localhost:${PORT}`);
  console.log(`   Waiting for players to connect...\n`);
});
