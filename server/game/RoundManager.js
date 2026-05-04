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
      let maxGreen = 0;
      let maxYellow = 0;

      if (player.solved) {
        guessCount = player.currentGuesses.length;
        timeRemainingMs = room.roundEndTime - player.solvedAt;
        maxGreen = 5; // Solved means all 5 are correct
      } else if (player.currentGuesses.length > 0) {
        // Find best state for each position if they didn't solve it
        const bestStates = [0, 0, 0, 0, 0];
        for (const guess of player.currentGuesses) {
          for (let i = 0; i < 5; i++) {
            if (guess.result[i] === 'correct') {
              bestStates[i] = 2;
            } else if (guess.result[i] === 'present' && bestStates[i] < 1) {
              bestStates[i] = 1;
            }
          }
        }
        maxGreen = bestStates.filter(s => s === 2).length;
        maxYellow = bestStates.filter(s => s === 1).length;
      }

      const score = ScoringEngine.calculateRoundScore(guessCount, timeRemainingMs, maxGreen, maxYellow);
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

  clearTimer(roomCode) {
    const existing = this.timers.get(roomCode);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(roomCode);
    }
  }
}
