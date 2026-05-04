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
# Install both server and client dependencies
cd server && npm install
cd ../client && npm install
cd ..
```

### 3. Start the game

Open **two terminal windows**:

```bash
# Terminal 1 — Start the game server
cd server && npm run dev
```

```bash
# Terminal 2 — Start the frontend
cd client && npm run dev
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

> **Example:** Solving in 2 guesses with 60s remaining = 800 + (6 × 50) = **1100 points**

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

## 🌐 Deployment Guide

Since this is a **client-server** app, deployment requires two parts:
- **Frontend** → GitHub Pages (free, static hosting)
- **Backend** → Render.com (free tier, runs Node.js)

### Step 1: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up (free, no credit card)
2. Click **"New" → "Web Service"**
3. Connect your GitHub repository
4. Configure:
   | Setting | Value |
   |---------|-------|
   | **Name** | `wordle-arena-server` |
   | **Root Directory** | `server` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `node index.js` |
   | **Instance Type** | Free |

5. Add **Environment Variable**:
   | Key | Value |
   |-----|-------|
   | `CORS_ORIGIN` | `https://<your-username>.github.io` |

6. Click **"Deploy"** and wait for it to go live
7. Copy the Render URL (e.g., `https://wordle-arena-server.onrender.com`)

### Step 2: Deploy Frontend to GitHub Pages

1. Go to your GitHub repository → **Settings → Pages**
2. Under **Source**, select **"GitHub Actions"**
3. Go to **Settings → Variables and secrets → Actions → Variables**
4. Add a **Repository Variable**:
   | Name | Value |
   |------|-------|
   | `VITE_SERVER_URL` | `https://wordle-arena-server.onrender.com` |

5. Push to `main` branch — the GitHub Action will automatically build and deploy!

> **Note:** If your repo name is not `wordle`, update the `base` in `client/vite.config.js`:
> ```js
> base: mode === 'production' ? '/<your-repo-name>/' : '/',
> ```

### Step 3: Play! 🎉

Your game will be live at:
```
https://<your-username>.github.io/wordle/
```

Share this URL with friends. Create a room, share the code, and compete!

---

## ⚠️ Important Notes

### Render Free Tier Cold Starts
Render's free tier spins down after 15 minutes of inactivity. The first connection may take **30-50 seconds** to wake up. After that, it runs normally. For always-on service, upgrade to Render's paid tier ($7/month).

### GitHub Pages Base Path
If your repository is named something other than `wordle`, update the `base` path in `client/vite.config.js` to match your repo name.

### Custom Domain (Optional)
To use a custom domain with GitHub Pages:
1. Add a `CNAME` file in `client/public/` with your domain
2. Update the `base` in `vite.config.js` to `'/'`
3. Configure DNS records as per [GitHub Pages docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

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

## 🧪 Development

### Running in Development Mode

```bash
# Server (auto-restarts on file changes)
cd server && npm run dev

# Client (hot module replacement)
cd client && npm run dev
```

### Building for Production

```bash
cd client && VITE_SERVER_URL=https://your-server.onrender.com npm run build
```

The production build outputs to `client/dist/`.

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<p align="center">
  Built with ❤️ for word game lovers everywhere
</p>
