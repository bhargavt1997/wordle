# 🎯 Wordle Arena — Multiplayer Word Game

A real-time competitive Wordle game where **100+ players** battle simultaneously across multiple rounds. Guess the 5-letter word, climb the leaderboard, and claim the championship!

![Wordle Arena](https://img.shields.io/badge/Players-100%2B-10b981?style=for-the-badge) ![Rounds](https://img.shields.io/badge/Multi--Round-3%20to%2010-f59e0b?style=for-the-badge) ![Real-time](https://img.shields.io/badge/Real--Time-WebSocket-8b5cf6?style=for-the-badge)

---

## ✨ Features

- 🏟️ **100+ Concurrent Players** — WebSocket-powered, handles massive rooms
- 🔄 **Multi-Round Gameplay** — 3, 5, 7, or 10 rounds per game
- 🏆 **Live Leaderboard** — Podium for top 3, full rankings between rounds
- ⚡ **Speed Bonus Scoring** — Faster solves earn more points
- ⏱️ **Configurable Timer** — 60s, 90s, 120s, or 180s per round
- 🎨 **Dark Glassmorphic UI** — Premium design with smooth animations
- 🎯 **Tile Flip Animations** — 3D transforms with color reveals
- ⌨️ **Dual Keyboard Support** — On-screen + physical keyboard
- 🔴 **Live Feed** — See when other players solve in real-time
- 🎉 **Confetti Celebration** — Particle effects on game over
- 📋 **Room Codes** — Easy 6-character codes to share with friends
- 📖 **2000+ Dictionary Words** — Validated against English dictionary

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vite + Vanilla JS | Fast, lightweight UI |
| **Backend** | Node.js + Express | HTTP server |
| **Real-time** | Socket.IO | WebSocket communication |
| **Styling** | Vanilla CSS | Dark glassmorphic design |
| **Animations** | CSS + canvas-confetti | Tile flips, celebrations |
| **Deployment** | GitHub Pages + Render | Free hosting |

---

## 📁 Project Structure

```
wordle/
├── server/                     # Backend (Node.js)
│   ├── package.json
│   ├── index.js                # Express + Socket.IO server
│   └── game/
│       ├── RoomManager.js      # Room create/join/leave
│       ├── RoundManager.js     # Round lifecycle + guess processing
│       ├── ScoringEngine.js    # Points + leaderboard calculation
│       ├── WordValidator.js    # Word validation + color feedback
│       └── words.js            # 500+ solutions, 2000+ valid guesses
├── client/                     # Frontend (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html              # All screen layouts
│   ├── style.css               # Full design system
│   ├── main.js                 # Socket connection + screen router
│   └── screens/
│       ├── lobby.js            # Create/join room
│       ├── game.js             # Grid, keyboard, timer
│       ├── leaderboard.js      # Between-round results + podium
│       └── results.js          # Game over + confetti
├── .github/workflows/
│   └── deploy.yml              # Auto-deploy to GitHub Pages
├── package.json                # Root scripts
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ installed
- npm (comes with Node.js)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/wordle.git
cd wordle
```

### 2. Install dependencies

```bash
# Installs dependencies for both server and client
npm run install:all
```

### 3. Start the game

```bash
# Starts both backend and frontend concurrently
npm run dev
```

### 4. Play!

Open **http://localhost:5173** in your browser. 

To test multiplayer, open the same URL in multiple browser tabs or share it with people on your local network.

---

## 🎮 How to Play

1. **Create a Room** — Enter a nickname, choose rounds (3-10) and timer (60-180s), click "Create Room"
2. **Share the Code** — Copy the 6-character room code and share it with friends
3. **Friends Join** — They visit the same URL, enter the code + nickname, click "Join Room"
4. **Start the Game** — Host clicks "🚀 Start Game"
5. **Guess the Word** — Everyone has the same time to guess the 5-letter word in up to 6 tries
6. **Color Feedback**:
   - 🟩 **Green** — Letter is correct and in the right position
   - 🟨 **Yellow** — Letter is in the word but wrong position
   - ⬛ **Gray** — Letter is not in the word
7. **Round Results** — See the leaderboard with podium after each round
8. **Next Round** — Host advances to the next round
9. **Game Over** — Final standings with confetti celebration! 🎉

---

## 🏆 Scoring System

| Guesses Used | Base Points | Speed Bonus |
|:---:|:---:|:---|
| 1 | 1000 | +50 points per 10 seconds remaining |
| 2 | 800 | +50 points per 10 seconds remaining |
| 3 | 600 | +50 points per 10 seconds remaining |
| 4 | 400 | +50 points per 10 seconds remaining |
| 5 | 200 | +50 points per 10 seconds remaining |
| 6 | 100 | +50 points per 10 seconds remaining |
| Failed | 0 | — |

**Letter Bonus (Awarded even if you fail!):**
- **+50 points** for every unique letter found in the correct place (🟩 Green)
- **+20 points** for every unique letter found in the wrong place (🟨 Yellow)

> **Example:** Solving in 2 guesses with 60s remaining = 800 (base) + 300 (speed) + 250 (5 green letters) = **1350 points**

---

## 👥 Player Capacity

| Metric | Value |
|--------|-------|
| **Max players per room** | 200 (configurable in server code) |
| **Concurrent connections per server** | 1000+ |
| **Multiple rooms** | Unlimited (limited by server memory) |
| **Recommended per room** | 2–100 for best experience |

The Socket.IO + Node.js architecture efficiently handles thousands of concurrent WebSocket connections. Each player connection uses minimal memory (~2KB state), so a basic server (512MB RAM) can comfortably handle 1000+ simultaneous players across multiple rooms.

---

## 🌐 Deployment Guide (Render)

Wordle Arena is configured to be deployed as a **single web service** on Render. The Node.js backend builds and serves the Vite frontend automatically.

### Step 1: Create a Web Service

1. Go to [render.com](https://render.com) and sign up/sign in with your GitHub account.
2. Click **"New +" → "Web Service"**.
3. Select your `wordle` GitHub repository.

### Step 2: Configure Settings

Fill out the configuration page exactly like this:

| Setting | Value |
|---------|-------|
| **Name** | `wordle-arena` (or whatever you prefer) |
| **Region** | Choose the one closest to you |
| **Branch** | `main` |
| **Root Directory** | *(Leave completely blank)* |
| **Runtime** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |

### Step 3: Deploy

1. Scroll down to "Instance Type" and ensure **Free** ($0/month) is selected.
2. Click **"Deploy Web Service"**.

Render will automatically download your code, install dependencies, build the frontend, and start the server. Within a few minutes, your game will be live at a URL like `https://wordle-arena-xxxx.onrender.com`.

---

## ⚠️ Important Notes

### Render Free Tier Cold Starts
Render's free tier spins down after 15 minutes of inactivity. The first connection after it sleeps may take **30-50 seconds** to wake up. After that, it runs normally for everyone. For always-on service, upgrade to Render's paid tier.

---

## 🛠️ Configuration

### Server Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `CORS_ORIGIN` | `localhost` | Comma-separated allowed origins |

### Client Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SERVER_URL` | `http://localhost:3001` | Backend server URL |

### Game Settings (adjustable when creating a room)

| Setting | Options | Default |
|---------|---------|---------|
| Rounds | 3, 5, 7, 10 | 5 |
| Timer | 60s, 90s, 120s, 180s | 90s |
| Max Players | Up to 200 | 200 |

---

## 🧪 Development & Building

### Running in Development Mode

```bash
# Starts both frontend and backend concurrently with hot-reloading
npm run dev
```

### Building for Production

```bash
# Installs all dependencies and builds the Vite frontend into /client/dist
npm run build
```

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<p align="center">
  Built with ❤️ for word game lovers everywhere
</p>
