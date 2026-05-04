export class ScoringEngine {
  /** Points awarded by guess number (1-indexed) */
  static GUESS_POINTS = {
    1: 1000,
    2: 800,
    3: 600,
    4: 400,
    5: 200,
    6: 100
  };

  /** Speed bonus: points per 10 seconds remaining */
  static SPEED_BONUS_PER_10S = 50;

  /**
   * Calculate score for a single round
   * @param {number} guessCount - number of guesses used (1-6), 0 = failed
   * @param {number} timeRemainingMs - milliseconds remaining on timer
   * @param {number} maxGreen - highest number of unique green letters found
   * @param {number} maxYellow - highest number of unique yellow letters found
   * @returns {{ base: number, speedBonus: number, letterBonus: number, total: number }}
   */
  static calculateRoundScore(guessCount, timeRemainingMs, maxGreen = 0, maxYellow = 0) {
    let base = 0;
    let speedBonus = 0;

    if (guessCount > 0 && guessCount <= 6) {
      base = ScoringEngine.GUESS_POINTS[guessCount] || 0;
      const secondsRemaining = Math.max(0, Math.floor(timeRemainingMs / 1000));
      speedBonus = Math.floor(secondsRemaining / 10) * ScoringEngine.SPEED_BONUS_PER_10S;
    }

    const letterBonus = (maxGreen * 50) + (maxYellow * 20);

    return {
      base: base + letterBonus,
      speedBonus,
      letterBonus,
      total: base + speedBonus + letterBonus
    };
  }

  /**
   * Build leaderboard from player scores
   * @param {Map} players - Map of playerId -> { nickname, scores: [{ round, base, speedBonus, total, guessCount }] }
   * @returns {Array} sorted leaderboard entries
   */
  static buildLeaderboard(players) {
    const entries = [];

    for (const [playerId, player] of players) {
      const totalScore = player.scores.reduce((sum, s) => sum + s.total, 0);
      const totalGuesses = player.scores.reduce((sum, s) => sum + (s.guessCount || 0), 0);
      const solvedRounds = player.scores.filter(s => s.guessCount > 0 && s.guessCount <= 6).length;

      entries.push({
        playerId,
        nickname: player.nickname,
        avatar: player.avatar,
        totalScore,
        totalGuesses,
        solvedRounds,
        roundScores: player.scores,
        avgGuesses: solvedRounds > 0 ? (totalGuesses / solvedRounds).toFixed(1) : '-'
      });
    }

    // Sort by total score desc, then by fewer total guesses, then alphabetically
    entries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.totalGuesses !== b.totalGuesses) return a.totalGuesses - b.totalGuesses;
      return a.nickname.localeCompare(b.nickname);
    });

    // Assign ranks
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return entries;
  }
}
