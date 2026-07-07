<<<<<<< HEAD
# ConnectSpace

Real-time collaboration and video meeting platform with multi-user video calling, screen sharing, file sharing, collaborative whiteboard, secure authentication, and encrypted file storage.

## Features

- **Multi-user video calling** — WebRTC peer-to-peer video with Socket.io signaling
- **Screen sharing** — Share your screen with all participants
- **File sharing** — Upload and download files with AES encryption at rest
- **Whiteboard** — Real-time collaborative drawing synced via Socket.io
- **Secure authentication** — JWT-based auth with bcrypt password hashing
- **Data encryption** — Files encrypted with AES before storage

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Socket.io Client, WebRTC |
| Backend | Node.js, Express, Socket.io |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcrypt |
| Deployment | Docker, Render/Railway ready |

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/connectspace
JWT_SECRET=your-long-random-secret-key-here
ENCRYPTION_KEY=your-32-character-encryption-key!
CORS_ORIGIN=http://localhost:5173
```

### 3. Start MongoDB

If using Docker for MongoDB only:

```bash
docker run -d -p 27017:27017 --name connectspace-mongo mongo:7
```

### 4. Run the app

Terminal 1 — Backend:

```bash
npm run dev:backend
```

Terminal 2 — Frontend:

```bash
npm run dev:frontend
```

Open **http://localhost:5173** — register an account, create a room, and share the Room ID with others.

## Docker Deployment (Full Stack)

Deploy everything with one command:

```bash
# Set secrets (optional — defaults work for local testing)
export JWT_SECRET="your-production-jwt-secret-min-32-chars"
export ENCRYPTION_KEY="your-production-encryption-key!!"

docker-compose up --build -d
```

App runs at **http://localhost:5000** (frontend + API + WebSocket on one port).

## Cloud Deployment

### Option A: Render (Recommended — free tier)

1. Push this repo to GitHub
2. Create a **MongoDB Atlas** cluster (free M0) and copy the connection string
3. On [Render](https://render.com):
   - **New → Web Service** → connect your repo
   - **Environment**: Docker
   - **Port**: 5000
   - Add environment variables:
     ```
     MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/connectspace
     JWT_SECRET=<generate-a-long-random-string>
     ENCRYPTION_KEY=<32-character-key>
     CORS_ORIGIN=https://your-app.onrender.com
     NODE_ENV=production
     ```
4. Deploy — Render builds the Dockerfile and serves the full app

### Option B: Railway

1. Push to GitHub
2. On [Railway](https://railway.app): **New Project → Deploy from GitHub**
3. Add a **MongoDB** plugin or use Atlas URI
4. Set the same environment variables as above
5. Railway auto-detects the Dockerfile

### Option C: Split deployment (Vercel + Render)

**Backend on Render/Railway:**
- Deploy backend folder with `npm start`
- Set `CORS_ORIGIN` to your Vercel URL

**Frontend on Vercel:**
- Root directory: `frontend`
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://your-backend.onrender.com`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms/:roomId` | Get room info |
| POST | `/api/rooms/:roomId/join` | Join room |
| POST | `/api/files/:roomId` | Upload file |
| GET | `/api/files/:roomId` | List files |
| GET | `/api/files/download/:fileId` | Download file |
| GET | `/api/health` | Health check |

## WebSocket Events

Socket.io handles WebRTC signaling (`offer`, `answer`, `ice-candidate`), whiteboard sync, chat, and presence.

## Project Structure

```
ConnectSpace/
├── backend/
│   ├── src/
│   │   ├── config/       # Database connection
│   │   ├── middleware/    # JWT auth
│   │   ├── models/        # User, Room, File
│   │   ├── routes/        # REST API
│   │   ├── socket/        # Real-time handlers
│   │   └── utils/         # JWT, encryption
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/           # HTTP client
│   │   ├── components/    # UI components
│   │   ├── context/       # Auth state
│   │   ├── hooks/         # WebRTC, whiteboard
│   │   └── pages/         # Login, Dashboard, Meeting
│   └── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Security Notes

- Change `JWT_SECRET` and `ENCRYPTION_KEY` in production
- Use HTTPS in production (Render/Railway provide this automatically)
- WebRTC media is encrypted by DTLS-SRTP by default
- Passwords hashed with bcrypt (12 rounds)
- Rate limiting enabled on API routes

## License

MIT
=======
# Verdant & Co — E-Commerce Demo
## 🔗 Live Demo
[https://verdant-and-co.onrender.com](https://verdant-and-co.onrender.com)

> Hosted on Render's free tier — if it's been idle, the first load may take 30-60 seconds to wake up.
> 
A small but fully functional online store: Express.js backend, vanilla HTML/CSS/JS frontend, JSON-file database (no setup, no native modules — just `npm install` and go).

## Features
- Product listing with search + category filter, and product detail pages
- Shopping cart (add / update quantity / remove), persisted per browser session
- User registration & login (passwords hashed with bcrypt), sessions via cookies
- Checkout flow that turns a cart into an order
- Order history with a live-looking tracker (Processing → Shipped → Out for Delivery → Delivered, auto-advances every 2 minutes for demo purposes)

## Run it

```bash
npm install
npm start
```


## Project structure

```
server.js              Express app entry point
routes/                 API route handlers (auth, products, cart, orders)
lib/db.js               Tiny JSON-file "database" (read/write/nextId)
lib/auth.js              requireAuth middleware
data/                   JSON data files acting as the database
  products.json          Seed catalog (8 sample products)
  users.json              Registered users (starts empty)
  orders.json             Placed orders (starts empty)
public/                 Frontend (static HTML/CSS/JS)
  index.html, product.html, cart.html, login.html, register.html, orders.html
  css/style.css
  js/                     Page logic + shared nav/session helper
```

## How the data layer works
Instead of a real database, `lib/db.js` reads/writes the JSON files in `/data`. It's a genuine working persistence layer (data survives server restarts) and swaps in easily for a real DB later — every route only touches data through `readData()` / `writeData()` / `nextId()`, so migrating to Postgres, MongoDB, or SQLite later just means rewriting that one file.

## Notes / things to harden before going to production
- Session secret in `server.js` is a hardcoded placeholder — set it via an environment variable.
- No HTTPS/cookie `secure` flag — enable when deploying behind TLS.
- No rate limiting on login/register.
- JSON-file storage isn't safe for concurrent writes at scale — fine for a demo/single-user dev environment, but swap for a real database before handling real traffic.
- Order status is simulated by elapsed time rather than a real fulfillment system.

## Sample flow to try
1. Go to the shop, click a product, add it to your cart.
2. Go to Cart → Proceed to checkout (you'll be asked to sign up/log in if you haven't).
3. Enter a shipping address and place the order.
4. Go to "My Orders" to see it, with a tracker that advances automatically every 2 minutes so you can watch the status change.
>>>>>>> 32ca12efd615cc1cf7330a77931cca1a0d99ce17
