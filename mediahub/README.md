# MediaHub Frontend

A beautiful Locket-inspired social media app built with React + Tailwind v4.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
The default already points to your live Render backend:
```
VITE_API_URL=https://media-hub-bq9w.onrender.com
```

### 3. Run dev server
```bash
npm run dev
```

### 4. Build for production
```bash
npm run build
```

## Stack
- React 19
- React Router 7
- Tailwind CSS v4
- Zustand (global state)
- Axios (API calls)
- React Icons (Feather icons)
- React Hot Toast (notifications)
- Day.js (dates)

## Features
- 🌙 Dark / Light mode toggle
- 📸 Photo upload with drag & drop
- ❤️ Like posts (animated)
- 💬 Comments
- 🔍 Explore & search
- 👤 Profile page with post grid
- ⚙️ Settings & profile editing
- 🔐 JWT authentication (auto-persisted)

## Pages
| Path | Page |
|------|------|
| `/` | Feed (stories + posts) |
| `/explore` | Explore (search + grid) |
| `/create` | Create post |
| `/posts/:id` | Post detail + comments |
| `/profile` | My profile |
| `/settings` | Settings |
| `/login` | Login |
| `/register` | Register |

## Deploy to Vercel
```bash
npm install -g vercel
vercel
# Set VITE_API_URL env var in Vercel dashboard
```
