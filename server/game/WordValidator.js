import { SOLUTION_WORDS, VALID_GUESSES } from './words.js';

export class WordValidator {
  constructor() {
    this.validGuesses = VALID_GUESSES;
    this.solutionWords = SOLUTION_WORDS;
  }

  /** Pick a random solution word, optionally excluding already-used words */
  getRandomWord(usedWords = []) {
    const available = this.solutionWords.filter(w => !usedWords.includes(w));
    if (available.length === 0) {
      // Reset if we've used all words (unlikely with 500+ words)
      return this.solutionWords[Math.floor(Math.random() * this.solutionWords.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  /** Check if a word is a valid 5-letter guess */
  isValidGuess(word) {
    if (!word || word.length !== 5) return false;
    return this.validGuesses.has(word.toLowerCase());
  }

  /**
   * Evaluate a guess against the target word.
   * Returns an array of 5 objects: { letter, status }
   * status: 'correct' (green), 'present' (yellow), 'absent' (gray)
   */
  evaluateGuess(guess, target) {
    guess = guess.toLowerCase();
    target = target.toLowerCase();

    const result = Array(5).fill(null).map((_, i) => ({
      letter: guess[i],
      status: 'absent'
    }));

    const targetLetters = target.split('');
    const guessLetters = guess.split('');

    // First pass: mark correct (green)
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        result[i].status = 'correct';
        targetLetters[i] = null; // consumed
        guessLetters[i] = null;  // consumed
      }
    }

    // Second pass: mark present (yellow)
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === null) continue; // already correct
      const idx = targetLetters.indexOf(guessLetters[i]);
      if (idx !== -1) {
        result[i].status = 'present';
        targetLetters[idx] = null; // consumed
      }
    }

    return result;
  }

  /** Check if a guess is the correct word */
  isCorrect(guess, target) {
    return guess.toLowerCase() === target.toLowerCase();
  }
}
