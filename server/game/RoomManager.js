import { randomBytes } from 'crypto';

export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
  }

  /** Generate a unique 6-char room code */
  generateRoomCode() {
    let code;
    do {
      code = randomBytes(3).toString('hex').toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * Create a new room
   * @param {string} hostId - socket ID of the host
   * @param {string} hostNickname - display name of the host
   * @param {object} options - { rounds, roundDuration, maxPlayers }
   * @returns {Room}
   */
  createRoom(hostId, hostNickname, options = {}) {
    const code = this.generateRoomCode();
    const room = {
      code,
      hostId,
      status: 'waiting', // waiting | playing | finished
      settings: {
        rounds: options.rounds || 5,
        roundDuration: options.roundDuration || 90, // seconds
        maxPlayers: options.maxPlayers || 200
      },
      players: new Map(),
      currentRound: 0,
      usedWords: [],
      createdAt: Date.now()
    };

    // Add host as first player
    room.players.set(hostId, {
      nickname: hostNickname,
      avatar: this.getRandomAvatar(),
      scores: [],
      connected: true,
      currentGuesses: [],
      solved: false,
      solvedAt: null
    });

    this.rooms.set(code, room);
    return room;
  }

  /**
   * Join an existing room
   * @returns {{ success: boolean, error?: string, room?: Room }}
   */
  joinRoom(roomCode, playerId, nickname) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return { success: false, error: 'Room not found. Check the code and try again.' };
    }
    if (room.status === 'finished') {
      return { success: false, error: 'This game has already ended.' };
    }
    // Check for rejoining player or duplicate nicknames
    for (const [existingId, p] of room.players) {
      if (p.nickname.toLowerCase() === nickname.toLowerCase()) {
        if (!p.connected) {
          // Reclaim disconnected player slot
          p.connected = true;
          room.players.set(playerId, p);
          room.players.delete(existingId);
          if (room.hostId === existingId) {
            room.hostId = playerId;
          }
          return { success: true, room };
        }
        return { success: false, error: 'Nickname already taken in this room.' };
      }
    }

    if (room.players.size >= room.settings.maxPlayers) {
      return { success: false, error: 'Room is full.' };
    }

    room.players.set(playerId, {
      nickname,
      avatar: this.getRandomAvatar(),
      scores: [],
      connected: true,
      currentGuesses: [],
      solved: false,
      solvedAt: null
    });

    return { success: true, room };
  }

  /** Remove player from room. Returns true if room was deleted. */
  leaveRoom(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    room.players.delete(playerId);

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      return true;
    }

    // If host left, assign new host
    if (room.hostId === playerId) {
      room.hostId = room.players.keys().next().value;
    }

    return false;
  }

  /** Mark player as disconnected (for reconnection support) */
  disconnectPlayer(playerId) {
    for (const [code, room] of this.rooms) {
      if (room.players.has(playerId)) {
        const player = room.players.get(playerId);
        player.connected = false;

        // If host disconnected, assign new host among connected players
        if (room.hostId === playerId) {
          for (const [id, p] of room.players) {
            if (p.connected) {
              room.hostId = id;
              break;
            }
          }
        }
        
        return { roomCode: code, room };
      }
    }
    return null;
  }

  /** Find room by player ID */
  findRoomByPlayer(playerId) {
    for (const [code, room] of this.rooms) {
      if (room.players.has(playerId)) {
        return { roomCode: code, room };
      }
    }
    return null;
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  /** Get serializable player list for a room */
  getPlayerList(room) {
    const players = [];
    for (const [id, p] of room.players) {
      players.push({
        id,
        nickname: p.nickname,
        avatar: p.avatar,
        connected: p.connected,
        isHost: id === room.hostId
      });
    }
    return players;
  }

  getRandomAvatar() {
    const avatars = ['🦊', '🐸', '🦉', '🐙', '🦄', '🐲', '🦋', '🐺', '🦈', '🐢',
      '🦁', '🐨', '🐯', '🦅', '🐬', '🦎', '🐝', '🦩', '🐳', '🦝',
      '🐻', '🦥', '🐼', '🦘', '🐧', '🦑', '🐹', '🦜', '🐰', '🦚'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  /** Cleanup old empty/finished rooms */
  cleanup() {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    for (const [code, room] of this.rooms) {
      if (room.players.size === 0 || (now - room.createdAt > ONE_HOUR && room.status === 'finished')) {
        this.rooms.delete(code);
      }
    }
  }
}
