# Verdant & Co — E-Commerce Demo

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

Then open **http://localhost:3000** in your browser.

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
