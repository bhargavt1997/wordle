import { WordValidator } from './WordValidator.js';
import { ScoringEngine } from './ScoringEngine.js';

export class RoundManager {
  constructor() {
    this.wordValidator = new WordValidator();
    /** @type {Map<string, NodeJS.Timeout>} roomCode -> timer */
    this.timers = new Map();
  }

  /**
   * Start a new round for a room
   * @param {object} room - room object from RoomManager
   * @param {function} onRoundEnd - callback when round timer expires
   * @returns {{ roundNumber: number, duration: number }}
   */
  startRound(room, onRoundEnd) {
    room.currentRound++;
    room.status = 'playing';

    // Pick a new word not yet used in this game
    const targetWord = this.wordValidator.getRandomWord(room.usedWords);
    room.usedWords.push(targetWord);
    room.currentWord = targetWord;
    room.roundStartTime = Date.now();
    room.roundEndTime = Date.now() + (room.settings.roundDuration * 1000);

    // Reset player states for new round
    for (const [, player] of room.players) {
      player.currentGuesses = [];
      player.solved = false;
      player.solvedAt = null;
    }

    // Set timer for round end
    this.clearTimer(room.code);
    const timer = setTimeout(() => {
      onRoundEnd(room.code);
    }, room.settings.roundDuration * 1000);
    this.timers.set(room.code, timer);

    return {
      roundNumber: room.currentRound,
      totalRounds: room.settings.rounds,
      duration: room.settings.roundDuration
    };
  }

  /**
   * Process a player's guess
   * @returns {{ valid: boolean, result?: Array, solved?: boolean, error?: string }}
   */
  processGuess(room, playerId, guess) {
    const player = room.players.get(playerId);
    if (!player) {
      return { valid: false, error: 'Player not found.' };
    }
    if (player.solved) {
      return { valid: false, error: 'You already solved this round!' };
    }
    if (player.currentGuesses.length >= 6) {
      return { valid: false, error: 'No more guesses remaining.' };
    }
    if (room.status !== 'playing') {
      return { valid: false, error: 'Round is not active.' };
    }

    const normalizedGuess = guess.toLowerCase().trim();

    if (!this.wordValidator.isValidGuess(normalizedGuess)) {
      return { valid: false, error: 'Not a valid word.' };
    }

    // Check for duplicate guess
    if (player.currentGuesses.some(g => g.word === normalizedGuess)) {
      return { valid: false, error: 'Already guessed this word.' };
    }

    const result = this.wordValidator.evaluateGuess(normalizedGuess, room.currentWord);
    const solved = this.wordValidator.isCorrect(normalizedGuess, room.currentWord);

    player.currentGuesses.push({
      word: normalizedGuess,
      result,
      timestamp: Date.now()
    });

    if (solved) {
      player.solved = true;
      player.solvedAt = Date.now();
    }

    return {
      valid: true,
      result,
      solved,
      guessNumber: player.currentGuesses.length
    };
  }

  /**
   * End the current round and calculate scores
   * @returns {{ scores: Array, leaderboard: Array, word: string }}
   */
  endRound(room) {
    this.clearTimer(room.code);

    const roundScores = [];

    for (const [playerId, player] of room.players) {
      let guessCount = 0;
      let timeRemainingMs = 0;
      let letterBonus = 0;

      if (player.currentGuesses.length > 0) {
        const bestStates = [0, 0, 0, 0, 0];
        
        for (const guess of player.currentGuesses) {
          const guessTimeRemaining = Math.max(0, Math.floor((room.roundEndTime - guess.timestamp) / 1000));
          
          for (let i = 0; i < 5; i++) {
            const status = guess.result[i].status;
            
            if (status === 'correct' && bestStates[i] < 2) {
              const basePoints = bestStates[i] === 1 ? 30 : 50; // Diff if already yellow
              letterBonus += basePoints + (guessTimeRemaining * 2);
              bestStates[i] = 2;
            } else if (status === 'present' && bestStates[i] < 1) {
              letterBonus += 20 + (guessTimeRemaining * 1);
              bestStates[i] = 1;
            }
          }
        }
      }

      if (player.solved) {
        guessCount = player.currentGuesses.length;
        timeRemainingMs = room.roundEndTime - player.solvedAt;
      }

      const score = ScoringEngine.calculateRoundScore(guessCount, timeRemainingMs, letterBonus);
      score.guessCount = guessCount;
      score.round = room.currentRound;
      score.solved = player.solved;

      player.scores.push(score);

      roundScores.push({
        playerId,
        nickname: player.nickname,
        avatar: player.avatar,
        ...score
      });
    }

    // Sort round scores
    roundScores.sort((a, b) => b.total - a.total);

    // Build cumulative leaderboard
    const leaderboard = ScoringEngine.buildLeaderboard(room.players);

    const isGameOver = room.currentRound >= room.settings.rounds;
    if (isGameOver) {
      room.status = 'finished';
    }

    return {
      roundNumber: room.currentRound,
      word: room.currentWord,
      roundScores,
      leaderboard,
      isGameOver
    };
  }

  /** Check if all players in a room have finished (solved or used all 6 guesses) */
  allPlayersFinished(room) {
    for (const [, player] of room.players) {
      if (!player.connected) continue; // skip disconnected
      if (!player.solved && player.currentGuesses.length < 6) {
        return false;
      }
    }
    return true;
  }

  /** Get round status for a room */
  getRoundStatus(room) {
    const playerStatuses = [];
    for (const [playerId, player] of room.players) {
      playerStatuses.push({
        playerId,
        nickname: player.nickname,
        avatar: player.avatar,
        guessCount: player.currentGuesses.length,
        solved: player.solved,
        connected: player.connected
      });
    }
    return {
      roundNumber: room.currentRound,
      totalRounds: room.settings.rounds,
      timeRemaining: Math.max(0, room.roundEndTime - Date.now()),
      players: playerStatuses
    };
  }

  /** Calculate exact live scores for all players mid-round */
  getLiveLeaderboard(room) {
    const entries = [];

    for (const [playerId, player] of room.players) {
      // 1. Get accumulated score from all PREVIOUS rounds
      const previousTotal = player.scores.reduce((sum, s) => sum + s.total, 0);

      // 2. Calculate CURRENT round live score
      let currentRoundScore = 0;
      let letterBonus = 0;

      if (player.currentGuesses.length > 0) {
        const bestStates = [0, 0, 0, 0, 0];
        for (const guess of player.currentGuesses) {
          const guessTimeRemaining = Math.max(0, Math.floor((room.roundEndTime - guess.timestamp) / 1000));
          
          for (let i = 0; i < 5; i++) {
            const status = guess.result[i].status;
            if (status === 'correct' && bestStates[i] < 2) {
              const basePoints = bestStates[i] === 1 ? 30 : 50;
              letterBonus += basePoints + (guessTimeRemaining * 2);
              bestStates[i] = 2;
            } else if (status === 'present' && bestStates[i] < 1) {
              letterBonus += 20 + (guessTimeRemaining * 1);
              bestStates[i] = 1;
            }
          }
        }
      }

      if (player.solved) {
        const guessCount = player.currentGuesses.length;
        const timeRemainingMs = room.roundEndTime - player.solvedAt;
        const scoreObj = ScoringEngine.calculateRoundScore(guessCount, timeRemainingMs, letterBonus);
        currentRoundScore = scoreObj.total;
      } else if (player.currentGuesses.length > 0) {
        // guessCount = 0 so no base/speed points, just letterBonus
        const scoreObj = ScoringEngine.calculateRoundScore(0, 0, letterBonus);
        currentRoundScore = scoreObj.total;
      }

      entries.push({
        playerId,
        nickname: player.nickname,
        avatar: player.avatar,
        liveScore: previousTotal + currentRoundScore,
        solved: player.solved,
        guessCount: player.currentGuesses.length
      });
    }

    // Sort by live score desc, then alphabetically
    entries.sort((a, b) => {
      if (b.liveScore !== a.liveScore) return b.liveScore - a.liveScore;
      return a.nickname.localeCompare(b.nickname);
    });

    // Assign live ranks
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return entries;
  }

  clearTimer(roomCode) {
    const existing = this.timers.get(roomCode);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(roomCode);
    }
  }
}
